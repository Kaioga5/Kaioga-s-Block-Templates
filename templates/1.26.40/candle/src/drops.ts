// Drops one candle per candle in the cluster.
//
// A block loot table cannot read a block state, so it drops a single candle
// and this component tops the drop up to the count that was standing there.
// It runs on the block's own break event, so it costs nothing until a candle
// is actually broken.
import {
  BlockComponentPlayerBreakEvent,
  GameMode,
  ItemStack,
  system,
} from "@minecraft/server";

import { CANDLE_ID, COUNT_STATE } from "./candle.js";

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:candle_drops",
    {
      // Runs after a player breaks the block
      onPlayerBreak(event: BlockComponentPlayerBreakEvent): void {
        const { block, dimension, player, brokenBlockPermutation } = event;
        if (
          player === undefined ||
          player.getGameMode() === GameMode.Creative
        ) {
          return;
        }

        // The block is already gone, so the count comes from the
        // permutation the event kept for us
        const states = brokenBlockPermutation.getAllStates();
        const raw = states[COUNT_STATE];
        const count = (typeof raw === "number" ? raw : 0) + 1;

        // The loot table already dropped the first one
        const extra = count - 1;
        if (extra <= 0) {
          return;
        }
        dimension.spawnItem(new ItemStack(CANDLE_ID, extra), {
          x: block.x + 0.5,
          y: block.y + 0.5,
          z: block.z + 0.5,
        });
      },
    },
  );
});
