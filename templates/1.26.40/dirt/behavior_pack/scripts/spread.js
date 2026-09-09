// Registers the component that lets grass spread onto this dirt. Vanilla
// runs the spread from the grass side; a custom block cannot add itself to
// vanilla grass's spread list, so this template runs the same rule from the
// dirt side instead: on a random tick, the dirt looks for living grass
// nearby and converts itself when it finds some.
import { system, } from "@minecraft/server";
import { grassSources, grassSpreadTargets } from "./config.js";
// Vanilla's light thresholds: grass only survives on a block whose top gets
// at least 4 light, and a grass source only spreads when its own surface
// has at least 9
const SURVIVE_MIN_LIGHT = 4;
const SOURCE_MIN_LIGHT = 9;
// Check whether the block above smothers new grass. Air and liquids never
// smother, and neither does a snow layer. Anything else blocks the change
// when it also darkens the surface below the vanilla threshold
function smothers(above) {
    if (above === undefined) {
        return false;
    }
    if (above.isAir || above.typeId === "minecraft:snow_layer") {
        return false;
    }
    // Water on top always prevents grass, like vanilla
    if (above.isLiquid) {
        return true;
    }
    return above.getLightLevel() < SURVIVE_MIN_LIGHT;
}
// Register the component before the world loads. onRandomTick needs no JSON
// component; the randomTickSpeed gamerule drives how often it runs
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:dirt_spread", {
        // Run this code on each random tick
        onRandomTick(event) {
            // Get the block and its dimension from the event
            const { block, dimension } = event;
            // Get the grass this dirt should turn into
            const grassId = grassSpreadTargets.get(block.typeId);
            // Stop here if this block has no configured conversion
            if (grassId === undefined) {
                return;
            }
            // Grass cannot appear under a smothering block or under water
            if (smothers(block.above())) {
                return;
            }
            // Look for a living grass source nearby. The neighborhood is
            // the inverse of vanilla's spread offsets: a source one block
            // out sideways, from one below to three above
            const { x, y, z } = block.location;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    for (let dy = -1; dy <= 3; dy++) {
                        // Skip our own column center
                        if (dx === 0 && dz === 0 && dy === 0) {
                            continue;
                        }
                        // Get the candidate block; skip unloaded positions
                        let source;
                        try {
                            source = dimension.getBlock({
                                x: x + dx,
                                y: y + dy,
                                z: z + dz,
                            });
                        }
                        catch {
                            continue;
                        }
                        // Keep looking until a configured grass source shows up
                        if (source === undefined || !grassSources.has(source.typeId)) {
                            continue;
                        }
                        // The source only spreads when its own surface is lit
                        if ((source.above()?.getLightLevel() ?? 0) < SOURCE_MIN_LIGHT) {
                            continue;
                        }
                        // Found one, this dirt becomes its configured grass
                        block.setType(grassId);
                        return;
                    }
                }
            }
        },
    });
});
