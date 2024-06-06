// Import necessary modules from Minecraft server API
import { world, ItemStack } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for interaction
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the block
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player } = e;

            // Get the equipment component for the player
            const equipment = player.getComponent('equippable');

            // Get the selected item from the player's mainhand
            const selectedItem = equipment.getEquipment('Mainhand');

            // Check if the selected item is a water bucket
            if (selectedItem?.typeId === 'minecraft:water_bucket') {
                // Play sound effect
                player.playSound('bucket.empty_water');
                // If not in creative mode, replace water bucket with empty bucket
                if (player.getGameMode() !== "creative") {
                    equipment.setEquipment('Mainhand', new ItemStack('minecraft:bucket', 1));
                }
            }

            // Check if the block interacted is a kai:lantern and the player is using a water bucket
            if (block.typeId === 'kai:lantern' && selectedItem?.typeId === 'minecraft:water_bucket') {
                // Get the block_face state of the kai:lantern
                const blockFace = block.permutation.getState('minecraft:block_face');

                // Load the appropriate structure based on the block_face state
                let structureName = '';
                if (blockFace === 'down') {
                    structureName = 'mystructure:hanging_lantern';
                } else if (blockFace === 'up') {
                    structureName = 'mystructure:floor_lantern';
                }

                // Place the structure if a valid one was determined
                if (structureName) {
                    const { x, y, z } = block;
                    world.structureManager.place(structureName, e.dimension, { x, y, z });
                }
            }
        }
    });
});
