// Building a patch up flower by flower. What a broken patch pays out needs no
// script: the block names one loot table per count, so the engine drops every
// flower that was standing there, whatever broke it.
import { BlockComponentPlayerPlaceBeforeEvent, BlockPermutation, system } from "@minecraft/server";
import { MAX_PETALS, PETALS_ID, PETALS_STATE } from "./config.js";
import { petalCount } from "./petals.js";

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:petal_growth", {
        // The block is replaceable, so petals aimed at a patch that is already
        // standing are handed the same cell. Rewriting the permutation here
        // adds a flower instead of starting the patch over, and it happens
        // before anything reaches the world
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            const target = event.block;
            if (target.typeId !== PETALS_ID) {
                // A fresh patch. The placement filter in the block JSON has
                // already decided whether the ground under it will hold one
                return;
            }

            const states = target.permutation.getAllStates();
            const petals = petalCount(target);
            if (petals >= MAX_PETALS) {
                // A full patch takes no more. Refusing the placement leaves the
                // player free to put the next one down beside it, which is what
                // vanilla does
                event.cancel = true;
                return;
            }

            event.permutationToPlace = BlockPermutation.resolve(PETALS_ID, {
                ...states,
                [PETALS_STATE]: petals + 1,
            });
        },
    });
});
