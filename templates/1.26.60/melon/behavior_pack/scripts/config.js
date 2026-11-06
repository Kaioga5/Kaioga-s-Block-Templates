// Everything about the stem and its fruit that a pack normally wants to
// change: the blocks and states, how fast the stem grows, where a fruit may
// appear, and what bone meal does.
// The stem, the fruit it grows, and the stem's two states
export const STEM_ID = "kai_templates:melon_stem";
export const MELON_ID = "kai_templates:melon";
export const GROWTH_STATE = "kai_templates:growth";
export const ATTACHED_STATE = "kai_templates:attached";
// The ripe stage. Vanilla stems have eight stages, 0 to 7
export const MAX_GROWTH = 7;
// A stem only grows, and only fruits, when the light where it stands reaches
// this level
export const MIN_LIGHT = 9;
// The block a stem grows on, and the state that says whether it is watered
export const FARMLAND_ID = "minecraft:farmland";
export const MOISTURE_STATE = "moisturized_amount";
// The growth points the farmland under the stem gives, watered and dry, and
// what each of the eight blocks around that farmland adds. Vanilla's numbers
export const POINTS_WET = 4;
export const POINTS_DRY = 2;
export const POINTS_WET_NEIGHBOUR = 0.75;
export const POINTS_DRY_NEIGHBOUR = 0.25;
// What a fruit may grow on top of. The fruit itself lands in the air beside
// the stem; this is the block under that air
export const fruitSoilIds = new Set([
    "minecraft:farmland",
    "minecraft:dirt",
    "minecraft:coarse_dirt",
    "minecraft:dirt_with_roots",
    "minecraft:grass_block",
    "minecraft:podzol",
    "minecraft:mycelium",
    "minecraft:moss_block",
    "minecraft:pale_moss_block",
    "minecraft:mud",
    "minecraft:muddy_mangrove_roots",
]);
// The item that counts as bone meal, and how many stages one use adds.
// Vanilla picks two to five, and bone meal never grows the fruit itself
export const BONE_MEAL_ID = "minecraft:bone_meal";
export const BONE_MEAL_MIN_STAGES = 2;
export const BONE_MEAL_MAX_STAGES = 5;
