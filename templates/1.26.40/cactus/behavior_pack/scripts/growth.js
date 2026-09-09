// Cactus growth on random ticks.
// Vanilla counts the cacti already stacked under this one and only grows when
// the stack is short enough and the space above is clear. The age state is the
// counter: every random tick nudges it up, and the tick that would overflow it
// spends the age on a new segment instead.
import { BlockPermutation, system } from "@minecraft/server";
import { AGE_STATE, CACTUS_ID, MAX_AGE, MAX_HEIGHT } from "./config.js";
// getState is typed for vanilla state names only, so custom states are read
// through getAllStates and written through BlockPermutation.resolve
function readAge(block) {
    const age = block.permutation.getAllStates()[AGE_STATE];
    return typeof age === "number" ? age : 0;
}
function setAge(block, age) {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(block.typeId, { ...states, [AGE_STATE]: age }));
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:cactus_growth", {
        onRandomTick(event) {
            const block = event.block;
            // Nothing grows into an occupied space
            const above = block.above();
            if (above === undefined || !above.isAir) {
                return;
            }
            // Count this segment plus the ones under it. Stopping at MAX_HEIGHT
            // keeps the loop short whatever is buried below
            let height = 1;
            for (let step = 1; step < MAX_HEIGHT; step++) {
                const below = block.below(step);
                if (below === undefined || below.typeId !== CACTUS_ID) {
                    break;
                }
                height++;
            }
            if (height >= MAX_HEIGHT) {
                return;
            }
            const age = readAge(block);
            if (age < MAX_AGE) {
                setAge(block, age + 1);
                return;
            }
            // Full age: spend it on a new segment and start this one over, so a
            // stack that is later cut down regrows at the same pace
            above.setPermutation(BlockPermutation.resolve(CACTUS_ID, { [AGE_STATE]: 0 }));
            setAge(block, 0);
        },
    });
});
