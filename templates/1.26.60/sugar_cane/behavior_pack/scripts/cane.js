// The questions a block of cane asks about itself and the ground it stands on.
import { BlockPermutation } from "@minecraft/server";
import { AGE_STATE, CANE_ID, MAX_HEIGHT, waterIds } from "./config.js";
export function isCane(block) {
    return block !== undefined && block.typeId === CANE_ID;
}
export function ageOf(block) {
    const value = block.permutation.getAllStates()[AGE_STATE];
    return typeof value === "number" ? value : 0;
}
export function setAge(block, age) {
    block.setPermutation(BlockPermutation.resolve(CANE_ID, { [AGE_STATE]: age }));
}
// Water on any of the four sides of the given block. A waterlogged neighbour
// counts too, which is how cane beside a waterlogged slab or a kelp strand
// stays alive
export function hasWaterBeside(block) {
    if (block === undefined) {
        return false;
    }
    const sides = [block.north(), block.south(), block.east(), block.west()];
    return sides.some((side) => side !== undefined && (waterIds.has(side.typeId) || side.isWaterlogged));
}
// Is this block the bottom of a stand?
export function isRoot(block) {
    return !isCane(block.below());
}
// The root of the stand this block belongs to, found by walking down at most
// MAX_HEIGHT blocks. Nothing here walks the whole world column
export function rootOf(block) {
    let current = block;
    for (let step = 0; step < MAX_HEIGHT; step++) {
        const below = current.below();
        if (!isCane(below)) {
            return current;
        }
        current = below;
    }
    return current;
}
// How many blocks are standing under this one, plus itself
export function heightOf(root) {
    let count = 1;
    let current = root;
    for (let step = 0; step < MAX_HEIGHT; step++) {
        const above = current.above();
        if (!isCane(above)) {
            return count;
        }
        count += 1;
        current = above;
    }
    return count;
}
// Only the top block grows
export function isTop(block) {
    return !isCane(block.above());
}
// Pull one block of cane out and leave its item. Nothing walks up the stand
// afterwards: the placement filter lists the cane itself as valid ground, so
// the block above loses its footing on the same update and the engine pops the
// rest of the column for us
export function uproot(block) {
    const drop = block.getItemStack(1, true);
    const { dimension } = block;
    const centre = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, centre);
    }
    dimension.playSound("dig.grass", centre);
}
