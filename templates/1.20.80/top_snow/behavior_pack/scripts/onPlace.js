// Import necessary modules from Minecraft server API
import { world } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_placed
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_place', {
        // Define behavior when a player places the top snow
        onPlace(e) {
            // Destructure event data for easier access
            const { block } = e;
            
            // Get the current permutation of the block
            const permutation = block.permutation;

            // Check if the block's 'kai:layer_level' state is 0
            if (permutation.getState('kai:layer_level') === 0) {
                // Generate a random rotation (0 to 3)
                const randomRotation = Math.floor(Math.random() * 4);

                // Update only the 'kai:random_rotation' state
                const newPermutation = permutation.withState('kai:random_rotation', randomRotation);

                // Set the block's permutation to the new permutation with the updated state
                block.setPermutation(newPermutation);
            }
        }
    });
});