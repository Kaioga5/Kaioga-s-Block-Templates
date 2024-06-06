// Import necessary modules from Minecraft server API
import { world } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_player_destroy for fence destruction
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_player_destroy', {
        // Define behavior when a player destroys the fence
        onPlayerDestroy(e) {
            // Destructure event data for easier access
            const { block } = e;
            const aboveBlock = block.above();

            // Remove kai:fence_inventory on top if present
            if (aboveBlock.typeId === 'kai:fence_inventory') {
                aboveBlock.setType('minecraft:air')
            }
        }
    });
});