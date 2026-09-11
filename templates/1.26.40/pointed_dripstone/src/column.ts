// The shape of a dripstone column.
// A spike's thickness is not really a property of the spike, it is a property
// of where the spike sits. This file owns that arithmetic, the component that
// keeps every segment's state matching it, and the world events that are the
// only warning a column gets that whatever holds it up has gone.
import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockComponentRandomTickEvent,
    BlockPermutation,
    LiquidType,
    system,
    world,
} from "@minecraft/server";
import {
    BREAK_SOUND,
    DRIPSTONE_ID,
    FACE_STATE,
    THICKNESS_STATE,
    anchorIds,
    anchorTags,
    nonAnchorIds,
    nonAnchorTags,
} from "./config.js";
import { dropColumn } from "./falling.js";

const UP = { x: 0, y: 1, z: 0 };
const DOWN = { x: 0, y: -1, z: 0 };

export function isDripstone(block: Block | undefined): block is Block {
    return block !== undefined && block.typeId === DRIPSTONE_ID;
}

// "down" for a stalactite, "up" for a stalagmite
export function facing(block: Block): string {
    const value = block.permutation.getAllStates()[FACE_STATE];
    return typeof value === "string" ? value : "up";
}

// The way the column runs back towards whatever holds it up
export function towards(block: Block): { x: number; y: number; z: number } {
    return facing(block) === "down" ? UP : DOWN;
}

// The way the column grows
export function away(block: Block): { x: number; y: number; z: number } {
    return facing(block) === "down" ? DOWN : UP;
}

