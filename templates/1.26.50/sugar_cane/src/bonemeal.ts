// Bone meal on sugar cane.
// This is a genuine per-edition fork: on Bedrock bone meal takes a stand
// straight to full height, and on Java it does nothing at all. Bedrock is what
// this template follows.
import {
    Block,
    EquipmentSlot,
    GameMode,
    Player,
    system,
    world,
} from "@minecraft/server";
import { BONE_MEAL_ID, CANE_ID, MAX_HEIGHT } from "./config.js";
import { isCane, rootOf } from "./cane.js";
import { extend } from "./growth.js";

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

// Walk up to the growing end, so bone meal used anywhere on a stand grows it
// from the top
function findTop(block: Block): Block {
    let current: Block = block;
    for (let step = 0; step < MAX_HEIGHT; step++) {
        const above: Block | undefined = current.above();
        if (!isCane(above)) {
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
    if (event.block.typeId !== CANE_ID || event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }

    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (!block.isValid || block.typeId !== CANE_ID) {
            return;
        }
        // Take the stand all the way up rather than one block at a time, which
        // is what Bedrock bone meal does here
        let grown = false;
        let top = findTop(rootOf(block));
        for (let step = 0; step < MAX_HEIGHT; step++) {
            if (!extend(top)) {
                break;
            }
            grown = true;
            const above: Block | undefined = top.above();
            if (above === undefined) {
                break;
            }
            top = above;
        }
        if (!grown) {
            return;
        }
        const centre = top.center();
        block.dimension.spawnParticle(GROWTH_PARTICLE, centre);
        block.dimension.playSound("item.bone_meal.use", centre);
        consumeOne(player);
    });
});
