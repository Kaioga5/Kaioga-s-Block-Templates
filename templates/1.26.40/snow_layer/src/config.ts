// How deep snow can pile, when it melts, what a shovel gets out of it, and
// where falling snow is allowed to build it up.

export const SNOW_ID = "kai_templates:snow_layer";
export const HEIGHT_STATE = "kai_templates:height";

// Heights run 0..7, which is one to eight layers. Eight fills the block
export const MAX_HEIGHT = 7;

// Snow melts once the light where it stands reaches this level. Vanilla uses
// 12, counting block light only; the script reads combined light, which is the
// closest the stable API gets
export const MELT_LIGHT = 12;

// What one layer is worth when it is dug out without Silk Touch
export const DROP_PER_LAYER = "minecraft:snowball";

// The script API can set the weather but cannot read it, so weather.ts keeps
// the newest weatherChange event per dimension. The value is also stored in a
// world dynamic property under this key plus the dimension name, so leaving
// and re-entering the world during a storm does not forget the storm
export const WEATHER_PROPERTY = "kai_templates:snow_layer_weather.";

// Precipitation falls as snow once the temperature at the block is below this.
// This is the world generator's snow threshold; the biome files carry each
// biome's temperature but not the threshold itself
export const SNOW_TEMPERATURE = 0.15;

// Up to this height a biome keeps its base temperature. Above it the
// generator takes SNOW_LINE_DROP_PER_BLOCK off for every block of height,
// which is 0.05 per 40 blocks. The generator also adds a small noise wobble
// to that height; the script ignores it, so its snow line is a flat plane
export const SNOW_LINE_BASE_Y = 80;
export const SNOW_LINE_DROP_PER_BLOCK = 0.05 / 40;

// Base temperature of every overworld biome that can see snow, copied from
// minecraft:climate.temperature in the vanilla biome files
// (behavior_pack/biomes/*.biome.json in the 1.26.40 samples). Biomes at 0.5
// or warmer are left out: the drop with altitude cannot bring them under
// SNOW_TEMPERATURE below the build limit, so they only ever get rain. A biome
// missing from the table is checked for the SNOWY_BIOME_TAG instead
export const biomeTemperatures = new Map<string, number>([
    // Cold enough at any height
    ["minecraft:frozen_peaks", -0.7],
    ["minecraft:jagged_peaks", -0.7],
    ["minecraft:cold_taiga", -0.5],
    ["minecraft:cold_taiga_hills", -0.5],
    ["minecraft:cold_taiga_mutated", -0.5],
    ["minecraft:snowy_slopes", -0.3],
    ["minecraft:grove", -0.2],
    ["minecraft:ice_plains", 0.0],
    ["minecraft:ice_plains_spikes", 0.0],
    ["minecraft:ice_mountains", 0.0],
    ["minecraft:frozen_river", 0.0],
    ["minecraft:frozen_ocean", 0.0],
    ["minecraft:legacy_frozen_ocean", 0.0],
    ["minecraft:cold_beach", 0.05],
    // Rain low down, snow above the snow line. With the values above that
    // line sits at y 120 for 0.2, y 160 for 0.25 and y 200 for 0.3
    ["minecraft:extreme_hills", 0.2],
    ["minecraft:extreme_hills_edge", 0.2],
    ["minecraft:extreme_hills_mutated", 0.2],
    ["minecraft:extreme_hills_plus_trees", 0.2],
    ["minecraft:extreme_hills_plus_trees_mutated", 0.2],
    ["minecraft:stone_beach", 0.2],
    ["minecraft:dripstone_caves", 0.2],
    ["minecraft:taiga", 0.25],
    ["minecraft:taiga_hills", 0.25],
    ["minecraft:taiga_mutated", 0.25],
    ["minecraft:redwood_taiga_mutated", 0.25],
    ["minecraft:mega_taiga", 0.3],
    ["minecraft:mega_taiga_hills", 0.3],
    ["minecraft:redwood_taiga_hills_mutated", 0.3],
    ["minecraft:meadow", 0.3],
    ["minecraft:cherry_grove", 0.3],
    // Carries the frozen tag but its climate says 0.5, so it gets rain like
    // the other oceans. Listed so the tag fallback below does not catch it
    ["minecraft:deep_frozen_ocean", 0.5],
]);

// A biome the table does not know still counts as snowy when it carries this
// biome tag. Every vanilla biome tagged frozen is already in the table, so
// this only matters for custom biomes
export const SNOWY_BIOME_TAG = "frozen";
