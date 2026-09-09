// Weeping vines reaching further down, and coming apart when they are cut.
// Only the bottom segment, the tip, grows, and only it carries a meaningful
// age. Everything above it is body: it holds the curtain up and does nothing
// else, which is why the tip flag is a state rather than something recomputed
// from the neighbours every time somebody asks.
import { BlockPermutation, system, } from "@minecraft/server";
import { AGE_STATE, CASCADE_TICKS, GROWTH_CHANCE, MAX_AGE, TIP_STATE, VINE_ID, unsupportiveIds, unsupportiveTags, } from "./config.js";
// A curtain hangs from a ceiling or from more of itself. The placement
// filter can only say that something has to be up there, so what that
// something may be is decided here
function canHangFrom(above) {
    if (above === undefined || above.isAir || above.isLiquid) {
        return false;
    }
    if (above.typeId === VINE_ID) {
        return true;
    }
    if (unsupportiveIds.has(above.typeId)) {
        return false;
    }
    return !unsupportiveTags.some((tag) => above.hasTag(tag));
}
export function readAge(block) {
    const value = block.permutation.getAllStates()[AGE_STATE];
    return typeof value === "number" ? value : 0;
}
export function isTip(block) {
    return block.permutation.getAllStates()[TIP_STATE] === true;
}
function setStates(block, age, tip) {
    block.setPermutation(BlockPermutation.resolve(VINE_ID, { [AGE_STATE]: age, [TIP_STATE]: tip }));
}
// Extend the curtain by one segment. The old tip becomes body and the new
// segment takes over as tip with the next age up. Returns false when there is
// nowhere left to go, which is how bone meal knows to stop.
// Random growth and bone meal stop the curtain at MAX_AGE. A player hanging
// segments by hand does not, so `stopAtMaxAge` is false on that path and the
// age simply holds at the cap
export function extend(tip, stopAtMaxAge = true) {
    const age = readAge(tip);
    if (stopAtMaxAge && age >= MAX_AGE) {
        return false;
    }
    const below = tip.below();
    if (below === undefined || !below.isAir) {
        return false;
    }
    setStates(tip, age, false);
    setStates(below, Math.min(age + 1, MAX_AGE), true);
    return true;
}
// Walk down to the end of the curtain. Bone meal or another segment used
// halfway up a vine still works on the growing end, which is what a player
// expects
export function findTip(block) {
    let current = block;
    for (let step = 0; step < 64 && current !== undefined; step++) {
        if (isTip(current)) {
            return current;
        }
        const below = current.below();
        if (below === undefined || below.typeId !== VINE_ID) {
            return current;
        }
        current = below;
    }
    return current;
}
// Break the segment at `cell` the way a player would, so it drops its item
// and plays its break effect, then move on to the one under it a moment
// later. The chain walks away from the cut in the direction the curtain
// grows, one segment per step, and stops at the first block that is not this
// vine. Each step reads the world again, so a segment that is already gone,
// or was replaced in the meantime, ends the chain rather than being destroyed
// twice
function cascadeDown(dimension, cell) {
    let segment;
    try {
        segment = dimension.getBlock(cell);
    }
    catch {
        // Unloaded or out of the world, nothing more to bring down
        return;
    }
    if (segment === undefined || segment.typeId !== VINE_ID) {
        return;
    }
    dimension.runCommand(`setblock ${cell.x} ${cell.y} ${cell.z} air destroy`);
    system.runTimeout(() => cascadeDown(dimension, { x: cell.x, y: cell.y - 1, z: cell.z }), CASCADE_TICKS);
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:weeping_vines_growth", {
        beforeOnPlayerPlace(event) {
            if (!canHangFrom(event.block.above())) {
                event.cancel = true;
            }
        },
        onRandomTick(event) {
            // Body segments never grow; the curtain only advances at its end
            if (!isTip(event.block)) {
                return;
            }
            if (Math.random() >= GROWTH_CHANCE) {
                return;
            }
            extend(event.block);
        },
        // A segment placed under an existing vine takes over as the tip, so the
        // one above has to give the role up
        onPlace(event) {
            const above = event.block.above();
            if (above !== undefined && above.typeId === VINE_ID && isTip(above)) {
                setStates(above, readAge(above), false);
            }
        },
        // Cutting the curtain does two things. The segment above becomes the
        // new tip, so the curtain can grow again from the cut. Everything
        // below has lost its hold and comes apart as a chain, segment by
        // segment, from the cut downwards, the same way vanilla's support
        // updates run through a curtain
        onPlayerBreak(event) {
            const { block, dimension } = event;
            const above = block.above();
            const below = { x: block.x, y: block.y - 1, z: block.z };
            const age = above !== undefined && above.typeId === VINE_ID ? readAge(above) : undefined;
            system.run(() => {
                if (above !== undefined && age !== undefined && above.typeId === VINE_ID) {
                    setStates(above, age, true);
                }
                cascadeDown(dimension, below);
            });
        },
    });
});
