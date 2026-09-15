// A drift falling when the block under it goes.
// Vanilla's top snow is a falling block in Bedrock: take away its floor and it
// drops as one piece and lands as the same drift, or breaks into a snowball
// where it cannot land. Custom blocks have no native gravity at 1.26.40, so
// the drift is handed to an entity of our own that carries its depth as a
// property, and this file does the two things the engine cannot: notice the
// floor going, and put the drift back down when the entity lands.
// The ordinary ways a floor goes are a player breaking it or an explosion, so
// both of those events look at the cell above the one that emptied. Anything
// quieter, a command or a piston, is caught by the block's own random tick.
// Landing reports itself through the environment sensor in
// entities/falling_snow.json, so nothing here polls a falling entity; the
// sweep at the bottom only exists to catch a report that never arrived.
import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";
import { DROP_PER_LAYER, FALL_AGE_PROPERTY, FALL_HEIGHT_PROPERTY, FALLING_ID, HEIGHT_STATE, LAND_SOUND, MAX_HEIGHT, SNOW_ID, } from "./config.js";
// Give up on a fall after thirty seconds and leave a snowball where the entity
// got to. Vanilla has the same kind of failsafe, so a faller that somehow never
// lands cannot exist forever
const MAX_FALL_TICKS = 600;
// Landing is event driven, so the sweep only has to catch a lost report and an
// entity that is stuck. Once a second is enough
const SWEEP_INTERVAL = 20;
const UP = { x: 0, y: 1, z: 0 };
function isSnow(block) {
    return block !== undefined && block.typeId === SNOW_ID;
}
// The height state of a drift, 0 to 7
function heightOf(block) {
    const height = block.permutation.getAllStates()[HEIGHT_STATE];
    return typeof height === "number" ? height : 0;
}
// The height the entity is carrying
function carriedBy(faller) {
    const height = faller.getProperty(FALL_HEIGHT_PROPERTY);
    return typeof height === "number" ? height : 0;
}
function drift(height) {
    return BlockPermutation.resolve(SNOW_ID, { [HEIGHT_STATE]: height });
}
// Is there anything under this drift to stand on? Air and liquid are not: a
// vanilla drift over a hole or on water falls, and this one does the same
function isSupported(block) {
    const below = block.below();
    // Unloaded terrain is not proof of anything, so the drift stays
    if (below === undefined) {
        return true;
    }
    return !below.isAir && !below.isLiquid;
}
// Hand a drift to a falling entity. The cell is cleared before the entity is
// spawned, so there is never a moment where both exist
function drop(block) {
    const { dimension } = block;
    const { x, y, z } = block.location;
    const height = heightOf(block);
    block.setType("minecraft:air");
    // Spawn in the drift's own cell, centred in it, so it falls straight down
    const faller = dimension.spawnEntity(FALLING_ID, { x: x + 0.5, y, z: z + 0.5 });
    faller.setProperty(FALL_HEIGHT_PROPERTY, height);
    faller.setDynamicProperty(FALL_AGE_PROPERTY, 0);
}
// Let a drift fall if nothing holds it up any more. Returns whether it went
export function dropIfUnsupported(block) {
    if (!isSnow(block) || isSupported(block)) {
        return false;
    }
    drop(block);
    return true;
}
// The cell a landed entity is standing in. The small upward nudge keeps an
// entity resting exactly on a block top from rounding down into the floor
function cellOf(faller) {
    const { x, y, z } = faller.location;
    return faller.dimension.getBlock({ x: Math.floor(x), y: Math.floor(y + 0.1), z: Math.floor(z) });
}
// The end of a fall. A drift lands as the drift it was, piles onto a drift
// that is already there, and where it cannot land at all it breaks into a
// single snowball, which is what vanilla's does
function land(faller, cell) {
    const { dimension } = faller;
    const carried = carriedBy(faller);
    const centre = cell.center();
    if (cell.isAir) {
        cell.setPermutation(drift(carried));
        dimension.playSound(LAND_SOUND, centre);
    }
    else if (isSnow(cell)) {
        // Two drifts become one. Layers past a full block go on top when
        // there is room for them, and are lost as a snowball when there is not
        const layers = heightOf(cell) + 1 + carried + 1;
        const here = Math.min(layers, MAX_HEIGHT + 1);
        cell.setPermutation(drift(here - 1));
        const left = layers - here;
        if (left > 0) {
            const above = cell.above();
            if (above !== undefined && above.isAir) {
                above.setPermutation(drift(left - 1));
            }
            else {
                dimension.spawnItem(new ItemStack(DROP_PER_LAYER), centre);
            }
        }
        dimension.playSound(LAND_SOUND, centre);
    }
    else {
        // Inside a slab, a plant, water: no room for a drift
        dimension.spawnItem(new ItemStack(DROP_PER_LAYER), centre);
    }
    faller.remove();
}
// A landing report, from the sensor or the sweep
function landed(faller) {
    const cell = cellOf(faller);
    // Cell not loaded, leave the entity alone and let the sweep retry
    if (cell === undefined) {
        return;
    }
    land(faller, cell);
}
// The entity's environment sensor queues
// `scriptevent kai_templates:snow_fall landed` the moment it touches down,
// which is the only thing this file waits for
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "kai_templates:snow_fall") {
        return;
    }
    // A sensor can fire again on the tick the entity is already being taken
    // away, so a report from an entity that has gone is not an error
    const faller = event.sourceEntity;
    if (faller === undefined || !faller.isValid || faller.typeId !== FALLING_ID) {
        return;
    }
    try {
        landed(faller);
    }
    catch {
        // The chunk went away mid-report, the sweep below tries again
    }
});
// Check one entity from the sweep
function sweepFaller(faller) {
    const age = (faller.getDynamicProperty(FALL_AGE_PROPERTY) ?? 0) + SWEEP_INTERVAL;
    faller.setDynamicProperty(FALL_AGE_PROPERTY, age);
    // A fall that somehow never ends is put down as a snowball
    if (age > MAX_FALL_TICKS) {
        faller.dimension.spawnItem(new ItemStack(DROP_PER_LAYER), faller.location);
        faller.remove();
        return;
    }
    // Landed, but the report never arrived, for example because the chunk
    // unloaded on the tick the sensor fired
    if (faller.isOnGround) {
        landed(faller);
    }
}
// One sweep for the whole world rather than one timer per entity. getEntities
// finds fallers again by itself after a chunk reload, so nothing has to be
// remembered between passes
system.runInterval(() => {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        const dimension = world.getDimension(dimensionId);
        for (const faller of dimension.getEntities({ type: FALLING_ID })) {
            try {
                sweepFaller(faller);
            }
            catch {
                // Chunk unloaded mid-check, the next sweep picks it up
            }
        }
    }
}, SWEEP_INTERVAL);
// A cell has just emptied. If a drift was standing on it, it falls. Waiting a
// tick lets the engine finish the change before the drift is measured against
// it
function floorWent(changed) {
    system.run(() => {
        try {
            const above = changed.offset(UP);
            if (isSnow(above)) {
                dropIfUnsupported(above);
            }
        }
        catch {
            // The cell is at the top of the world, or its chunk went away
            // between the break and this pass. Either way there is nothing
            // standing on it
        }
    });
}
world.afterEvents.playerBreakBlock.subscribe((event) => {
    floorWent(event.block);
});
// A creeper or a charge of TNT takes a floor out the same way, and reports
// every cell it cleared
world.afterEvents.blockExplode.subscribe((event) => {
    floorWent(event.block);
});
