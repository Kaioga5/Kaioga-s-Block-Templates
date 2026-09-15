// Snow melting, and what a dug-out drift is worth.
// Both belong together because both depend on how many layers were standing,
// which is the one thing a Bedrock loot table cannot read. The loot table is
// empty and everything is paid out here. The random tick that drives melting
// is also where falling snow gets its chance to add a layer, so the two never
// fight over the same tick.
import { BlockPermutation, EquipmentSlot, ItemStack, system, } from "@minecraft/server";
import { DROP_PER_LAYER, HEIGHT_STATE, MELT_LIGHT, SNOW_ID } from "./config.js";
import { dropIfUnsupported } from "./falling.js";
import { addLayer, isSnowingOn } from "./snowfall.js";
// Heights count from zero, so a drift of height 3 is four layers deep
function layersOf(states) {
    const height = states[HEIGHT_STATE];
    return (typeof height === "number" ? height : 0) + 1;
}
// Melting takes one layer off. The last layer takes the block with it
function melt(block) {
    const height = block.permutation.getAllStates()[HEIGHT_STATE];
    const current = typeof height === "number" ? height : 0;
    if (current === 0) {
        block.setType("minecraft:air");
        return;
    }
    block.setPermutation(BlockPermutation.resolve(SNOW_ID, { [HEIGHT_STATE]: current - 1 }));
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:snow_melt", {
        onRandomTick(event) {
            const { block } = event;
            // A drift whose floor went without anyone breaking it, a command
            // or a piston say, notices here and falls before anything else
            if (dropIfUnsupported(block)) {
                return;
            }
            // Falling snow is checked first. Combined light reads 12 or more
            // under an open daytime sky, so checking melting first would thaw
            // a drift in the middle of a snowstorm
            if (isSnowingOn(block)) {
                addLayer(block);
                return;
            }
            if (block.getLightLevel() >= MELT_LIGHT) {
                melt(block);
            }
        },
        onPlayerBreak(event) {
            const layers = layersOf(event.brokenBlockPermutation.getAllStates());
            const tool = event.player
                ?.getComponent("minecraft:equippable")
                ?.getEquipment(EquipmentSlot.Mainhand);
            // Vanilla only gives anything back to a shovel
            if (tool === undefined || !tool.hasTag("minecraft:is_shovel")) {
                return;
            }
            // Silk Touch returns the drift itself, one item per layer, so it can
            // be rebuilt to the same depth
            const silk = tool.getComponent("minecraft:enchantable")?.getEnchantment("silk_touch") !== undefined;
            const dropId = silk ? SNOW_ID : DROP_PER_LAYER;
            const dimension = event.dimension;
            const location = event.block.center();
            system.run(() => dimension.spawnItem(new ItemStack(dropId, layers), location));
        },
    });
});
