// Piling snow up.
// The block declares `minecraft:replaceable` only on the permutations below
// full height, so the engine aims a new layer at a shallow drift and at the
// space above a full one. That is the whole upper bound: a full drift is never
// a placement target, so nothing can overshoot it or spend an item against it.
// All this handler does is deepen a drift that still has room.
import { BlockComponentPlayerPlaceBeforeEvent, BlockPermutation, system } from "@minecraft/server";
import { HEIGHT_STATE, MAX_HEIGHT, SNOW_ID } from "./config.js";

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:snow_stacking", {
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            const target = event.block;

            // Landing on bare ground, or on the space above a full drift:
            // place a single layer and stop
            if (target.typeId !== SNOW_ID) {
                return;
            }

            const current = target.permutation.getAllStates()[HEIGHT_STATE];
            const height = typeof current === "number" ? current : 0;

            // The engine should never aim a placement at a full drift, because
            // that permutation is not replaceable. Checking anyway means a
            // command or another add-on cannot push the state past its range
            if (height >= MAX_HEIGHT) {
                return;
            }

            event.permutationToPlace = BlockPermutation.resolve(SNOW_ID, {
                [HEIGHT_STATE]: height + 1,
            });
        },
    });
});
