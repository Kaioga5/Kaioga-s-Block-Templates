// Bone meal on a wet cluster standing on coral fills it out and seeds more
// pickles on the coral around it, the way vanilla grows a pickle patch.
//
// Bone meal is a vanilla item, so it cannot carry a custom component, that
// would mean overriding minecraft:bone_meal for every pack in the world. The
// interact-with-block before-event is the precise alternative: it names the
// held item and it can be cancelled.
import { EquipmentSlot, GameMode, system, world, } from "@minecraft/server";
import { MAX_PICKLES, PICKLE_ID, isDead, pickleCount, setPickle, } from "./pickle.js";
// The item that grows the patch and the sound vanilla plays for it
const BONE_MEAL = "minecraft:bone_meal";
const GROW_SOUND = "item.bone_meal.use";
// Only live coral blocks grow pickles. Dead coral does not, which is why the
// dead_ variants are absent from this list
const CORAL_BLOCKS = new Set([
    "minecraft:tube_coral_block",
    "minecraft:brain_coral_block",
    "minecraft:bubble_coral_block",
    "minecraft:fire_coral_block",
    "minecraft:horn_coral_block",
]);
// How far around the clicked block the patch spreads, and how many seats it
// tries. Both are kept small so one click is a bounded amount of work
const SPREAD_RADIUS = 2;
const SPREAD_ATTEMPTS = 12;
// Take one bone meal out of the player's hand, except in creative
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
// A seat is somewhere a new cluster can go: water, with live coral under it
function canSeatPickle(block) {
    if (block === undefined || !block.isAir) {
        return false;
    }
    const below = block.below();
    return below !== undefined && CORAL_BLOCKS.has(below.typeId);
}
// Scatter new clusters over the coral near the clicked block
function spreadAround(origin) {
    for (let attempt = 0; attempt < SPREAD_ATTEMPTS; attempt += 1) {
        const dx = Math.floor(Math.random() * (SPREAD_RADIUS * 2 + 1)) - SPREAD_RADIUS;
        const dz = Math.floor(Math.random() * (SPREAD_RADIUS * 2 + 1)) - SPREAD_RADIUS;
        if (dx === 0 && dz === 0) {
            continue;
        }
        let seat;
        try {
            seat = origin.dimension.getBlock({
                x: origin.x + dx,
                y: origin.y,
                z: origin.z + dz,
            });
        }
        catch {
            // Chunk not loaded, skip this seat
            continue;
        }
        if (!canSeatPickle(seat) || seat === undefined) {
            continue;
        }
        // Water has to already be here, or the new cluster would be dead the
        // moment it appeared
        if (!seat.isWaterlogged && !seat.above()?.isLiquid) {
            continue;
        }
        seat.setType(PICKLE_ID);
        setPickle(seat, 1 + Math.floor(Math.random() * MAX_PICKLES), false);
    }
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { block, player, itemStack: held } = event;
    // Anything that is not a wet pickle standing on coral falls through
    if (block.typeId !== PICKLE_ID || held?.typeId !== BONE_MEAL) {
        return;
    }
    if (isDead(block) || !CORAL_BLOCKS.has(block.below()?.typeId ?? "")) {
        return;
    }
    event.cancel = true;
    system.run(() => {
        if (block.typeId !== PICKLE_ID) {
            return;
        }
        // Vanilla fills the clicked cluster out first, then seeds the coral
        // around it on later applications
        if (pickleCount(block) < MAX_PICKLES) {
            setPickle(block, MAX_PICKLES, false);
        }
        else {
            spreadAround(block);
        }
        block.dimension.playSound(GROW_SOUND, block.center());
        consumeOne(player);
    });
});
