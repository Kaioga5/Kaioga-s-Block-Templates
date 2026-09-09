// Building a patch of litter up, and paying for it when it is broken.
// Both live together because both are about the same number, how many quarters
// of the block are covered, and that number is the one thing a Bedrock loot
// table cannot read.
import { BlockPermutation, ItemStack, system, } from "@minecraft/server";
import { DROP_PER_SEGMENT, LITTER_ID, MAX_SEGMENTS, SEGMENTS_STATE, unsupportiveIds, unsupportiveTags, } from "./config.js";
// The floor a patch would lie on. Litter landing on litter is a different
// case and is handled below, because the engine aims it at the same block
function canLieOn(below) {
    if (below === undefined || below.isAir || below.isLiquid) {
        return false;
    }
    if (unsupportiveIds.has(below.typeId)) {
        return false;
    }
    return !unsupportiveTags.some((tag) => below.hasTag(tag));
}
function segmentsOf(states) {
    const value = states[SEGMENTS_STATE];
    return typeof value === "number" ? value : 1;
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:litter_spreading", {
        // The block is `replaceable`, so placing litter onto litter aims the new
        // block at the same position. Rewriting the permutation here adds a
        // quarter instead of starting the patch over, and it happens before
        // anything is written to the world
        beforeOnPlayerPlace(event) {
            const target = event.block;
            if (target.typeId !== LITTER_ID) {
                // A fresh patch: refuse a floor that could not hold one
                if (!canLieOn(target.below())) {
                    event.cancel = true;
                }
                return;
            }
            const states = target.permutation.getAllStates();
            const segments = segmentsOf(states);
            if (segments >= MAX_SEGMENTS) {
                // A full patch takes no more. Vanilla drops the next one beside
                // it, which is what refusing the placement leaves the player
                // free to do
                event.cancel = true;
                return;
            }
            // Keep the facing the patch already has, so adding to it does not
            // spin the whole thing round
            event.permutationToPlace = BlockPermutation.resolve(LITTER_ID, {
                ...states,
                [SEGMENTS_STATE]: segments + 1,
            });
        },
        onPlayerBreak(event) {
            const segments = segmentsOf(event.brokenBlockPermutation.getAllStates());
            const dimension = event.dimension;
            const location = event.block.center();
            system.run(() => dimension.spawnItem(new ItemStack(DROP_PER_SEGMENT, segments), location));
        },
    });
});
