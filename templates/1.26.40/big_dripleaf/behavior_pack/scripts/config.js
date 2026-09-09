// The dripleaf's timings and its growth limits.
export const DRIPLEAF_ID = "kai_templates:big_dripleaf";
export const HEAD_STATE = "kai_templates:head";
export const TILT_STATE = "kai_templates:tilt";
// The facing the placement_direction trait writes. A dripleaf placed on top
// of another one copies this from the block below, so a stacked plant points
// one way from the ground to the leaf
export const FACING_STATE = "minecraft:cardinal_direction";
// Ticks between one block of the plant coming down and the next when any
// part of it is broken. One tick reads as a ripple; zero drops it all at once
export const CASCADE_TICKS = 1;
export const tiltSequence = new Map([
    ["none", { to: "unstable", delay: 10 }],
    ["unstable", { to: "partial", delay: 10 }],
    ["partial", { to: "full", delay: 100 }],
    ["full", { to: "none", delay: 0 }],
]);
// How tall a dripleaf can grow on bone meal
export const MAX_HEIGHT = 5;
// Chance that one bone meal grows the stem. Vanilla always grows it when there
// is room, which is what 1 means here
export const BONE_MEAL_CHANCE = 1;
export const BONE_MEAL_ID = "minecraft:bone_meal";
