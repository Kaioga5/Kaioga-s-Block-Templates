// How fast weeping vines grow, how far, and how they feel to climb.

export const VINE_ID = "kai_templates:weeping_vines";
export const AGE_STATE = "kai_templates:age";
export const TIP_STATE = "kai_templates:tip";

// Vanilla lets a weeping vine reach age 25 before it stops. A custom block
// state may hold at most 16 values, so this caps at 15 and the vine grows a
// slightly shorter curtain than a nether one
export const MAX_AGE = 15;

// Chance that a random tick on the tip grows one more segment. Vanilla rolls
// one in ten
export const GROWTH_CHANCE = 0.1;

// Ticks between one segment coming down and the next when a curtain is cut.
// One tick reads as a ripple running away from the cut; zero would drop the
// whole curtain at once
export const CASCADE_TICKS = 1;

// Bone meal adds this many segments at once, picked from the range
export const BONE_MEAL_MIN = 1;
export const BONE_MEAL_MAX = 5;
export const BONE_MEAL_ID = "minecraft:bone_meal";

// Blocks with no face solid enough to hold a plant up. The stalk itself leads
// the list: vanilla lets a stalk hang from another stalk but not from the tip
// of one growing the other way, and nothing here should attach to a torch or a
// tuft of grass either
export const unsupportiveIds = new Set<string>(["minecraft:barrier", "minecraft:light_block"]);
export const unsupportiveTags = ["plant", "flower"];

// Climbing speeds in blocks per tick, matching vanilla's climb and slide rates
export const CLIMB_SPEED = 0.235;
export const DESCEND_SPEED = -0.15;
