// Lets a hoe till the grass into farmland and a shovel flatten it into a
// dirt path. Both conversions produce the vanilla target block on purpose:
// farmland and paths already behave correctly, so crops, trampling and path
// mechanics all work without this template reimplementing them. This
// listens to the interact-with-block before-event, the precise item-use
// path, instead of a block interact component.
import { EquipmentSlot, GameMode, system, world, } from "@minecraft/server";
import { GRASS_ID } from "./config.js";
// What the two tools turn the grass into
const PATH_BLOCK = "minecraft:grass_path";
const FARMLAND_BLOCK = "minecraft:farmland";
// Take one point of durability from the player's tool, unless they are in
// creative
function damageTool(player, equipment, tool) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    // Get the durability component; some items do not have one
    const durability = tool.getComponent("minecraft:durability");
    if (durability === undefined) {
        return;
    }
    // Break the tool if this was its last point of durability. Unbreaking's
    // chance to skip the wear is engine-internal and not modeled here
    if (durability.damage + 1 >= durability.maxDurability) {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
        player.playSound("random.break");
    }
    else {
        durability.damage += 1;
        equipment.setEquipment(EquipmentSlot.Mainhand, tool);
    }
}
// Convert the grass and charge the tool
function convert(block, targetId, sound, player) {
    block.setType(targetId);
    block.dimension.playSound(sound, block.center());
    const equipment = player.getComponent("minecraft:equippable");
    const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (equipment !== undefined && held !== undefined) {
        damageTool(player, equipment, held);
    }
}
// Watch every block interaction and claim shovel and hoe use on the grass
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    // The engine can fire this more than once per click, act on the
    // first one only
    if (!event.isFirstEvent) {
        return;
    }
    // Only this template's grass reacts
    const block = event.block;
    if (block.typeId !== GRASS_ID) {
        return;
    }
    const held = event.itemStack;
    if (held === undefined) {
        return;
    }
    // Vanilla refuses to till or flatten under another block
    const above = block.above();
    if (above !== undefined && !above.isAir) {
        return;
    }
    // Match tools by tag (not exact ids) so modded hoes and shovels that
    // carry the vanilla tool tags work too
    const player = event.player;
    if (held.hasTag("minecraft:is_shovel")) {
        // Cancel the click and do the world write after the read-only
        // before-event window
        event.cancel = true;
        system.run(() => {
            if (block.typeId === GRASS_ID) {
                convert(block, PATH_BLOCK, "use.grass", player);
            }
        });
    }
    else if (held.hasTag("minecraft:is_hoe")) {
        event.cancel = true;
        system.run(() => {
            if (block.typeId === GRASS_ID) {
                convert(block, FARMLAND_BLOCK, "use.gravel", player);
            }
        });
    }
});
