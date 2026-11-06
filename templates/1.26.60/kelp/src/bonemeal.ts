// Bone meal on kelp.
// The click is claimed on the interact-with-block before-event, the path a
// held item takes, and the growth runs a tick later, outside the read-only
// window. Bone meal used anywhere on a strand grows it from the top, which is
// what a player expects.
import { Block, EquipmentSlot, GameMode, Player, system, world } from "@minecraft/server";
import { BONE_MEAL_ID, BONE_MEAL_MAX, BONE_MEAL_MIN, KELP_ID, MAX_AGE } from "./config.js";
import { extend, isTip } from "./growth.js";

const GROWTH_PARTICLE = "minecraft:crop_growth_emitter";

function consumeOne(player: Player): void {
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

// Walk up to the growing end of the strand
function findTip(block: Block): Block {
    let current = block;
    for (let step = 0; step < MAX_AGE + 1; step++) {
        if (isTip(current)) {
            return current;
        }
        const above: Block | undefined = current.above();
        if (above === undefined || above.typeId !== KELP_ID) {
            return current;
        }
        current = above;
    }
    return current;
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== KELP_ID || event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }

    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (block.typeId !== KELP_ID) {
            return;
        }
        const tip = findTip(block);
        block.dimension.spawnParticle(GROWTH_PARTICLE, tip.center());
        block.dimension.playSound("item.bone_meal.use", tip.center());
        consumeOne(player);

        const span = BONE_MEAL_MAX - BONE_MEAL_MIN + 1;
        const wanted = BONE_MEAL_MIN + Math.floor(Math.random() * span);
        let end: Block = tip;
        for (let grown = 0; grown < wanted; grown++) {
            if (!extend(end)) {
                return;
            }
            const next = end.above();
            if (next === undefined) {
                return;
            }
            end = next;
        }
    });
});
