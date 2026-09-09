// Frogspawn hatching.
// Two routes lead to the same place, and both are needed. A timer started when
// the spawn is laid reproduces vanilla's delay exactly, but a timer does not
// survive a world reload, so a random tick carries any spawn the timer lost.
// Both go through the same hatch function, which checks the block is still
// there, so a spawn covered by both never hatches twice.
import { system } from "@minecraft/server";
import { FROGSPAWN_ID, HATCHLING_ID, HATCH_DELAY_MAX, HATCH_DELAY_MIN, HATCH_MAX, HATCH_MIN, HATCH_TICK_CHANCE, } from "./config.js";
function hatch(block) {
    // The timer may fire long after the spawn was broken, or the chunk unloaded
    if (!block.isValid || block.typeId !== FROGSPAWN_ID) {
        return;
    }
    const { dimension } = block;
    const centre = block.center();
    const span = HATCH_MAX - HATCH_MIN + 1;
    const count = HATCH_MIN + Math.floor(Math.random() * span);
    block.setType("minecraft:air");
    dimension.playSound("hatch.frogspawn", centre);
    for (let index = 0; index < count; index++) {
        try {
            // Scatter them a little so they do not all appear in one point
            dimension.spawnEntity(HATCHLING_ID, {
                x: centre.x + (Math.random() - 0.5) * 0.5,
                y: centre.y - 0.5,
                z: centre.z + (Math.random() - 0.5) * 0.5,
            });
        }
        catch {
            // No room, or an identifier the world does not know, the rest of
            // the clutch still hatches
        }
    }
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:frogspawn_hatch", {
        onPlace(event) {
            const block = event.block;
            const span = HATCH_DELAY_MAX - HATCH_DELAY_MIN + 1;
            const delay = HATCH_DELAY_MIN + Math.floor(Math.random() * span);
            system.runTimeout(() => hatch(block), delay);
        },
        onRandomTick(event) {
            if (Math.random() < HATCH_TICK_CHANCE) {
                hatch(event.block);
            }
        },
    });
});
