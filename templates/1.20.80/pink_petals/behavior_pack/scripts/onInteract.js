// Import necessary modules from Minecraft server API
import { world, ItemStack } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for interacting with the block
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the block
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player } = e;

            // Get the block's current location
            const { x, y, z } = block.location;

            // Get the equipment component for the player
            const equipment = player.getComponent('equippable');
            // Get the selected item from the player's mainhand
            const selectedItem = equipment.getEquipment('Mainhand');

            // Check if the selected item is 'kai:pink_petals_item' or 'minecraft:bone_meal'
            if (selectedItem && (selectedItem.typeId === 'kai:pink_petals_item' || selectedItem.typeId === 'minecraft:bone_meal')) {
                // Get the current permutation of the block
                const permutation = block.permutation;

                // Get the current kai:growth state value
                const currentGrowthLevel = permutation.getState('kai:growth');

                // If the selected item is 'minecraft:bone_meal' and growth level is 3, spawn particle and spawn a kai:pink_petals_item
                if (selectedItem.typeId === 'minecraft:bone_meal' && currentGrowthLevel === 3) {
                    block.dimension.spawnParticle('minecraft:crop_growth_emitter', { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
                    const pinkPetalsItem = new ItemStack('kai:pink_petals_item', 1);
                    block.dimension.spawnItem(pinkPetalsItem, { x: x + 0.5, y: y + 0.5, z: z + 0.5 });

                    // Reduce bone meal from player's inventory
                    if (player.getGameMode() !== "creative") {
                        if (selectedItem.amount > 1) {
                            selectedItem.amount -= 1;
                            equipment.setEquipment('Mainhand', selectedItem);
                        } else {
                            equipment.setEquipment('Mainhand', undefined); // Clear the slot if only 1 item left
                        }
                    }

                    // Prevent further execution
                    e.cancel = true;
                }

                // Check if the growth level is less than or equal to 2
                else if (currentGrowthLevel <= 2) {
                    // Prevent default block placement behavior
                    e.cancel = true;

                    // Increase the kai:layer_level state by 1
                    const newGrowthLevel = currentGrowthLevel + 1;

                    // Create a new permutation with the updated kai:layer_level state
                    const newPermutation = permutation.withState('kai:growth', newGrowthLevel);

                    // Set the block's permutation to the new permutation
                    block.setPermutation(newPermutation);

                    // If the selected item is 'minecraft:bone_meal', spawn 'minecraft:crop_growth_emitter' particle
                    if (selectedItem.typeId === 'minecraft:bone_meal') {
                        block.dimension.spawnParticle('minecraft:crop_growth_emitter', { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
                    }

                    // Reduce one 'kai:pink_petals_item' item from the player's inventory if not in creative mode
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