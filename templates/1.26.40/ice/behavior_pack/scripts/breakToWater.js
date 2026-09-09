// Registers the component that leaves water behind when the ice is mined.
// Vanilla rule: mining ice in survival without Silk Touch turns it into
// water, but only when something sits underneath, never in creative, and
// never in the Nether. The drop side of the rule lives in the loot table;
// this component covers the water side.
import { EquipmentSlot, GameMode, system, } from "@minecraft/server";
// Check whether the player's main-hand item has Silk Touch
function mainhandHasSilkTouch(player) {
    // Get the player's equipment
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable === undefined) {
        return false;
    }
    // Get the item currently held in the main hand
    const held = equippable.getEquipment(EquipmentSlot.Mainhand);
    if (held === undefined) {
        // Bare hands, ice breaks fine by hand, it just melts into water
        return false;
    }
    // Non-enchantable items have no enchantable component at all, which
    // correctly reads as "no Silk Touch"
    const enchantable = held.getComponent("minecraft:enchantable");
    if (enchantable === undefined) {
        return false;
    }
    // Check for the Silk Touch enchantment
    return enchantable.hasEnchantment("minecraft:silk_touch");
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:ice_break", {
        // Run this code when a player breaks the block. By the time it
        // fires the ice is already air, so the only decision left is
        // whether water should take its place
        onPlayerBreak(event) {
            // Get the block, dimension and player from the event
            const { block, dimension, player } = event;
            // Return in the Nether, water cannot exist there, so vanilla
            // ice broken in the Nether simply disappears
            if (dimension.id === "minecraft:nether") {
                return;
            }
            // Return if nothing is underneath. Vanilla only forms water
            // when the block below can hold it up. The stable API has no
            // "blocks movement" query, so this checks for "not air"
            // instead. An unloaded chunk below reads as undefined, treat
            // that as no support rather than placing water over a hole we
            // cannot see
            const below = block.below();
            if (below === undefined || below.isAir) {
                return;
            }
            if (player !== undefined) {
                // Return in creative, creative breaks leave nothing behind
                if (player.getGameMode() === GameMode.Creative) {
                    return;
                }
                // Return for Silk Touch, it harvests the block itself,
                // and no water forms
                if (mainhandHasSilkTouch(player)) {
                    return;
                }
            }
            // Replace the broken ice with a water source
            block.setType("minecraft:water");
        },
    });
});
