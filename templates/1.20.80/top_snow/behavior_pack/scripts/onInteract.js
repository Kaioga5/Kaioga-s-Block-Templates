// Import necessary modules from Minecraft server API
import { world } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for interacting with the block
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the block
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player } = e;

            // Get the equipment component for the player
            const equipment = player.getComponent('equippable');
            // Get the selected item from the player's mainhand
            const selectedItem = equipment.getEquipment('Mainhand');

            // Check if the selected item is 'kai:top_snow'
            if (selectedItem && selectedItem.typeId === 'kai:top_snow') {
                // Get the current permutation of the block
                const permutation = block.permutation;

                // Get the current kai:layer_level state
                const currentLayerLevel = permutation.getState('kai:layer_level');

                // Check if the layer level is less than or equal to 6
                if (currentLayerLevel <= 6) {
                    // Prevent default block placement behavior
                    e.cancel = true;

                    // Increase the kai:layer_level state by 1
                    const newLayerLevel = currentLayerLevel + 1;

                    // Create a new permutation with the updated kai:layer_level state
                    const newPermutation = permutation.withState('kai:layer_level', newLayerLevel);

                    // Set the block's permutation to the new permutation
                    block.setPermutation(newPermutation);

                    // Reduce one 'kai:top_snow' item from the player's inventory if not in creative mode
                    if (player.getGameMode() !== "creative") {
                        if (selectedItem.amount > 1) {
                            selectedItem.amount -= 1;
                            equipment.setEquipment('Mainhand', selectedItem);
                        } else {
                            equipment.setEquipment('Mainhand', undefined); // Clear the slot if only 1 item left
                        }
                    }
                }
            }
        }
    });
});