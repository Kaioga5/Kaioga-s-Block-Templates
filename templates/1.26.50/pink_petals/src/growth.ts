// Building a patch up flower by flower, and paying for it when it is broken.
// Both live in one component because both are about the same number, how many
// of the four quarters are filled, and that number is the one thing a Bedrock
// loot table cannot read.
import {
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockPermutation,
    GameMode,
    ItemStack,
    system,
} from "@minecraft/server";
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

        // The loot table already dropped one. Top the pile up to the number of
        // flowers that were standing there
        onPlayerBreak(event: BlockComponentPlayerBreakEvent): void {
            const { block, dimension, player, brokenBlockPermutation } = event;
            if (player === undefined || player.getGameMode() === GameMode.Creative) {
                return;
            }
            const raw = brokenBlockPermutation.getAllStates()[PETALS_STATE];
            const extra = (typeof raw === "number" ? raw : 1) - 1;
            if (extra <= 0) {
                return;
            }
            const centre = block.center();
            system.run(() => dimension.spawnItem(new ItemStack(PETALS_ID, extra), centre));
        },
    });
});
