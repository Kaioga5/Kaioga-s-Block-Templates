// Registers the component that opens and closes the trapdoor when the
// player interacts with it. Copper trapdoors open by hand like wooden ones.
// Waxing and scraping never reach this handler: wax.ts cancels the
// interaction before it lands on the block.
import {
  BlockComponentPlayerInteractEvent,
  BlockPermutation,
  system,
} from "@minecraft/server";

// The custom state declared on every block in the family
const OPEN_STATE = "kai_templates:open";

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:copper_trapdoor_interact",
    {
      // Run this code whenever the player interacts with the block
      onPlayerInteract(event: BlockComponentPlayerInteractEvent): void {
        // Get the block and its dimension from the event
        const { block, dimension } = event;

        // Read the current states through getAllStates, since custom
        // states are not in the typed vanilla state list
        const states = block.permutation.getAllStates();
        const wasOpen = states[OPEN_STATE] === true;

        // Flip the open state, keeping the facing and half
        block.setPermutation(
          BlockPermutation.resolve(block.typeId, {
            ...states,
            [OPEN_STATE]: !wasOpen,
          }),
        );

        // Play the toggle sound for both directions, vanilla has no
        // separate close sound id for copper trapdoors
        dimension.playSound("open_trapdoor.copper", block.center());
      },
    },
  );
});
