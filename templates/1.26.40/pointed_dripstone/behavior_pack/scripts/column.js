// The shape of a dripstone column.
// A spike's thickness is not really a property of the spike, it is a property
// of where the spike sits. This file owns that arithmetic and the component
// that keeps every segment's state matching it.
import { BlockPermutation, LiquidType, system, } from "@minecraft/server";
import { DRIPSTONE_ID, FACE_STATE, MAX_LENGTH, THICKNESS_STATE, anchorIds, anchorTags, nonAnchorIds, nonAnchorTags, } from "./config.js";
const UP = { x: 0, y: 1, z: 0 };
const DOWN = { x: 0, y: -1, z: 0 };
export function isDripstone(block) {
    return block !== undefined && block.typeId === DRIPSTONE_ID;
}
// "down" for a stalactite, "up" for a stalagmite
export function facing(block) {
    const value = block.permutation.getAllStates()[FACE_STATE];
    return typeof value === "string" ? value : "up";
}
// The way the column runs back towards whatever holds it up
export function towards(block) {
    return facing(block) === "down" ? UP : DOWN;
}
// The way the column grows
export function away(block) {
    return facing(block) === "down" ? DOWN : UP;
}
// The ceiling or floor a column can hang from or stand on. Vanilla wants a
// solid face on the side the spike touches, which is why a stalactite grows off
// stone and deepslate but not off a torch or a patch of grass
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
// The next spike along, but only when it belongs to the same column. Two spikes
// pointing at each other are two columns that happen to meet
function sameColumn(block, offset) {
    const neighbour = block.offset(offset);
    if (!isDripstone(neighbour) || facing(neighbour) !== facing(block)) {
        return undefined;
    }
    return neighbour;
}
// Vanilla's rule, in order: the far end is a tip unless it has run into a spike
// coming the other way, in which case both merge; the segment behind a tip is a
// frustum; the segment touching the anchor is a base; anything else is middle
export function thicknessFor(block) {
    const next = sameColumn(block, away(block));
    if (next === undefined) {
        const beyond = block.offset(away(block));
        if (isDripstone(beyond) && facing(beyond) !== facing(block)) {
            return "merge";
        }
        return "tip";
    }
    const nextThickness = next.permutation.getAllStates()[THICKNESS_STATE];
    if (nextThickness === "tip" || nextThickness === "merge") {
        return "frustum";
    }
    if (sameColumn(block, towards(block)) === undefined) {
        return "base";
    }
    return "middle";
}
function applyThickness(block, thickness) {
    const states = block.permutation.getAllStates();
    if (states[THICKNESS_STATE] === thickness) {
        return;
    }
    block.setPermutation(BlockPermutation.resolve(DRIPSTONE_ID, { ...states, [THICKNESS_STATE]: thickness }));
}
// Walk back to the anchored end of the column
export function findAnchorEnd(block) {
    let end = block;
    for (let step = 0; step < MAX_LENGTH; step++) {
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
    let tip = block;
    for (let step = 0; step < MAX_LENGTH; step++) {
        const next = sameColumn(tip, away(tip));
        if (next === undefined) {
            return tip;
        }
        tip = next;
    }
    return tip;
}
// Restyle a whole column. Thickness is written from the tip back towards the
// anchor, because each segment reads the one beyond it and only the tip can
// decide on its own
export function restyle(member) {
    const segments = [];
    let current = findAnchorEnd(member);
    for (let step = 0; step < MAX_LENGTH && current !== undefined; step++) {
        segments.push(current);
        current = sameColumn(current, away(current));
    }
    for (const segment of segments.reverse()) {
        applyThickness(segment, thicknessFor(segment));
    }
}
// A column has to reach an anchor. The placement filter only checks the single
// block touching the spike, which stops being enough once a column is more than
// one segment long
export function isSupported(block) {
    let current = block;
    for (let step = 0; step < MAX_LENGTH; step++) {
        const next = current.offset(towards(current));
        if (next === undefined) {
            // Unloaded terrain is not proof of anything, so the spike stays
            return true;
        }
        if (isAnchor(next)) {
            return true;
        }
        const sibling = sameColumn(current, towards(current));
        if (sibling === undefined) {
            return false;
        }
        current = sibling;
    }
    return false;
}
// An unsupported spike breaks and leaves its item. Vanilla drops the column as
// falling blocks instead; see the README for why that is not reproducible here
export function collapse(block) {
    const drop = block.getItemStack(1, true);
    const { dimension } = block;
    const center = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, center);
    }
    dimension.playSound("dig.pointed_dripstone", center);
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:dripstone_column", {
        // The placement filter can only ask what the spike is touching, not
        // which way that neighbour runs. A stalactite hanging over a stalagmite
        // would satisfy it and then have nothing holding it up, so the real
        // rule is checked before the block is written
        beforeOnPlayerPlace(event) {
            const placing = event.permutationToPlace.getAllStates()[FACE_STATE];
            if (typeof placing !== "string") {
                return;
            }
            const anchorSide = placing === "down" ? event.block.above() : event.block.below();
            if (isAnchor(anchorSide)) {
                return;
            }
            // The only other thing a spike may hang from is more of the same
            // column, running the same way
            if (isDripstone(anchorSide) && facing(anchorSide) === placing) {
                return;
            }
            event.cancel = true;
        },
        onPlace(event) {
            restyle(event.block);
        },
        onRandomTick(event) {
            const block = event.block;
            if (!isSupported(block)) {
                collapse(block);
                return;
            }
            applyThickness(block, thicknessFor(block));
        },
        // Breaking a spike leaves a shorter column that needs restyling, and
        // whatever hung past the break has lost its anchor
        onPlayerBreak(event) {
            const neighbours = [event.block.above(), event.block.below()];
            system.run(() => {
                for (const neighbour of neighbours) {
                    if (!isDripstone(neighbour)) {
                        continue;
                    }
                    if (isSupported(neighbour)) {
                        restyle(neighbour);
                    }
                    else {
                        collapse(neighbour);
                    }
                }
            });
        },
    });
});
