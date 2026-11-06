// The growth chain and how often budding amethyst pushes it along.
export const BUDDING_ID = "kai_templates:budding_amethyst";
// The stages a bud passes through, in order. Growth reads this list and nothing
// else, so adding a stage means adding a block file and one entry here
export const budStages = [
    "kai_templates:small_amethyst_bud",
    "kai_templates:medium_amethyst_bud",
    "kai_templates:large_amethyst_bud",
    "kai_templates:amethyst_cluster",
];
// The state the placement trait gives every bud. Growth carries it from one
// stage to the next so a bud keeps pointing the way it started
export const FACE_STATE = "minecraft:block_face";
// Chance that one random tick on a budding block grows something. Vanilla rolls
// one in five, which is why a geode fills slowly rather than all at once
export const GROWTH_CHANCE = 0.2;
