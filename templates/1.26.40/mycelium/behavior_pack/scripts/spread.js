// Mycelium living, colonising and dying back, all on random ticks.
// Mycelium follows the same two light rules grass does: it dies when the space
// above it goes dark, and it only colonises neighbours when that space is
// bright. The difference is what it converts and what it leaves behind.
import { system } from "@minecraft/server";
import { spreadTargets } from "./config.js";
// Below this light level above the block, mycelium reverts to dirt
const DIE_BELOW_LIGHT = 4;
// At or above this light level, mycelium may colonise a neighbour
const SPREAD_MIN_LIGHT = 9;
// How many neighbours one random tick tries to colonise
const ATTEMPTS_PER_TICK = 4;
// Is the block above dark enough to kill the mycelium under it?
function smothers(above) {
    // Nothing above at the world ceiling, so nothing to smother it
    if (above === undefined) {
        return false;
    }
    // Air, water and a thin snow layer all leave the surface alive
    if (above.isAir || above.isLiquid || above.typeId === "minecraft:snow_layer") {
        return false;
    }
    // A real block above only kills it once the space has actually gone dark
    return above.getLightLevel() < DIE_BELOW_LIGHT;
}
// One offset from vanilla's colonisation neighbourhood: one block either side
// on x and z, and from one above to three below
function randomNeighbourOffset() {
    return {
        x: Math.floor(Math.random() * 3) - 1,
        y: Math.floor(Math.random() * 5) - 3,
        z: Math.floor(Math.random() * 3) - 1,
    };
}
// Register before the world loads, which is the only time the block component
// registry accepts entries. onRandomTick needs no JSON counterpart, the
// randomTickSpeed gamerule already drives it
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:mycelium_spread", {
        onRandomTick(event) {
            const { block } = event;
            const above = block.above();
            // Death first: smothered mycelium loses its fungal layer and is
            // plain dirt again
            if (smothers(above)) {
                block.setType("minecraft:dirt");
                return;
            }
            // Too dark to colonise anything, but still alive
            if (above !== undefined && above.getLightLevel() < SPREAD_MIN_LIGHT) {
                return;
            }
            // The lowest and highest block the dimension holds. The neighbour
            // search reaches three blocks down, so mycelium on the floor of a
            // flat world would otherwise ask for a block below the world and
            // throw LocationOutOfWorldBoundariesError
            const { min, max } = block.dimension.heightRange;
            for (let attempt = 0; attempt < ATTEMPTS_PER_TICK; attempt++) {
                const offset = randomNeighbourOffset();
                // Skip any offset that lands outside the world's height range
                const y = block.y + offset.y;
                if (y < min || y > max) {
                    continue;
                }
                // offset() returns undefined for an unloaded chunk, the only
                // failure left once the height has been checked
                const target = block.offset(offset);
                if (target === undefined) {
                    continue;
                }
                // Only the soils listed in config.ts can be colonised, and the
                // map also decides what each one turns into
                const grown = spreadTargets.get(target.typeId);
                if (grown === undefined) {
                    continue;
                }
                // Skip a neighbour that is itself covered, mycelium would only
                // die there on its next tick
                if (smothers(target.above())) {
                    continue;
                }
                target.setType(grown);
            }
        },
    });
});
