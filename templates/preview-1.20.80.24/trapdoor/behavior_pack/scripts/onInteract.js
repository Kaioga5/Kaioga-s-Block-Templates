// Import necessary modules from Minecraft server API
import { world, BlockPermutation } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for trapdoor interaction
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the trapdoor block
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player } = e;

            // Get the current state of the 'kai:open' block trait
            const currentState = block.permutation.getState('kai:open');

            // Determine the new state of the 'kai:open' block trait (toggle between true and false)
            const newOpenState = !currentState;

            // Resolve the new block permutation based on the current block type and updated states
            const newPermutation = BlockPermutation.resolve(block.typeId, {
                ...block.permutation.getAllStates(),
                'kai:open': newOpenState
            });

            // Set the block permutation to the newly resolved permutation
            block.setPermutation(newPermutation);

            // Determine the sound effect to play based on the current state of the trapdoor
            const sound = currentState ? 'open.wooden_trapdoor' : 'close.wooden_trapdoor';

            // Play the corresponding sound effect for opening or closing the trapdoor
            player.playSound(sound);
        }
    });
});