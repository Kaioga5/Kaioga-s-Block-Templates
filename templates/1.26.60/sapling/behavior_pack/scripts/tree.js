// Turning a sapling into a tree.
// Two routes are offered because packs want different things: a shape described
// in config.ts, which is easy to retune and needs no extra files, or a saved
// structure, which is easy to build in-game and hard to describe in numbers.
import { BlockPermutation, world } from "@minecraft/server";
import { structureOffset, treeShape, treeStructure } from "./config.js";
// Blocks a growing tree is allowed to grow through. Anything else stops it,
// which is why a tree will not eat a roof
function isClear(block) {
    return block !== undefined && (block.isAir || block.typeId.endsWith("_leaves"));
}
// Is there room for a trunk this tall, with the canopy spread around its top?
function hasRoom(origin, trunk) {
    for (let step = 1; step < trunk; step++) {
        if (!isClear(origin.above(step))) {
            return false;
        }
    }
    // The canopy is wider than the trunk, so the rings need checking too
    const top = trunk - 1;
    for (const layer of treeShape.canopy) {
        for (let dx = -layer.radius; dx <= layer.radius; dx++) {
            for (let dz = -layer.radius; dz <= layer.radius; dz++) {
                const candidate = origin.offset({ x: dx, y: top + layer.y, z: dz });
                if (candidate !== undefined && !isClear(candidate)) {
                    return false;
                }
            }
        }
    }
    return true;
}
// Place one block without disturbing anything solid that is already there
function placeSoftly(dimension, location, permutation) {
    try {
        const target = dimension.getBlock(location);
        if (target !== undefined && isClear(target)) {
            target.setPermutation(permutation);
        }
    }
    catch {
        // Outside the loaded world; the tree just stops there
    }
}
// Build the configured shape at the sapling's position
function buildShape(origin) {
    const span = treeShape.maxTrunk - treeShape.minTrunk + 1;
    const trunk = treeShape.minTrunk + Math.floor(Math.random() * span);
    if (!hasRoom(origin, trunk)) {
        return;
    }
    const log = BlockPermutation.resolve(treeShape.log);
    const leaves = BlockPermutation.resolve(treeShape.leaves);
    const { dimension, location } = origin;
    const top = location.y + trunk - 1;
    // Leaves first, so the trunk overwrites any leaf that lands on its column
    for (const layer of treeShape.canopy) {
        for (let dx = -layer.radius; dx <= layer.radius; dx++) {
            for (let dz = -layer.radius; dz <= layer.radius; dz++) {
                const corner = Math.abs(dx) === layer.radius && Math.abs(dz) === layer.radius;
                // Vanilla drops each far corner about half the time, which is
                // what keeps two trees from looking identical
                if (corner && layer.trimCorners && Math.random() < 0.5) {
                    continue;
                }
                placeSoftly(dimension, { x: location.x + dx, y: top + layer.y, z: location.z + dz }, leaves);
            }
        }
    }
    for (let step = 0; step < trunk; step++) {
        try {
            dimension.getBlock({ x: location.x, y: location.y + step, z: location.z })?.setPermutation(log);
        }
        catch {
            return;
        }
    }
}
// Place a saved structure instead, anchored by structureOffset
function buildStructure(origin, name) {
    const { dimension, location } = origin;
    try {
        world.structureManager.place(name, dimension, {
            x: location.x + structureOffset.x,
            y: location.y + structureOffset.y,
            z: location.z + structureOffset.z,
        });
    }
    catch {
        // A missing or oversized structure leaves the sapling standing rather
        // than half-building a tree
    }
}
// Grow whichever of the two the pack configured
export function growTree(origin) {
    if (treeStructure !== undefined) {
        buildStructure(origin, treeStructure);
        return;
    }
    buildShape(origin);
}
