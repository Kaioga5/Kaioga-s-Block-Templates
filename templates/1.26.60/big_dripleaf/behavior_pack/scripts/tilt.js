// The leaf giving way underfoot.
// This is the one mechanic in this set that genuinely needs timed transitions:
// the leaf has to wobble, dip, drop whatever is on it, and come back up, each
// after a fixed delay. The chain is driven by `system.runTimeout` and starts
// only when something steps on a level leaf, so a dripleaf nobody is standing
// on schedules nothing at all.
import { BlockPermutation, system } from "@minecraft/server";
import { DRIPLEAF_ID, HEAD_STATE, TILT_STATE, tiltSequence } from "./config.js";
function readTilt(block) {
    const value = block.permutation.getAllStates()[TILT_STATE];
    return typeof value === "string" ? value : "none";
}
function isHead(block) {
    return block.permutation.getAllStates()[HEAD_STATE] === true;
}
function setTilt(block, tilt) {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(DRIPLEAF_ID, { ...states, [TILT_STATE]: tilt }));
}
// One sound per step, so the leaf is audible as well as visible
const TILT_SOUNDS = new Map([
    ["partial", "tilt_down.big_dripleaf"],
    ["full", "tilt_down.big_dripleaf"],
    ["none", "tilt_up.big_dripleaf"],
]);
// Walk the sequence one step at a time. Each step checks that the leaf is still
// where the previous step left it, so two chains started at once, or a
// redstone signal cutting in, cannot fight each other
function step(block, expected) {
    if (!block.isValid || block.typeId !== DRIPLEAF_ID) {
        return;
    }
    if (readTilt(block) !== expected) {
        return;
    }
    const next = tiltSequence.get(expected);
    if (next === undefined) {
        return;
    }
    setTilt(block, next.to);
    const sound = TILT_SOUNDS.get(next.to);
    if (sound !== undefined) {
        block.dimension.playSound(sound, block.center());
    }
    if (next.delay > 0) {
        system.runTimeout(() => step(block, next.to), next.delay);
    }
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:dripleaf_tilt", {
        onStepOn(event) {
            const block = event.block;
            if (!isHead(block) || readTilt(block) !== "none") {
                return;
            }
            step(block, "none");
        },
        // A powered dripleaf is held open. Vanilla uses this to make a dripleaf
        // a one-way door that redstone can hold shut
        onRedstoneUpdate(event) {
            const block = event.block;
            if (!isHead(block)) {
                return;
            }
            if (event.powerLevel > 0) {
                if (readTilt(block) !== "full") {
                    setTilt(block, "full");
                    block.dimension.playSound("tilt_down.big_dripleaf", block.center());
                }
                return;
            }
            // Power gone: come back up straight away rather than waiting out
            // the timer the step chain would have used
            if (readTilt(block) === "full") {
                setTilt(block, "none");
                block.dimension.playSound("tilt_up.big_dripleaf", block.center());
            }
        },
    });
});
