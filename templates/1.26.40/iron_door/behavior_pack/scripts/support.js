// Doors need a floor. Vanilla refuses a door unless the block under the lower
// half has a solid top; without that check a door can hang on air, redstone
// dust or a flower. This runs before the block lands, so a refused placement
// leaves nothing behind: no half door and no duplicated item.
// minecraft:placement_filter cannot express this. Its allowed_faces list
// constrains the face the block is placed against, and a door is normally
// placed by clicking the side of a neighbour while the support sits below it.
import { LiquidType, system, } from "@minecraft/server";
// Can the lower half of a door rest on this block?
function isSupport(block) {
    if (block === undefined || block.isAir || block.isLiquid) {
        return false;
    }
    // Scripts cannot read a block's top face shape, so this stands in for it: a
    // block that stops water from flowing has a face solid enough to hang a door
    // on. Full blocks, slabs and stairs pass; redstone dust, torches, rails,
    // pressure plates and plants do not. Fences pass here where vanilla would
    // turn them down, which is the one place the approximation shows
    return block.isLiquidBlocking(LiquidType.Water);
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:iron_door_support", {
        // The last moment a script can stop the placement instead of undoing it
        beforeOnPlayerPlace(event) {
            // The multi_block trait puts the lower half at the placement position
            // and stacks the upper half itself, so this cell is the one that needs
            // a floor
            let below;
            try {
                below = event.block.below();
            }
            catch {
                // Chunk not loaded, let the engine decide rather than guess
                return;
            }
            if (!isSupport(below)) {
                event.cancel = true;
            }
        },
    });
});
