// The fall a hanging column takes once nothing holds it up.
// Every spike of the column falls as its own entity, the way vanilla's do. They
// are all let go on the same tick, so gravity carries them down as one column
// with nothing ever stopped or moved by hand, and each one breaks where it
// lands. The lowest reaches the ground first and the rest arrive close behind
// it, so the column comes apart from the bottom up at the speed it was
// falling, which is what a stalactite coming off a cave roof looks like.
// A landing reports itself through the environment sensor in
// entities/falling_dripstone.json, so nothing here polls a falling entity;
// the sweep at the bottom only exists to catch a report that never arrived.
import { ItemStack, system, world } from "@minecraft/server";
import { BREAK_SOUND, DRIPSTONE_ID, FALLING_ID, LANDING_TICKS, THICKNESS_PROPERTY } from "./config.js";
// Give up on a fall after thirty seconds and leave the spike where the entity
// got to. Vanilla has the same kind of failsafe, so a faller that somehow never
// lands cannot exist forever
const MAX_FALL_TICKS = 600;
// Landing is event driven, so the sweep only has to catch a lost report and an
// entity that is stuck. Once a second is enough
const SWEEP_INTERVAL = 20;
// How long this entity has been falling, in ticks. A dynamic property rather
// than a script-side map, so a fall survives a chunk unload and a reload
const AGE_PROPERTY = "kai_templates:fall_age";
// Send one column on its way. The caller clears the cells first, which is what
// stops a column from ever existing twice. `thicknesses` runs from the tip
// upward, one entry per spike, so each entity wears the shape its block had
export function dropColumn(dimension, tip, thicknesses) {
    thicknesses.forEach((thickness, above) => {
        // Spawn in the spike's own cell, centred in it, so the column falls
        // straight down the shaft it came out of
        const faller = dimension.spawnEntity(FALLING_ID, {
            x: tip.x + 0.5,
            y: tip.y + above,
            z: tip.z + 0.5,
        });
        // A tip that was merged onto a stalagmite is a tip again once it is
        // falling; every other shape travels as it was
        faller.setProperty(THICKNESS_PROPERTY, thickness === "merge" ? "tip" : thickness);
        faller.setDynamicProperty(AGE_PROPERTY, 0);
    });
}
// The end of a fall. A landed spike comes apart into its item, which is what a
// spike does whenever it stops being part of a column
function land(faller) {
    const { dimension } = faller;
    const at = faller.location;
    dimension.spawnItem(new ItemStack(DRIPSTONE_ID), at);
    dimension.playSound(BREAK_SOUND, at);
    faller.remove();
}
// A landed spike breaks after the short rest vanilla's take, unless something
// else has already taken it by then
function landed(faller) {
    system.runTimeout(() => {
        if (!faller.isValid) {
            return;
        }
        try {
            land(faller);
        }
        catch {
            // The chunk went away mid-rest, the sweep below tries again
        }
    }, LANDING_TICKS);
}
// The entity's environment sensor queues
// `scriptevent kai_templates:dripstone_fall landed` the moment it touches
// down, which is the only thing this file waits for
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "kai_templates:dripstone_fall") {
        return;
    }
    // A sensor can fire again on the tick the entity is already being taken
    // away, so a report from an entity that has gone is not an error
    const faller = event.sourceEntity;
    if (faller === undefined || !faller.isValid || faller.typeId !== FALLING_ID) {
        return;
    }
    landed(faller);
});
// Check one entity from the sweep
function sweepFaller(faller) {
    const age = (faller.getDynamicProperty(AGE_PROPERTY) ?? 0) + SWEEP_INTERVAL;
    faller.setDynamicProperty(AGE_PROPERTY, age);
    // Landed, but the report never arrived, for example because the chunk
    // unloaded on the tick the sensor fired. A fall that somehow never ends
    // is put down here as well
    if (faller.isOnGround || age > MAX_FALL_TICKS) {
        land(faller);
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
