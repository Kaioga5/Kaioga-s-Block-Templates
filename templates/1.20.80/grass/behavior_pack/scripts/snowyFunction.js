import { world, BlockPermutation, system } from '@minecraft/server';

// Function to update the kai:snowy state on the block below
function updateSnowyState(block, isSnowy) {
    const blockBelow = block.below();
    if (blockBelow && blockBelow.typeId === 'kai:grass') {
        // Get the current block states of the block below
        const currentStates = blockBelow.permutation.getAllStates();
        // Create a new permutation with the updated snowy state
        const newPermutation = BlockPermutation.resolve('kai:grass', {
            ...currentStates,
            'kai:snowy': isSnowy
        });
        // Delay the execution by one tick using system.run
        system.run(() => {
            blockBelow.setPermutation(newPermutation);
        });
    }
}


// Listen for block destroy event
world.afterEvents.playerBreakBlock.subscribe(eventData => {
    const { block } = eventData;
    // If a snow, snow layer or powder snow block is destroyed and has a kai:grass block below, change the block state kai:snowy of the kai:grass block to false
    if (eventData.brokenBlockPermutation.type.id === 'minecraft:snow' || eventData.brokenBlockPermutation.type.id === 'minecraft:snow_layer' || eventData.brokenBlockPermutation.type.id === 'minecraft:powder_snow') {
        updateSnowyState(block, false);
    }
});

world.beforeEvents.itemUseOn.subscribe(eventData => {
    // If a player interacts with a minecraft:powder snow block using a bucket, and has a kai:grass block below, change the block state kai:snowy of the kai:grass block to false
    if (eventData.itemStack.typeId === 'minecraft:bucket' && eventData.block.typeId === 'minecraft:powder_snow') {
        updateSnowyState(eventData.block, false);
    }
});