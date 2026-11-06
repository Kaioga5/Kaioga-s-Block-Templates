// A coral block drying out.
// A solid block cannot be waterlogged, so unlike the fans and plants it only
// has its six neighbours to draw water from, which is exactly what vanilla
// checks. There is no neighbour-changed hook for custom blocks, so the check
// runs when the block is placed and on random ticks after that.
import { system, } from "@minecraft/server";
import { DIES_OUT_OF_WATER, deadForms } from "./config.js";
const NEIGHBOURS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];
function hasWater(block) {
    return NEIGHBOURS.some((offset) => {
        const neighbour = block.offset(offset);
        // Unknown neighbours at a chunk border count as water rather than
        // killing coral on a guess
        if (neighbour === undefined) {
            return true;
        }
        // A water block keeps coral alive, and so does a waterlogged block:
        // a slab, a fan or a sea pickle standing in water still has water
        // against this face. isLiquid only reports the water block itself, so
        // the waterlogged case has to be asked for separately
        return neighbour.isLiquid || neighbour.isWaterlogged;
    });
}
function check(block) {
    if (!DIES_OUT_OF_WATER) {
        return;
    }
    const dead = deadForms.get(block.typeId);
    if (dead !== undefined && !hasWater(block)) {
        block.setType(dead);
        block.dimension.playSound("dig.stone", block.center());
    }
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:coral_block_death", {
        onPlace(event) {
            check(event.block);
        },
        onRandomTick(event) {
            check(event.block);
        },
    });
});
