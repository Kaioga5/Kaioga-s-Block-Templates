// Import necessary modules from Minecraft server API
import { world, ItemStack, BlockPermutation } from '@minecraft/server';

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

            // Check if the block interacted is a kai:leaves and the player is using a water bucket
            if (block.typeId === 'kai:leaves' && selectedItem?.typeId === 'minecraft:water_bucket') {
                // Save the current block states
                const currentStates = block.permutation.getAllStates();

                // Get the structure file with our leaves block waterlogged
                const structureName = 'mystructure:leaves';

                // Place the structure
                const { x, y, z } = block.location;
                world.structureManager.place(structureName, e.dimension, { x, y, z });

                // Get the new block at the same location
                const newBlock = e.dimension.getBlock({ x, y, z });

                // Reapply the old block states to the new block
                const newStates = { ...newBlock.permutation.getAllStates(), ...currentStates };
                const newPermutation = BlockPermutation.resolve(newBlock.typeId, newStates);
                newBlock.setPermutation(newPermutation);
            }
        }
    });
});
