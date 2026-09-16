// Registers the component that opens and closes the trapdoor when the
// player interacts with it.
import { BlockPermutation, system, } from "@minecraft/server";
// The custom state declared in blocks/trapdoor.json. If you rename the
// state there, rename this string too.
const OPEN_STATE = "kai_templates:open";
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:trapdoor_interact", {
        // Run this code whenever the player interacts with the block
        onPlayerInteract(event) {
            // Get the block and its dimension from the event
            const { block, dimension } = event;
            // getState and withState are typed for vanilla state names only,
            // so custom states are read through getAllStates instead
            const states = block.permutation.getAllStates();
            // Check whether the trapdoor is currently open
            const wasOpen = states[OPEN_STATE] === true;
            // Build a new permutation with every current state kept and only
            // the open flag flipped, the half and facing survive the toggle
            block.setPermutation(BlockPermutation.resolve(block.typeId, {
                ...states,
                [OPEN_STATE]: !wasOpen,
            }));
            // Play the vanilla wooden trapdoor sound at the block, so nearby
            // players hear it from the right place
            dimension.playSound(wasOpen ? "close.wooden_trapdoor" : "open.wooden_trapdoor", block.center());
        },
    });
});
