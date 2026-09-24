// Where a vine is holding on.
// A vine is four independent flags, one for each horizontal face it clings to,
// plus a fifth that only draws a leaf under a solid block overhead. This file
// owns reading them, writing them, and the rule that decides which of them the
// world still supports.
import { Block, BlockPermutation, LiquidType } from "@minecraft/server";
import { SIDE_STATES, UP_STATE, VINES_ID, clingingIds, clingingTags, nonClingingIds } from "./config.js";

export type Side = (typeof SIDE_STATES)[number];

// The neighbour each side state looks at. A vine clinging to its north face is
// held up by the block to the north
export const SIDE_OFFSETS: Record<Side, { x: number; y: number; z: number }> = {
    "kai_templates:north": { x: 0, y: 0, z: -1 },
    "kai_templates:south": { x: 0, y: 0, z: 1 },
    "kai_templates:east": { x: 1, y: 0, z: 0 },
    "kai_templates:west": { x: -1, y: 0, z: 0 },
};

// Which side state a clicked face corresponds to. Clicking the north face of a
// block puts the vine on the south side of that block's neighbour, so the vine
// clings to its own south face. The top and the underside of a block have no
// entry: a vanilla vine can hang from neither
export const FACE_TO_STATE: Record<string, Side> = {
    north: "kai_templates:south",
    south: "kai_templates:north",
    east: "kai_templates:west",
    west: "kai_templates:east",
};

// Can a vine hold onto this block? A block that can neither hold water nor be
// washed away by it is solid, and the lists in config.ts catch the few blocks
// where the vanilla vine disagrees with that
export function canCling(block: Block | undefined): boolean {
    if (block === undefined || block.isAir || block.isLiquid) {
        return false;
    }
    if (nonClingingIds.has(block.typeId)) {
        return false;
    }
    if (clingingIds.has(block.typeId) || clingingTags.some((tag) => block.hasTag(tag))) {
        return true;
    }
    return !block.canContainLiquid(LiquidType.Water) && !block.canBeDestroyedByLiquidSpread(LiquidType.Water);
}

export function readFlag(block: Block, state: string): boolean {
    return block.permutation.getAllStates()[state] === true;
}

// All five flags exactly as the block currently carries them
export function readFlags(block: Block): Record<string, boolean> {
    const flags: Record<string, boolean> = { [UP_STATE]: readFlag(block, UP_STATE) };
    for (const state of SIDE_STATES) {
        flags[state] = readFlag(block, state);
    }
    return flags;
}

// Which of the faces this vine already has are still held up.
//
// A face survives while the wall behind it is there, or while the vine directly
// above is clinging to the same face. That second clause is the whole reason a
// curtain can hang past the bottom of the wall it started on, and it is the
// piece that is easy to miss: without it, every segment below the wall lets go
// at once.
//
// A face that is off stays off. Faces are only ever added by placing a vine or
// by growth, never by a neighbour appearing, the same way vanilla does it, and
// the reason a vine does not silently re-attach to a wall a player just built.
export function supportedFlags(block: Block): Record<string, boolean> {
    const above = block.above();
    const vineAbove = above !== undefined && above.typeId === VINES_ID ? above : undefined;

    const flags: Record<string, boolean> = {};
    for (const state of SIDE_STATES) {
        if (!readFlag(block, state)) {
            flags[state] = false;
            continue;
        }
        flags[state] =
            canCling(block.offset(SIDE_OFFSETS[state])) ||
            (vineAbove !== undefined && readFlag(vineAbove, state));
    }

    // The ceiling leaf is drawn whenever a solid block sits overhead and never
    // holds anything up. Vanilla draws it the same way, and a vine with
    // nothing but a ceiling does not survive there
    flags[UP_STATE] = canCling(above);
    return flags;
}

// A vine is alive while at least one side still holds it
export function anySide(flags: Partial<Record<string, boolean>>): boolean {
    return SIDE_STATES.some((state) => flags[state]);
}

export function applyFlags(block: Block, flags: Record<string, boolean>): void {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(VINES_ID, { ...states, ...flags }));
}

// Put a new vine down with these sides. The ceiling leaf follows the block
// above the new vine, not the one it grew from
export function placeVine(block: Block, sides: Partial<Record<Side, boolean>>): void {
    block.setPermutation(BlockPermutation.resolve(VINES_ID, { ...sides, [UP_STATE]: canCling(block.above()) }));
}

export function sameFlags(block: Block, flags: Record<string, boolean>): boolean {
    return Object.entries(flags).every(([state, value]) => readFlag(block, state) === value);
}
