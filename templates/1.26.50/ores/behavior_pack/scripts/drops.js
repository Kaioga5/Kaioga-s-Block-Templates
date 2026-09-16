// Handles what an ore gives up when it is mined: Silk Touch, Fortune and
// experience. A loot table can express none of the three, so the block ships
// an empty one and this component drops everything itself.
//
// It runs on the block's own break event, so it costs nothing until an ore is
// actually mined.
import { EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, system, } from "@minecraft/server";
import { DROP_ITEM, DROP_MAX, DROP_MIN, FORTUNE_MODE, HARVEST_TIERS, HARVEST_TOOL_TAG, ORE_ID, XP_MAX, XP_MIN, XP_SCATTER, } from "./config.js";
// The vanilla enchantment ids this template reads
const SILK_TOUCH = "silk_touch";
const FORTUNE = "fortune";
// Inclusive random integer, the roll every count below is built from
function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
// The item the player was holding when the block broke
function heldItem(player) {
    const equipment = player.getComponent(EntityComponentTypes.Equippable);
    return equipment?.getEquipment(EquipmentSlot.Mainhand);
}
// Whether this tool is allowed to harvest the ore. Vanilla checks the tool
// family first and then the tier, and a tool that fails either one breaks the
// block for nothing
function canHarvest(tool) {
    if (tool === undefined || !tool.hasTag(HARVEST_TOOL_TAG)) {
        return false;
    }
    return HARVEST_TIERS.some((tier) => tool.hasTag(tier));
}
// Read an enchantment level off the tool, 0 when it is not there
function enchantmentLevel(tool, id) {
    const enchantable = tool?.getComponent("minecraft:enchantable");
    return enchantable?.getEnchantment(id)?.level ?? 0;
}
// The vanilla ore Fortune rule: roll 0 to level+1, and treat 0 and 1 the same.
// That is what makes a multiplier of 1 twice as likely as any other value
function fortuneMultiplier(level) {
    if (FORTUNE_MODE === "none" || level <= 0) {
        return 1;
    }
    return Math.max(1, randomInt(0, level + 1));
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:ore_drops", {
        // Runs after a player breaks the block
        onPlayerBreak(event) {
            const { block, dimension, player } = event;
            if (player === undefined) {
                return;
            }
            // Creative breaks give nothing, the same as vanilla
            if (player.getGameMode() === GameMode.Creative) {
                return;
            }
            const tool = heldItem(player);
            // Drops are spawned at the middle of the cell the ore filled
            const where = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
            // Silk Touch takes the ore itself and awards no experience
            if (enchantmentLevel(tool, SILK_TOUCH) > 0) {
                dimension.spawnItem(new ItemStack(ORE_ID, 1), where);
                return;
            }
            // The wrong tool breaks the block and leaves nothing behind
            if (!canHarvest(tool)) {
                return;
            }
            const count = randomInt(DROP_MIN, DROP_MAX) *
                fortuneMultiplier(enchantmentLevel(tool, FORTUNE));
            if (count > 0) {
                dimension.spawnItem(new ItemStack(DROP_ITEM, count), where);
            }
            // Experience comes out as real orbs so it behaves like vanilla: it
            // can be picked up later, and it is lost if the player walks away.
            // Every orb a script spawns is worth 1, so the roll is also the count
            const xp = randomInt(XP_MIN, XP_MAX);
            for (let spawned = 0; spawned < xp; spawned += 1) {
                dimension.spawnEntity("minecraft:xp_orb", {
                    x: where.x + (Math.random() - 0.5) * XP_SCATTER * 2,
                    y: where.y,
                    z: where.z + (Math.random() - 0.5) * XP_SCATTER * 2,
                });
            }
        },
    });
});
