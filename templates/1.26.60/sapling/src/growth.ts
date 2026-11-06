// The sapling's own growth, on random ticks.
// Vanilla nudges a sapling twice before it becomes a tree: the first nudge sets
// the stage bit, the second spends it. Both nudges need light and both are one
// in seven, which is why a planted sapling takes its time.
import { Block, BlockComponentRandomTickEvent, BlockPermutation, system } from "@minecraft/server";
import { FINAL_STAGE, GROWTH_CHANCE, MIN_LIGHT, SAPLING_ID, STAGE_STATE } from "./config.js";
import { growTree } from "./tree.js";

function readStage(block: Block): number {
    const value = block.permutation.getAllStates()[STAGE_STATE];
    return typeof value === "number" ? value : 0;
}

// Advance one step: either set the stage bit, or spend it on a tree. Exported
// because bone meal takes exactly the same step
export function advance(block: Block): void {
    const stage = readStage(block);
    if (stage < FINAL_STAGE) {
        const states = block.permutation.getAllStates();
        block.setPermutation(BlockPermutation.resolve(SAPLING_ID, { ...states, [STAGE_STATE]: stage + 1 }));
        return;
    }
    growTree(block);
}

// Light is read one block up, where the sapling's leaves actually are
export function hasLight(block: Block): boolean {
    const above = block.above();
    return above === undefined || above.getLightLevel() >= MIN_LIGHT;
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sapling_growth", {
        onRandomTick(event: BlockComponentRandomTickEvent): void {
            if (!hasLight(event.block)) {
                return;
            }
            if (Math.random() >= GROWTH_CHANCE) {
                return;
            }
            advance(event.block);
        },
    });
});
