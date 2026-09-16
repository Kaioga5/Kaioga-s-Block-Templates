// How kelp grows, how tall it gets, and what it needs around it.

export const KELP_ID = "kai_templates:kelp";
export const AGE_STATE = "kai_templates:age";
export const TIP_STATE = "kai_templates:tip";

// Vanilla counts a strand to 25 before it stops. A custom block state holds at
// most sixteen values, so this stops at 15 and a strand tops out shorter
export const MAX_AGE = 15;

// Chance a random tick on the growing end adds another block. Vanilla rolls
// about one in seven, which is why a kelp forest fills in over minutes
export const GROWTH_CHANCE = 0.14;

// Bone meal adds this many blocks at once
export const BONE_MEAL_MIN = 1;
export const BONE_MEAL_MAX = 2;
export const BONE_MEAL_ID = "minecraft:bone_meal";

// Kelp roots on the sea floor, on more kelp, or on anything else with a real
// face. As everywhere else in this set, the rule is written as the list of
// things that cannot hold it, because no stable script API reports a solid face
export const unrootableIds = new Set<string>(["minecraft:barrier", "minecraft:light_block"]);
export const unrootableTags = ["plant", "flower"];
