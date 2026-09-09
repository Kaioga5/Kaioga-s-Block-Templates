// Turns each falling powder entity back into a block. The entity
// (entities/falling_powder.json) reports its own landing and water contact
// through an environment sensor that queues a scriptevent, this script
// receives those reports and does the part the engine cannot: placing the
// block, curing it, and dropping an item when the landing cell is blocked.
import { ItemStack, system, world } from "@minecraft/server";
import { concreteConversions, ENTITY_ID, PROP_AGE, PROP_BLOCK, PROP_CURED, } from "./config.js";
// Give up on a fall after 30 seconds and drop the item instead. Vanilla has
// a similar failsafe so a glitched faller cannot exist forever
const MAX_FALL_TICKS = 600;
// Landing and water contact are event-driven, so the fallback sweep only
// has to catch lost events and stuck entities, every second is enough
const SWEEP_INTERVAL = 20;
// Last-resort ids for an entity that somehow lost its dynamic properties
const [DEFAULT_POWDER] = concreteConversions.keys();
// Finish one falling entity: place a block or drop an item, then remove it
function settle(faller, blockId, asItem) {
    const dimension = faller.dimension;
    const loc = faller.location;
    // The cell the entity is in. The small upward nudge keeps an entity
    // resting exactly on a block top from rounding down into the floor
    const cell = {
        x: Math.floor(loc.x),
        y: Math.floor(loc.y + 0.1),
        z: Math.floor(loc.z),
    };
    if (asItem) {
        // No room to place the block, drop it as an item like vanilla does
        dimension.spawnItem(new ItemStack(blockId), {
            x: cell.x + 0.5,
            y: cell.y + 0.5,
            z: cell.z + 0.5,
        });
    }
    else {
        // Place the block into the cell and play the landing sound
        dimension.setBlockType(cell, blockId);
        dimension.playSound("dig.sand", {
            x: cell.x + 0.5,
            y: cell.y + 0.5,
            z: cell.z + 0.5,
        });
    }
    faller.remove();
}
// Handle one report from a falling entity: "landed" or "wet"
function onReport(faller, message) {
    // Read back what this entity should become
    const blockId = faller.getDynamicProperty(PROP_BLOCK) ?? DEFAULT_POWDER;
    const curedId = faller.getDynamicProperty(PROP_CURED) ??
        concreteConversions.get(blockId) ??
        blockId;
    if (message === "wet") {
        // Water contact cures the powder mid-fall: it becomes solid
        // concrete in the first water cell it touches, which is why powder
        // dropped onto water forms concrete floating at the surface
        settle(faller, curedId, false);
        return;
    }
    // Get the cell the entity landed in
    const loc = faller.location;
    const cell = faller.dimension.getBlock({
        x: Math.floor(loc.x),
        y: Math.floor(loc.y + 0.1),
        z: Math.floor(loc.z),
    });
    // Cell not loaded, leave the entity alone and let the sweep retry
    if (cell === undefined) {
        return;
    }
    // Landed. Place the block if the cell is free; otherwise drop the item,
    // like vanilla does when a falling block ends up inside a slab or
    // another partial block
    settle(faller, blockId, !(cell.isAir || cell.isLiquid));
}
// The entity's environment sensor queues
// `scriptevent kai_templates:powder_fall` with "landed" or "wet", receive
// those reports here
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "kai_templates:powder_fall") {
        return;
    }
    // Both sensors can fire on the same tick; the first settle removes the
    // entity, so ignore reports from an entity that is already gone
    const faller = event.sourceEntity;
    if (faller === undefined || !faller.isValid || faller.typeId !== ENTITY_ID) {
        return;
    }
    try {
        onReport(faller, event.message);
    }
    catch {
        // Chunk unloaded mid-report, the sweep below retries
    }
});
// Check one entity from the fallback sweep
function sweepFaller(faller) {
    // Count how long this entity has existed
    const age = (faller.getDynamicProperty(PROP_AGE) ?? 0) + SWEEP_INTERVAL;
    faller.setDynamicProperty(PROP_AGE, age);
    // A fall that somehow never ends becomes an item
    if (age > MAX_FALL_TICKS) {
        const blockId = faller.getDynamicProperty(PROP_BLOCK) ?? DEFAULT_POWDER;
        settle(faller, blockId, true);
        return;
    }
    // Catch a landing whose scriptevent was lost, for example when the
    // chunk unloaded on the tick the sensor fired
    if (faller.isOnGround) {
        onReport(faller, "landed");
        return;
    }
    // Catch missed water contact the same way
    const loc = faller.location;
    const cell = faller.dimension.getBlock({
        x: Math.floor(loc.x),
        y: Math.floor(loc.y + 0.1),
        z: Math.floor(loc.z),
    });
    if (cell !== undefined && cell.isLiquid && cell.typeId.includes("water")) {
        onReport(faller, "wet");
    }
}
// Sweep all three dimensions. getEntities re-finds fallers after a chunk
// reload on its own, so no bookkeeping map is needed. Each entity is
// wrapped in try/catch because its chunk can unload between the query and
// the work, the next sweep picks it up again
system.runInterval(() => {
    for (const dimId of ["overworld", "nether", "the_end"]) {
        const dimension = world.getDimension(dimId);
        for (const faller of dimension.getEntities({ type: ENTITY_ID })) {
            try {
                sweepFaller(faller);
            }
            catch {
                // Chunk unloaded mid-check, retry on the next sweep
            }
        }
    }
}, SWEEP_INTERVAL);
