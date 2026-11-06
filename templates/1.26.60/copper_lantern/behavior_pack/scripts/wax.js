// Copper maintenance: honeycomb waxes a lantern, an axe strips the wax or
// scrapes one oxidation stage back. Both are vanilla items, so neither can
// carry a custom item component, a pack cannot add components to
// minecraft:honeycomb without overriding the item for every other pack in the
// world. The interact-with-block before-event is the precise alternative: it
// fires on the click, tells us exactly what was held, and can be cancelled.
import { EquipmentSlot, GameMode, system, world, } from "@minecraft/server";
import { STAGE_BY_ID, STAGE_BY_WAXED_ID, swapLanternType } from "./family.js";
// The item that waxes copper, and the sounds vanilla plays for each action
const HONEYCOMB = "minecraft:honeycomb";
const WAX_ON_SOUND = "copper.wax.on";
const WAX_OFF_SOUND = "copper.wax.off";
const SCRAPE_SOUND = "scrape";
// Remove one item from the player's main hand, unless they are in creative
function consumeOne(player, equipment, held) {
    if (player.getGameMode() === GameMode.Creative) {
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
// Take one point of durability off the player's axe
function damageAxe(player, equipment, axe) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const durability = axe.getComponent("minecraft:durability");
    if (durability === undefined) {
        return;
    }
    // Break the axe if this was its last point. Unbreaking's chance to skip
    // the wear is engine-internal and is not modelled here
    if (durability.damage + 1 >= durability.maxDurability) {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    }
    else {
        durability.damage += 1;
        equipment.setEquipment(EquipmentSlot.Mainhand, axe);
    }
}
// Swap the lantern and play the sound for the action
function applyChange(block, newId, sound) {
    swapLanternType(block, newId);
    block.dimension.playSound(sound, block.center());
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { block, player, itemStack: held } = event;
    if (held === undefined) {
        return;
    }
    // Only this family reacts. Everything else falls straight through
    const unwaxedStage = STAGE_BY_ID.get(block.typeId);
    const waxedStage = STAGE_BY_WAXED_ID.get(block.typeId);
    if (unwaxedStage === undefined && waxedStage === undefined) {
        return;
    }
    const equipment = player.getComponent("minecraft:equippable");
    if (equipment === undefined) {
        return;
    }
    // Honeycomb waxes an unwaxed lantern and does nothing to a waxed one
    if (held.typeId === HONEYCOMB && unwaxedStage !== undefined) {
        const waxedId = unwaxedStage.waxedId;
        const fromId = unwaxedStage.id;
        // Before-events are read-only, so cancel now and mutate next tick
        event.cancel = true;
        system.run(() => {
            if (block.typeId === fromId) {
                applyChange(block, waxedId, WAX_ON_SOUND);
                consumeOne(player, equipment, held);
            }
        });
        return;
    }
    // Match an axe by the vanilla item tag, so axes from other packs work too
    if (!held.hasTag("minecraft:is_axe")) {
        return;
    }
    // An axe strips the wax first if there is any
    if (waxedStage !== undefined) {
        const fromId = waxedStage.waxedId;
        const toId = waxedStage.id;
        event.cancel = true;
        system.run(() => {
            if (block.typeId === fromId) {
                applyChange(block, toId, WAX_OFF_SOUND);
                damageAxe(player, equipment, held);
            }
        });
        return;
    }
    // Otherwise it scrapes one oxidation stage back, if there is one
    if (unwaxedStage?.previous !== undefined) {
        const fromId = unwaxedStage.id;
        const toId = unwaxedStage.previous;
        event.cancel = true;
        system.run(() => {
            if (block.typeId === fromId) {
                applyChange(block, toId, SCRAPE_SOUND);
                damageAxe(player, equipment, held);
            }
        });
    }
});
