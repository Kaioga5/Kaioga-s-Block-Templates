// Registers the component that opens and closes the copper trapdoor with
// redstone.
import { BlockPermutation, system, } from "@minecraft/server";
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:copper_trapdoor_redstone", {
        // Run this code whenever the incoming redstone power changes.
        // The block JSON declares minecraft:redstone_consumer with
        // min_power: 0, a higher threshold would deliver the rising edge
        // but never the drop back to zero, and the trapdoor could not close
        onRedstoneUpdate(event) {
            // Get the block and its dimension from the event
            const { block, dimension } = event;
            // Convert both power levels to a simple on/off
            const powered = event.powerLevel > 0;
            const wasPowered = event.previousPowerLevel > 0;
            // Return if only the strength changed (say 7 -> 12), the
            // trapdoor only cares about on/off
            if (powered === wasPowered) {
                return;
            }
            // Read the current states through getAllStates, since custom
            // states are not in the typed vanilla state list
            const states = block.permutation.getAllStates();
            // Return if the trapdoor is already in the requested position.
            // This matches vanilla's latch: a trapdoor closed by hand under
            // a powered lever stays closed until the next rising edge
            if (powered === (states["kai_templates:open"] === true)) {
                return;
            }
            // Apply the new open state, keeping the facing and half
            block.setPermutation(BlockPermutation.resolve(block.typeId, {
                ...states,
                "kai_templates:open": powered,
            }));
            // Play the open sound for both directions, vanilla has no close
            // sound id for copper trapdoors (see onInteract.ts)
            dimension.playSound("open_trapdoor.copper", block.center());
        },
    });
});
