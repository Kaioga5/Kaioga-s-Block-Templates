// The shape of an icicle.
// A segment's thickness follows from where it sits, and it is rewritten
// whenever an icicle next to it changes. This file owns that arithmetic, the
// component that keeps it up to date, the way a column comes loose, and the
// world events that tell an icicle its support has gone. It starts from the
// Pointed Dripstone template's column logic, adds the attached state, and
// follows the vanilla icicle where they differ: only hand placement and growth
// start a merge, and a random tick never reshapes a segment.
import { BlockPermutation, LiquidType, system, world, } from "@minecraft/server";
import { ATTACHED_STATE, BREAK_PARTICLE, BREAK_SOUND, FACE_STATE, ICICLE_ID, THICKNESS_STATE, anchorIds, anchorTags, nonAnchorIds, nonAnchorTags, } from "./config.js";
import { dropSegments } from "./falling.js";
const UP = { x: 0, y: 1, z: 0 };
// How long a segment that finds itself without support waits before it falls
// or breaks, in ticks: pointed dripstone's scheduled tick
const UNSUPPORTED_DELAY = 2;
const DOWN = { x: 0, y: -1, z: 0 };
export function isIcicle(block) {
    return block !== undefined && block.typeId === ICICLE_ID;
}
// "down" for an icicle hanging from a ceiling, "up" for one standing on a floor
export function facing(block) {
    const value = block.permutation.getAllStates()[FACE_STATE];
    return typeof value === "string" ? value : "down";
}
export function thicknessOf(block) {
    return String(block.permutation.getAllStates()[THICKNESS_STATE]);
}
export function isAttached(block) {
    return block.permutation.getAllStates()[ATTACHED_STATE] === true;
}
// The way the column runs back towards whatever holds it up
export function towards(block) {
    return facing(block) === "down" ? UP : DOWN;
}
// The way the column grows
export function away(block) {
    return facing(block) === "down" ? DOWN : UP;
}
// The ceiling or floor an icicle can hang from or stand on. Vanilla wants a
// solid face on the side the icicle touches, which is why it hangs from stone
// but not from a torch or a patch of grass
export function isAnchor(block) {
    if (block === undefined || block.isAir || block.isLiquid) {
        return false;
    }
    if (anchorIds.has(block.typeId) || anchorTags.some((tag) => block.hasTag(tag))) {
        return true;
    }
    if (nonAnchorIds.has(block.typeId) || nonAnchorTags.some((tag) => block.hasTag(tag))) {
        return false;
    }
    // Nothing in the script API reports whether a face is solid, so this asks
    // the closest question it can answer: does the block stop water? A full
    // block does. Torches, rails, buttons, plants and open fences do not
    return block.isLiquidBlocking(LiquidType.Water);
}
// The cell next door, or nothing when there is no reading to be had. The API
// answers undefined for a chunk that has not loaded and throws for a cell past
// the top or bottom of the world, and a walk along a column treats both the
// same way: whatever is there, it is not the next segment
export function neighbour(block, offset) {
    try {
        return block.offset(offset);
    }
    catch {
        return undefined;
    }
}
// How far a walk along a column could possibly go. Every walk below stops on
// the first cell that is not more of the same column, which is what really
// ends it; the height of the world is only the backstop
function walkLimit(block) {
    const { min, max } = block.dimension.heightRange;
    return max - min;
}
// The next segment along, but only when it belongs to the same column. Two
// icicles pointing at each other are two columns that happen to meet
export function sameColumn(block, offset) {
    const next = neighbour(block, offset);
    if (!isIcicle(next) || facing(next) !== facing(block)) {
        return undefined;
    }
    return next;
}
// The segment a tip has run into, when that segment belongs to an icicle
// coming the other way. Only a tip can have one
export function opposingTip(tip) {
    const beyond = neighbour(tip, away(tip));
    if (!isIcicle(beyond) || facing(beyond) === facing(tip)) {
        return undefined;
    }
    return beyond;
}
// Pointed dripstone's rule, in order: the free end is a tip, or a merge when
// it touches an icicle coming the other way; the segment behind a tip or merge
// is a frustum; the one against the ceiling or floor is the base; anything else
// is middle. This rule never starts a merge on its own: measured in Preview,
// two tips set next to each other by /setblock stay tips. Hand placement and
// growth write the merge themselves (beforeOnPlayerPlace below, grow.ts), and
// from then on this keeps it, on both sides, until the two tips part
export function thicknessFor(block) {
    const opposing = opposingTip(block);
    if (opposing !== undefined) {
        const merged = thicknessOf(block) === "merge" || thicknessOf(opposing) === "merge";
        return merged ? "merge" : "tip";
    }
    const next = sameColumn(block, away(block));
    if (next === undefined) {
        return "tip";
    }
    const nextThickness = thicknessOf(next);
    if (nextThickness === "tip" || nextThickness === "merge") {
        return "frustum";
    }
    return sameColumn(block, towards(block)) === undefined ? "base" : "middle";
}
export function applyThickness(block, thickness) {
    const states = block.permutation.getAllStates();
    if (states[THICKNESS_STATE] === thickness) {
        return;
    }
    block.setPermutation(BlockPermutation.resolve(ICICLE_ID, { ...states, [THICKNESS_STATE]: thickness }));
}
// Walk back to the anchored end of the column, however far off that is
export function findAnchorEnd(block) {
    const limit = walkLimit(block);
    let end = block;
    for (let step = 0; step < limit; step++) {
        const next = sameColumn(end, towards(end));
        if (next === undefined) {
            return end;
        }
        end = next;
    }
    return end;
}
// Walk out to the free end
export function findTip(block) {
    const limit = walkLimit(block);
    let tip = block;
    for (let step = 0; step < limit; step++) {
        const next = sameColumn(tip, away(tip));
        if (next === undefined) {
            return tip;
        }
        tip = next;
    }
    return tip;
}
// Every segment from this one out to the free end, this one first
export function segmentsFrom(start) {
    const limit = walkLimit(start);
    const segments = [];
    let current = start;
    for (let step = 0; step < limit && current !== undefined; step++) {
        segments.push(current);
        current = sameColumn(current, away(current));
    }
    return segments;
}
// A segment told that something next to it changed checks its support, and an
// unsupported column falls or breaks UNSUPPORTED_DELAY ticks later. Measured in
// Preview: a stalactite lost its support to a segment set beside it and was
// falling two ticks later
function checkLater(segment) {
    if (isSupported(segment)) {
        return;
    }
    system.runTimeout(() => {
        if (isIcicle(segment) && !isSupported(segment)) {
            collapseColumn(segment);
        }
    }, UNSUPPORTED_DELAY);
}
// Vanilla reshapes a segment only when an icicle next to it changes, and the
// change spreads one segment at a time. This walks that spread out from a cell
// that has just changed: each icicle above and below it is measured again, and
// only one whose thickness really changes passes the update on to its own
// neighbours. The changed cell itself is left alone unless that spread comes
// back to it, which is how a lone /setblock segment keeps its thickness
export function updateAround(changed) {
    const queue = [];
    const passOn = (from) => {
        for (const offset of [UP, DOWN]) {
            const next = neighbour(from, offset);
            if (isIcicle(next)) {
                queue.push(next);
            }
        }
    };
    passOn(changed);
    // Each segment can change only a few times in one spread; the limit is a
    // backstop against a loop, never the thing that ends it
    let budget = walkLimit(changed) * 4;
    while (queue.length > 0 && budget-- > 0) {
        const segment = queue.shift();
        if (!isIcicle(segment)) {
            continue;
        }
        // Every segment that hears of a change also checks it is still held up
        checkLater(segment);
        const thickness = thicknessFor(segment);
        if (thickness === thicknessOf(segment)) {
            continue;
        }
        applyThickness(segment, thickness);
        passOn(segment);
    }
}
// An icicle has to reach an anchor. The placement filter only checks the
// single block touching the segment, which stops being enough once an icicle
// is more than one segment long
export function isSupported(block) {
    const end = findAnchorEnd(block);
    const anchor = neighbour(end, towards(end));
    if (anchor === undefined) {
        // Unloaded terrain, or the edge of the world. Neither is proof that the
        // anchor has gone, so the icicle stays
        return true;
    }
    return isAnchor(anchor);
}
// One segment coming apart where it stood, leaving its item. This is what an
// icicle standing on a floor does when it melts or the floor goes: there is
// nothing for it to fall to
function popOff(block) {
    const drop = block.getItemStack(1, false);
    const { dimension } = block;
    const center = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, center);
    }
    // A block a script sets to air gets no break effect from the engine
    dimension.spawnParticle(BREAK_PARTICLE, block.location);
    dimension.playSound(BREAK_SOUND, center);
}
// Let a hanging icicle go from this segment down: the segment and every one
// below it fall, and whatever is left above is a shorter icicle with a new tip.
// Melting uses this on the segment that melted, and losing the ceiling uses it
// on the segment against the ceiling, which takes the whole icicle
export function breakLoose(start) {
    // Several segments of one icicle can get their random tick in the same
    // game tick. The first one to act takes the whole icicle, so by the time
    // the next runs its cell may already be air
    if (!isIcicle(start)) {
        return;
    }
    const segments = segmentsFrom(start);
    const tip = segments[segments.length - 1];
    // Each segment falls wearing the shape it has now, read off the blocks
    // before they go. A tip that was merged onto an icicle below is a tip
    // again once it is falling
    const falling = segments.map((segment) => {
        const thickness = thicknessOf(segment);
        return {
            location: segment.location,
            thickness: thickness === "merge" ? "tip" : thickness,
            attached: isAttached(segment),
        };
    });
    const { dimension } = start;
    // Clear the cells before anything is spawned, so there is never a moment
    // where both the icicle and the thing carrying it exist
    for (const segment of segments) {
        segment.setType("minecraft:air");
    }
    dropSegments(dimension, falling);
    // What stays on the ceiling ends in a new tip, and whatever the old tip
    // was merged with is a tip again
    updateAround(start);
    updateAround(tip);
}
// The standing version: this segment and every one above it come apart where
// they are, and the rest of the stalagmite gets a new tip
export function breakUp(start) {
    if (!isIcicle(start)) {
        return;
    }
    const segments = segmentsFrom(start);
    for (const segment of segments) {
        popOff(segment);
    }
    updateAround(start);
    updateAround(segments[segments.length - 1]);
}
// Support is a property of a whole icicle: every segment reaches the anchor
// along the same walk, so once one of them has lost it they all have
export function collapseColumn(member) {
    if (!isIcicle(member)) {
        return;
    }
    const end = findAnchorEnd(member);
    if (facing(member) === "down") {
        breakLoose(end);
    }
    else {
        breakUp(end);
    }
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:icicle_column", {
        // The placement filter can only ask what the icicle is touching, not
        // which way that neighbour runs. An icicle hanging under one that points
        // up (set by /setblock, or one whose floor went unnoticed) would pass it
        // and then have nothing holding it up, so the real rule is checked
        // before the block is written. This is
        // also where the new segment learns whether it is attached and whether
        // it merges with a tip it was placed against
        beforeOnPlayerPlace(event) {
            const states = event.permutationToPlace.getAllStates();
            const placing = states[FACE_STATE];
            if (typeof placing !== "string") {
                return;
            }
            const block = event.block;
            // neighbour() rather than above()/below(), which throw at the top
            // and bottom of the world
            const anchorSide = neighbour(block, placing === "down" ? UP : DOWN);
            const ontoIcicle = isIcicle(anchorSide);
            // The only icicle another may hang from is more of the same icicle,
            // running the same way
            if (ontoIcicle ? facing(anchorSide) !== placing : !isAnchor(anchorSide)) {
                event.cancel = true;
                return;
            }
            // A tip placed against one coming the other way merges with it.
            // Pointed dripstone skips the merge while the player sneaks, and
            // so does this
            const beyond = neighbour(block, placing === "down" ? DOWN : UP);
            const merges = isIcicle(beyond) && facing(beyond) !== placing && !(event.player?.isSneaking ?? false);
            event.permutationToPlace = BlockPermutation.resolve(ICICLE_ID, {
                ...states,
                [ATTACHED_STATE]: !ontoIcicle,
                [THICKNESS_STATE]: merges ? "merge" : "tip",
            });
        },
        // A new segment is news to the icicles beside it. The new segment
        // keeps the thickness it was placed with unless their change reaches
        // back to it; measured in Preview, a lone segment set by /setblock
        // keeps whatever thickness the command gave it
        onPlace(event) {
            const block = event.block;
            // Measured in Preview: a lone icicle set by /setblock in mid-air
            // stays there, but one set next to another icicle has its whole
            // column checked, and an unsupported column comes down
            if (isIcicle(neighbour(block, UP)) || isIcicle(neighbour(block, DOWN))) {
                checkLater(block);
            }
            updateAround(block);
        },
        // The safety net for support lost without a break event, such as an
        // anchor removed by /setblock or moved by a piston. It does not reshape
        // the segment: vanilla never does on a random tick, which is how a lone
        // /setblock segment keeps its thickness
        onRandomTick(event) {
            const block = event.block;
            // Another segment's tick earlier in this game tick may already
            // have taken this one
            if (!isIcicle(block)) {
                return;
            }
            if (!isSupported(block)) {
                collapseColumn(block);
            }
        },
    });
});
// The ceiling an icicle hangs from and the floor it stands on are ordinary
// blocks, so no hook of ours is told when one of them goes. A segment can only
// be sitting in the two cells directly above and below the change, so a break
// with no icicle beside it costs two block reads and nothing else
function checkSupport(changed) {
    for (const offset of [UP, DOWN]) {
        try {
            const segment = changed.offset(offset);
            if (!isIcicle(segment)) {
                continue;
            }
            if (isSupported(segment)) {
                // Still held up, but a shorter icicle has a different shape,
                // and one that was merged onto the broken one is a tip again
                updateAround(changed);
            }
            else {
                collapseColumn(segment);
            }
        }
        catch {
            // The cell is past the top or bottom of the world, or its chunk
            // went away between the break and this pass
        }
    }
}
// Both events name a cell that has just emptied, which is either the anchor an
// icicle hung from or a segment out of the middle of one. Waiting a tick lets
// the engine finish the change before the column is measured against it
world.afterEvents.playerBreakBlock.subscribe((event) => {
    const changed = event.block;
    system.run(() => checkSupport(changed));
});
// A creeper or a charge of TNT takes an anchor out the same way, and reports
// every cell it cleared
world.afterEvents.blockExplode.subscribe((event) => {
    const changed = event.block;
    system.run(() => checkSupport(changed));
});
