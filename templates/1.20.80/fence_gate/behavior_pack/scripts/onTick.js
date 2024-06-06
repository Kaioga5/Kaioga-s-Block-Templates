// Import necessary modules from Minecraft server API
import { world, BlockPermutation } from '@minecraft/server';

// Initialize a Map to store the state of each block for tracking changes
const blockStates = new Map();

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_tick for fence gate connections and interaction with redstone
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_tick', {
        onTick(e) {
            // Destructure event data for easier access
            const { block } = e;
            const { x, y, z } = block.location;
            const blockKey = `${x},${y},${z}`;
            const currentState = block.permutation.getState('kai:open');
            const cardinalDirection = block.permutation.getState('minecraft:cardinal_direction');
            const sound = currentState ? 'open.fence_gate' : 'close.fence_gate';

            // Get adjacent blocks
            const adjacentBlocks = {
                north: block.north(),
                east: block.east(),
                south: block.south(),
                west: block.west(),
                above: block.above(),
                below: block.below()
            };

            // Define allowed blocks for kai:in_wall_bit state (blocks should be walls to maintain vanilla functionality)
            const allowedBlocks = ['minecraft:cobblestone_wall', 'minecraft:stone_wall'];

            // Function to check if any adjacent blocks are of allowed types
            const hasAllowedBlock = (blocks) => blocks.some(adjacentBlock => allowedBlocks.includes(adjacentBlock?.typeId));

            // Check if any allowed adjacent blocks exist based on the cardinal direction
            const hasAllowedAdjacentBlock = (cardinalDirection === 'north' || cardinalDirection === 'south')
                ? hasAllowedBlock([adjacentBlocks.east, adjacentBlocks.west])
                : hasAllowedBlock([adjacentBlocks.north, adjacentBlocks.south]);

            // Update kai:in_wall_bit state based on adjacent blocks
            block.setPermutation(block.permutation.withState('kai:in_wall_bit', hasAllowedAdjacentBlock));

            // Define blocks excluded from redstone functionality
            const excludedBlocks = [
                'minecraft:wooden_door', 'minecraft:iron_door', 'minecraft:acacia_door', 'minecraft:birch_door',
                'minecraft:crimson_door', 'minecraft:dark_oak_door', 'minecraft:jungle_door', 'minecraft:oak_door',
                'minecraft:spruce_door', 'minecraft:warped_door', 'minecraft:mangrove_door', 'minecraft:cherry_door',
                'minecraft:bamboo_door', 'minecraft:iron_trapdoor', 'minecraft:acacia_trapdoor', 'minecraft:birch_trapdoor',
                'minecraft:crimson_trapdoor', 'minecraft:dark_oak_trapdoor', 'minecraft:jungle_trapdoor', 'minecraft:oak_trapdoor',
                'minecraft:spruce_trapdoor', 'minecraft:warped_trapdoor', 'minecraft:mangrove_trapdoor', 'minecraft:cherry_trapdoor',
                'minecraft:bamboo_trapdoor', 'minecraft:trapdoor', 'minecraft:observer', 'minecraft:unpowered_repeater',
                'minecraft:powered_repeater', 'minecraft:unpowered_comparator', 'minecraft:powered_comparator'
            ];

            // Check if any adjacent blocks have redstone power, excluding certain block types
            const hasRedstonePower = Object.values(adjacentBlocks).some(adjacentBlock =>
                !excludedBlocks.includes(adjacentBlock?.typeId) && adjacentBlock?.getRedstonePower() > 0
            );

            // Check if there's a redstone torch directly above the block
            const isRedstoneTorchTop = adjacentBlocks.above?.typeId === 'minecraft:redstone_torch' &&
                adjacentBlocks.above.permutation.getState('torch_facing_direction') === 'top';

            // Define blocks that should be destroyed when receiving redstone power and in a specific position
            const destroyableBlocksArray = [
                'minecraft:wooden_button', 'minecraft:stone_button', 'minecraft:oak_button', 'minecraft:spruce_button',
                'minecraft:birch_button', 'minecraft:jungle_button', 'minecraft:acacia_button', 'minecraft:dark_oak_button',
                'minecraft:crimson_button', 'minecraft:warped_button', 'minecraft:polished_blackstone_button', 'minecraft:mangrove_button',
                'minecraft:cherry_button', 'minecraft:bamboo_button', 'minecraft:wooden_pressure_plate', 'minecraft:stone_pressure_plate',
                'minecraft:light_weighted_pressure_plate', 'minecraft:heavy_weighted_pressure_plate', 'minecraft:acacia_pressure_plate',
                'minecraft:birch_pressure_plate', 'minecraft:crimson_pressure_plate', 'minecraft:dark_oak_pressure_plate',
                'minecraft:jungle_pressure_plate', 'minecraft:spruce_pressure_plate', 'minecraft:warped_pressure_plate',
                'minecraft:mangrove_pressure_plate', 'minecraft:cherry_pressure_plate', 'minecraft:bamboo_pressure_plate',
                'minecraft:polished_blackstone_pressure_plate'
            ];

            // Check if the block above is a destroyable block and is powered
            const destroyableBlocks = destroyableBlocksArray.includes(adjacentBlocks.above?.typeId) &&
                adjacentBlocks.above?.getRedstonePower() > 0;

            // Check if an adjacent observer is facing the block and is powered
            const observerFacingBlock = [
                { block: adjacentBlocks.north, direction: 'north' },
                { block: adjacentBlocks.east, direction: 'east' },
                { block: adjacentBlocks.south, direction: 'south' },
                { block: adjacentBlocks.west, direction: 'west' },
                { block: adjacentBlocks.above, direction: 'up' },
                { block: adjacentBlocks.below, direction: 'down' }
            ].some(({ block, direction }) => block?.typeId === 'minecraft:observer' &&
                block?.permutation.getState('minecraft:facing_direction') === direction && block?.getRedstonePower() > 1);

            // Check if an adjacent powered repeater is facing the block
            const poweredRepeater = [
                { block: adjacentBlocks.north, direction: 'north' },
                { block: adjacentBlocks.east, direction: 'east' },
                { block: adjacentBlocks.south, direction: 'south' },
                { block: adjacentBlocks.west, direction: 'west' }
            ].some(({ block, direction }) => block?.typeId === 'minecraft:powered_repeater' &&
                block?.permutation.getState('minecraft:cardinal_direction') === direction);

            // Check if an adjacent powered comparator is facing the block
            const poweredComparator = [
                { block: adjacentBlocks.north, direction: 'north' },
                { block: adjacentBlocks.east, direction: 'east' },
                { block: adjacentBlocks.south, direction: 'south' },
                { block: adjacentBlocks.west, direction: 'west' }
            ].some(({ block, direction }) => block?.typeId === 'minecraft:powered_comparator' &&
                block?.permutation.getState('minecraft:cardinal_direction') === direction);

            // Retrieve the previous state of the block from the Map
            const previousState = blockStates.get(blockKey) || false;

            // Determine if the block should open or close based on redstone power and other conditions
            const shouldOpen = (hasRedstonePower || observerFacingBlock || poweredRepeater || poweredComparator) && !previousState && !isRedstoneTorchTop;
            const shouldClose = (!hasRedstonePower && !observerFacingBlock && !poweredRepeater && !poweredComparator) && previousState && !isRedstoneTorchTop;

            // Update the block's state if necessary
            if (shouldOpen || shouldClose) {
                const newState = shouldOpen;
                block.setPermutation(block.permutation.withState('kai:open', newState));
                world.sendMessage(newState ? "I have the power!!!" : "I lost the power!!!");
                block.dimension.playSound(sound, block.location);
                blockStates.set(blockKey, newState);

                // Update the block above if it's a kai:fence_gate and invisible
                if (adjacentBlocks.above.typeId === 'kai:fence_gate' && adjacentBlocks.above.permutation.getState('kai:invisible')) {
                    adjacentBlocks.above.setPermutation(adjacentBlocks.above.permutation.withState('kai:open', newState));
                }
            }

            // Destroy the block above our fence gate if necessary
            if (destroyableBlocks) {
                block.dimension.runCommand(`/setblock ${x} ${y + 1} ${z} air destroy`);
            }
        }
    });
});