// The sapling's growth rules and the tree it turns into. Everything a pack
// normally wants to change about this template lives in this file.

// The sapling block itself
export const SAPLING_ID = "kai_templates:sapling";

// The growth counter. Vanilla saplings hold one bit: a sapling has to be
// nudged twice before it becomes a tree
export const STAGE_STATE = "kai_templates:stage";
export const FINAL_STAGE = 1;

// A sapling only grows when the light where it stands reaches this level
export const MIN_LIGHT = 9;

// Chance that a random tick advances the sapling at all. Vanilla rolls one in
// seven, which is why a planted sapling takes a while even on a lit farm
export const GROWTH_CHANCE = 1 / 7;

// Chance that one use of bone meal advances the sapling. Vanilla is 45 per cent
export const BONE_MEAL_CHANCE = 0.45;

// The item that counts as bone meal
export const BONE_MEAL_ID = "minecraft:bone_meal";

// One horizontal ring of leaves, placed relative to the topmost log. A negative
// y sits below the top of the trunk
export interface CanopyLayer {
    // Height relative to the topmost log
    y: number;
    // How far out the ring reaches, in blocks
    radius: number;
    // Drop the extreme corners, which is what stops the canopy looking like a
    // stack of boxes
    trimCorners: boolean;
}

export interface TreeShape {
    // What the trunk is made of
    log: string;
    // What the canopy is made of
    leaves: string;
    // Trunk height is picked from this range, inclusive
    minTrunk: number;
    maxTrunk: number;
    // The canopy, described from the bottom ring upwards
    canopy: CanopyLayer[];
}

// The shape that ships: a plain oak. Point log and leaves at your own blocks
// and the same builder grows those instead
export const treeShape: TreeShape = {
    log: "minecraft:oak_log",
    leaves: "minecraft:oak_leaves",
    minTrunk: 4,
    maxTrunk: 6,
    canopy: [
        { y: -2, radius: 2, trimCorners: true },
        { y: -1, radius: 2, trimCorners: true },
        { y: 0, radius: 1, trimCorners: false },
        { y: 1, radius: 1, trimCorners: true },
    ],
};

// A saved structure to place instead of building the shape above. Leave it
// undefined to use treeShape; set it to the name of a structure the world
// already holds, "mystructure:big_oak", for example, and the sapling places
// that instead, centred on the sapling's own column
export const treeStructure: string | undefined = undefined;

// How far the structure's origin sits from the sapling, when one is used. A
// 5x7x5 tree wants its corner two blocks north-west of the sapling
export const structureOffset = { x: -2, y: 0, z: -2 };
