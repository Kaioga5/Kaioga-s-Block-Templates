// Import necessary modules from Minecraft server API
import { world, BlockTypes, BlockPermutation } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for handling specific interactions
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the fence gate
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player, face } = e;

            // Get the equipment component for the player
            const equipment = player.getComponent('equippable');
            // Get the selected item from the player's mainhand
            const selectedItem = equipment.getEquipment('Mainhand');

            // Check if a player tried to place a block on top of the fence gate
            if (selectedItem && face === 'Up' && BlockTypes.get(selectedItem.typeId)) {
                // Calculate the position above the current block
                const aboveBlock = block.above();

                // If the block above is a kai:fence_gate (an equivalent of air)...
                if (aboveBlock.typeId === 'kai:fence_gate') {
                    // ...place the selected block above the current block
                    aboveBlock.setType(selectedItem.typeId);
                    
                    // Reduce item count if not in creative mode
                    if (player.getGameMode() !== "creative") {
                        if (selectedItem.amount > 1) {
                            selectedItem.amount -= 1;
                            equipment.setEquipment('Mainhand', selectedItem);
                        } else {
                            equipment.setEquipment('Mainhand', undefined); // Clear the slot if only 1 item left
                        }
                    }
                    return; // Exit the function after placing the block
                }
            }

            // Toggle the 'kai:open' state between false and true and determine the sound effect to play
            const currentState = block.permutation.getState('kai:open');
            const newOpenState = !currentState;
            const sound = newOpenState ? 'open.fence_gate' : 'close.fence_gate';

            // Determine the new cardinal direction based on the player's rotation
            const rotationAngle = player.getRotation().y;
            const newCardinalDirection = getNewCardinalDirection(block.permutation.getState('minecraft:cardinal_direction'), rotationAngle);

            // Update the block's permutation with the new states
            const newPermutation = BlockPermutation.resolve(block.typeId, {
                ...block.permutation.getAllStates(),
                'kai:open': newOpenState,
                'minecraft:cardinal_direction': newCardinalDirection
            });

            // Apply the new permutation and play the sound
            block.setPermutation(newPermutation);
            block.dimension.playSound(sound, block.location);

            // Corrected: Remove redeclaration of aboveBlock
            const aboveBlock = block.above();
            // Checks if the block above our fence gate is an invisible fence gate (equivalent to air)
            if (aboveBlock.typeId === 'kai:fence_gate' && aboveBlock.permutation.getState('kai:invisible')) {
                const aboveCurrentState = aboveBlock.permutation.getState('kai:open');
                // Update kai:open state of the invisible fence gate above our fence gate
                if (aboveCurrentState !== newOpenState) {
                    const newAbovePermutation = BlockPermutation.resolve(aboveBlock.typeId, {
                        ...aboveBlock.permutation.getAllStates(),
                        'kai:open': newOpenState
                    });
                    aboveBlock.setPermutation(newAbovePermutation);
                }
            }
        }
    });
});

// Function to calculate the new cardinal direction based on the player's rotation
function getNewCardinalDirection(currentDirection, angle) {
    const direction = directionDisplay(angle);
    if (['north', 'south'].includes(currentDirection)) {
        return direction.includes('south') ? 'south' : 'north';
    } else {
        return direction.includes('west') ? 'west' : 'east';
    }
}

// Function to calculate the direction a player is looking at
function directionDisplay(angle) {
    if (Math.abs(angle) > 112.5) return 'north';
    if (Math.abs(angle) < 67.5) return 'south';
    if (angle < 157.5 && angle > 22.5) return 'west';
    if (angle > -157.5 && angle < -22.5) return 'east';
    return '';
}