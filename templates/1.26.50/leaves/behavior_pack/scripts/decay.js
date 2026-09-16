// Leaves rotting once their tree is gone.
// The distance state already holds the answer, so a random tick reads states
// and nothing else: no neighbour reads, no search, no matter how much canopy
// is loaded. Keeping that number honest is queue.ts's job.
import { system } from "@minecraft/server";
import { DECAY_CHANCE, MAX_DISTANCE, PERSISTENT_STATE } from "./config.js";
import { dropPoint, rollDrops } from "./drops.js";
import { enqueue, isQueued } from "./queue.js";
import { isVerified, readDistance, survey, writeDistance } from "./support.js";
// Rotting leaves drop what an untooled break would drop, so a felled tree still
// leaves saplings behind
function rot(block) {
    const { dimension } = block;
    const location = dropPoint(block);
    block.setType("minecraft:air");
    dimension.playSound("dig.grass", location);
    rollDrops(dimension, location, 0);
    // Nothing is queued here on purpose. A leaf only rots on the cap, and a
    // leaf on the cap adds nothing to the sums around it, so taking it away
    // cannot change a single neighbour's distance
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:leaves_decay", {
        onRandomTick(event) {
            const block = event.block;
            const states = block.permutation.getAllStates();
            // A leaf a player placed is theirs to keep
            if (states[PERSISTENT_STATE] === true) {
                return;
            }
            // Placed by a command, a structure or another add-on and never
            // measured. It starts on the cap, so rotting it now would be a
            // guess: queue it and let the worker say
            if (!isVerified(states)) {
                enqueue(block.dimension, block.location);
                return;
            }
            // Still within reach of a log
            if (readDistance(states) < MAX_DISTANCE) {
                return;
            }
            // A new number is already on its way, so let the worker have the
            // last word before this leaf is written off
            if (isQueued(block.dimension, block.location)) {
                return;
            }
            if (Math.random() >= DECAY_CHANCE) {
                return;
            }
            // One last look at the six neighbours before this leaf is written
            // off. The worker gets through a fixed number of leaves per tick, so
            // on a large canopy a leaf can hold a measured 7 while a lower
            // number is still walking toward it, and its own states cannot tell
            // the two apart. Seven reads, on the one tick a leaf would rot, is
            // cheaper than holding the whole canopy in the queue to be safe
            const result = survey(block);
            // A neighbouring chunk went away, and a log could be hiding there
            if (result === undefined) {
                return;
            }
            // A log is in range after all, so keep the number that proves it
            if (result.distance < MAX_DISTANCE) {
                writeDistance(block, states, result.distance);
                return;
            }
            // A neighbour has never been measured, so the 7 it holds is the
            // default rather than an answer
            if (result.unsettled) {
                enqueue(block.dimension, block.location);
                return;
            }
            // A neighbour is queued for a new number. That number can come back
            // lower than the one it holds now, which would put this leaf back
            // in range, so let the worker speak first
            for (const location of result.leafNeighbours) {
                if (isQueued(block.dimension, location)) {
                    return;
                }
            }
            rot(block);
        },
    });
});
