// Registers the component that opens and closes the door with redstone.
// Power arriving at either half works, because vanilla doors respond to
// power on either block.
import { BlockPermutation, system, } from "@minecraft/server";
// The custom state declared on every block in the family
const OPEN_STATE = "kai_templates:open";
// Set the open state on every part of the door. The multi_block trait does
// not copy custom states between the halves, so both must be written
function setOpenOnAllParts(block, open) {
    const parts = block.getParts() ?? [block];
    for (const part of parts) {
        const states = part.permutation.getAllStates();
        part.setPermutation(BlockPermutation.resolve(part.typeId, { ...states, [OPEN_STATE]: open }));
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:copper_door_redstone", {
        // Run this code whenever the incoming redstone power changes
        onRedstoneUpdate(event) {
            // Get the block and its dimension from the event
            const { block, dimension } = event;
            // Convert both power levels to a simple on/off
            const powered = event.powerLevel > 0;
            const wasPowered = event.previousPowerLevel > 0;
            // Return if only the strength changed (say 7 -> 12), doors
            // react to power turning on or off, not to strength
            if (powered === wasPowered) {
                return;
            }
            // Return if the door is already in the requested position. This
            // matches vanilla's latch: a door closed by hand under a powered
            // lever stays closed until the next rising edge
            if (powered ===
                (block.permutation.getAllStates()[OPEN_STATE] === true)) {
                return;
            }
            // Toggle both halves together
            setOpenOnAllParts(block, powered);
            // Play the vanilla copper door sound at the block
            dimension.playSound(powered ? "open_door.copper" : "close_door.copper", block.center());
        },
    });
});
