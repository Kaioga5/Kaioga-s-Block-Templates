// The spore haze drifting off mycelium.
// Vanilla draws this on the client, once per frame, at random points across
// the top of the block. A custom block gets no client hook, so the spores ride
// the random tick the spread rule already uses: each tick throws a handful of
// particles at random spots over the top face. Nothing polls and a block in an
// unloaded chunk costs nothing.
import { BlockComponentRandomTickEvent, system } from "@minecraft/server";
import { SPORE_MAX, SPORE_MIN, SPORE_PARTICLE } from "./config.js";

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:mycelium_spores", {
        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const { block } = event;

            // Spores only rise where there is open air to rise into
            const above = block.above();
            if (above === undefined || !above.isAir) {
                return;
            }

            // Pick how many spores this tick releases
            const span = SPORE_MAX - SPORE_MIN + 1;
            const count = SPORE_MIN + Math.floor(Math.random() * span);

            // Scatter each one across the whole top face, just above the
            // surface. A fixed corner or centre would read as a fountain
            // rather than the loose haze vanilla draws
            for (let spore = 0; spore < count; spore++) {
                block.dimension.spawnParticle(SPORE_PARTICLE, {
                    x: block.x + Math.random(),
                    y: block.y + 1.02 + Math.random() * 0.1,
                    z: block.z + Math.random(),
                });
            }
        },
    });
});
