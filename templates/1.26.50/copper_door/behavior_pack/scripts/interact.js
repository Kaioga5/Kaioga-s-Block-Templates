// Registers the component that opens and closes the door when the player
// interacts with it. Copper doors open by hand like wooden ones, only
// iron doors need redstone. Waxing and scraping never reach this handler:
// wax.ts cancels the interaction before it lands on the block.
import { BlockPermutation, system, } from "@minecraft/server";
// The custom state declared on every block in the family
const OPEN_STATE = "kai_templates:open";
// Set the open state on every part of the door. The multi_block trait keeps
// both halves placed and destroyed together, but custom states are NOT
// copied between them, writing only the clicked half would leave the door
// half open and half closed. Block.getParts() is the trait's own list of
// the door's cells. (redstone.ts carries its own copy of this helper so
// each concern file stays standalone.)
function setOpenOnAllParts(block, open) {
    // Get both halves of the door; fall back to just this block
    const parts = block.getParts() ?? [block];
    for (const part of parts) {
        // Write the open state while keeping every other state
        const states = part.permutation.getAllStates();
        part.setPermutation(BlockPermutation.resolve(part.typeId, { ...states, [OPEN_STATE]: open }));
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:copper_door_interact", {
        // Run this code whenever the player interacts with either half
        onPlayerInteract(event) {
            // Get the block and its dimension from the event
            const { block, dimension } = event;
            // Check whether the door is currently open
            const wasOpen = block.permutation.getAllStates()[OPEN_STATE] === true;
            // Toggle both halves together
            setOpenOnAllParts(block, !wasOpen);
            // Play the vanilla copper door sound at the block
            dimension.playSound(wasOpen ? "close_door.copper" : "open_door.copper", block.center());
        },
    });
});
