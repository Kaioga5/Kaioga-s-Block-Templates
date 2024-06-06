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

            // Places kai:fence instead of kai:fence_inventory and places a kai:fence_inventory in top of it, with kai:post state set to 1 to avoid looping and implement bigger collision
            e.block.setType('kai:fence')
            if (aboveBlock.typeId === 'minecraft:air') {
                aboveBlock.setPermutation(BlockPermutation.resolve('kai:fence_inventory', { 'kai:post': 1 }))
            }
        }
    });
});