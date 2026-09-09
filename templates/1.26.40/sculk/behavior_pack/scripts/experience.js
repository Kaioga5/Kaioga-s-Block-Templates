// The experience sculk leaves behind.
// A Bedrock loot table can hand out items and nothing else, so the one thing
// sculk gives that is not an item has to come from a script. Silk Touch is
// handled by the loot table, and this covers every other break.
import { EquipmentSlot, system } from "@minecraft/server";
import { EXPERIENCE } from "./config.js";
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sculk_experience", {
        onPlayerBreak(event) {
            const player = event.player;
            if (player === undefined) {
                return;
            }
            const tool = player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
            // Silk Touch returned the block itself, so there is nothing to pay
            if (tool?.getComponent("minecraft:enchantable")?.getEnchantment("silk_touch") !== undefined) {
                return;
            }
            system.run(() => player.addExperience(EXPERIENCE));
        },
    });
});
