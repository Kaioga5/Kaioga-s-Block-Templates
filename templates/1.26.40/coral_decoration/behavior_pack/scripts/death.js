// Coral dying when it is out of water.
// Vanilla schedules a check a moment after anything near the coral changes. A
// custom block has no neighbour-changed hook, so the check runs at the two
// points that cover it: the moment the coral is placed, and on random ticks
// afterwards. Nothing polls, and coral in an unloaded chunk costs nothing.
import { BlockPermutation, system, } from "@minecraft/server";
import { DIES_OUT_OF_WATER, deadForms, familyIds, unsupportiveTags } from "./config.js";
// Which neighbour a decoration on this face is holding on to. A wall fan
// that reads "north" was placed against a neighbour to the north of it
const SUPPORT_OFFSETS = {
    up: { x: 0, y: -1, z: 0 },
    down: { x: 0, y: 1, z: 0 },
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    east: { x: 1, y: 0, z: 0 },
    west: { x: -1, y: 0, z: 0 },
};
// Anything solid will do except the family itself and the obvious thin
// blocks, which is as close as a script can get to vanilla's sturdy-face test
function canGrowOn(support) {
    if (support === undefined || support.isAir || support.isLiquid) {
        return false;
    }
    if (familyIds.has(support.typeId)) {
        return false;
    }
    return !unsupportiveTags.some((tag) => support.hasTag(tag));
}
// The six neighbours a coral can draw water from
const NEIGHBOURS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];
// Coral counts as wet if water is inside its own space or against any face
function hasWater(block) {
    if (block.isWaterlogged) {
        return true;
    }
    return NEIGHBOURS.some((offset) => {
        const neighbour = block.offset(offset);
        // An unloaded neighbour is unknown; treating it as water keeps coral at
        // a chunk border from dying on a guess
        if (neighbour === undefined) {
            return true;
        }
        // A water block counts, and so does a waterlogged block next door: a
        // slab or another fan standing in water still has water against this
        // face. isLiquid only reports the water block itself, so the
        // waterlogged case is asked for separately
        return neighbour.isLiquid || neighbour.isWaterlogged;
    });
}
// Swap in the dead counterpart, carrying every state across. The wall fans in
// particular have to keep facing the way they were placed
function die(block) {
    const dead = deadForms.get(block.typeId);
    if (dead === undefined) {
        return;
    }
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(dead, states));
    block.dimension.playSound("dig.stone", block.center());
}
function check(block) {
    if (DIES_OUT_OF_WATER && !hasWater(block)) {
        die(block);
    }
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:coral_death", {
        beforeOnPlayerPlace(event) {
            // The standing plant and the seabed fan attach downwards; a wall
            // fan attaches to whichever side its block_face names
            const face = event.permutationToPlace.getAllStates()["minecraft:block_face"];
            const offset = SUPPORT_OFFSETS[typeof face === "string" ? face : "up"];
            if (offset !== undefined && !canGrowOn(event.block.offset(offset))) {
                event.cancel = true;
            }
        },
        // Placing coral in the open kills it straight away rather than leaving
        // it looking alive until the next random tick
        onPlace(event) {
            check(event.block);
        },
        onRandomTick(event) {
            check(event.block);
        },
    });
});
