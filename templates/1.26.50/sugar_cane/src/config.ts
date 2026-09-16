// How tall a stand of cane gets, how fast it climbs, and what it drinks from.

export const CANE_ID = "kai_templates:sugar_cane";
export const AGE_STATE = "kai_templates:age";

// The counter every block keeps. When it runs out the block puts a new one on
// top of itself and starts again
export const MAX_AGE = 15;

// How tall one stand grows on its own. Vanilla stops at three; world generation
// occasionally leaves a fourth block standing, which this does not touch
export const MAX_HEIGHT = 3;

// Bone meal on Bedrock takes a stand straight to full height. On Java it does
// nothing at all, which is a real per-edition fork rather than an oversight
export const BONE_MEAL_ID = "minecraft:bone_meal";

// What counts as water beside the root block. Ice is not on the list: vanilla
// cane wants water or a waterlogged block, and a frozen pond does not keep it
export const waterIds = new Set<string>([
    "minecraft:water",
    "minecraft:flowing_water",
]);
