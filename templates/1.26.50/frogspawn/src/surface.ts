// Keeping the clutch on the surface.
// Vanilla frogspawn sits in the open block directly above a full water block,
// it never replaces the water and it never sits under it. The block JSON says
// half of that with `minecraft:placement_filter`: the face clicked has to be the
// top of a water block. The other half is that the space the clutch lands in has
// to be free of water, and a placement filter has no way to describe the block
// it is being placed into.
import { BlockComponentPlayerPlaceBeforeEvent, system } from "@minecraft/server";

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:frogspawn_surface", {
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            const target = event.block;

            // Reached from below, or from inside the water, the click lands on
            // a submerged block rather than the surface. Refusing it leaves the
            // water alone instead of swapping a block of it for the clutch
            if (target.isLiquid || target.isWaterlogged) {
                event.cancel = true;
            }
        },
    });
});
