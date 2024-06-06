// Import necessary modules from Minecraft server API
import { world } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_tick for fence connections
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_tick', {
        onTick(e) {
            // Destructure event data for easier access
            const { block } = e;

            // Get the block above the current block
            const aboveBlock = block.above();

            // If the block above is air and the current block is a fence, set it to kai:fence_inventory
            if (block.typeId === 'kai:fence' && aboveBlock.typeId === 'minecraft:air') {
                block.setType('kai:fence_inventory');
            }

            // Get adjacent blocks
            const north = block.north();
            const east = block.east();
            const south = block.south();
            const west = block.west();

            // Define an array of block types to exclude from connections
            const excludeBlocksArray = [
                'minecraft:air',
                'minecraft:wooden_door', 
                'minecraft:iron_door', 
                'minecraft:acacia_door', 
                'minecraft:birch_door', 
                'minecraft:crimson_door', 
                'minecraft:dark_oak_door', 
                'minecraft:jungle_door', 
                'minecraft:oak_door', 
                'minecraft:spruce_door', 
                'minecraft:warped_door', 
                'minecraft:mangrove_door',
                'minecraft:cherry_door',
                'minecraft:bamboo_door',
                'minecraft:iron_trapdoor', 
                'minecraft:acacia_trapdoor', 
                'minecraft:birch_trapdoor', 
                'minecraft:crimson_trapdoor', 
                'minecraft:dark_oak_trapdoor', 
                'minecraft:jungle_trapdoor', 
                'minecraft:oak_trapdoor', 
                'minecraft:spruce_trapdoor', 
                'minecraft:warped_trapdoor',
                'minecraft:mangrove_trapdoor',
                'minecraft:cherry_trapdoor',
                'minecraft:bamboo_trapdoor',
                'minecraft:trapdoor', 
                'minecraft:glass',
                'minecraft:glass_pane'
                // Add other block types you want to exclude
            ];

            // Check if the adjacent block is not in the excludeBlocksArray
            const northConnects = !excludeBlocksArray.includes(north?.typeId);
            const eastConnects = !excludeBlocksArray.includes(east?.typeId);
            const southConnects = !excludeBlocksArray.includes(south?.typeId);
            const westConnects = !excludeBlocksArray.includes(west?.typeId);

            // Update block states based on the presence of adjacent blocks
            block.setPermutation(block.permutation.withState('kai:north_picket', northConnects ? 1 : 0));
            block.setPermutation(block.permutation.withState('kai:south_picket', southConnects ? 1 : 0));
            block.setPermutation(block.permutation.withState('kai:east_picket', eastConnects ? 1 : 0));
            block.setPermutation(block.permutation.withState('kai:west_picket', westConnects ? 1 : 0));
        }
    });
});