// Bone meal on twisting vines.
// Vanilla grows several segments at once rather than one, which is what makes
// bone meal worth carrying in the nether. The click is taken on the
// interact-with-block before-event, the path a held item takes, and the
// growth runs a tick later, outside the read-only window.
import { system, world } from "@minecraft/server";
import { BONE_MEAL_ID, BONE_MEAL_MAX, BONE_MEAL_MIN, VINE_ID } from "./config.js";
import { extend, findTip } from "./growth.js";
import { consumeOne } from "./hand.js";
const GROWTH_PARTICLE = "minecraft:crop_growth_emitter";
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== VINE_ID || event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }
    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (block.typeId !== VINE_ID) {
            return;
        }
        const tip = findTip(block);
        if (tip === undefined) {
            return;
        }
        block.dimension.spawnParticle(GROWTH_PARTICLE, tip.center());
        block.dimension.playSound("item.bone_meal.use", tip.center());
        consumeOne(player);
        // Each segment is grown from whatever is the tip at that moment, so the
        // loop stops as soon as the stalk runs into something
        const span = BONE_MEAL_MAX - BONE_MEAL_MIN + 1;
        const wanted = BONE_MEAL_MIN + Math.floor(Math.random() * span);
        let end = tip;
        for (let grown = 0; grown < wanted && end !== undefined; grown++) {
            if (!extend(end)) {
                break;
            }
            end = end.above();
        }
    });
});
