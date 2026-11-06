// Growing on random ticks and picking the berries.
// Both hang off the block's custom component. A random tick moves the bush
// on one stage, and using a bush that has berries on it drops them and takes
// it back to the bare stage, leaving the bush in place.
import { BlockPermutation, ItemStack, system, } from "@minecraft/server";
import { BERRIES_ID, BUSH_ID, GROWTH_CHANCE, GROWTH_STATE, MAX_GROWTH, PICK_COUNTS, PICKED_GROWTH, } from "./config.js";
// Read the growth stage, 0 for a fresh sprout
export function growthOf(block) {
    const value = block.permutation.getAllStates()[GROWTH_STATE];
    return typeof value === "number" ? value : 0;
}
// Put the bush on a given stage
export function setGrowth(block, growth) {
    block.setPermutation(BlockPermutation.resolve(BUSH_ID, { [GROWTH_STATE]: growth }));
}
// Inclusive random integer
function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
// Drop the berries for the bush's stage and take it back to the bare stage.
// Returns false when the bush has nothing to pick. Exported because bone meal
// on a full bush picks it too
export function pick(block) {
    const range = PICK_COUNTS[growthOf(block)];
    if (range === undefined) {
        return false;
    }
    const count = randomInt(range[0], range[1]);
    block.dimension.spawnItem(new ItemStack(BERRIES_ID, count), block.center());
    block.dimension.playSound("block.sweet_berry_bush.pick", block.center());
    setGrowth(block, PICKED_GROWTH);
    return true;
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sweet_berry_bush", {
        onRandomTick(event) {
            const growth = growthOf(event.block);
            if (growth < MAX_GROWTH && Math.random() < GROWTH_CHANCE) {
                setGrowth(event.block, growth + 1);
            }
        },
        onPlayerInteract(event) {
            pick(event.block);
        },
    });
});
