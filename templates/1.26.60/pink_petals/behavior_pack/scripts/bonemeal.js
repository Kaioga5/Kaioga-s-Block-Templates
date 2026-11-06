// Bone meal on a patch of petals.
// Vanilla adds one flower while there is room, and once the block is full it
// gives the player a copy of the item instead of growing anything. The click
// is claimed on the interact-with-block before-event, the path a held item
// takes, and the work runs a tick later, outside the read-only window.
import { EquipmentSlot, GameMode, ItemStack, system, world, } from "@minecraft/server";
import { BONE_MEAL_ID, BONE_MEAL_PETALS, MAX_PETALS, PETALS_ID } from "./config.js";
import { petalCount, setPetalCount } from "./petals.js";
const GROWTH_PARTICLE = "minecraft:crop_growth_emitter";
function consumeOne(player) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const equipment = player.getComponent("minecraft:equippable");
    const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (equipment === undefined || held === undefined) {
        return;
    }
    if (held.amount > 1) {
        held.amount -= 1;
        equipment.setEquipment(EquipmentSlot.Mainhand, held);
        return;
    }
    equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== PETALS_ID || event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }
    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (!block.isValid || block.typeId !== PETALS_ID) {
            return;
        }
        const centre = block.center();
        block.dimension.spawnParticle(GROWTH_PARTICLE, centre);
        block.dimension.playSound("item.bone_meal.use", centre);
        consumeOne(player);
        const petals = petalCount(block);
        if (petals >= MAX_PETALS) {
            // A full patch has nowhere to put another flower, so the meal pays
            // out a copy of the block instead
            block.dimension.spawnItem(new ItemStack(PETALS_ID, 1), centre);
            return;
        }
        setPetalCount(block, Math.min(MAX_PETALS, petals + BONE_MEAL_PETALS));
    });
});
