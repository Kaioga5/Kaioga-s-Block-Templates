// Registers the component that opens and closes the fence gate with
// redstone.
import {
  BlockComponentRedstoneUpdateEvent,
  BlockPermutation,
  system,
} from "@minecraft/server";

// The custom state declared in blocks/fence_gate.json
const OPEN_STATE = "kai_templates:open";

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:fence_gate_redstone",
    {
      // Run this code whenever the incoming redstone power changes
      onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        // Get the block and its dimension from the event
        const { block, dimension } = event;

        // Convert both power levels to a simple on/off
        const powered = event.powerLevel > 0;
        const wasPowered = event.previousPowerLevel > 0;

        // Return if only the strength changed (say 7 -> 12)
        if (powered === wasPowered) {
          return;
        }

        // Return if the gate is already in the requested position. This
        // matches vanilla's latch: a gate closed by hand under a powered
        // lever stays closed until the next rising edge
        const states = block.permutation.getAllStates();
        if (powered === (states[OPEN_STATE] === true)) {
          return;
        }

        // Apply the new open state. The swing side (open_away) keeps its
        // last value, vanilla instead swings away from the power
        // source, but the redstone hook reports power levels, not the
        // source's position, so that information is not available here
        block.setPermutation(
          BlockPermutation.resolve(block.typeId, {
            ...states,
            [OPEN_STATE]: powered,
          }),
        );

        // Play the vanilla fence gate sound
        dimension.playSound(
          powered ? "open.fence_gate" : "close.fence_gate",
          block.center(),
        );
      },
    },
  );
});
