// Registers the component that lowers the gate between walls. A vanilla
// fence gate placed between two walls drops by three pixels so its bars
// line up with the wall's silhouette. The kai_templates:in_wall state
// drives a translation permutation in the block JSON; this file keeps that
// state matched to the actual neighbors without any tick polling. The
// stable script API has no neighbor-changed hook, so the check runs on the
// two moments the answer can change: when the gate itself is placed, and
// when a player places or breaks a block beside an existing gate.
import { BlockPermutation, world, system, } from "@minecraft/server";
// The block this template defines. The world-event listeners below need it
// to recognize gates among arbitrary neighbors
const GATE_ID = "kai_templates:fence_gate";
// The custom state declared in blocks/fence_gate.json
const IN_WALL_STATE = "kai_templates:in_wall";
// Get the two neighbors along the gate's bar. The bar runs perpendicular to
// the facing: a north- or south-facing gate spans east-west
function sideNeighbors(block, facing) {
    if (facing === "north" || facing === "south") {
        return [block.east(), block.west()];
    }
    return [block.north(), block.south()];
}
// Check whether a neighbor is a wall. Every flattened vanilla wall id ends
// in "_wall" (cobblestone_wall, ...), and a wall from this library's own
// Wall template ends in ":wall". Anything else keeps the gate at full
// height, like vanilla, fences do not lower gates, only walls do
function isWall(block) {
    if (block === undefined) {
        return false;
    }
    return block.typeId.endsWith("_wall") || block.typeId.endsWith(":wall");
}
// Re-read the neighbors and rewrite the in-wall state if it changed
function updateInWall(block) {
    // Read the current states and check both side neighbors
    const states = block.permutation.getAllStates();
    const facing = String(states["minecraft:cardinal_direction"]);
    const inWall = sideNeighbors(block, facing).some(isWall);
    // Only write on an actual change, a place event next to a gate that is
    // already correct should not touch the block at all
    if ((states[IN_WALL_STATE] === true) === inWall) {
        return;
    }
    // Apply the new in-wall state, keeping everything else
    block.setPermutation(BlockPermutation.resolve(block.typeId, {
        ...states,
        [IN_WALL_STATE]: inWall,
    }));
}
// A block changed at this position; if any horizontal neighbor is a gate,
// its in-wall answer may have changed too. Four lookups per player action,
// and only when the event actually fires, nothing runs while idle
function updateAdjacentGates(changed) {
    const neighbors = [
        changed.north(),
        changed.south(),
        changed.east(),
        changed.west(),
    ];
    for (const neighbor of neighbors) {
        // Skip unloaded chunks and anything that is not this gate
        if (neighbor === undefined || neighbor.typeId !== GATE_ID) {
            continue;
        }
        updateInWall(neighbor);
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:fence_gate_in_wall", {
        // The gate was just placed, settle its in-wall state immediately
        onPlace(event) {
            updateInWall(event.block);
        },
    });
});
// A wall built beside an existing gate arrives through these two world
// events, not through any hook on the gate itself
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    updateAdjacentGates(event.block);
});
world.afterEvents.playerBreakBlock.subscribe((event) => {
    updateAdjacentGates(event.block);
});
