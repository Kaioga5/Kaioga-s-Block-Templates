// Bone meal on the bush.
// One use gives a bush with no berries its first berries at once, or adds a
// stage to one that has some, and is spent. On a full bush it picks the
// berries instead and the bone meal is kept, which is what vanilla does.
// The click arrives through the interact-with-block before-event, because
// that is the path a held item takes. Growth happens a tick later, outside
// the read-only before-event window.
import { EquipmentSlot, GameMode, system, world } from "@minecraft/server";
import { BONE_MEAL_BERRY_GROWTH, BONE_MEAL_ID, BUSH_ID, MAX_GROWTH } from "./config.js";
import { growthOf, setGrowth } from "./bush.js";
// The green sparkle vanilla shows when bone meal takes
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
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== BUSH_ID || event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }
    // A full bush lets the click through, so the block's own interact handler
    // picks it and the bone meal stays in the hand
    if (growthOf(event.block) >= MAX_GROWTH) {
        return;
    }
    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (!block.isValid || block.typeId !== BUSH_ID) {
            return;
        }
        const growth = growthOf(block);
        if (growth >= MAX_GROWTH) {
            return;
        }
        setGrowth(block, Math.min(MAX_GROWTH, Math.max(growth + 1, BONE_MEAL_BERRY_GROWTH)));
        block.dimension.spawnParticle(GROWTH_PARTICLE, block.center());
        block.dimension.playSound("item.bone_meal.use", block.center());
        consumeOne(player);
    });
});
