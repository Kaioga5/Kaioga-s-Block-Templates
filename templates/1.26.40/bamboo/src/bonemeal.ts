// Bone meal on bamboo and on a shoot.
// The click is claimed on the interact-with-block before-event, the path a
// held item takes, and the growth runs a tick later, outside the read-only
// window. A shoot raises its first stalk section; a stalk gains one or two more
// from its top, which is what vanilla's bone meal does.
import { Block, EquipmentSlot, GameMode, Player, system, world } from "@minecraft/server";
import { BAMBOO_ID, BONE_MEAL_ID, BONE_MEAL_MAX, BONE_MEAL_MIN } from "./config.js";
import { findTop, growFrom, isShoot } from "./stalk.js";

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

// Grow the plant this block belongs to. Returns true when at least one section
// was added
function apply(block: Block): boolean {
    // A shoot with nothing above it raises its first section, and only one,
    // which is what vanilla's shoot does with bone meal
    if (isShoot(block) && block.above()?.isAir === true) {
        return growFrom(block);
    }

    // Clicking anywhere on a stalk grows it from the top, which is what a
    // player expects when they bone meal the middle of one
    const span = BONE_MEAL_MAX - BONE_MEAL_MIN + 1;
    const wanted = BONE_MEAL_MIN + Math.floor(Math.random() * span);
    let top: Block = findTop(block);
    let grown = 0;
    while (grown < wanted) {
        // growFrom refuses a finished top or a full-height stalk, so bone meal
        // stops where vanilla's does
        if (!growFrom(top)) {
            break;
        }
        grown++;
        const next = top.above();
        if (next === undefined) {
            break;
        }
        top = next;
    }
    return grown > 0;
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== BAMBOO_ID) {
        return;
    }
    if (event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }

    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (block.typeId !== BAMBOO_ID) {
            return;
        }
        // A finished or full-height stalk takes nothing, and vanilla keeps the
        // bone meal in that case
        if (!apply(block)) {
            return;
        }
        block.dimension.spawnParticle(GROWTH_PARTICLE, block.center());
        block.dimension.playSound("item.bone_meal.use", block.center());
        consumeOne(player);
    });
});
