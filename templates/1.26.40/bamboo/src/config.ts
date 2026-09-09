// Growth settings for the bamboo template: how tall a stalk gets, how fast it
// climbs, and when it turns thick.

export const BAMBOO_ID = "kai_templates:bamboo";

// Vanilla's three states: how thick this section is, how leafy it is, and
// whether it has finished growing
export const THICK_STATE = "kai_templates:thick";
export const LEAVES_STATE = "kai_templates:leaves";
export const MATURE_STATE = "kai_templates:mature";

// This template's own state. Vanilla keeps the shoot as a separate block; here
// it is the same block wearing the shoot look, so one item, one identifier and
// one loot table cover the whole plant. The block file lists true first, which
// makes the shoot the default permutation: a freshly placed bamboo is the
// shoot on its first frame without any script touching it
export const SHOOT_STATE = "kai_templates:shoot";

export const LEAVES_NONE = "none";
export const LEAVES_SMALL = "small";
export const LEAVES_LARGE = "large";

// A stalk stops at this many blocks, counting the one that started as the
// shoot. Vanilla stops at 16
export const MAX_HEIGHT = 16;

// Once a stalk is this many blocks tall, every section of it turns thick.
// Bedrock fattens the whole stalk at once rather than only the new sections
export const THICK_FROM = 4;

// Chance a random tick grows anything, for the shoot and the stalk alike.
// Vanilla rolls one in three, which is why bamboo is the fastest plant in the
// game without needing a tick of its own
export const GROWTH_CHANCE = 1 / 3;

// Light needed in the space a new section would occupy
export const MIN_LIGHT = 9;

// A top at least MATURE_FROM blocks tall rolls MATURE_CHANCE for the section it
// grows to be the last one, and a top MATURE_ALWAYS blocks tall always grows a
// last one. Both are vanilla's numbers, so stalks end up 12 to 16 tall and a
// grove comes out ragged instead of level
export const MATURE_FROM = 11;
export const MATURE_CHANCE = 0.25;
export const MATURE_ALWAYS = 15;

// Bone meal adds this many sections at once
export const BONE_MEAL_MIN = 1;
export const BONE_MEAL_MAX = 2;
export const BONE_MEAL_ID = "minecraft:bone_meal";
