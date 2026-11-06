// What a living coral block gives back.
// Vanilla has three outcomes: Silk Touch keeps the living block, a plain
// pickaxe returns the dead one, and no pickaxe returns nothing. A Bedrock loot
// table can express the first and the third, but not "a pickaxe without Silk
// Touch", there is no way to negate a condition, so the middle case is
// handled here.
import { BlockComponentPlayerBreakEvent, EquipmentSlot, ItemStack, system } from "@minecraft/server";
import { deadForms } from "./config.js";

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:coral_block_drops", {
        onPlayerBreak(event: BlockComponentPlayerBreakEvent): void {
            const dead = deadForms.get(event.block.typeId);
            if (dead === undefined) {
                return;
            }

            const tool = event.player
                ?.getComponent("minecraft:equippable")
                ?.getEquipment(EquipmentSlot.Mainhand);

            // No pickaxe means no drop at all, which the loot table already did
            if (tool === undefined || !tool.hasTag("minecraft:is_pickaxe")) {
                return;
            }
            // Silk Touch already returned the living block through the loot table
            if (tool.getComponent("minecraft:enchantable")?.getEnchantment("silk_touch") !== undefined) {
                return;
            }

            const dimension = event.dimension;
            const location = event.block.center();
            system.run(() => dimension.spawnItem(new ItemStack(dead, 1), location));
        },
    });
});
