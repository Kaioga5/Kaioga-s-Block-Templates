import { world, BlockPermutation } from '@minecraft/server';

world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_random_tick for grass spreading logic
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_random_tick', {
        onRandomTick(e) {
            // Destructure event data for easier access
            const { block } = e;

            // Define the range dimensions (3x3x3) centered around the source block
            const range = 1;

            // Get the block's current location
            const { x, y, z } = block.location;

            // Allowed blocks above the target dirt block, should be blocks that let light go through
            const allowedBlocks = [
                'minecraft:air', 'minecraft:glass', 'minecraft:torch', 'minecraft:end_rod', 'minecraft:lightning_rod', 
                'minecraft:glowstone', 'minecraft:sea_lantern', 'minecraft:redstone_lamp', 'minecraft:lantern', 'minecraft:campfire', 
                'minecraft:soul_campfire', 'minecraft:beacon', 'minecraft:shroomlight', 'minecraft:jack_o_lantern', 'minecraft:soul_lantern', 
                'minecraft:glass_pane', 'minecraft:stained_glass', 'minecraft:stained_glass_pane', 'minecraft:leaves', 'minecraft:iron_bars', 
                'minecraft:chain', 'minecraft:ice', 'minecraft:packed_ice', 'minecraft:blue_ice', 'minecraft:slime_block', 
                'minecraft:honey_block', 'minecraft:trapdoor', 'minecraft:glass_bottle', 'minecraft:hopper', 'minecraft:rail', 
                'minecraft:detector_rail', 'minecraft:activator_rail', 'minecraft:powered_rail', 'minecraft:scaffolding', 'minecraft:vines', 
                'minecraft:carpet', 'minecraft:ladder', 'minecraft:snow_layer', 'minecraft:iron_trapdoor', 'minecraft:tripwire', 
                'minecraft:tripwire_hook', 'minecraft:banner', 'minecraft:web', 'minecraft:chorus_plant', 'minecraft:chorus_flower', 
                'minecraft:end_gateway', 'minecraft:end_portal', 'minecraft:end_portal_frame', 'minecraft:barrier', 'minecraft:structure_void', 
                'minecraft:bamboo', 'minecraft:flower_pot', 'minecraft:cobweb', 'minecraft:conduit', 'minecraft:conduit_power', 
                'minecraft:soul_torch', 'minecraft:soul_fire', 'minecraft:candle', 'minecraft:candle_cake', 'minecraft:azalea', 
                'minecraft:flowering_azalea'
            ];            

            // Check all blocks within the 3x3x3 range
            for (let dx = -range; dx <= range; dx++) {
                for (let dy = -range; dy <= range; dy++) {
                    for (let dz = -range; dz <= range; dz++) {
                        // Skip the source block itself
                        if (dx === 0 && dy === 0 && dz === 0) continue;

                        // Get the block at the current position within the range
                        const targetBlock = block.dimension.getBlock({ x: x + dx, y: y + dy, z: z + dz });

                        // Check if the target block is KAI:dirt
                        if (targetBlock && targetBlock.typeId === 'kai:dirt') {

                            // Get the block above the target block
                            const blockAbove = targetBlock.above();

                            // Check if the block above is not in the allowed blocks list
                            if (blockAbove && !allowedBlocks.includes(blockAbove.typeId)) {
                                // Turn the block into a kai:dirt block
                                targetBlock.setType('kai:dirt');
                            } else if (targetBlock.typeId === 'kai:dirt' && blockAbove && allowedBlocks.includes(blockAbove.typeId)) {
                                // If the target block is kai:dirt and the block above is in the allowed blocks list, turn it into a kai:grass block
                                targetBlock.setType('kai:grass');
                            }
                        }
                    }
                }
            }
        }
    });
});