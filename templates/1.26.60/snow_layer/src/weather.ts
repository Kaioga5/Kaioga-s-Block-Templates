// Which dimensions have rain or thunder right now.
// The script API can set the weather but cannot read it back, so the only way
// to know is to listen for every change and remember the newest one.
import { Dimension, WeatherType, world } from "@minecraft/server";
import { WEATHER_PROPERTY } from "./config.js";

// The newest weather seen in each dimension since the scripts started
const weatherByDimension = new Map<string, WeatherType>();

// The event names the dimension with a plain string, and that string is not
// promised to be spelled like Dimension.id. Lower the case and drop any
// namespace so "Overworld", "overworld" and "minecraft:overworld" all land on
// the same entry
function keyOf(dimensionId: string): string {
    return dimensionId.toLowerCase().replace(/^minecraft:/, "");
}

// Turn a stored value back into a weather type, or undefined if it is not one
function asWeather(value: unknown): WeatherType | undefined {
    if (value === WeatherType.Clear || value === WeatherType.Rain || value === WeatherType.Thunder) {
        return value;
    }
    return undefined;
}

// Remember every change, in memory for speed and in a world property so the
// value is still there after leaving and re-entering the world
world.afterEvents.weatherChange.subscribe((event) => {
    const key = keyOf(event.dimension);
    weatherByDimension.set(key, event.newWeather);
    world.setDynamicProperty(WEATHER_PROPERTY + key, event.newWeather);
});

// The weather this dimension is believed to have right now
export function currentWeather(dimension: Dimension): WeatherType {
    const key = keyOf(dimension.id);
    const remembered = weatherByDimension.get(key);
    if (remembered !== undefined) {
        return remembered;
    }
    // Nothing seen since startup, so read what the last session stored. A world
    // that has never fired the event under this pack has no record at all, and
    // the script assumes clear skies until the first change corrects it
    const stored = asWeather(world.getDynamicProperty(WEATHER_PROPERTY + key)) ?? WeatherType.Clear;
    weatherByDimension.set(key, stored);
    return stored;
}

// Is anything falling from the sky in this dimension? Thunder is rain too
export function isPrecipitating(dimension: Dimension): boolean {
    const weather = currentWeather(dimension);
    return weather === WeatherType.Rain || weather === WeatherType.Thunder;
}
