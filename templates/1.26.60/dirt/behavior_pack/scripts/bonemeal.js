// Lets bone meal grow the configured plants on top of this dirt. Vanilla
// bone meal ignores plain dirt; this template accepts it so the plant table
// in config.ts is easy to see working. Uses the interact-with-block
// before-event, the precise item-use path, not a block interact component.
import { BlockPermutation, EquipmentSlot, GameMode, system, world, } from "@minecraft/server";
import { boneMealPlants, grassSpreadTargets } from "./config.js";
// Remove one bone meal from the player's main hand, unless they are in
// creative
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
    }
    else {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    }
}
// Pick one plant from the weighted table
function pickPlant() {
    const total = boneMealPlants.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * total;
    for (const plant of boneMealPlants) {
        roll -= plant.weight;
        if (roll < 0) {
            return plant;
        }
    }
    return boneMealPlants[0];
}
// Grow one plant on top of the dirt
function grow(block, player) {
    const above = block.above();
    if (above === undefined || !above.isAir) {
        return;
    }
    const plant = pickPlant();
    if (plant === undefined) {
        return;
    }
    if (plant.tall === true) {
        // A two-block plant needs the cell above the plant free too
        const top = above.above();
        if (top === undefined || !top.isAir) {
            return;
        }
        // Place both halves; the upper half carries the vanilla upper bit
        above.setType(plant.id);
        top.setPermutation(BlockPermutation.resolve(plant.id, { upper_block_bit: true }));
    }
    else {
        above.setType(plant.id);
    }
    // The vanilla bone meal effects
    block.dimension.playSound("item.bone_meal.use", block.center());
    block.dimension.spawnParticle("minecraft:crop_growth_emitter", above.center());
    consumeOne(player);
}
// Watch every block interaction and claim bone meal use on this dirt
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    // The engine can fire this more than once per click, act on the
    // first one only
    if (!event.isFirstEvent) {
        return;
    }
    // Only this template's dirt reacts
    const block = event.block;
    if (!grassSpreadTargets.has(block.typeId)) {
        return;
    }
    // Only bone meal triggers the growth
    if (event.itemStack?.typeId !== "minecraft:bone_meal") {
        return;
    }
    // Cancel the click and do the world writes after the read-only
    // before-event window
    const player = event.player;
    const dirtId = block.typeId;
    event.cancel = true;
    system.run(() => {
        if (block.typeId === dirtId) {
            grow(block, player);
        }
    });
});