// The ceiling or floor a column can hang from or stand on. Vanilla wants a
// solid face on the side the spike touches, which is why a stalactite grows off
// stone and deepslate but not off a torch or a patch of grass
export function isAnchor(block: Block | undefined): boolean {
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
// the top or bottom of the world, and a walk along a column has the same use
// for both: whatever is there, it is not the next segment
function neighbour(block: Block, offset: { x: number; y: number; z: number }): Block | undefined {
    try {
        return block.offset(offset);
    } catch {
        return undefined;
    }
}

// How far a walk along a column could possibly go. A column runs straight up or
// down, so the height of the world it stands in is the only thing that limits
// how long it is. Every walk below stops on the first cell that is not more of
// the same column, which is what really ends them; this is the backstop, and
// reaching it would take a column running from the floor of the world to its
// ceiling
function walkLimit(block: Block): number {
    const { min, max } = block.dimension.heightRange;
    return max - min;
}

// The next spike along, but only when it belongs to the same column. Two spikes
// pointing at each other are two columns that happen to meet
function sameColumn(block: Block, offset: { x: number; y: number; z: number }): Block | undefined {
    const next = neighbour(block, offset);
    if (!isDripstone(next) || facing(next) !== facing(block)) {
        return undefined;
    }
    return next;
}

// The spike a tip has run into, when that spike belongs to a column coming the
// other way. Only a tip can have one, because anything further back has its own
// column in front of it
function opposingTip(tip: Block): Block | undefined {
    const beyond = neighbour(tip, away(tip));
    if (!isDripstone(beyond) || facing(beyond) === facing(tip)) {
        return undefined;
    }
    return beyond;
}

// Vanilla's rule, in order: the far end is a tip unless it has run into a spike
// coming the other way, in which case both merge; the segment behind a tip is a
// frustum; the segment touching the anchor is a base; anything else is middle
export function thicknessFor(block: Block): string {
    const next = sameColumn(block, away(block));
    if (next === undefined) {
        return opposingTip(block) === undefined ? "tip" : "merge";
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

function applyThickness(block: Block, thickness: string): void {
    const states = block.permutation.getAllStates();
    if (states[THICKNESS_STATE] === thickness) {
        return;
    }
    block.setPermutation(BlockPermutation.resolve(DRIPSTONE_ID, { ...states, [THICKNESS_STATE]: thickness }));
}

// Walk back to the anchored end of the column, however far off that is
export function findAnchorEnd(block: Block): Block {
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
export function findTip(block: Block): Block {
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

// Every spike of the column a member belongs to, anchor end first
function columnFrom(member: Block): Block[] {
    const limit = walkLimit(member);
    const segments: Block[] = [];
    let current: Block | undefined = findAnchorEnd(member);
    for (let step = 0; step < limit && current !== undefined; step++) {
        segments.push(current);
        current = sameColumn(current, away(current));
    }
    return segments;
}

// Restyle one column. Thickness is written from the tip back towards the
// anchor, because each segment reads the one beyond it and only the tip can
// decide on its own
function restyleColumn(member: Block): void {
    for (const segment of columnFrom(member).reverse()) {
        applyThickness(segment, thicknessFor(segment));
    }
}

// Restyle a column and whatever it has met. Two spikes pointing at each other
// belong to two columns, and the walk above stops where they join, so the far
// side keeps the shape it had until something restyles it in its own right.
// That is what leaves a stalagmite standing as a bare tip under a stalactite
// that has already merged onto it
export function restyle(member: Block): void {
    restyleColumn(member);
    const meeting = opposingTip(findTip(member));
    if (meeting !== undefined) {
        restyleColumn(meeting);
    }
}

// A column has to reach an anchor. The placement filter only checks the single
// block touching the spike, which stops being enough once a column is more than
// one segment long
export function isSupported(block: Block): boolean {
    // The answer belongs to the column rather than to the spike being asked
    // about: every segment hangs off the same one cell, so the walk goes to the
    // anchored end of the column, however far away that is, and asks about the
    // cell past it
    const end = findAnchorEnd(block);
    const anchor = neighbour(end, towards(end));
    if (anchor === undefined) {
        // Unloaded terrain, or the edge of the world. Neither is proof that the
        // anchor has gone, so the spike stays
        return true;
    }
    return isAnchor(anchor);
}

// One spike coming apart where it stood, leaving its item. This is what a
// stalagmite does when its floor goes: it is standing on the ground already,
// so there is nothing for it to fall to. A stalactite takes the other path in
// collapseColumn below
export function collapse(block: Block): void {
    const drop = block.getItemStack(1, true);
    const { dimension } = block;
    const center = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, center);
    }
    dimension.playSound(BREAK_SOUND, center);
}

// Support is a property of a column rather than of one spike: every segment
// reaches the anchor along the same walk, so once one of them has lost it they
// all have. Nothing reports a block a script set to air, so the rest of the
// column is taken here instead of each segment waiting to notice on its own
export function collapseColumn(member: Block): void {
    const segments = columnFrom(member);
    const tip = segments[segments.length - 1];
    const meeting = opposingTip(tip);
    if (facing(member) === "down") {
        // A stalactite with nothing above it drops the way vanilla's does,
        // rather than leaving a handful of items where the ceiling used to
        // be. Each spike falls wearing the shape it has now, read off the
        // blocks before they go. The cells are cleared before anything is
        // spawned, so there is never a moment where both the column and the
        // thing carrying it exist
        const { dimension } = tip;
        const start = tip.location;
        const shapes = segments
            .map((segment) => String(segment.permutation.getAllStates()[THICKNESS_STATE]))
            .reverse();
        for (const segment of segments) {
            segment.setType("minecraft:air");
        }
        dropColumn(dimension, start, shapes);
    } else {
        // A stalagmite has no ceiling to come away from. Its floor going is
        // the end of it, and it comes apart where it stood
        for (const segment of segments) {
            collapse(segment);
        }
    }
    // Whatever the tip was merged with is a tip again
    if (meeting !== undefined) {
        restyleColumn(meeting);
    }
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:dripstone_column", {
        // The placement filter can only ask what the spike is touching, not
        // which way that neighbour runs. A stalactite hanging over a stalagmite
        // would satisfy it and then have nothing holding it up, so the real
        // rule is checked before the block is written
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            const placing = event.permutationToPlace.getAllStates()[FACE_STATE];
            if (typeof placing !== "string") {
                return;
            }
            const anchorSide = placing === "down" ? event.block.above() : event.block.below();
            if (isAnchor(anchorSide)) {
                return;
            }
            // The only other thing a spike may hang from is more of the same
            // column, running the same way. How long that column already is
            // makes no difference: nothing here counts segments
            if (isDripstone(anchorSide) && facing(anchorSide) === placing) {
                return;
            }
            event.cancel = true;
        },

        onPlace(event: BlockComponentOnPlaceEvent): void {
            restyle(event.block);
        },

        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const block = event.block;
            if (!isSupported(block)) {
                collapseColumn(block);
                return;
            }
            applyThickness(block, thicknessFor(block));
        },
    });
});

// The ceiling a column hangs from and the floor it stands on are ordinary
// blocks belonging to whoever placed them, so no hook of ours is told when one
// of them goes. A spike can only ever be sitting in the two cells directly
// above and below the change, so a break with no spike beside it costs two
// block reads and nothing else
function checkSupport(changed: Block): void {
    for (const offset of [UP, DOWN]) {
        try {
            const spike = changed.offset(offset);
            if (!isDripstone(spike)) {
                continue;
            }
            if (isSupported(spike)) {
                // Still held up, but a shorter column has a different shape,
                // and a spike that was merged onto the broken one is a tip
                // again
                restyle(spike);
            } else {
                collapseColumn(spike);
            }
        } catch {
            // The cell is past the top or bottom of the world, or its chunk
            // went away between the break and this pass. Either way there is
            // nothing to hold up, and the other side still gets its turn
        }
    }
}

// Both events name a cell that has just emptied, which is either the anchor a
// column hung from or a spike out of the middle of one. Waiting a tick lets the
// engine finish the change before the column is measured against it
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
