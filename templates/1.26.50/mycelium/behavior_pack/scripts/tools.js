// Shovel and hoe conversions.
// This listens to the interact-with-block before-event, which is the precise
// item-use path, a block interact component fires for empty hands too. The
// click is cancelled so the vanilla tool logic does not also run, and the world
// write happens one tick later, outside the read-only before-event window.
import { EquipmentSlot, GameMode, system, world } from "@minecraft/server";
import { MYCELIUM_ID, toolConversions } from "./config.js";
// Take one point of durability off the tool, the way vanilla does. Creative
// players keep theirs untouched
function damageTool(player, equipment, tool) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const durability = tool.getComponent("minecraft:durability");
    if (durability === undefined) {
        return;
    }
    // The last point breaks the tool instead of leaving it at zero. Unbreaking
    // rolls its save inside the engine and is not modelled here
    if (durability.damage + 1 >= durability.maxDurability) {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
        player.playSound("random.break");
        return;
    }
    durability.damage += 1;
    equipment.setEquipment(EquipmentSlot.Mainhand, tool);
}
// Swap the block and charge the tool that did it
function convert(block, conversion, player) {
    block.setType(conversion.block);
    block.dimension.playSound(conversion.sound, block.center());
    const equipment = player.getComponent("minecraft:equippable");
    const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (equipment !== undefined && held !== undefined) {
        damageTool(player, equipment, held);
    }
}
// Find the first conversion the held item qualifies for. Matching on tags
// rather than ids means custom shovels and hoes work as well as vanilla ones
function conversionFor(held) {
    for (const [tag, conversion] of toolConversions) {
        if (held.hasTag(tag)) {
            return conversion;
        }
    }
    return undefined;
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    // One click can raise this event more than once; only the first is real
    if (!event.isFirstEvent) {
        return;
    }
    const block = event.block;
    if (block.typeId !== MYCELIUM_ID) {
        return;
    }
    const held = event.itemStack;
    if (held === undefined) {
        return;
    }
    const conversion = conversionFor(held);
    if (conversion === undefined) {
        return;
    }
    // Neither tool works on a covered block, which is vanilla's rule as well
    const above = block.above();
    if (above !== undefined && !above.isAir) {
        return;
    }
    const player = event.player;
    event.cancel = true;
    system.run(() => {
        // The world moved on between the two phases, so confirm the block is
        // still the one that was clicked
        if (block.typeId === MYCELIUM_ID) {
            convert(block, conversion, player);
        }
    });
});
