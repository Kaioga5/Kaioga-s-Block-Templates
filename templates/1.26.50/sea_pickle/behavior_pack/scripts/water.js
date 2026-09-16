// Keeps the pickle's water flag in step with the water around it.
//
// Bedrock has no block state for waterlogging, and a permutation cannot read
// block.isWaterlogged, so the model and the light hang off a state this file
// keeps up to date. There is no "a liquid moved into this block" event, so
// three things drive it: placement, a random tick, and a player interacting
// with the cluster, which is the bucket, and the one case where a stale flag
// would be obvious.
import { system, world, } from "@minecraft/server";
import { PICKLE_ID, isDead, pickleCount, setPickle } from "./pickle.js";
// Write the flag only when it actually changed, so a settled cluster costs one
// state read per tick it is visited and nothing else
function sync(block) {
    const dead = !block.isWaterlogged;
    if (dead !== isDead(block)) {
        setPickle(block, pickleCount(block), dead);
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sea_pickle_water", {
        // A pickle placed straight into water is alive from the first tick
        onPlace(event) {
            sync(event.block);
        },
        // Catch water that arrived or drained after the pickle was placed
        onRandomTick(event) {
            sync(event.block);
        },
    });
});
// A bucket used on the cluster changes the water in the same tick, and waiting
// out a random tick would leave a pickle glowing in the open air for up to a
// minute. The block is read again on the following tick, once the interaction
// has finished with it
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const block = event.block;
    if (block.typeId !== PICKLE_ID) {
        return;
    }
    system.run(() => {
        if (block.isValid && block.typeId === PICKLE_ID) {
            sync(block);
        }
    });
});
