// Registers the component that puts plants in the pot and takes them out.
// Vanilla's flower pot keeps its contents in a block entity, which custom
// blocks do not get at 1.26.40, and a custom block state holds at most sixteen
// values, fewer than the plants a pot should accept. So this template stores
// the contents the way vanilla's own blocks do: the empty pot is one block,
// every plant it can hold is its own block, and planting swaps one identifier
// for the other. plants.ts is the list both sides read.
import { EquipmentSlot, GameMode, ItemStack, system, } from "@minecraft/server";
import { POTTED_PLANTS } from "./plants.js";
// The block a pot goes back to when its plant is taken out
const EMPTY_POT = "kai_templates:flower_pot";
// Held item to the block the pot becomes
const BLOCK_BY_ITEM = new Map(POTTED_PLANTS.map((plant) => [plant.item, plant.block]));
// Potted block to the item it hands back
const ITEM_BY_BLOCK = new Map(POTTED_PLANTS.map((plant) => [plant.block, plant.item]));
// Remove one item from the player's main hand, unless they are in creative
function consumeOne(player, equipment, held) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    if (held.amount > 1) {
        held.amount -= 1;
        equipment.setEquipment(EquipmentSlot.Mainhand, held);
    }
    else {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    // Every pot block carries this component: the empty one and all the
    // potted ones, because a click means "plant" on one and "take" on the other
    init.blockComponentRegistry.registerCustomComponent("kai_templates:flower_pot_plant", {
        // Run this code whenever the player interacts with a pot
        onPlayerInteract(event) {
            // Get the block, dimension and player from the event
            const { block, dimension, player } = event;
            if (player === undefined) {
                return;
            }
            const center = block.center();
            // A potted block gives its plant back on any click and turns into
            // the empty pot. Vanilla puts the plant straight in your inventory;
            // spawning it at the pot is the stable-API equivalent
            const planted = ITEM_BY_BLOCK.get(block.typeId);
            if (planted !== undefined) {
                block.setType(EMPTY_POT);
                dimension.spawnItem(new ItemStack(planted, 1), {
                    x: center.x,
                    y: center.y + 0.5,
                    z: center.z,
                });
                dimension.playSound("dig.grass", center);
                return;
            }
            // The pot is empty, check what the player is holding
            const equipment = player.getComponent("minecraft:equippable");
            const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
            if (equipment === undefined || held === undefined) {
                return;
            }
            // Not a pottable item, nothing happens, like vanilla
            const potted = BLOCK_BY_ITEM.get(held.typeId);
            if (potted === undefined) {
                return;
            }
            // Plant it: swap in the potted block, take one item, play the sound
            block.setType(potted);
            consumeOne(player, equipment, held);
            dimension.playSound("dig.grass", center);
        },
    });
});
