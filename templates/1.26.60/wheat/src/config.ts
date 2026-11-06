// Everything about the crop that a pack normally wants to change: the block
// and its state, how fast it grows, and what bone meal does to it.

// The crop block and its growth state
export const WHEAT_ID = "kai_templates:wheat";
export const GROWTH_STATE = "kai_templates:growth";

// The ripe stage. Vanilla wheat has eight stages, 0 to 7
export const MAX_GROWTH = 7;

// A crop only grows when the light where it stands reaches this level. Bedrock
// lets seeds be planted in the dark; they just sit there until it is lit
export const MIN_LIGHT = 9;

// The block a crop grows on, and the state that says whether it is watered
export const FARMLAND_ID = "minecraft:farmland";
export const MOISTURE_STATE = "moisturized_amount";

// The growth points the farmland under the crop gives, watered and dry, and
// what each of the eight blocks around that farmland adds. Vanilla's numbers
export const POINTS_WET = 4;
export const POINTS_DRY = 2;
export const POINTS_WET_NEIGHBOUR = 0.75;
export const POINTS_DRY_NEIGHBOUR = 0.25;

// The item that counts as bone meal, and how many stages one use adds.
// Vanilla picks two to five
export const BONE_MEAL_ID = "minecraft:bone_meal";
export const BONE_MEAL_MIN_STAGES = 2;
export const BONE_MEAL_MAX_STAGES = 5;
