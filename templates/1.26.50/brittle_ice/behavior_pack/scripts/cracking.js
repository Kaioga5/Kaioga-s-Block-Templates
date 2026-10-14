// Registers the component that cracks the ice under anything standing on it.
// Java's rule, read from BrittleIceBlock and timed in game:
// - a living entity on the block cracks it one stage (0 to 1 to 2 to 3), and a
//   fourth crack breaks it, with no drop
// - after a crack the block waits 24 ticks before it can crack again, however
//   many entities stand on it
// - an entity that steps off stops the cracking; the stage it reached stays,
//   and the next entity to stand on it carries on from there
// - when a block breaks, every brittle ice block touching it (all six sides)
//   cracks one stage too, and the ones that do not break wait 24 ticks
// Players crack it walking, running, sneaking or standing still; jumping only
// counts on the ticks the player is back on the ground.
//
// Where it still differs from Java, measured side by side:
// - Each crack before the last plays a borrowed vanilla sound (see config.ts);
//   Bedrock has no brittle ice sounds. The final break uses the glass sound
//   set, which is what Bedrock's own ice uses.
// - A mob that reaches the ice without stepping onto it (teleported there, or
//   standing on a carpet over it) is found by a sweep every 20 ticks, so its
//   first crack can come up to 20 ticks late. Spawned mobs are checked the
//   tick after they appear.
// - The 24-tick waits live in script memory, so /reload or reopening the world
//   forgets them and a block can crack sooner once. Java saves them.
// - Java lets only polar bears spawn on it. A custom block cannot limit which
//   mobs spawn on it.
import { BlockPermutation, GameMode, Player, system, world, } from "@minecraft/server";
import { AGE_STATE, BRITTLE_ICE_ID, CRACK_DELAY, CRACK_PARTICLE, CRACK_SOUND, exemptTypes, MAX_AGE, MOB_SWEEP_INTERVAL, MOB_SWEEP_RANGE, } from "./config.js";
// The six blocks touching a block
const SIDES = [
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: 1 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
];
// Blocks that someone stepped on and may still be standing on. Each tick the
// loop below checks only these, so the cost follows the number of blocks
// being stood on, not the number of brittle ice blocks in the world
const watched = new Map();
// The tick each block may crack again. Keyed by position like Java's
// scheduled tick, so it outlives the block: ice put back in the same spot
// inside the 24 ticks still has to wait
const readyAt = new Map();
function keyOf(dimension, location) {
    return `${dimension.id} ${location.x} ${location.y} ${location.z}`;
}
// Check whether the block is still waiting out its last crack
function isWaiting(key, now) {
    const tick = readyAt.get(key);
    if (tick === undefined) {
        return false;
    }
    if (tick > now) {
        return true;
    }
    // The wait is over, forget it
    readyAt.delete(key);
    return false;
}
// Start the 24-tick wait, unless one is already running. Java ignores a
// second scheduled tick for a block that already has one
function startWait(key, now) {
    if (!isWaiting(key, now)) {
        readyAt.set(key, now + CRACK_DELAY);
    }
}
// Check whether an entity cracks the ice. Java lets any living entity do it
// except the types in its tag; Bedrock gives living entities the "mob" family,
// and players are the one living entity without it
function isCracker(entity) {
    if (!entity.isValid || exemptTypes.has(entity.typeId)) {
        return false;
    }
    if (entity instanceof Player) {
        // Spectators pass through blocks without touching them
        return entity.getGameMode() !== GameMode.Spectator;
    }
    const family = entity.getComponent("minecraft:type_family");
    return family?.hasTypeFamily("mob") ?? false;
}
// Get the block an entity stands on. Java looks 0.2 blocks below the feet,
// so a carpet, a one-layer snow layer or a bottom trapdoor lying on the ice
// still lets the ice crack, while a slab does not. ignoreThinBlocks skips
// blocks 0.2 tall or less in the same way. When an entity stands across
// several blocks, Java and Bedrock both pick the one closest to its middle
function blockUnder(entity) {
    const under = entity.getBlockStandingOn({ ignoreThinBlocks: true });
    if (under !== undefined) {
        return under;
    }
    // On the tick an entity lands from a jump, Bedrock already reports it on
    // the ground but still falling, and getBlockStandingOn returns nothing.
    // Java counts that tick, so fall back to Java's own rule
    const { x, y, z } = entity.location;
    return entity.dimension.getBlock({ x: Math.floor(x), y: Math.floor(y - 0.2), z: Math.floor(z) });
}
// Check whether an entity is standing on this exact block right now
function standsOn(entity, block) {
    try {
        if (!entity.isOnGround) {
            return false;
        }
        const under = blockUnder(entity);
        return under !== undefined && under.x === block.x && under.y === block.y && under.z === block.z;
    }
    catch {
        // The entity was removed while we looked at it
        return false;
    }
}
// Check whether anything that cracks the ice is standing on the block
function hasCracker(block) {
    // Entities stand with their feet on the top of the block. Wide mobs can
    // have their middle up to about one and a half blocks to the side
    const top = { x: block.x + 0.5, y: block.y + 1, z: block.z + 0.5 };
    const nearby = block.dimension.getEntities({ location: top, maxDistance: 2 });
    return nearby.some((entity) => isCracker(entity) && standsOn(entity, block));
}
// Break the block the way Java does: the break particles and sound, no drop.
// "destroy" plays both, and the loot table drops nothing without Silk Touch
function shatter(block) {
    const { x, y, z } = block.location;
    block.dimension.runCommand(`setblock ${x} ${y} ${z} air destroy`);
}
// Crack the block one stage, or break it if it is already at the last stage.
// Returns true when the block broke
function crackOnce(block) {
    // getState is typed for vanilla state names only, so the custom age is
    // read through getAllStates
    const age = block.permutation.getAllStates()[AGE_STATE];
    if (age >= MAX_AGE) {
        shatter(block);
        return true;
    }
    // Move to the next stage
    block.setPermutation(BlockPermutation.resolve(BRITTLE_ICE_ID, { [AGE_STATE]: age + 1 }));
    // Play the crack sound from the middle of the block
    const middle = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
    block.dimension.playSound(CRACK_SOUND, middle);
    // Throw off chips, only on the first crack, like Java
    if (age === 0) {
        block.dimension.spawnParticle(CRACK_PARTICLE, block.location);
    }
    return false;
}
// Crack the block under a standing entity, then pass the damage on if it broke
function crackUnderfoot(block, key, now) {
    const broke = crackOnce(block);
    // Java schedules the wait even when the block broke, so ice put back in
    // the same spot waits too
    readyAt.set(key, now + CRACK_DELAY);
    if (!broke) {
        return;
    }
    // Crack every brittle ice block touching it. A neighbour at the last stage
    // breaks, but that break does not spread any further
    for (const side of SIDES) {
        let neighbour;
        try {
            neighbour = block.offset(side);
        }
        catch {
            // The neighbour is outside the loaded world
            continue;
        }
        if (neighbour?.typeId !== BRITTLE_ICE_ID) {
            continue;
        }
        if (!crackOnce(neighbour)) {
            startWait(keyOf(neighbour.dimension, neighbour.location), now);
        }
    }
}
// Start watching a block, and crack it right away if it is ready and the
// entity is still on it
function watch(block, entity) {
    const key = keyOf(block.dimension, block.location);
    watched.set(key, { dimension: block.dimension, location: block.location });
    const now = system.currentTick;
    if (!isWaiting(key, now) && standsOn(entity, block)) {
        crackUnderfoot(block, key, now);
    }
}
// Start watching the block under an entity, if it is brittle ice that this
// entity cracks and nobody is watching it yet
function watchUnder(entity) {
    try {
        if (!entity.isValid || !entity.isOnGround) {
            return;
        }
        const under = blockUnder(entity);
        if (under?.typeId !== BRITTLE_ICE_ID || !isCracker(entity)) {
            return;
        }
        if (!watched.has(keyOf(under.dimension, under.location))) {
            watch(under, entity);
        }
    }
    catch {
        // The entity was removed, or is changing dimension
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:brittle_ice_crack", {
        // Run this code when an entity steps onto the block. The event can
        // arrive a tick or two after the landing, so watch() checks the
        // entity is still on the block before cracking it
        onStepOn(event) {
            const { block, entity } = event;
            if (entity === undefined || !isCracker(entity)) {
                return;
            }
            watch(block, entity);
        },
    });
});
system.runInterval(() => {
    const now = system.currentTick;
    // Players are checked directly every tick as well, so a player who
    // reaches the ice without a step event (a teleport, for one) still counts
    for (const player of world.getAllPlayers()) {
        watchUnder(player);
    }
    // Crack each watched block that is ready and still has someone on it
    for (const [key, spot] of watched) {
        let block;
        try {
            block = spot.dimension.getBlock(spot.location);
        }
        catch {
            block = undefined;
        }
        // Stop watching blocks that are gone or unloaded
        if (block?.typeId !== BRITTLE_ICE_ID) {
            watched.delete(key);
            continue;
        }
        // Wait out the 24 ticks. The block stays watched, so an entity that
        // is still on it when the wait ends cracks it on that same tick
        if (isWaiting(key, now)) {
            continue;
        }
        if (hasCracker(block)) {
            crackUnderfoot(block, key, now);
        }
        else {
            // Nobody is on it any more. The next step on it starts again
            watched.delete(key);
        }
    }
});
// A mob spawned or loaded on top of the ice never steps onto it. Look one
// tick later, once it has settled
world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    system.run(() => watchUnder(entity));
});
// The slow sweep for everything else that arrives without a step event
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        try {
            const mobs = player.dimension.getEntities({
                location: player.location,
                maxDistance: MOB_SWEEP_RANGE,
                families: ["mob"],
            });
            for (const mob of mobs) {
                watchUnder(mob);
            }
        }
        catch {
            // The player is changing dimension or just left
        }
    }
}, MOB_SWEEP_INTERVAL);
