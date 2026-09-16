// Registers the component that makes grass live, spread, and die.
// Two halves of vanilla's random-tick behavior:
//   dies:    grass under a light-blocking block turns back into dirt.
//   spreads: well-lit grass converts nearby bare dirt into more grass.
import { system, } from "@minecraft/server";
import { spreadTargets } from "./config.js";
// Vanilla's light thresholds: grass dies when the light above drops below
// 4, and only spreads when the light above reaches 9
const DIE_BELOW_LIGHT = 4;
const SPREAD_MIN_LIGHT = 9;
// Check whether the block above smothers the grass. Air and liquids never
// smother; a snow layer keeps grass alive too (it just looks snowy, see
// snowCover.ts). Anything else kills the grass only when it also darkens
// the space above below the vanilla threshold
function smothers(above) {
    if (above === undefined) {
        return false;
    }
    if (above.isAir ||
        above.isLiquid ||
        above.typeId === "minecraft:snow_layer") {
        return false;
    }
    // A real block above: the grass dies when not enough light reaches it
    return above.getLightLevel() < DIE_BELOW_LIGHT;
}
// Pick a random offset in vanilla's spread neighborhood: 3 wide, from one
// above to three below
function randomNearbyOffset() {
    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 5) - 3;
    const dz = Math.floor(Math.random() * 3) - 1;
    return [dx, dy, dz];
}
// Register the component before the world loads. onRandomTick needs no JSON
// component; the randomTickSpeed gamerule drives how often it runs
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:grass_spread", {
        // Run this code on each random tick
        onRandomTick(event) {
            // Get the block and its dimension from the event
            const { block, dimension } = event;
            const above = block.above();
            // Check the death rule first: smothered grass turns back into
            // plain vanilla dirt
            if (smothers(above)) {
                block.setType("minecraft:dirt");
                return;
            }
            // Return if it is too dark to spread. The light is read one
            // block up, where the grass surface actually is
            if (above !== undefined && above.getLightLevel() < SPREAD_MIN_LIGHT) {
                return;
            }
            // Make four attempts to convert nearby dirt, the same attempt
            // count vanilla uses per random tick
            const { x, y, z } = block.location;
            for (let attempt = 0; attempt < 4; attempt++) {
                const [dx, dy, dz] = randomNearbyOffset();
                // Get the candidate block; skip the attempt outside the world
                let target;
                try {
                    target = dimension.getBlock({ x: x + dx, y: y + dy, z: z + dz });
                }
                catch {
                    continue;
                }
                // Only configured dirt-type blocks can grow grass. The
                // map also says which grass each dirt grows into
                const grownId = target === undefined ? undefined : spreadTargets.get(target.typeId);
                if (target === undefined || grownId === undefined) {
                    continue;
                }
                // Skip dirt that is itself smothered, grass would die there
                if (smothers(target.above())) {
                    continue;
                }
                // Convert the dirt into its configured grass block
                target.setType(grownId);
            }
        },
    });
});
