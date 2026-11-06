// The flame and smoke a lit torch gives off. Vanilla runs this from the
// renderer, several times a second, on the client alone. A pack has no hook
// that cheap, so this rides the random tick instead: no timer, no ticking
// component, nothing scheduled, the block is only touched when the world picks
// it. That makes the puffs far rarer than vanilla's steady plume. Raising
// randomTickSpeed is the knob for a denser effect; see the README.
import { system } from "@minecraft/server";
// Vanilla spawns both of these together at the tip of the torch
const FLAME = "minecraft:basic_flame_particle";
const SMOKE = "minecraft:basic_smoke_particle";
// Height of the flame above the bottom of the block, as a fraction of a block.
// A wall torch's head sits a little higher than a floor torch's
const FLOOR_HEIGHT = 0.7;
const WALL_HEIGHT = 0.92;
// How far the flame of a wall torch sits from the middle of its cell. The stick
// leans out of the wall as it rises but starts inside it, so the tip still ends
// up on the wall's side of centre
const WALL_OFFSET = 0.27;
// Which way to shift the flame for each face a torch can be stuck to. The state
// names the face of the supporting block that was clicked, so the wall is on
// the opposite side of the torch from that name
const WALL_SHIFT = {
    north: [0, 1],
    south: [0, -1],
    east: [-1, 0],
    west: [1, 0],
};
// Work out where the flame sits for the torch in this block
function flamePosition(x, y, z, face) {
    const shift = WALL_SHIFT[face];
    if (shift === undefined) {
        // Standing on the floor: straight up the middle
        return { x: x + 0.5, y: y + FLOOR_HEIGHT, z: z + 0.5 };
    }
    return {
        x: x + 0.5 + shift[0] * WALL_OFFSET,
        y: y + WALL_HEIGHT,
        z: z + 0.5 + shift[1] * WALL_OFFSET,
    };
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:torch_particles", {
        // Run this code when the world random-ticks this block
        onRandomTick(event) {
            // Get the block and the face it is stuck to
            const { block } = event;
            const face = String(block.permutation.getAllStates()["minecraft:block_face"]);
            // Place the particles at the tip of the flame
            const at = flamePosition(block.x, block.y, block.z, face);
            block.dimension.spawnParticle(SMOKE, at);
            block.dimension.spawnParticle(FLAME, at);
        },
    });
});
