// Import necessary modules from Minecraft server API
import { world, BlockPermutation } from '@minecraft/server';

// Create a Map to keep track of processed blocks
const processedBlocks = new Map();

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_place
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_place', {
        // Define behavior when a player places the block
        onPlace(e) {
            // Destructure event data for easier access
            const { block } = e;
            const aboveBlock = block.above();
            const northBlock = block.north(); // Get the block to the east
            const southBlock = block.south(); // Get the block to the east
            const eastBlock = block.east(); // Get the block to the east
            const westBlock = block.west(); // Get the block to the east
            const { x, y, z } = block.location;

            // Check if the block has already been processed
            if (processedBlocks.has(`${x},${y},${z}`)) {
                return; // Exit early if block has already been processed
            }

            // Get all current block states
            const currentStates = block.permutation.getAllStates();

            // Get the cardinal direction of the block
            const cardinalDirection = currentStates['minecraft:cardinal_direction'];

            // Check if the block above is air
            if (aboveBlock.typeId === 'minecraft:air' && !block.permutation.getState('kai:upper_block_bit')) {
                // Create a new permutation for the block above with the cardinal direction
                const aboveBlockPermutation = BlockPermutation.resolve('kai:door', {
                    'kai:upper_block_bit': true,
                    'minecraft:cardinal_direction': cardinalDirection
                });
                aboveBlock.setPermutation(aboveBlockPermutation);

                // Update the block's permutation with the new state
                const newPermutation = BlockPermutation.resolve(block.typeId, currentStates);

                // Apply the new permutation to the block
                block.setPermutation(newPermutation);
            } // Check if the block above is not air and the current block is not an upper block
            
            

            // Check if the cardinal direction of the block is south
            if (cardinalDirection === 'south' && eastBlock?.typeId === 'kai:door') {
                const eastBlockStates = eastBlock.permutation.getAllStates();
                // Check if the east block is a kai:door with kai:door_hinge_bit set to false
                if (!eastBlockStates['kai:door_hinge_bit']) {
                    // Change the kai:door_hinge_bit state of the placed block to true
                    const newPermutation = BlockPermutation.resolve(block.typeId, {
                        ...currentStates,
                        'kai:door_hinge_bit': true
                    });
                    block.setPermutation(newPermutation);
                }
                // Also, check if the block above has the same cardinal direction and if the block to the east of the above block is a kai:door
                const aboveBlockCardinalDirection = aboveBlock.permutation.getState('minecraft:cardinal_direction');
                const eastBlockAbove = aboveBlock.east();
                if (
                    aboveBlockCardinalDirection === 'south' &&
                    eastBlockAbove?.typeId === 'kai:door'
                ) {
                    const eastBlockAboveStates = eastBlockAbove.permutation.getAllStates();
                    // Check if the east block above is a kai:door with kai:door_hinge_bit set to false
                    if (!eastBlockAboveStates['kai:door_hinge_bit']) {
                        // Change the kai:door_hinge_bit state of the block above to true
                        const newAbovePermutation = BlockPermutation.resolve(aboveBlock.typeId, {
                            ...eastBlockAboveStates,
                            'kai:door_hinge_bit': true
                        });
                        aboveBlock.setPermutation(newAbovePermutation);
                    }
                }
            }

            // Check if the cardinal direction of the block is east
            if (cardinalDirection === 'east' && northBlock?.typeId === 'kai:door') {
                const northBlockStates = northBlock.permutation.getAllStates();
                // Check if the north block is a kai:door with kai:door_hinge_bit set to false
                if (!northBlockStates['kai:door_hinge_bit']) {
                    // Change the kai:door_hinge_bit state of the placed block to true
                    const newPermutation = BlockPermutation.resolve(block.typeId, {
                        ...currentStates,
                        'kai:door_hinge_bit': true
                    });
                    block.setPermutation(newPermutation);
                }
                // Also, check if the block above has the same cardinal direction and if the block to the north of the above block is a kai:door
                const aboveBlockCardinalDirection = aboveBlock.permutation.getState('minecraft:cardinal_direction');
                const northBlockAbove = aboveBlock.north();
                if (
                    aboveBlockCardinalDirection === 'east' &&
                    northBlockAbove?.typeId === 'kai:door'
                ) {
                    const northBlockAboveStates = northBlockAbove.permutation.getAllStates();
                    // Check if the north block above is a kai:door with kai:door_hinge_bit set to false
                    if (!northBlockAboveStates['kai:door_hinge_bit']) {
                        // Change the kai:door_hinge_bit state of the block above to true
                        const newAbovePermutation = BlockPermutation.resolve(aboveBlock.typeId, {
                            ...northBlockAboveStates,
                            'kai:door_hinge_bit': true
                        });
                        aboveBlock.setPermutation(newAbovePermutation);
                    }
                }
            }

            // Check if the cardinal direction of the block is north
            if (cardinalDirection === 'north' && westBlock?.typeId === 'kai:door') {
                const westBlockStates = westBlock.permutation.getAllStates();
                // Check if the west block is a kai:door with kai:door_hinge_bit set to false
                if (!westBlockStates['kai:door_hinge_bit']) {
                    // Change the kai:door_hinge_bit state of the placed block to true
                    const newPermutation = BlockPermutation.resolve(block.typeId, {
                        ...currentStates,
                        'kai:door_hinge_bit': true
                    });
                    block.setPermutation(newPermutation);
                }
                // Also, check if the block above has the same cardinal direction and if the block to the west of the above block is a kai:door
                const aboveBlockCardinalDirection = aboveBlock.permutation.getState('minecraft:cardinal_direction');
                const westBlockAbove = aboveBlock.west();
                if (
                    aboveBlockCardinalDirection === 'north' &&
                    westBlockAbove?.typeId === 'kai:door'
                ) {
                    const westBlockAboveStates = westBlockAbove.permutation.getAllStates();
                    // Check if the west block above is a kai:door with kai:door_hinge_bit set to false
                    if (!westBlockAboveStates['kai:door_hinge_bit']) {
                        // Change the kai:door_hinge_bit state of the block above to true
                        const newAbovePermutation = BlockPermutation.resolve(aboveBlock.typeId, {
                            ...westBlockAboveStates,
                            'kai:door_hinge_bit': true
                        });
                        aboveBlock.setPermutation(newAbovePermutation);
                    }
                }
            }

            // Check if the cardinal direction of the block is west
            if (cardinalDirection === 'west' && southBlock?.typeId === 'kai:door') {
                const southBlockStates = southBlock.permutation.getAllStates();
                // Check if the south block is a kai:door with kai:door_hinge_bit set to false
                if (!southBlockStates['kai:door_hinge_bit']) {
                    // Change the kai:door_hinge_bit state of the placed block to true
                    const newPermutation = BlockPermutation.resolve(block.typeId, {
                        ...currentStates,
                        'kai:door_hinge_bit': true
                    });
                    block.setPermutation(newPermutation);
                }
                // Also, check if the block above has the same cardinal direction and if the block to the south of the above block is a kai:door
                const aboveBlockCardinalDirection = aboveBlock.permutation.getState('minecraft:cardinal_direction');
                const southBlockAbove = aboveBlock.south();
                if (
                    aboveBlockCardinalDirection === 'west' &&
                    southBlockAbove?.typeId === 'kai:door'
                ) {
                    const southBlockAboveStates = southBlockAbove.permutation.getAllStates();
                    // Check if the south block above is a kai:door with kai:door_hinge_bit set to false
                    if (!southBlockAboveStates['kai:door_hinge_bit']) {
                        // Change the kai:door_hinge_bit state of the block above to true
                        const newAbovePermutation = BlockPermutation.resolve(aboveBlock.typeId, {
                            ...southBlockAboveStates,
                            'kai:door_hinge_bit': true
                        });
                        aboveBlock.setPermutation(newAbovePermutation);
                    }
                }
            }

            // Mark the block as processed
            processedBlocks.set(`${x},${y},${z}`, true);
        }
    });
});

// Subscribe to the 'playerBreakBlock' event to remove processed block entry
world.afterEvents.playerBreakBlock.subscribe(eventData => {
    const { block } = eventData;
    const { x, y, z } = block.location;

    // Remove the block's entry from the processedBlocks map
    processedBlocks.delete(`${x},${y},${z}`);

    // Check if the block above or below the destroyed block is also kai:door
    const aboveBlock = block.above();
    const belowBlock = block.below();
    if (belowBlock.typeId === 'kai:door') {
        belowBlock.setType('minecraft:air');
        processedBlocks.delete(`${x},${y-1},${z}`); // Remove the below block's entry
    } else if (aboveBlock.typeId === 'kai:door') {
        aboveBlock.setType('minecraft:air');
        processedBlocks.delete(`${x},${y+1},${z}`); // Remove the above block's entry
    }
});

world.beforeEvents.playerPlaceBlock.subscribe(event => {
    const { block } = event;
    const aboveBlock = block.above();

    if (aboveBlock.typeId !== 'minecraft:air') {
        event.cancel = true;
    }
});