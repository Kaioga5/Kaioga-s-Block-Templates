// Import necessary modules from Minecraft server API
import { world, ItemStack } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_player_destroy for block destruction
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_player_destroy', {
        // Define behavior when a player destroys the block
        onPlayerDestroy(e) {
            // Destructure event data for easier access
            const { player, dimension, block } = e;

            // Extract destroyed block permutation from event data
            const { destroyedBlockPermutation: perm } = e;

            // Check if player and equipment are valid
            if (!player || !player.getComponent('equippable')) {
                return;  // Exit if player or their equipment component is invalid
            }

            // Get the item in the player's main hand
            const selectedItem = player.getComponent('equippable').getEquipment('Mainhand');

            // Check if the selected item is a shovel
            if (!selectedItem || !selectedItem.hasTag('minecraft:is_shovel')) {
                return;  // Exit if no item is selected or if the item is not tagged as a shovel
            }

            // Get the layer level state of the destroyed block
            const layerLevel = perm.getState('kai:layer_level');

            // Determine the number of snowball items to spawn based on the layer level
            let snowballCount = 0;
            if (layerLevel >= 0 && layerLevel <= 2) {
                snowballCount = 1;
            } else if (layerLevel === 3 || layerLevel === 4) {
                snowballCount = 2;
            } else if (layerLevel === 5 || layerLevel === 6) {
                snowballCount = 3;
            } else if (layerLevel === 7) {
                snowballCount = 4;
            }

            // Spawn the snowball items at the destroyed block location if any should be spawned
            if (snowballCount > 0) {
                const snowballItem = new ItemStack('kai:snowball', snowballCount);
                dimension.spawnItem(snowballItem, block.location);
            }
        }
    });
});