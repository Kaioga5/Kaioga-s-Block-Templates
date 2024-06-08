// Import necessary modules from Minecraft server API
import { world, ItemStack } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_player_destroy for block destruction
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_player_destroy', {
        // Define behavior when a player destroys the block
        onPlayerDestroy(e) {
            // Destructure event data for easier access
            const { dimension, block } = e;

            // Extract destroyed block permutation from event data
            const { destroyedBlockPermutation: perm } = e;

            // Get the kai:growth state of the destroyed block
            const growthLevel = perm.getState('kai:growth');

            // Determine the number of pink petals items to spawn based on the kai:growth block state value
            let dropCount = 0;
            if (growthLevel === 0) {
                dropCount = 1;
            } else if (growthLevel === 1) {
                dropCount = 2;
            } else if (growthLevel === 2) {
                dropCount = 3;
            } else if (growthLevel === 3) {
                dropCount = 4;
            }

            // Spawn the pink petals items at the destroyed block location if any should be spawned
            if (dropCount > 0) {
                const pinkPetalsItem = new ItemStack('kai:pink_petals_item', dropCount);
                dimension.spawnItem(pinkPetalsItem, block.location);
            }
        }
    });
});