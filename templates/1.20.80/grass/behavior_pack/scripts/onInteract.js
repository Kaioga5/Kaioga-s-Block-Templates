// Import necessary modules from Minecraft server API
import { world, BlockPermutation, ItemStack } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named kai:on_interact for block interaction 
    eventData.blockTypeRegistry.registerCustomComponent('kai:on_interact', {
        // Define the behavior when a player interacts with the block
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player, face } = e;

            // Get the equipment component for the player
            const equipment = player.getComponent('equippable');

            // Get the selected item from the player's mainhand
            const selectedItem = equipment.getEquipment('Mainhand');

            // Check if the interaction is from the 'Up' face to a kai:grass block
            if (block.typeId === 'kai:grass' && face === 'Up') {
                // Check if the item in player-s hand is snow, snow layer, or a powder snow bucket
                if (selectedItem?.typeId === 'minecraft:snow' || selectedItem?.typeId === 'minecraft:snow_layer' || selectedItem?.typeId === 'minecraft:powder_snow_bucket') {
                    // Place the snow, snow layer or powder snow block on top of the current block
                    const blockAbove = block.above();
                    blockAbove.setType(selectedItem.typeId === 'minecraft:powder_snow_bucket' ? 'minecraft:powder_snow' : selectedItem.typeId);
                    // Change the kai:snowy block state to true on the kai:grass
                    updateSnowyState(block, true);
                    
                    // Decrease the amount of the selected item or replace powder snow bucket with empty bucket
                    if (selectedItem.typeId === 'minecraft:powder_snow_bucket') {
                        equipment.setEquipment('Mainhand', new ItemStack('minecraft:bucket', 1));
                    } else {
                        reduceItemAmount(selectedItem, equipment, player);
                    }
                }
            }
                // Check if the interaction is on any face excluding down
                if (face !== 'Down') {
                    // Check if the selected item has the tag 'minecraft:is_shovel'
                    if (selectedItem?.hasTag('minecraft:is_shovel')) {
                        // Turn the block to grass path
                        block.setType('kai:grass_path');
                        // Play sound effect p.d check iki for correct sound idk it yet
                        player.playSound('use.grass');
                        // Reduce durability of the tool
                        reduceDurability(selectedItem, equipment, player);
                    }

                    // Check if the selected item has the tag 'minecraft:is_hoe'
                    if (selectedItem?.hasTag('minecraft:is_hoe')) {
                        // Turn the block to farmland
                        block.setType('minecraft:farmland');
                        // Play sound effect p.d check iki for correct sound idk it yet
                        player.playSound('use.gravel');
                        // Reduce durability of the tool
                        reduceDurability(selectedItem, equipment, player);
                }
            }
        }
    });
});

// Function to reduce the amount of the selected item
function reduceItemAmount(item, equipment, player) {
    if (player.getGameMode() !== 'creative') {
        if (item.amount > 1) {
            item.amount -= 1;
            equipment.setEquipment('Mainhand', item);
        } else if (item.amount === 1) {
            equipment.setEquipment('Mainhand', undefined); // Clear the slot if only 1 item left
        }
    }
}

// Function to reduce the durability of the tool
function reduceDurability(item, equipment, player) {
    // Get the durability component of the selected item
    const durability = item.getComponent('durability');

    // Check if the item has a durability component and if its damage is less than the maximum durability
    if (durability && durability.damage < durability.maxDurability) {
        // Increment the damage of the item, reducing its durability
        durability.damage++;
        
        // Update the equipment in the player's main hand with the modified item
        equipment.setEquipment('Mainhand', item);
    }

    // Check if the item has a durability component and if its damage is greater than or equal to the maximum durability
    if (durability && durability.damage >= durability.maxDurability) {
        // Play the sound effect for breaking an item
        player.playSound('random.break');
        
        // Replace the item in the player's main hand with an air block (i.e., remove the item)
        equipment.setEquipment('Mainhand', new ItemStack('minecraft:air', 1));
    }
}

// Function to update the kai:snowy state on the block
function updateSnowyState(block, isSnowy) {
    // Get the current block states of the block
    const currentStates = block.permutation.getAllStates();
    // Create a new permutation with the updated snowy state
    const newPermutation = BlockPermutation.resolve(block.typeId, {
        ...currentStates,
        'kai:snowy': isSnowy
    });
    block.setPermutation(newPermutation);
}
