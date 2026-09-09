// Leaves shedding the odd falling leaf.
// Vanilla runs this in the client renderer, several times a second per block.
// A custom block has no client hook at all, so the effect rides the same random
// ticks the decay rule already uses: no extra scheduling, no per-tick scan, and
// a canopy that costs nothing when nobody is looking at it.
import { MolangVariableMap, system } from "@minecraft/server";
import { LEAF_PARTICLE, LEAF_PARTICLE_CHANCE, leafParticleColor } from "./config.js";
// The Molang variables handed to the particle. Built on first use, not at
// module scope and not inside the startup event: MolangVariableMap is a native
// class, and the engine refuses to construct it during early execution. A
// constructor call in startup throws, the registration below never runs, and
// the block that names this component is then rejected in its entirety
let colour;
// Get the shared variable map, creating it the first time a leaf falls. By
// then the world is loaded and native constructors are allowed
function leafColour() {
    if (colour === undefined) {
        colour = new MolangVariableMap();
        colour.setColorRGB("variable.leaf_color", leafParticleColor);
    }
    return colour;
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:leaves_particles", {
        onRandomTick(event) {
            if (LEAF_PARTICLE_CHANCE <= 0 || Math.random() >= LEAF_PARTICLE_CHANCE) {
                return;
            }
            const block = event.block;
            const below = block.below();
            if (below === undefined) {
                return;
            }
            // Vanilla only sheds a leaf when the space underneath has no solid
            // top face, which is why particles come off the underside of a
            // canopy rather than from inside it. Script cannot ask a block for
            // its top face, so this settles for open space, which gives the
            // same result for a canopy sitting over air or water
            if (!below.isAir && !below.isLiquid) {
                return;
            }
            // The emitter shape in the particle file measures from the block's
            // minimum corner and covers the whole 1x1 footprint just under the
            // block, so the raw block position is the right anchor
            block.dimension.spawnParticle(LEAF_PARTICLE, block.location, leafColour());
        },
    });
});
