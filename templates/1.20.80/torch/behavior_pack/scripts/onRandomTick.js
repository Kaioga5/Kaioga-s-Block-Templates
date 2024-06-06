// Import necessary modules from Minecraft server API
import { world, MolangVariableMap } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_random_tick for torch particles
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_random_tick', {
        onRandomTick(e) {
            // Destructure event data for easier access
            const { block } = e;

            // Check if the block is of type 'kai:torch'
            if (block.typeId === 'kai:torch') {

                // Get the block face state
                const blockFace = block.permutation.getState('minecraft:block_face');

                // Define positions for the particles based on the block face state
                const particlePositions = {
                    north: [0.5, 0.9, 0.75],
                    south: [0.5, 0.9, 0.25],
                    east: [0.25, 0.9, 0.5],
                    west: [0.75, 0.9, 0.5],
                    up: [0.5, 0.7, 0.5]
                };

                // Get the particle position based on the block face
                const position = particlePositions[blockFace];

                // Check if the position is defined
                if (position) {
                    
                    // Destructure position into x, y, z coordinates
                    const [offsetX, offsetY, offsetZ] = position;

                    // Get the block's current location
                    const { x, y, z } = block.location;

                    // Calculate the particle spawn position
                    const particleX = x + offsetX;
                    const particleY = y + offsetY;
                    const particleZ = z + offsetZ;

                    // Create an empty MolangVariableMap
                    const molangVariables = new MolangVariableMap();

                    // Spawn basic_flame_particle
                    block.dimension.spawnParticle('minecraft:basic_flame_particle', { x: particleX, y: particleY, z: particleZ }, molangVariables);

                    // Spawn basic_smoke_particle
                    block.dimension.spawnParticle('minecraft:basic_smoke_particle', { x: particleX, y: particleY, z: particleZ }, molangVariables);
                }
            }
        }
    });
});