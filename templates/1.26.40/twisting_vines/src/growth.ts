// Twisting vines reaching further up, and coming down when they are cut.
// Only the top segment, the tip, grows, and only it carries a meaningful age.
// Everything under it is body: it holds the stalk together and does nothing
// else, which is why the tip flag is a state rather than something recomputed
// from the neighbours every time somebody asks.
import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentRandomTickEvent,
    BlockPermutation,
    Dimension,
    Vector3,
    system,
} from "@minecraft/server";
import {
    AGE_STATE,
    CASCADE_TICKS,
    GROWTH_CHANCE,
    MAX_AGE,
    TIP_STATE,
    VINE_ID,
    unsupportiveIds,
    unsupportiveTags,
} from "./config.js";

// A stalk stands on solid ground or on more of itself. The placement
// filter can only say that something has to be under it, so what that
// something may be is decided here
function canStandOn(below: Block | undefined): boolean {
    if (below === undefined || below.isAir || below.isLiquid) {
        return false;
    }
    if (below.typeId === VINE_ID) {
        return true;
    }
    if (unsupportiveIds.has(below.typeId)) {
        return false;
    }
    return !unsupportiveTags.some((tag) => below.hasTag(tag));
}

export function readAge(block: Block): number {
    const value = block.permutation.getAllStates()[AGE_STATE];
    return typeof value === "number" ? value : 0;
}

export function isTip(block: Block): boolean {
    return block.permutation.getAllStates()[TIP_STATE] === true;
}

function setStates(block: Block, age: number, tip: boolean): void {
    block.setPermutation(BlockPermutation.resolve(VINE_ID, { [AGE_STATE]: age, [TIP_STATE]: tip }));
}

// Add one segment on top. The old tip becomes body and the new segment takes
// over as tip with the next age up. Returns false when the stalk has nowhere
// left to go, which is how bone meal knows to stop.
// Random growth and bone meal stop the stalk at MAX_AGE. A player stacking
// segments by hand does not, so `stopAtMaxAge` is false on that path and the
// age simply holds at the cap
export function extend(tip: Block, stopAtMaxAge = true): boolean {
    const age = readAge(tip);
    if (stopAtMaxAge && age >= MAX_AGE) {
        return false;
    }
    const above = tip.above();
    if (above === undefined || !above.isAir) {
        return false;
    }
    setStates(tip, age, false);
    setStates(above, Math.min(age + 1, MAX_AGE), true);
    return true;
}

// Walk up to the top of the stalk. Bone meal or another segment used halfway up
// a vine still works on the growing end, which is what a player expects
export function findTip(block: Block): Block | undefined {
    let current: Block | undefined = block;
    for (let step = 0; step < 64 && current !== undefined; step++) {
        if (isTip(current)) {
            return current;
        }
        const above: Block | undefined = current.above();
        if (above === undefined || above.typeId !== VINE_ID) {
            return current;
        }
        current = above;
    }
    return current;
}

// Break the segment at `cell` the way a player would, so it drops its item
// and plays its break effect, then move on to the one above it a moment
// later. The chain walks away from the cut in the direction the stalk grows,
// one segment per step, and stops at the first block that is not this vine.
// Each step reads the world again, so a segment that is already gone, or was
// replaced in the meantime, ends the chain rather than being destroyed twice
function cascadeUp(dimension: Dimension, cell: Vector3): void {
    let segment: Block | undefined;
    try {
        segment = dimension.getBlock(cell);
    } catch {
        // Unloaded or out of the world, nothing more to bring down
        return;
    }
    if (segment === undefined || segment.typeId !== VINE_ID) {
        return;
    }
    dimension.runCommand(`setblock ${cell.x} ${cell.y} ${cell.z} air destroy`);
    system.runTimeout(() => cascadeUp(dimension, { x: cell.x, y: cell.y + 1, z: cell.z }), CASCADE_TICKS);
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:twisting_vines_growth", {
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            if (!canStandOn(event.block.below())) {
                event.cancel = true;
            }
        },

        onRandomTick(event: BlockComponentRandomTickEvent): void {
            // Body segments never grow; the stalk only advances at its top
            if (!isTip(event.block)) {
                return;
            }
            if (Math.random() >= GROWTH_CHANCE) {
                return;
            }
            extend(event.block);
        },

        // A segment placed on top of an existing stalk takes over as the tip,
        // so the one underneath has to give the role up
        onPlace(event: BlockComponentOnPlaceEvent): void {
            const below = event.block.below();
            if (below !== undefined && below.typeId === VINE_ID && isTip(below)) {
                setStates(below, readAge(below), false);
            }
        },

        // Cutting the stalk does two things. The segment underneath becomes
        // the new tip, so the stalk can grow again from the cut. Everything
        // above has lost its footing and comes down as a chain, segment by
        // segment, from the cut upwards, the same way vanilla's support
        // updates run through a stalk
        onPlayerBreak(event: BlockComponentPlayerBreakEvent): void {
            const { block, dimension } = event;
            const below = block.below();
            const above = { x: block.x, y: block.y + 1, z: block.z };
            const age = below !== undefined && below.typeId === VINE_ID ? readAge(below) : undefined;
            system.run(() => {
                if (below !== undefined && age !== undefined && below.typeId === VINE_ID) {
                    setStates(below, age, true);
                }
                cascadeUp(dimension, above);
            });
        },
    });
});
