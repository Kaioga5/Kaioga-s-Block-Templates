// Slows whatever moves across the slime block. Vanilla slime is slippery
// (the block JSON's minecraft:friction covers that) but it also takes most of
// the sideways speed away from anything on it, every tick it is on the
// ground: measured against vanilla, an entity keeps 0.4 of its speed each
// tick, plus a fifth of its vertical speed, which is why walking on slime is
// so slow. Nothing in the block JSON does this, so the script does it.
import { system, Player } from "@minecraft/server";
// The block that slows. If you rename the block, rename this string too
const SLIME_ID = "kai_templates:slime_block";
// The share of sideways speed kept each tick, and how much more an entity
// keeps per block per tick of vertical speed
const KEPT = 0.4;
const KEPT_PER_VERTICAL = 0.2;
// A creature's or player's push replaces the speed the slime would have left
// it with next tick, so their share also carries the slime's own slipperiness
// (0.8 x 0.91 air drag). Items, boats and minecarts get that from the game
// after the push
const SURFACE = 0.728;
const OBJECTS = new Set([
    "minecraft:item",
    "minecraft:boat",
    "minecraft:chest_boat",
    "minecraft:minecart",
    "minecraft:chest_minecart",
    "minecraft:hopper_minecart",
    "minecraft:tnt_minecart",
    "minecraft:command_block_minecart",
]);
// A player moves on their own device, which only sees the knockback a little
// late and takes only part of it, so they are sent much less. Even so a
// knockback cannot slow a player all the way: walking comes out about 1.4
// blocks a second against vanilla's 1.2, and sending less still barely helps
const PLAYER_KEPT = 0.2;
// Only an entity resting on the block is slowed; one moving up or down this
// fast, bouncing or jumping, keeps its speed
const MAX_VERTICAL = 0.1;
// Entities that have stepped onto a slime block, by id. Each tick checks they
// are still on one, so stepping off needs no hook of its own
const onSlime = new Map();
function standingOnSlime(entity) {
    if (entity.getBlockStandingOn()?.typeId === SLIME_ID)
        return true;
    // Items, boats and minecarts are not always reported as standing on
    // anything, so look straight under them too
    const { x, y, z } = entity.location;
    try {
        return entity.dimension.getBlock({ x, y: y - 0.05, z })?.typeId === SLIME_ID;
    }
    catch {
        return false;
    }
}
function slow(entity) {
    // A sneaking player steps carefully and is not slowed, as in vanilla
    if (entity instanceof Player && entity.isSneaking)
        return;
    const velocity = entity.getVelocity();
    if (Math.abs(velocity.y) >= MAX_VERTICAL)
        return;
    if (Math.abs(velocity.x) + Math.abs(velocity.z) < 1e-4)
        return;
    let kept = KEPT + Math.abs(velocity.y) * KEPT_PER_VERTICAL;
    if (!OBJECTS.has(entity.typeId))
        kept *= SURFACE;
    if (entity instanceof Player) {
        // Players reject applyImpulse; a knockback sets their sideways speed
        const player = kept * PLAYER_KEPT;
        entity.applyKnockback({ x: velocity.x * player, z: velocity.z * player }, velocity.y);
    }
    else {
        entity.clearVelocity();
        entity.applyImpulse({ x: velocity.x * kept, y: velocity.y, z: velocity.z * kept });
    }
}
system.runInterval(() => {
    for (const [id, entity] of onSlime) {
        if (!entity.isValid || !standingOnSlime(entity)) {
            onSlime.delete(id);
            continue;
        }
        slow(entity);
    }
});
// Custom components register during the startup before-event, which runs in
// early execution, before any world or entity exists
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:slime_slowdown", {
        onStepOn(event) {
            const entity = event.entity;
            if (entity?.isValid)
                onSlime.set(entity.id, entity);
        },
        // Landing on the block counts too, however short the fall
        onEntityFallOn(event) {
            const entity = event.entity;
            if (entity?.isValid)
                onSlime.set(entity.id, entity);
        },
    });
});
