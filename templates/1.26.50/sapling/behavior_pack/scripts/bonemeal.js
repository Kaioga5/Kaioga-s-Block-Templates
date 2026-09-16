// Bone meal on a sapling.
// This listens to the interact-with-block before-event rather than a block
// interact component, because that is the path a held item takes. The click is
// cancelled so the vanilla bone meal handler does not also run, and the growth
// happens a tick later, outside the read-only before-event window.
import { EquipmentSlot, GameMode, system, world } from "@minecraft/server";
import { BONE_MEAL_CHANCE, BONE_MEAL_ID, SAPLING_ID } from "./config.js";
import { advance } from "./growth.js";
// The green sparkle vanilla shows whether or not the roll succeeded
const GROWTH_PARTICLE = "minecraft:crop_growth_emitter";
// Take one bone meal from the stack, unless the player is in creative
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
function applyBoneMeal(block, player) {
    block.dimension.spawnParticle(GROWTH_PARTICLE, block.center());
    block.dimension.playSound("item.bone_meal.use", block.center());
    consumeOne(player);
    // Vanilla rolls for the advance and keeps the bone meal spent either way
    if (Math.random() < BONE_MEAL_CHANCE) {
        advance(block);
    }
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== SAPLING_ID) {
        return;
    }
    if (event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }
    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (block.typeId === SAPLING_ID) {
            applyBoneMeal(block, player);
        }
    });
});
