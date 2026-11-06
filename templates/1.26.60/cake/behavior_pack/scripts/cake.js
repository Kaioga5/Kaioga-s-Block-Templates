// Shared helpers for the cake blocks.
//
// The bite counter is kept the way vanilla keeps its own: 0 is a whole cake and
// 6 is the last sliver still standing. There is no seventh value, because the
// bite that would produce it takes the block away instead.
//
// A cake carrying a candle is a second block rather than a state of the first,
// which is also how vanilla does it: minecraft:candle_cake and its sixteen
// coloured twins are separate identifiers with a lit flag and no bite counter,
// because a candle only ever goes on a whole cake.
import { BlockPermutation } from "@minecraft/server";
// The two blocks and their states
export const CAKE_ID = "kai_templates:cake";
export const CANDLE_CAKE_ID = "kai_templates:candle_cake";
export const BITE_STATE = "kai_templates:bite_counter";
export const LIT_STATE = "kai_templates:lit";
// The highest bite counter a cake can stand at
export const MAX_BITES = 6;
// How many slices have already been eaten here, 0 to 6
export function biteCount(block) {
    const value = block.permutation.getAllStates()[BITE_STATE];
    return typeof value === "number" ? value : 0;
}
// Rewrite the block with a new bite counter
export function setBites(block, bites) {
    block.setPermutation(BlockPermutation.resolve(CAKE_ID, { [BITE_STATE]: bites }));
}
// Whether the candle on this cake is burning
export function isLit(block) {
    return block.permutation.getAllStates()[LIT_STATE] === true;
}
// Light or snuff the candle without disturbing anything else. The block keeps
// its own identifier: there are seventeen candle cakes, one per candle colour,
// and resolving a fixed one here would repaint a red candle white
export function setLit(block, lit) {
    block.setPermutation(BlockPermutation.resolve(block.typeId, { [LIT_STATE]: lit }));
}
