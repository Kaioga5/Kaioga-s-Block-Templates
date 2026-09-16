// Registers the component that opens and closes the trapdoor with redstone.
//
// The block's minecraft:redstone_consumer component makes the engine call
// onRedstoneUpdate every time the incoming power changes.
import {
  BlockComponentRedstoneUpdateEvent,
  BlockPermutation,
  system,
} from "@minecraft/server";

// Same custom state as in interact.ts
const OPEN_STATE = "kai_templates:open";

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:trapdoor_redstone",
    {
      // Run this code whenever the incoming redstone power changes
      onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        // Get the block from the event
        const { block } = event;

        // Convert both power levels to a simple on/off
        const powered = event.powerLevel > 0;
        const wasPowered = event.previousPowerLevel > 0;

        // Return if only the strength changed (say 15 dropping to 7),
        // vanilla trapdoors react to power turning on or off, not to
        // strength changes
        if (powered === wasPowered) {
          return;
        }

        // Read the current states. Custom states are not in the typed
        // vanilla state list, so they go through getAllStates
        const states = block.permutation.getAllStates();

        // Return if the trapdoor is already in the position the signal
        // asks for. This happens when a player toggled it by hand, and
        // vanilla leaves it alone in that case too, writing again would
        // be harmless, but replaying the sound would not
        if (powered === (states[OPEN_STATE] === true)) {
          return;
        }

        // Apply the new open state, keeping the half and facing
        block.setPermutation(
          BlockPermutation.resolve(block.typeId, {
            ...states,
            [OPEN_STATE]: powered,
          }),
        );

        // Play the matching vanilla trapdoor sound
        block.dimension.playSound(
          powered ? "open.wooden_trapdoor" : "close.wooden_trapdoor",
          block.center(),
        );
      },
    },
  );
});
