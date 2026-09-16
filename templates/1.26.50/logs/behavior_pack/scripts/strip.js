// Swaps the log for its stripped variant when a player uses an axe on it.
// This listens to the interact-with-block before-event, the precise
// item-use path, instead of a block interact component, so the action is
// tied to the axe actually being used and other interactions stay free.
import { BlockPermutation, EquipmentSlot, GameMode, system, world, } from "@minecraft/server";
// What each log strips into. Adding a wood type to this template is one
// more row here plus its block JSON files
const stripTargets = new Map([
    ["kai_templates:log", "kai_templates:stripped_log"],
]);
// Strip the log and charge the axe
function strip(block, strippedId, player) {
    // Swap the block in place, carrying every state across, the custom
    // kai_templates:axis state exists on both blocks, so a sideways log
    // stays sideways after stripping
    block.setPermutation(BlockPermutation.resolve(strippedId, block.permutation.getAllStates()));
    // Play the wood family's interaction sound, the closest stable match
    // to vanilla's stripping sound
    block.dimension.playSound("use.wood", block.center());
    // Stripping costs one durability point, but tools are free in
    // creative, like vanilla
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const equippable = player.getComponent("minecraft:equippable");
    const held = equippable?.getEquipment(EquipmentSlot.Mainhand);
    if (equippable === undefined || held === undefined) {
        return;
    }
    const durability = held.getComponent("minecraft:durability");
    if (durability === undefined) {
        return;
    }
    // An ItemStack from getEquipment is a snapshot, not a live reference:
    // changing damage only affects this copy, so the modified stack must
    // be written back into the hand. When the last point goes, the axe
    // breaks like any vanilla tool
    const nextDamage = durability.damage + 1;
    if (nextDamage >= durability.maxDurability) {
        equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
        player.playSound("random.break");
    }
    else {
        durability.damage = nextDamage;
        equippable.setEquipment(EquipmentSlot.Mainhand, held);
    }
}
// Watch every block interaction and claim axe use on the logs
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    // The engine can fire this more than once per click, act on the
    // first one only
    if (!event.isFirstEvent) {
        return;
    }
    // Only configured logs react
    const block = event.block;
    const strippedId = stripTargets.get(block.typeId);
    if (strippedId === undefined) {
        return;
    }
    // Check for an axe in the main hand. Testing the vanilla
    // minecraft:is_axe item tag instead of a list of identifiers means
    // custom axes from other packs work too
    const held = event.itemStack;
    if (held === undefined || !held.hasTag("minecraft:is_axe")) {
        return;
    }
    // Cancel the click and do the world write after the read-only
    // before-event window
    const player = event.player;
    const logId = block.typeId;
    event.cancel = true;
    system.run(() => {
        if (block.typeId === logId) {
            strip(block, strippedId, player);
        }
    });
});
