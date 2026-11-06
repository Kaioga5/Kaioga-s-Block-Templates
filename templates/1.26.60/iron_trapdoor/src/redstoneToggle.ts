// Registers the component that opens and closes the iron trapdoor with
// redstone. There is no interact component at all, vanilla iron trapdoors
// have no click handler, and this template mirrors that by simply not
// registering one.
import {
  BlockComponentRedstoneUpdateEvent,
  BlockPermutation,
  system,
} from "@minecraft/server";

// The custom state that drives the geometry and collision permutations.
// If you rename the block's state, rename this string too.
const OPEN_STATE = "kai_templates:open";

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:iron_trapdoor_redstone",
    {
      // Run this code whenever the incoming redstone power changes.
      // The block JSON declares minecraft:redstone_consumer with
      // min_power: 0, with a higher threshold the drop back to zero
      // would never be delivered and the trapdoor could not close.
      onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        // Get the block and its dimension from the event
        const { block, dimension } = event;

        // Convert the power level to a simple on/off, vanilla does not
        // care how strong the signal is, only whether there is one
        const powered = event.powerLevel > 0;

        // Read the current states. Comparing against the block's own
        // state (instead of previousPowerLevel) means a strength-only
        // change like 5 -> 7 never replays the sound
        const states = block.permutation.getAllStates();

        // Return if the trapdoor is already where the signal wants it
        if ((states[OPEN_STATE] === true) === powered) {
          return;
        }

        // Build the new permutation with every current state carried
        // over, so the engine-managed half and facing survive the toggle
        block.setPermutation(
          BlockPermutation.resolve(block.typeId, {
            ...states,
            [OPEN_STATE]: powered,
          }),
        );

        // Play the vanilla iron trapdoor sound at the block
        dimension.playSound(
          powered ? "open.iron_trapdoor" : "close.iron_trapdoor",
          block.center(),
        );
      },
    },
  );
});
