// Working out how far a leaf is from a log.
// Vanilla stores a distance on every leaf and recomputes it from the six
// neighbours whenever one of them changes. Custom blocks get no
// neighbour-changed hook, so this file only does the arithmetic; queue.ts
// decides when it runs.
import { BlockPermutation, LocationOutOfWorldBoundariesError } from "@minecraft/server";
import { DISTANCE_STATE, LEAVES_ID, MAX_DISTANCE, UPDATE_STATE, supportIds, supportTags } from "./config.js";
// The six directions a leaf can be attached through
export const NEIGHBOURS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];
// Is this a log, or whatever else the pack decided holds leaves up?
export function isSupport(block) {
    return supportIds.has(block.typeId) || supportTags.some((tag) => block.hasTag(tag));
}
// The same test on a permutation. Break and explosion events only hand over
// what the block used to be, the block itself is already air by then
export function wasSupport(permutation) {
    for (const id of supportIds) {
        if (permutation.matches(id)) {
            return true;
        }
    }
    return supportTags.some((tag) => permutation.hasTag(tag));
}
// Is this one of our leaves?
export function isLeaf(block) {
    return block.typeId === LEAVES_ID;
}
// Was this permutation one of our leaves?
export function wasLeaf(permutation) {
    return permutation.matches(LEAVES_ID);
}
// The distance a leaf currently holds
export function readDistance(states) {
    const value = states[DISTANCE_STATE];
    return typeof value === "number" ? value : MAX_DISTANCE;
}
// Has the script measured this leaf yet? Leaves that arrive through a command,
// a structure or another add-on carry the update flag, because the block JSON
// lists true first and the engine places the first value of every state
export function isVerified(states) {
    return states[UPDATE_STATE] === false;
}
// Read the six neighbours once. A log next door gives 1, a measured leaf gives
// one more than it holds, and everything else gives nothing. Returns undefined
// when a neighbouring chunk is not loaded, because a log could be hiding there
export function survey(block) {
    // Nothing found yet, so start on the cap: the value that means "no log in
    // range" and the value a leaf rots on
    let distance = MAX_DISTANCE;
    let unsettled = false;
    const leafNeighbours = [];
    for (const offset of NEIGHBOURS) {
        let neighbour;
        try {
            neighbour = block.offset(offset);
        }
        catch (error) {
            // Above or below the world. Nothing can sit there, so it counts as air
            if (error instanceof LocationOutOfWorldBoundariesError) {
                continue;
            }
            // Anything else means the chunk went away, and a guess made without
            // it could rot a leaf that is actually attached
            return undefined;
        }
        // offset reports an unloaded chunk by returning nothing as well
        if (neighbour === undefined) {
            return undefined;
        }
        // A log next door is as close as a leaf can get
        if (isSupport(neighbour)) {
            distance = 1;
            continue;
        }
        // Air, stone, anything else neither supports nor conducts
        if (!isLeaf(neighbour)) {
            continue;
        }
        leafNeighbours.push(neighbour.location);
        const states = neighbour.permutation.getAllStates();
        // A leaf nobody has measured yet is still sitting on the default 7,
        // which says nothing about where the logs are. Counting through it
        // would report a support that may not be there
        if (!isVerified(states)) {
            unsettled = true;
            continue;
        }
        // One step further out than the neighbour
        distance = Math.min(distance, readDistance(states) + 1);
    }
    // A neighbour on the cap would push this leaf to 8, which the state cannot
    // hold, so the cap is also where counting stops
    return { distance: Math.min(distance, MAX_DISTANCE), leafNeighbours, unsettled };
}
// Store a measured distance on the leaf and clear the update flag in the same
// write, so one setPermutation covers both
export function writeDistance(block, states, distance) {
    block.setPermutation(BlockPermutation.resolve(LEAVES_ID, {
        ...states,
        [DISTANCE_STATE]: distance,
        [UPDATE_STATE]: false,
    }));
}
