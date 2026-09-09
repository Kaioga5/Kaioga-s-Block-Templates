// How far and how greedily a sponge drinks, and what a wet one does about it.

export const SPONGE_ID = "kai_templates:sponge";
export const WET_SPONGE_ID = "kai_templates:wet_sponge";

// How far the search may travel through connected water, measured in steps
// rather than straight-line distance. Vanilla uses six
export const ABSORB_RANGE = 6;

// The most water blocks one sponge takes. Vanilla stops at 64, and the cap is
// what keeps the search bounded no matter how much ocean is next to it
export const ABSORB_LIMIT = 64;

// A sponge only turns wet if it actually drank something
export const MIN_ABSORBED = 1;

// Where a wet sponge dries out on its own
export const DRYING_DIMENSIONS = new Set<string>(["minecraft:nether"]);

// The puff a drying sponge gives off
export const DRYING_PARTICLE = "minecraft:large_explosion";
