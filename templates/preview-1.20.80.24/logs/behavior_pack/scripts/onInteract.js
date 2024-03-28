// Import necessary modules from Minecraft server API
import { world, BlockPermutation } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for log interaction
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the block
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player } = e;

            // Get the selected item from the player's equipment
            const equipment = player.getComponent('equippable');
            const selectedItem = equipment.getEquipment('Mainhand');

            // Use a guard clause to check if the selected item is an axe
            if (!selectedItem?.hasTag('minecraft:is_axe')) return;

            // Get the current block state
            const blockState = block.permutation.getState("minecraft:block_face");
            
            // If block state exists, resolve the stripped log permutation based on the block_face block trait
            if (blockState) {
                const strippedLog = BlockPermutation.resolve('kai:stripped_log', {"minecraft:block_face": blockState});
                
                // Set the block permutation to the stripped log
                block.setPermutation(strippedLog);
            }
            
            // Play wood step sound effect
            player.playSound('step.wood');
        }
    });
});