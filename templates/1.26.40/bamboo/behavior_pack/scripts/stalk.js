// The shape of a bamboo stalk, and the one step that grows it.
// A new section is shaped from what already stands under it, and growing
// pushes the older leaves down the stalk. That is what produces the leafy
// crown and the bare stem below it, rather than a column of identical blocks.
import { BlockPermutation } from "@minecraft/server";
import { BAMBOO_ID, LEAVES_LARGE, LEAVES_NONE, LEAVES_SMALL, LEAVES_STATE, MATURE_ALWAYS, MATURE_CHANCE, MATURE_FROM, MATURE_STATE, MAX_HEIGHT, SHOOT_STATE, THICK_FROM, THICK_STATE, } from "./config.js";
// Any part of the plant, shoot or stalk
export function isBamboo(block) {
    return block !== undefined && block.typeId === BAMBOO_ID;
}
// The shoot a planted stalk starts from
export function isShoot(block) {
    return isBamboo(block) && block.permutation.getAllStates()[SHOOT_STATE] === true;
}
// A grown section, as opposed to the shoot
export function isStalk(block) {
    return isBamboo(block) && !isShoot(block);
}
export function leavesOf(block) {
    const value = block.permutation.getAllStates()[LEAVES_STATE];
    return typeof value === "string" ? value : LEAVES_NONE;
}
export function isThick(block) {
    return block.permutation.getAllStates()[THICK_STATE] === true;
}
export function isMature(block) {
    return block.permutation.getAllStates()[MATURE_STATE] === true;
}
// The full state set for one section. Every write of a section goes through
// here, so no write can leave a state unset
function section(thick, leaves, mature) {
    return BlockPermutation.resolve(BAMBOO_ID, {
        [THICK_STATE]: thick,
        [LEAVES_STATE]: leaves,
        [MATURE_STATE]: mature,
        [SHOOT_STATE]: false,
    });
}
// Change one state on a section and keep the others
function setState(block, state, value) {
    const states = block.permutation.getAllStates();
    // Skip the write when nothing changes, so a settled stalk is not rewritten
    // every time it is checked
    if (states[state] === value) {
        return;
    }
    block.setPermutation(BlockPermutation.resolve(BAMBOO_ID, { ...states, [state]: value }));
}
// How many bamboo blocks stand under this one. The shoot counts: it turns
// into a section as soon as anything grows on it, so a planted stalk is
// measured the same way vanilla measures one
export function heightBelow(block) {
    let count = 0;
    for (let step = 1; step < MAX_HEIGHT; step++) {
        if (!isBamboo(block.below(step))) {
            break;
        }
        count++;
    }
    return count;
}
// How tall the stalk is that ends at `top`
export function heightOf(top) {
    return heightBelow(top) + 1;
}
// Walk up to the block with nothing bamboo above it
export function findTop(block) {
    let top = block;
    for (let step = 0; step < MAX_HEIGHT; step++) {
        const above = top.above();
        if (!isBamboo(above)) {
            return top;
        }
        top = above;
    }
    return top;
}
// The section that belongs above `top`, worked out the way vanilla does it.
// Growth and a player stacking bamboo by hand both use this, so both build the
// same stalk. It only reads the world, so it is safe inside a before-event
export function nextSection(top, mature) {
    // Leaves come from the section under the top, not from the top itself.
    // Where that one still has leaves the new section takes the large ones and
    // the crown moves up. Where the stalk is bare there, or the top is the
    // shoot standing on soil, the new section starts small
    const under = top.below();
    const leaves = isStalk(under) && leavesOf(under) !== LEAVES_NONE ? LEAVES_LARGE : LEAVES_SMALL;
    // Thin until the stalk reaches THICK_FROM blocks. settle() fattens the
    // older sections at the same moment, so the whole stalk changes together
    const thick = heightOf(top) + 1 >= THICK_FROM;
    return section(thick, leaves, mature);
}
// One walk down the stalk, bringing every section under the top into shape.
// Two things are fixed on the way down, both of them things vanilla does to
// sections that are already standing rather than only to the new one
function reshapeBelow(top, thick) {
    let part = top.below();
    for (let step = 1; step < MAX_HEIGHT && isBamboo(part); step++) {
        // A shoot only belongs at the bottom of a plant with nothing on it.
        // With bamboo above, it is really the first section of the stalk, so
        // it becomes a plain stem with no leaves, the way vanilla turns its
        // sapling into a stalk. Written whole, because a shoot carries none of
        // a stem's other states
        if (isShoot(part)) {
            part.setPermutation(section(thick, LEAVES_NONE, false));
        }
        else if (thick) {
            // Bedrock fattens the sections that are already there as the stalk
            // climbs, so a tall stalk is never left with thin segments low down
            setState(part, THICK_STATE, true);
        }
        part = part.below();
    }
}
// Bring a stalk up to date from its top down. This runs after every growth
// step and after a player stacks a block, and only writes states that change,
// so running it on a stalk that is already in shape is harmless
export function settle(top) {
    const under = top.below();
    // A shoot on soil has nothing under it to settle
    if (!isBamboo(under)) {
        return;
    }
    // A shoot set straight onto bamboo, by a command or a structure, is really
    // the next section of that stalk. Done first, so the rules below read the
    // section it became rather than the shoot it arrived as
    if (isShoot(top)) {
        top.setPermutation(nextSection(under, false));
    }
    // Past this height every section of the stalk is thick, the top included
    const thick = heightOf(top) >= THICK_FROM;
    if (thick) {
        setState(top, THICK_STATE, true);
    }
    reshapeBelow(top, thick);
    // A new large crown pushes the old one down: the section that lent its
    // leaves drops to small and the one under that goes bare. Vanilla only
    // does this when that lower one is bamboo too
    if (leavesOf(top) === LEAVES_LARGE) {
        const two = top.below(2);
        const three = top.below(3);
        if (isStalk(two) && isStalk(three)) {
            setState(two, LEAVES_STATE, LEAVES_SMALL);
            setState(three, LEAVES_STATE, LEAVES_NONE);
        }
    }
}
// Put one more section on top of `top`. Returns false when the stalk cannot
// grow here, which is how bone meal knows to stop
export function growFrom(top) {
    const above = top.above();
    // Only air can be grown into
    if (above === undefined || !above.isAir) {
        return false;
    }
    // A section that has finished growing never grows again. The shoot is
    // never finished, whatever its state says
    if (!isShoot(top) && isMature(top)) {
        return false;
    }
    const height = heightOf(top);
    // A full-height stalk stops
    if (height >= MAX_HEIGHT) {
        return false;
    }
    // Tall stalks roll a chance to make this the last section, and a top at
    // MATURE_ALWAYS always makes it the last one
    const mature = (height >= MATURE_FROM && Math.random() < MATURE_CHANCE) || height === MATURE_ALWAYS;
    // The shoot needs no special case: standing on soil, the rule gives it a
    // thin section with small leaves, which is what vanilla's shoot grows
    above.setPermutation(nextSection(top, mature));
    settle(above);
    return true;
}
