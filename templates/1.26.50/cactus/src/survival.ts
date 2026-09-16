// The rule that gives cactus farms their shape: a cactus cannot stand next to a
// solid block. Vanilla re-checks this whenever a neighbour changes, but a custom
// block gets no neighbour-changed hook, so the check runs at the three moments
// that actually matter, when the cactus is placed, when a player puts a block
// beside one, and on random ticks as the catch-all for everything else
// (pistons, explosions, other scripts).
import { Block, BlockComponentPlayerPlaceBeforeEvent, BlockComponentRandomTickEvent, system, world } from "@minecraft/server";
import { CACTUS_ID, passableNeighbourIds, passableNeighbourTags } from "./config.js";

// The four horizontal offsets a cactus cares about
const SIDES = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];

// Does this neighbour kill the cactus?
function isBlocking(neighbour: Block | undefined): boolean {
    // An unloaded neighbour is unknown, and destroying on a guess would eat
    // cacti at chunk borders
    if (neighbour === undefined || neighbour.isAir) {
        return false;
    }
    // Lava is the one fluid that kills on contact
    if (neighbour.typeId === "minecraft:lava" || neighbour.typeId === "minecraft:flowing_lava") {
        return true;
    }
    // Water beside a cactus is fine, it is the sand under it that matters
    if (neighbour.isLiquid) {
        return false;
    }
    if (passableNeighbourIds.has(neighbour.typeId)) {
        return false;
    }
    // Tags catch whole families at once, which is why the list stays short
    return !passableNeighbourTags.some((tag) => neighbour.hasTag(tag));
}

// True when any of the four sides is blocked
export function isCrowded(block: Block): boolean {
    return SIDES.some((side) => isBlocking(block.offset(side)));
}

// Break the cactus and leave its item behind, which is what a failed survival
// check does in vanilla
function popCactus(block: Block): void {
    const drop = block.getItemStack(1, true);
    const { dimension, location } = block;
    const center = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, center);
    }
    dimension.playSound("dig.cloth", location);
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:cactus_survival", {
        // Refuse the placement outright rather than letting a cactus appear and
        // pop a moment later
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            if (isCrowded(event.block)) {
                event.cancel = true;
            }
        },

        onRandomTick(event: BlockComponentRandomTickEvent): void {
            if (isCrowded(event.block)) {
                popCactus(event.block);
            }
        },
    });
});

// A player walling a cactus in should see it break straight away, not on the
// next random tick. Only the four blocks around the one just placed are read
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    for (const side of SIDES) {
        const neighbour = event.block.offset(side);
        if (neighbour !== undefined && neighbour.typeId === CACTUS_ID && isCrowded(neighbour)) {
            popCactus(neighbour);
        }
    }
});
