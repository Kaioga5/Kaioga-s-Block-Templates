// Import necessary modules from Minecraft server API
import { world, ItemStack, BlockTypes } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for placing any block above our fence
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the block
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player, face } = e;
            
            // Get the equipment component for the player
            const equipment = player.getComponent('equippable');
            // Get the selected item from the player's mainhand
            const selectedItem = equipment.getEquipment('Mainhand');

            // Check if the selected item is a block
            if (selectedItem && face === 'Up' && BlockTypes.get(selectedItem.typeId)) {
                // Calculate the position above the current block
                const aboveBlock = block.above();

                // If the block above is a kai:fence_inventory (an equivalent of air)...
                if (aboveBlock.typeId === 'kai:fence_inventory') {
                    // ...place the selected block above the current block
                    aboveBlock.setType(selectedItem.typeId);
                    
                    // Reduce item count if not in creative mode
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