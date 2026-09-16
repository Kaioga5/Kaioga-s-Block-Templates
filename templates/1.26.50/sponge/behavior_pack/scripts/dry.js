// A wet sponge drying out.
// Vanilla dries a wet sponge the moment it is placed in the Nether, and the
// smelting recipe does the rest. This covers the first half; the second is a
// recipe, not code.
import { system } from "@minecraft/server";
import { DRYING_DIMENSIONS, DRYING_PARTICLE, SPONGE_ID, WET_SPONGE_ID } from "./config.js";
function dry(block) {
    if (!block.isValid || block.typeId !== WET_SPONGE_ID) {
        return;
    }
    if (!DRYING_DIMENSIONS.has(block.dimension.id)) {
        return;
    }
    const centre = block.center();
    block.setType(SPONGE_ID);
    block.dimension.spawnParticle(DRYING_PARTICLE, centre);
    block.dimension.playSound("random.fizz", centre);
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sponge_dry", {
        onPlace(event) {
            const block = event.block;
            system.run(() => dry(block));
        },
        // Catches a sponge that was already in the Nether before this pack was
        // loaded, or one a piston pushed there
        onRandomTick(event) {
            dry(event.block);
        },
    });
});
