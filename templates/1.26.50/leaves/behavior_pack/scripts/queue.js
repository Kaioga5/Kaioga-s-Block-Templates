// Keeping every leaf's distance up to date.
// Nothing here scans for leaves. Events say which positions might have moved,
// a deduplicated queue holds them, and one worker recomputes a fixed number of
// them per tick, so the cost follows what actually changed rather than how
// much foliage is loaded.
import { system, world, } from "@minecraft/server";
import { UPDATES_PER_TICK } from "./config.js";
import { NEIGHBOURS, isLeaf, isVerified, readDistance, survey, wasLeaf, wasSupport, writeDistance, } from "./support.js";
// The queue. Keying it by dimension and position is what stops two players
// felling the same tree, or the six neighbours of one broken log, from
// queueing the same leaf twice. A Map keeps insertion order, so draining it
// front to back deals with the oldest entry first
const pending = new Map();
function key(dimension, location) {
    return `${dimension.id} ${location.x} ${location.y} ${location.z}`;
}
// The top and bottom of each dimension, read once. heightRange is a property
// that can throw, and enqueueNeighbours would otherwise read it six times for
// a single broken log
const bounds = new Map();
function worldBounds(dimension) {
    const cached = bounds.get(dimension.id);
    if (cached !== undefined) {
        return cached;
    }
    try {
        const range = dimension.heightRange;
        const value = { min: range.min, max: range.max };
        bounds.set(dimension.id, value);
        return value;
    }
    catch {
        // No bounds to filter with. The worker reads every position inside a
        // try/catch anyway, so letting the entry through is safe
        return undefined;
    }
}
// Queue one position. No block is read here: whether a leaf is even there is
// the worker's problem, which keeps every event handler down to some string
// building and a Map write
export function enqueue(dimension, location) {
    // Above the build limit or below the bottom of the world there is nothing
    // to update, and asking for a block there throws. max is the exclusive top
    // of the range, one above the highest block that can be placed
    const height = worldBounds(dimension);
    if (height !== undefined && (location.y < height.min || location.y >= height.max)) {
        return;
    }
    pending.set(key(dimension, location), { dimension, location });
}
// Queue the six blocks around a position. This is what a log being broken or
// placed needs: the log itself is not a leaf, the blocks touching it might be
export function enqueueNeighbours(dimension, location) {
    for (const offset of NEIGHBOURS) {
        enqueue(dimension, {
            x: location.x + offset.x,
            y: location.y + offset.y,
            z: location.z + offset.z,
        });
    }
}
// Is this leaf already waiting for an answer? decay.ts asks before rotting one
export function isQueued(dimension, location) {
    return pending.has(key(dimension, location));
}
// Recompute one leaf. Seven block reads at the very most, the leaf itself and
// its six neighbours, plus at most one permutation write
function update(entry) {
    const block = entry.dimension.getBlock(entry.location);
    // Not loaded any more, or whatever was queued is not a leaf. Either way
    // there is nothing to do, and the next change nearby queues it again
    if (block === undefined || !isLeaf(block)) {
        return;
    }
    const states = block.permutation.getAllStates();
    const result = survey(block);
    // A neighbouring chunk went away mid-pass, so the six numbers are
    // incomplete and this leaf keeps what it has
    if (result === undefined) {
        return;
    }
    // Write when the number moved, and when this leaf has never been measured:
    // clearing the update flag is what lets it rot later
    const changed = result.distance !== readDistance(states) || !isVerified(states);
    if (changed) {
        writeDistance(block, states, result.distance);
    }
    // Nothing moved, so nothing around it moves either. Stopping here is what
    // drains the queue: a leaf beside an unloaded chunk can never finish its
    // survey, and requeueing on an unsettled reading alone would leave it and
    // its neighbour handing the position back and forth for as long as the
    // chunk stays away. decay.ts surveys again before it rots anything, so
    // leaving early costs no correctness
    if (!changed) {
        return;
    }
    // A leaf that changed hands its new number to the leaves around it, which
    // is how a broken log walks out through the canopy a few blocks per tick
    for (const location of result.leafNeighbours) {
        enqueue(entry.dimension, location);
    }
    // Come back once those unmeasured neighbours hold real numbers
    if (result.unsettled) {
        enqueue(entry.dimension, entry.location);
    }
}
// The worker. One interval for the whole world, never one per leaf or per
// player: a felled forest makes the queue longer, never a tick heavier
system.runInterval(() => {
    let budget = UPDATES_PER_TICK;
    for (const [id, entry] of pending) {
        if (budget <= 0) {
            break;
        }
        budget -= 1;
        // Take the entry out before running it, so a leaf that throws cannot
        // sit at the front of the queue forever. Anything update() queues lands
        // at the back and is picked up in this same pass if the budget lasts
        pending.delete(id);
        try {
            update(entry);
        }
        catch {
            // The chunk unloaded between fetching the block and writing to it.
            // Dropping the entry is right: whatever changes there next queues
            // the position again
        }
    }
}, 1);
// Only a log or a leaf changes what the leaves around it can reach. Everything
// else a player breaks or places is dropped here rather than costing a survey
function affectsLeaves(permutation) {
    return wasSupport(permutation) || wasLeaf(permutation);
}
// The leaf's own hooks. These see our block however it arrives or goes,
// including placements and breaks no player was involved in
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:leaves_updates", {
        onPlace(event) {
            // A new leaf carries the update flag and the default distance of 7,
            // so it has to be measured before anything can be decided about it
            enqueue(event.dimension, event.block.location);
        },
        onBreak(event) {
            // This leaf is gone, so the leaves that were counting through it
            // need a new number
            enqueueNeighbours(event.dimension, event.block.location);
        },
    });
});
// Logs belong to vanilla, so no custom component of ours can watch them. These
// world events are the only place a log next to a canopy shows
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    if (!affectsLeaves(event.block.permutation)) {
        return;
    }
    enqueueNeighbours(event.dimension, event.block.location);
});
world.afterEvents.playerBreakBlock.subscribe((event) => {
    if (!affectsLeaves(event.brokenBlockPermutation)) {
        return;
    }
    enqueueNeighbours(event.dimension, event.block.location);
});
// Creepers and TNT take out logs and leaves together, and one blast reports
// every block it destroyed, so this is the same job spread over more positions
world.afterEvents.blockExplode.subscribe((event) => {
    if (!affectsLeaves(event.explodedBlockPermutation)) {
        return;
    }
    enqueueNeighbours(event.dimension, event.block.location);
});
