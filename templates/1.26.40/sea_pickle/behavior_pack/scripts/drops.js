// Drops one pickle per pickle in the cluster.
//
// A block loot table cannot read a block state, so it drops a single pickle
// and this component tops the drop up to the count that was standing there.
// It runs on the block's own break event, so nothing happens until a cluster
// is actually broken.
import { GameMode, ItemStack, system, } from "@minecraft/server";
import { COUNT_STATE, PICKLE_ID } from "./pickle.js";
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sea_pickle_drops", {
        // Runs after a player breaks the block
        onPlayerBreak(event) {
            const { block, dimension, player, brokenBlockPermutation } = event;
            if (player === undefined ||
                player.getGameMode() === GameMode.Creative) {
                return;
            }
            // The block is gone by now, so the count comes from the
            // permutation the event kept for us
            const raw = brokenBlockPermutation.getAllStates()[COUNT_STATE];
            const extra = typeof raw === "number" ? raw : 0;
            if (extra <= 0) {
                return;
            }
            // The loot table already dropped the first one
            dimension.spawnItem(new ItemStack(PICKLE_ID, extra), {
                x: block.x + 0.5,
                y: block.y + 0.5,
                z: block.z + 0.5,
            });
        },
    });
});
