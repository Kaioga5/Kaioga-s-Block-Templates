// Planting cane, growing it, and pulling it out when the water goes.
import { BlockPermutation, system, } from "@minecraft/server";
import { AGE_STATE, CANE_ID, MAX_AGE, MAX_HEIGHT } from "./config.js";
import { ageOf, hasWaterBeside, heightOf, isCane, isRoot, isTop, rootOf, setAge, uproot, } from "./cane.js";
// Put one more block on top of a stand. Returns false when the stand is already
// as tall as it goes or there is something in the way, which is how bone meal
// knows to stop
export function extend(top) {
    const root = rootOf(top);
    if (heightOf(root) >= MAX_HEIGHT) {
        return false;
    }
    const above = top.above();
    if (above === undefined || !above.isAir) {
        return false;
    }
    setAge(top, 0);
    above.setPermutation(BlockPermutation.resolve(CANE_ID, { [AGE_STATE]: 0 }));
    return true;
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:cane_growth", {
        // The placement filter has already checked the ground. The water is
        // the half it cannot see, because a placement filter only ever
        // describes the block being placed against
        beforeOnPlayerPlace(event) {
            const below = event.block.below();
            if (isCane(below)) {
                // Stacking onto a stand that is already drinking
                return;
            }
            if (!hasWaterBeside(below)) {
                event.cancel = true;
            }
        },
        onRandomTick(event) {
            const block = event.block;
            // Only the bottom block is near the water, so only it asks. Pull
            // that one and the engine pops everything above it on the same
            // update, because the placement filter lists the cane as its own
            // valid ground
            if (isRoot(block)) {
                if (!hasWaterBeside(block.below())) {
                    uproot(block);
                    return;
                }
            }
            // Growth belongs to the growing end, and a stand that is already as
            // tall as it gets stops counting, the way vanilla's top block does
            if (!isTop(block)) {
                return;
            }
            if (heightOf(rootOf(block)) >= MAX_HEIGHT) {
                return;
            }
            const age = ageOf(block);
            if (age < MAX_AGE) {
                setAge(block, age + 1);
                return;
            }
            extend(block);
        },
    });
});
