// Handles copper maintenance on the door: honeycomb waxes it while
// sneaking, an axe strips wax or scrapes one oxidation stage back. This
// listens to the interact-with-block before-event instead of the block's
// own interact component, because waxing must NOT also swing the door,
// cancelling here stops the click before the open/close handler sees it.
import { EquipmentSlot, GameMode, MolangVariableMap, system, world, } from "@minecraft/server";
// Import the family table that ties stages and waxed twins together
import { STAGE_BY_ID, STAGE_BY_WAXED_ID, swapDoorType } from "./family.js";
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
// Take one point of durability from the player's axe
function damageAxe(player, equipment, axe) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const durability = axe.getComponent("minecraft:durability");
    if (durability === undefined) {
        return;
    }
    // Break the axe if this was its last point of durability. Unbreaking's
    // chance to skip the wear is engine-internal and not modeled here
    if (durability.damage + 1 >= durability.maxDurability) {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
        player.playSound("random.break");
    }
    else {
        durability.damage += 1;
        equipment.setEquipment(EquipmentSlot.Mainhand, axe);
    }
}
// The vanilla wax particle reads its tint and its drift from Molang variables
// the engine fills in when it spawns the effect itself. Spawned from a script
// without them it still shows, but every mote writes Molang errors to the
// content log, so the variables are built here, per mote: one colour for the
// effect and a random outward drift
function spawnWaxMotes(block, red, green, blue) {
    for (let i = 0; i < WAX_MOTES; i++) {
        const variables = new MolangVariableMap();
        variables.setColorRGBA("variable.color", { red, green, blue, alpha: 1 });
        variables.setVector3("variable.direction", {
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random() * 2 - 1,
        });
        // Somewhere just outside the block's faces, so the motes ring the block
        const spot = {
            x: block.x - 0.1 + Math.random() * 1.2,
            y: block.y - 0.1 + Math.random() * 1.2,
            z: block.z - 0.1 + Math.random() * 1.2,
        };
        block.dimension.spawnParticle("minecraft:wax_particle", spot, variables);
    }
}
// How many motes one waxing or scraping throws, and their colours: honey
// yellow for wax going on, the pale green of scraped patina coming off
const WAX_MOTES = 10;
const WAX_ON_COLOUR = { red: 0.93, green: 0.68, blue: 0.18 };
const SCRAPE_COLOUR = { red: 0.53, green: 0.83, blue: 0.72 };
// Wax the door: swap to the waxed twin, keep every placement state, play
// the vanilla wax effects, and use up one honeycomb
function applyWax(block, waxedId, player) {
    swapDoorType(block, waxedId);
    const center = block.center();
    block.dimension.playSound("copper.wax.on", center);
    spawnWaxMotes(block, WAX_ON_COLOUR.red, WAX_ON_COLOUR.green, WAX_ON_COLOUR.blue);
    const equipment = player.getComponent("minecraft:equippable");
    const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (equipment !== undefined && held !== undefined) {
        consumeOne(player, equipment, held);
    }
}
// Strip wax or scrape one oxidation stage back with an axe
function applyScrape(block, targetId, sound, player) {
    swapDoorType(block, targetId);
    const center = block.center();
    block.dimension.playSound(sound, center);
    spawnWaxMotes(block, SCRAPE_COLOUR.red, SCRAPE_COLOUR.green, SCRAPE_COLOUR.blue);
    const equipment = player.getComponent("minecraft:equippable");
    const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (equipment !== undefined && held !== undefined) {
        damageAxe(player, equipment, held);
    }
}
// Watch every block interaction and claim the ones that are copper
// maintenance on this family. Cancelling the before-event stops the door
// from also opening or closing
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    // The engine can fire this more than once per click, act on the
    // first one only
    if (!event.isFirstEvent) {
        return;
    }
    // Work out which family member was clicked, if any. Exactly one of
    // these lookups matches, depending on whether it is waxed
    const block = event.block;
    const unwaxedStage = STAGE_BY_ID.get(block.typeId);
    const waxedStage = STAGE_BY_WAXED_ID.get(block.typeId);
    if (unwaxedStage === undefined && waxedStage === undefined) {
        return;
    }
    const player = event.player;
    const held = event.itemStack;
    if (held === undefined) {
        return;
    }
    // Honeycomb waxes an unwaxed door, but only while sneaking, the
    // deliberate crouch keeps waxing from firing during normal door use
    if (held.typeId === "minecraft:honeycomb" && unwaxedStage !== undefined) {
        if (!player.isSneaking) {
            return;
        }
        // Cancel so the door does not also toggle; the world write has to
        // wait until after the read-only before-event window
        event.cancel = true;
        system.run(() => {
            // Re-check the block, something else may have changed it in
            // the meantime
            if (block.typeId === unwaxedStage.id) {
                applyWax(block, unwaxedStage.waxedId, player);
            }
        });
        return;
    }
    // Check for an axe by the vanilla item tag, so custom axes from other
    // packs work too. Axe use never toggles a copper door in vanilla
    if (held.hasTag("minecraft:is_axe")) {
        // Strip the wax first if there is any
        if (waxedStage !== undefined) {
            event.cancel = true;
            system.run(() => {
                if (block.typeId === waxedStage.waxedId) {
                    applyScrape(block, waxedStage.id, "copper.wax.off", player);
                }
            });
        }
        else if (unwaxedStage?.previous !== undefined) {
            // Otherwise scrape one oxidation stage back
            const previous = unwaxedStage.previous;
            event.cancel = true;
            system.run(() => {
                if (block.typeId === unwaxedStage.id) {
                    applyScrape(block, previous, "scrape", player);
                }
            });
        }
    }
});
