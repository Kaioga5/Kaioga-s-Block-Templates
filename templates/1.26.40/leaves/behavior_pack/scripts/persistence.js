// Player-placed leaves never rot.
// Vanilla writes a "persistent" flag the moment a player places a leaf block,
// which is what separates a hedge somebody built from a canopy that lost its
// tree. The flag is set here, before the block exists, by editing the
// permutation the engine is about to place.
import { BlockPermutation, system } from "@minecraft/server";
import { LEAVES_ID, PERSISTENT_STATE } from "./config.js";
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:leaves_persistence", {
        beforeOnPlayerPlace(event) {
            const states = event.permutationToPlace.getAllStates();
            event.permutationToPlace = BlockPermutation.resolve(LEAVES_ID, {
                ...states,
                [PERSISTENT_STATE]: true,
            });
        },
    });
});
