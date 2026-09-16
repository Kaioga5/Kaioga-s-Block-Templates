// Registers the logic that gives the grass its snowy white sides.
// Vanilla swaps the side texture whenever snow sits on top, at render
// time, by checking the neighbor above. A custom block's renderer cannot
// ask about neighbors, so this template stores the answer in the
// kai_templates:snowy state, which drives a texture-swap permutation.
// Player-placed and player-broken snow is caught by events; snow that
// falls in from the weather is caught on random ticks, snowfall is slow,
// so the delay is invisible.
import { BlockPermutation, system, world, } from "@minecraft/server";
import { GRASS_ID } from "./config.js";
// The custom state declared in blocks/grass_block.json
const SNOWY_STATE = "kai_templates:snowy";
// Both forms of lying snow count, like vanilla. Bedrock's ids are swapped
// relative to Java: minecraft:snow is the full block here, and
// minecraft:snow_layer is the layered snow
const SNOW_BLOCKS = new Set(["minecraft:snow", "minecraft:snow_layer"]);
// Re-check one grass block and write the snowy state on an actual change
function updateSnowy(block) {
    if (block.typeId !== GRASS_ID) {
        return;
    }
    // Check whether snow sits directly above
    const above = block.above();
    const snowy = above !== undefined && SNOW_BLOCKS.has(above.typeId);
    // Only write on an actual change
    const states = block.permutation.getAllStates();
    if ((states[SNOWY_STATE] === true) === snowy) {
        return;
    }
    // Apply the new snowy state, keeping everything else
    block.setPermutation(BlockPermutation.resolve(block.typeId, { ...states, [SNOWY_STATE]: snowy }));
}
// Register the component before the world loads. onRandomTick needs no JSON
// component; the randomTickSpeed gamerule drives how often it runs
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:grass_snow", {
        // Catch weather snowfall (and anything else the events miss) on
        // random ticks
        onRandomTick(event) {
            updateSnowy(event.block);
        },
    });
});
// A player placing snow on the grass should whiten it right away
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    if (SNOW_BLOCKS.has(event.block.typeId)) {
        const below = event.block.below();
        if (below !== undefined) {
            updateSnowy(below);
        }
    }
});
// A player breaking the snow should clear the white sides right away
world.afterEvents.playerBreakBlock.subscribe((event) => {
    if (SNOW_BLOCKS.has(event.brokenBlockPermutation.type.id)) {
        const below = event.block.below();
        if (below !== undefined) {
            updateSnowy(below);
        }
    }
});
