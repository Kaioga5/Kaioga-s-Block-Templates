// Reading and writing the one number the whole template turns on.
import { BlockPermutation } from "@minecraft/server";
import { MAX_PETALS, PETALS_ID, PETALS_STATE } from "./config.js";
// How many flowers are standing in this block
export function petalCount(block) {
    const value = block.permutation.getAllStates()[PETALS_STATE];
    return typeof value === "number" ? value : 1;
}
// Write a new count and keep the facing the patch already has, so adding a
// flower never spins the ones already there
export function setPetalCount(block, count) {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(PETALS_ID, { ...states, [PETALS_STATE]: count }));
}
// Room for at least one more flower
export function hasRoom(block) {
    return (block !== undefined &&
        block.typeId === PETALS_ID &&
        petalCount(block) < MAX_PETALS);
}
