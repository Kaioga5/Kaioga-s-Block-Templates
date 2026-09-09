// Turns the lamp on and off from the redstone signal reaching it.
// The block declares "minecraft:redstone_consumer", which makes the engine
// send onRedstoneUpdate whenever the incoming power changes. Nothing here
// polls the world, the handler only runs when a signal actually moves.
import { BlockPermutation, system, } from "@minecraft/server";
// The lamp block and the state that drives its look and its light
const LAMP_ID = "kai_templates:redstone_lamp";
const LIT_STATE = "kai_templates:lit";
// Vanilla lights the lamp on the same tick the signal arrives, but waits
// four ticks before letting it go dark. That delay is what makes a lamp on a
// clock stay lit instead of flickering
const OFF_DELAY_TICKS = 4;
// Pending "go dark" timers, keyed by block position. A lamp that is powered
// again before its timer fires cancels it and stays lit
const goingDark = new Map();
// One string key per block cell, usable as a map key
function keyOf(block) {
    return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}
// Read the lit state. getState is typed for vanilla state names only, so
// custom states are read through getAllStates instead
function isLit(block) {
    return block.permutation.getAllStates()[LIT_STATE] === true;
}
// Flip the lamp, keeping every other state it has. withState is typed for
// vanilla state names, so the permutation is rebuilt from the full state map
function setLit(block, lit) {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(block.typeId, { ...states, [LIT_STATE]: lit }));
}
// Cancel a pending "go dark" timer for this cell, if there is one
function cancelDarkening(key) {
    const handle = goingDark.get(key);
    if (handle !== undefined) {
        system.clearRun(handle);
        goingDark.delete(key);
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:redstone_lamp_power", {
        // Runs when the redstone signal into this block changes
        onRedstoneUpdate(event) {
            const { block, powerLevel } = event;
            const key = keyOf(block);
            // Any signal at all lights the lamp, and it lights immediately
            if (powerLevel > 0) {
                cancelDarkening(key);
                if (!isLit(block)) {
                    setLit(block, true);
                }
                return;
            }
            // Power is gone. If the lamp is already dark, or already on its
            // way there, there is nothing to schedule
            if (!isLit(block) || goingDark.has(key)) {
                return;
            }
            // Wait out the vanilla delay, then re-check. The block may have
            // been broken or re-powered while the timer ran, so the position
            // is looked up again rather than trusted
            const handle = system.runTimeout(() => {
                goingDark.delete(key);
                const current = block.dimension.getBlock({
                    x: block.x,
                    y: block.y,
                    z: block.z,
                });
                if (current?.typeId === LAMP_ID &&
                    current.permutation.getAllStates()[LIT_STATE] === true) {
                    current.setPermutation(BlockPermutation.resolve(LAMP_ID, { [LIT_STATE]: false }));
                }
            }, OFF_DELAY_TICKS);
            goingDark.set(key, handle);
        },
    });
});
