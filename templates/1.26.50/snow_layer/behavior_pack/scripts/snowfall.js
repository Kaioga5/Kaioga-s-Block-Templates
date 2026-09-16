// Deciding whether snow is falling onto a drift, and adding a layer when it is.
// Vanilla asks three things before it thickens snow: is it raining, does this
// spot get snow rather than rain, and is the drift open to the sky.
import { BlockPermutation } from "@minecraft/server";
import { biomeTemperatures, HEIGHT_STATE, MAX_HEIGHT, SNOW_ID, SNOW_LINE_BASE_Y, SNOW_LINE_DROP_PER_BLOCK, SNOW_TEMPERATURE, SNOWY_BIOME_TAG, } from "./config.js";
import { isPrecipitating } from "./weather.js";
// The generator's temperature at a height. Nothing changes up to the base
// height, above it every block of height takes a little off
function temperatureAt(base, y) {
    const above = Math.max(0, y - SNOW_LINE_BASE_Y);
    return base - above * SNOW_LINE_DROP_PER_BLOCK;
}
// Does precipitation land here as snow rather than rain?
function snowsAt(dimension, location) {
    // The biome at the block itself, which is what vanilla reads too
    const biome = dimension.getBiome(location);
    // Vanilla ids come back namespaced. Add the namespace if one is ever
    // missing so the table still matches
    const id = biome.id.includes(":") ? biome.id : "minecraft:" + biome.id;
    const base = biomeTemperatures.get(id);
    // A biome the table does not know is snowy only when it is tagged frozen
    if (base === undefined) {
        return biome.hasTags([SNOWY_BIOME_TAG]);
    }
    return temperatureAt(base, location.y) < SNOW_TEMPERATURE;
}
// Is nothing sitting above this block, all the way up to the sky?
function openToSky(block) {
    const { dimension } = block;
    // A y at the top of the height range has nothing above it, so the column
    // never has to be read. Reading heightRange can throw as well, which is
    // why this sits inside the caller's try
    if (block.y >= dimension.heightRange.max) {
        return true;
    }
    // Ask the engine for the highest block in this column instead of walking
    // up block by block
    const top = dimension.getTopmostBlock({ x: block.x, z: block.z });
    // Open when nothing is found above this block. Anything higher up, a leaf,
    // a slab, another drift, is a roof as far as snowfall is concerned
    return top === undefined || top.y <= block.y;
}
// Is snow falling on this drift right now?
export function isSnowingOn(block) {
    // Clear weather never adds snow, whatever the biome
    if (!isPrecipitating(block.dimension)) {
        return false;
    }
    // The biome and column reads throw when a chunk is unloaded or a position
    // is outside the world. A random tick means this chunk is loaded, but the
    // column search reaches the top of the world, so guard the reads anyway
    try {
        return snowsAt(block.dimension, block.location) && openToSky(block);
    }
    catch {
        return false;
    }
}
// Add one layer to a drift that still has room. A full drift stays as it is,
// which also keeps the height state inside its declared range
export function addLayer(block) {
    const height = block.permutation.getAllStates()[HEIGHT_STATE];
    const current = typeof height === "number" ? height : 0;
    if (current >= MAX_HEIGHT) {
        return;
    }
    block.setPermutation(BlockPermutation.resolve(SNOW_ID, { [HEIGHT_STATE]: current + 1 }));
}
