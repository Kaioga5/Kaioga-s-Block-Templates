// Import necessary modules from Minecraft server API
import { world, ItemStack } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_player_destroy for slab destruction
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_player_destroy', {
        // Define behavior when a player destroys the slab
        onPlayerDestroy(e) {
            // Destructure event data for easier access
            const { player, dimension } = e;

            // Extract destroyed block permutation from event data
            const { destroyedBlockPermutation: perm } = e;

            // Check if player and equipment are valid
            if (!player || !player.getComponent('equippable')) {
                return;
            }

            // Get the item in the player's main hand
            const selectedItem = player.getComponent('equippable').getEquipment('Mainhand');

            // Check if the selected item is a pickaxe
            if (!selectedItem || !selectedItem.hasTag('minecraft:is_pickaxe')) {
                return;
            }

            // Use destroyedBlockPermutation to get the ItemStack directly
            const slabItem = perm.getItemStack(1);
            if (slabItem) {
                // Spawn the item at the destroyed block location
                dimension.spawnItem(slabItem, e.block.location);
            }
        }
    });
});