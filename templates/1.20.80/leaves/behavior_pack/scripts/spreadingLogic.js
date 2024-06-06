// Import necessary modules from Minecraft server API
import { world, BlockPermutation } from '@minecraft/server';

// Array of allowed blocks; these blocks should be, ideally, the single log type of your leaves (e.g. oak leaves = oak log)
const allowedBlocks = ['minecraft:oak_log', 'kai:log'];

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_random_tick for leaves behavior logic
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_random_tick', {
        onRandomTick(e) {
            // Destructure event data for easier access
            const { block } = e;
            const { x, y, z } = block.location;

            // Check if there is a connected allowed block within the taxicab distance of 4 blocks
            const persistent = isConnectedToAllowedBlock(block, 4);

            // Set the block state kai:persistent_bit accordingly
            const currentStates = block.permutation.getAllStates();
            const newStates = { ...currentStates, 'kai:persistent_bit': persistent };
            const newPermutation = BlockPermutation.resolve(block.typeId, newStates);
            block.setPermutation(newPermutation);

            // Destroy the block if kai:persistent_bit and kai:placed are false
            if (!persistent && !block.permutation.getState('kai:placed')) {
                block.dimension.runCommand(`/setblock ${x} ${y} ${z} air destroy`);
            }
        }
    });
});

// Function to check if there is an allowed block within the specified taxicab distance
function isConnectedToAllowedBlock(block, maxDistance) {
    // Initialize a queue with the starting block and a distance of 0
    const queue = [{ block, dist: 0 }];
    // Create a set to keep track of visited blocks
    const visited = new Set();

    // Process blocks in the queue until it is empty
    while (queue.length > 0) {
        // Dequeue the first block in the queue
        const { block: currentBlock, dist } = queue.shift();
        // Skip further processing if the distance exceeds maxDistance
        if (dist > maxDistance) continue;

        // Get the current block's coordinates
        const { x, y, z } = currentBlock.location;
        // Create a unique key for the current block's coordinates
        const blockKey = `${x},${y},${z}`;
        // Skip processing if the block has already been visited
        if (visited.has(blockKey)) continue;

        // Mark the current block as visited
        visited.add(blockKey);

        // If the current block is an allowed block, return true
        if (allowedBlocks.includes(currentBlock.typeId)) {
            return true;
        }

        // If the current block is a 'kai:leaves' block
        if (currentBlock.typeId === 'kai:leaves') {
            // Get the 'kai:persistent_bit' state of the current block
            const persistentBit = currentBlock.permutation.getState('kai:persistent_bit');

            // Only propagate if persistentBit is true or if it is the starting block
            if (persistentBit || dist === 0) {
                // Get the adjacent blocks
                const adjacentBlocks = [
                    currentBlock.above(),
                    currentBlock.below(),
                    currentBlock.north(),
                    currentBlock.south(),
                    currentBlock.east(),
                    currentBlock.west()
                ];

                // Add each adjacent block to the queue if it hasn't been visited
                for (const adjacentBlock of adjacentBlocks) {
                    if (adjacentBlock && !visited.has(`${adjacentBlock.location.x},${adjacentBlock.location.y},${adjacentBlock.location.z}`)) {
                        queue.push({ block: adjacentBlock, dist: dist + 1 });
                    }
                }
            }
        }
    }

    // Return false if no allowed block is found within the specified distance
    return false;
}

// Placing functionality; this in order to not let the leaves dissapear when placed by a player
world.afterEvents.playerPlaceBlock.subscribe(eventData => {
    const { block } = eventData;
  
    // Check if the placed block is 'kai:leaves' and if 'kai:placed' state is false
    if (block.typeId === 'kai:leaves' && !block.permutation.getState('kai:placed')) {
      // Get the current states of the block
      const currentStates = block.permutation.getAllStates();
      
      // Update the 'kai:placed' state to true
      const newStates = { ...currentStates, 'kai:placed': true };
      
      // Create a new permutation with the updated states
      const newPermutation = BlockPermutation.resolve(block.typeId, newStates);
      
      // Set the block to the new permutation
      block.setPermutation(newPermutation);
    }
})