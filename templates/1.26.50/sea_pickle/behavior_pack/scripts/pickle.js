// Shared state helpers for the sea pickle.
//
// Two Bedrock quirks live in this file so nothing else has to remember them:
// the count state is zero-based (0 means one pickle), and the water flag is
// inverted (dead = true means there is NO water here). Getting either the
// wrong way round is the classic sea pickle bug.
import { BlockPermutation } from "@minecraft/server";
// The block and its two states
export const PICKLE_ID = "kai_templates:sea_pickle";
export const COUNT_STATE = "kai_templates:cluster_count";
export const DEAD_STATE = "kai_templates:dead";
// The most pickles one block holds
export const MAX_PICKLES = 4;
// How many pickles are standing here, 1 to 4
export function pickleCount(block) {
    const value = block.permutation.getAllStates()[COUNT_STATE];
    return (typeof value === "number" ? value : 0) + 1;
}
// True when the cluster is out of water, which is when it stops glowing
export function isDead(block) {
    return block.permutation.getAllStates()[DEAD_STATE] === true;
}
// Rewrite the block with a new count and water flag
export function setPickle(block, count, dead) {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(PICKLE_ID, {
        ...states,
        [COUNT_STATE]: count - 1,
        [DEAD_STATE]: dead,
    }));
}
