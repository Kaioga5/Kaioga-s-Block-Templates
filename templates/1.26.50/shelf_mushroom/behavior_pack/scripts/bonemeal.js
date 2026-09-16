// Bone meal on a shelf mushroom.
// A shelf mushroom never grows on its own: the only way from the small cap to
// the large one is bone meal, and one use always does it. The click arrives
// through the interact-with-block before-event, because that is the path a
// held item takes. It is cancelled so the vanilla bone meal handler does not
// also run, and the growth happens a tick later, outside the read-only
// before-event window.
import { BlockPermutation, EquipmentSlot, GameMode, system, world, } from "@minecraft/server";
// The block, its growth state and the value that means fully grown
const MUSHROOM_ID = "kai_templates:shelf_mushroom";
const GROWTH_STATE = "kai_templates:growth";
const LARGE = 1;
// The item that counts as bone meal
const BONE_MEAL_ID = "minecraft:bone_meal";
// The green sparkle vanilla shows when bone meal takes
const GROWTH_PARTICLE = "minecraft:crop_growth_emitter";
// Read the growth state, 0 for the small cap
function growthOf(block) {
    const value = block.permutation.getAllStates()[GROWTH_STATE];
    return typeof value === "number" ? value : 0;
}
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
// Swap the small cap for the large one, keeping the wall it hangs on
function grow(block, player) {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(MUSHROOM_ID, { ...states, [GROWTH_STATE]: LARGE }));
    block.dimension.spawnParticle(GROWTH_PARTICLE, block.center());
    block.dimension.playSound("item.bone_meal.use", block.center());
    consumeOne(player);
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== MUSHROOM_ID) {
        return;
    }
    if (event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }
    // A large mushroom takes no more bone meal, and the click falls through
    // so the item is not spent on it
    if (growthOf(event.block) >= LARGE) {
        return;
    }
    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (block.isValid && block.typeId === MUSHROOM_ID && growthOf(block) < LARGE) {
            grow(block, player);
        }
    });
});
