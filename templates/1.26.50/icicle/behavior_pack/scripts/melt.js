// Light melting an icicle loose.
// Measured in Minecraft Preview 26.60.29: a segment that is not attached melts
// on a random tick once the block light on it reaches 5, and the Preview
// changelog adds that in the Nether it melts whatever the light. A hanging
// segment falls and takes every segment below it along; a standing one breaks
// where it is, with every segment above it. Attached segments never melt, so a
// lit icicle built by hand keeps only its first segment, the one placed against
// the ceiling or floor.
import { system } from "@minecraft/server";
import { MELT_LIGHT } from "./config.js";
import { breakLoose, breakUp, facing, isAttached, isIcicle } from "./column.js";
// Whether the block light on this segment reaches `level`. The script API
// reports the total brightness and the sky light, but not the block light on
// its own. Measured in game: the sky reading follows the time of day (15 at
// noon under open sky, 4 at midnight, 0 in a sealed cave) and the total is the
// larger of the two. So whenever the total is above the sky reading, the total
// is the block light, exactly. When they are equal, a torch cannot be told
// from daylight, and the icicle is left alone, the way vanilla leaves one in
// sunlight
export function blockLightReaches(block, level) {
    const total = block.getLightLevel();
    return total >= level && total > block.getSkyLightLevel();
}
// Whether this segment is in conditions that melt it
export function isMelting(block) {
    return block.dimension.id === "minecraft:nether" || blockLightReaches(block, MELT_LIGHT);
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:icicle_melt", {
        onRandomTick(event) {
            const block = event.block;
            // Another segment's tick earlier in this game tick may already
            // have taken this one
            if (!isIcicle(block) || isAttached(block) || !isMelting(block)) {
                return;
            }
            if (facing(block) === "down") {
                breakLoose(block);
            }
            else {
                breakUp(block);
            }
        },
    });
});
