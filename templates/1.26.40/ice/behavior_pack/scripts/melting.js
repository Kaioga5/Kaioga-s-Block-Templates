// Registers the component that melts the ice into water near bright light.
// Vanilla ice melts on random ticks when the light next to it reaches 12+,
// checking block light only, torches melt ice, direct sunlight does not.
// The stable script API exposes the combined brightness (getLightLevel)
// and the sky-only value (getSkyLightLevel), but no block-light-only
// reading, so this component uses the combined value. The practical
// difference: this ice also melts under open daytime sky, where vanilla
// ice in a cold biome would survive.
import { system } from "@minecraft/server";
// Melt when the light level is above this value, 12 or higher melts,
// matching the vanilla threshold. Raise it toward 14 to only melt right
// next to a light source
const MELT_ABOVE_LIGHT_LEVEL = 11;
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:ice_melt", {
        // Run this code on each random tick
        onRandomTick(event) {
            // Get the block and its dimension from the event
            const { block, dimension } = event;
            // Return if it is not bright enough to melt
            if (block.getLightLevel() <= MELT_ABOVE_LIGHT_LEVEL) {
                return;
            }
            // Melt. There is no support check here: unlike mining, vanilla
            // melting always produces water (or nothing in the Nether,
            // where water cannot exist), even over a hole
            if (dimension.id === "minecraft:nether") {
                block.setType("minecraft:air");
            }
            else {
                block.setType("minecraft:water");
            }
        },
    });
});
