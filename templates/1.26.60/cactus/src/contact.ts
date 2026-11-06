// Cactus damage.
// Vanilla checks this from the entity side every tick: anything whose box
// overlaps a cactus takes a point of damage. There is no block hook for "an
// entity is inside me", so the sweep runs from the player list instead, every
// half second, entities near a player are tested against the cacti around them.
// The cost follows the player count, not the cactus count, so a farm with a
// hundred cacti in it is no more expensive than one with three.
import { Block, Entity, system, world } from "@minecraft/server";
import {
    CACTUS_ID,
    CONTACT_DAMAGE,
    CONTACT_INTERVAL,
    CONTACT_PLAYER_RANGE,
    ENTITY_HEIGHT,
    ENTITY_RADIUS,
} from "./config.js";

// The cactus damage box. Vanilla's collision shape is the block inset one
// pixel on every side and a pixel short of the top, and any entity whose
// bounding box touches that shape is hurt. The sides count as much as the
// top: pressing into a cactus from beside it is the usual way to get pricked
const INSET = 1 / 16;
const TOP = 15 / 16;

// The blocks worth testing for one entity: the column it stands in and the
// eight around it, at its feet and one up, so a tall mob leaning into a cactus
// at chest height is caught as well as one standing on the block beside it
const NEARBY: { x: number; y: number; z: number }[] = [];
for (const dy of [0, 1]) {
    for (const dx of [-1, 0, 1]) {
        for (const dz of [-1, 0, 1]) {
            NEARBY.push({ x: dx, y: dy, z: dz });
        }
    }
}

// Does this entity's box overlap the cactus damage box? Both are axis-aligned
// boxes, so the test is one comparison per axis. The entity box is a cylinder
// of ENTITY_RADIUS approximated as a square, standing ENTITY_HEIGHT tall from
// its feet, which is how the engine sizes most mobs
function touches(entity: Entity, cactus: Block): boolean {
    const at = entity.location;
    const minX = cactus.location.x + INSET;
    const maxX = cactus.location.x + 1 - INSET;
    const minY = cactus.location.y;
    const maxY = cactus.location.y + TOP;
    const minZ = cactus.location.z + INSET;
    const maxZ = cactus.location.z + 1 - INSET;

    // An entity standing on the top face has its feet at exactly maxY, and
    // vanilla counts that as clear, which is why the top is safe to stand on
    return (
        at.x + ENTITY_RADIUS > minX &&
        at.x - ENTITY_RADIUS < maxX &&
        at.y + ENTITY_HEIGHT > minY &&
        at.y < maxY &&
        at.z + ENTITY_RADIUS > minZ &&
        at.z - ENTITY_RADIUS < maxZ
    );
}

system.runInterval(() => {
    // One sweep per dimension that has a player in it, deduplicated so two
    // players standing together do not damage the same mob twice
    const seen = new Set<string>();
    for (const player of world.getPlayers()) {
        let nearby: Entity[];
        try {
            nearby = player.dimension.getEntities({
                location: player.location,
                maxDistance: CONTACT_PLAYER_RANGE,
            });
        } catch {
            continue;
        }

        for (const entity of nearby) {
            if (seen.has(entity.id)) {
                continue;
            }
            seen.add(entity.id);

            for (const offset of NEARBY) {
                let candidate: Block | undefined;
                try {
                    candidate = player.dimension.getBlock({
                        x: Math.floor(entity.location.x) + offset.x,
                        y: Math.floor(entity.location.y) + offset.y,
                        z: Math.floor(entity.location.z) + offset.z,
                    });
                } catch {
                    continue;
                }
                if (candidate === undefined || candidate.typeId !== CACTUS_ID) {
                    continue;
                }
                if (touches(entity, candidate)) {
                    entity.applyDamage(CONTACT_DAMAGE);
                    break;
                }
            }
        }
    }
}, CONTACT_INTERVAL);
