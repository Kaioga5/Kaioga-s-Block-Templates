// What leaves give back.
// Shears and Silk Touch are handled by the loot table, which has one pool for
// each. Everything else, saplings, sticks, the odd apple, is rolled here,
// because Fortune scaling cannot be written into a Bedrock block loot table and
// rotting leaves have no tool to consult at all.
import {
    Block,
    BlockComponentPlayerBreakEvent,
    Dimension,
    EquipmentSlot,
    ItemStack,
    system,
    Vector3,
} from "@minecraft/server";
import { leafDrops } from "./config.js";

// Highest Fortune level the tables above are written for; anything beyond it
// reuses the last entry
function chanceFor(chances: number[], fortune: number): number {
    return chances[Math.min(fortune, chances.length - 1)];
}

// Roll every configured drop once and scatter what comes up
export function rollDrops(dimension: Dimension, location: Vector3, fortune: number): void {
    for (const drop of leafDrops) {
        if (Math.random() >= chanceFor(drop.chances, fortune)) {
            continue;
        }
        const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
        try {
            dimension.spawnItem(new ItemStack(drop.id, count), location);
        } catch {
            // An identifier that no longer exists should not take the rest of
            // the drops down with it
        }
    }
}

// The centre of a block, which is where drops should appear
export function dropPoint(block: Block): Vector3 {
    return { x: block.location.x + 0.5, y: block.location.y + 0.5, z: block.location.z + 0.5 };
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:leaves_drops", {
        onPlayerBreak(event: BlockComponentPlayerBreakEvent): void {
            const tool = event.player
                ?.getComponent("minecraft:equippable")
                ?.getEquipment(EquipmentSlot.Mainhand);

            // Shears and Silk Touch already returned the block itself through
            // the loot table, so there is nothing more to give
            if (tool !== undefined) {
                if (tool.hasTag("minecraft:is_shears")) {
                    return;
                }
                const enchantable = tool.getComponent("minecraft:enchantable");
                if (enchantable?.getEnchantment("silk_touch") !== undefined) {
                    return;
                }
            }

            // Fortune raises every chance in the table by one index
            const fortune = tool?.getComponent("minecraft:enchantable")?.getEnchantment("fortune")?.level ?? 0;
            const dimension = event.dimension;
            const location = dropPoint(event.block);
            system.run(() => rollDrops(dimension, location, fortune));
        },
    });
});
