// How thickly leaf litter can lie, and what a swept-up patch is worth.

export const LITTER_ID = "kai_templates:leaf_litter";
export const SEGMENTS_STATE = "kai_templates:segments";

// A block holds four quarters of litter. Placing more on a patch that is
// already full puts the next one down beside it, the same as vanilla
export const MAX_SEGMENTS = 4;

// Litter needs a floor under it that could actually hold it. As everywhere
// else in this set, the rule is the list of things that cannot
export const unsupportiveIds = new Set<string>(["minecraft:barrier", "minecraft:light_block"]);
export const unsupportiveTags = ["plant", "flower"];

// What one quarter gives back when the patch is broken
export const DROP_PER_SEGMENT = LITTER_ID;
