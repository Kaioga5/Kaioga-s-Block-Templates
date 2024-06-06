// Import necessary modules from Minecraft server API
import { world, BlockPermutation } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_player_placed for fence placing
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_player_placed', {
        // Define behavior when a player places the fence
        onPlace(e) {
            // Destructure event data for easier access
            const { block } = e;
            const aboveBlock = block.above();

            // Get all current block states
            const currentStates = block.permutation.getAllStates();

            // Get the current state of the 'minecraft:cardinal_direction' block trait
            const cardinalDirection = currentStates['minecraft:cardinal_direction'];

            // Check if the current cardinal direction is 'south'
            if (cardinalDirection === 'south') {
                // Change the block state 'kai:direction' from false to true (remember this is the actual south rotation for our fence gate)
                const newKaiDirection = true;
                currentStates['kai:direction'] = newKaiDirection;

                // Update the block's permutation with the new state
                const newPermutation = BlockPermutation.resolve(block.typeId, currentStates);

                // Apply the new permutation to the block
                block.setPermutation(newPermutation);
            }

            // Check if the block above is air
            if (aboveBlock.typeId === 'minecraft:air') {
                // Create a copy of the current block states of our fence gate
                const newAboveStates = { ...currentStates };
    
                // If the cardinal direction is 'south', remove the 'minecraft:cardinal_direction' state (remember we are only using 'south' for inventory render purposes)
                if (cardinalDirection === 'south') {
                    delete newAboveStates['minecraft:cardinal_direction'];
                }
    
                // Set the 'kai:invisible' state to true for the block above
                newAboveStates['kai:invisible'] = true;
    
                // Apply the new permutation to the block above using 'kai:fence_gate'
                aboveBlock.setPermutation(BlockPermutation.resolve('kai:fence_gate', newAboveStates));
            }
        }
    });
});