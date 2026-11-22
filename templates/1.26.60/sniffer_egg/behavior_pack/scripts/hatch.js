// The sniffer egg's hatch.
//
// An egg takes three steps: a crack, a second crack, the hatch. How long a
// step takes is settled when it begins, from what the egg stands on at that
// moment, so moss put under an egg later only counts from the next step. The
// kai_templates:on_moss state records that choice.
//
// Two clocks time a step, and both are needed.
//
// The block's minecraft:tick component is the one the game saves with the
// world. It fires onTick after a random wait in the range the block JSON gives
// the current state, and it starts over whenever the state changes, which is
// exactly when a new step begins. An egg that has been through a world reload
// is carried by it.
//
// Vanilla's egg also runs faster when the randomTickSpeed game rule is raised
// and stops at 0, and minecraft:tick knows nothing about that rule. So every
// egg the script has seen start a step gets a script timer that does follow
// it, and while that timer is running it is the one that counts.
import { BlockPermutation, GameRule, system, world, } from "@minecraft/server";
import { BOOSTING_GROUND, CRACK_STATE, EGG_ID, HATCHLING_EVENT, HATCHLING_ID, HATCHLING_OFFSET, MAX_CRACKS, MOSS_STATE, PARTICLE_CRACK, PARTICLE_CRACK_COUNT, SOUND_CRACK, SOUND_HATCH, SOUND_OPTIONS, STEP_TICKS, STEP_TICKS_ON_MOSS, } from "./config.js";
// Every egg whose current step the script is timing, by cell
const steps = new Map();
// The game rule as of the last time it was read or changed
let speed;
function tickSpeed() {
    speed ??= world.gameRules.randomTickSpeed;
    return speed;
}
// One string key per block cell, usable as a map key
function keyOf(block) {
    return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}
// True while the block under the egg hurries the hatch along
function onBoostingGround(block) {
    const below = block.below();
    return below !== undefined && BOOSTING_GROUND.has(below.typeId);
}
// How many cracks the egg has, 0 to 2. Custom state names are not part of the
// typed state list, so they come out of getAllStates
function cracksOf(block) {
    const value = block.permutation.getAllStates()[CRACK_STATE];
    return typeof value === "number" ? value : 0;
}
// The egg with this many cracks, timed for the ground it is on right now
function eggFor(block, cracks) {
    return BlockPermutation.resolve(EGG_ID, {
        [CRACK_STATE]: cracks,
        [MOSS_STATE]: onBoostingGround(block),
    });
}
// Set the timer for what is left of a step at the current tick speed. At 0
// there is no timer at all: the egg waits for the rule to change
function wind(step) {
    const rate = tickSpeed();
    step.since = system.currentTick;
    step.timer =
        rate > 0
            ? system.runTimeout(() => finish(step), Math.max(1, Math.ceil(step.left / rate)))
            : undefined;
}
// Start timing the step the egg is on now
function begin(block) {
    const cell = keyOf(block);
    const old = steps.get(cell);
    if (old?.timer !== undefined) {
        system.clearRun(old.timer);
    }
    const boosted = block.permutation.getAllStates()[MOSS_STATE] === true;
    const [shortest, longest] = boosted ? STEP_TICKS_ON_MOSS : STEP_TICKS;
    const step = {
        block,
        left: shortest + Math.random() * (longest - shortest),
        since: 0,
        timer: undefined,
    };
    steps.set(cell, step);
    wind(step);
}
// The script timer ran out. The egg may have been broken, moved or unloaded
// since it was set, and then there is nothing left to do here
function finish(step) {
    const cell = keyOf(step.block);
    if (steps.get(cell) !== step) {
        return;
    }
    steps.delete(cell);
    if (step.block.isValid && step.block.typeId === EGG_ID) {
        advance(step.block);
    }
}
// One step of progress: another crack, or the hatch when the cracks run out
function advance(block) {
    const cracks = cracksOf(block);
    if (cracks >= MAX_CRACKS) {
        popEgg(block);
        return;
    }
    // The ground is read again here, for the step that follows
    block.setPermutation(eggFor(block, cracks + 1));
    block.dimension.playSound(SOUND_CRACK, block.center(), SOUND_OPTIONS);
    for (let mote = 0; mote < PARTICLE_CRACK_COUNT; mote++) {
        block.dimension.spawnParticle(PARTICLE_CRACK, {
            x: block.x + Math.random(),
            y: block.y + Math.random(),
            z: block.z + Math.random(),
        });
    }
    begin(block);
}
// The egg is done: the cell clears and a snifflet stands up in it
function popEgg(block) {
    const { dimension } = block;
    const centre = block.center();
    const nest = {
        x: block.x + HATCHLING_OFFSET.x,
        y: block.y + HATCHLING_OFFSET.y,
        z: block.z + HATCHLING_OFFSET.z,
    };
    steps.delete(keyOf(block));
    block.setType("minecraft:air");
    dimension.playSound(SOUND_HATCH, centre, SOUND_OPTIONS);
    try {
        dimension.spawnEntity(HATCHLING_ID, nest, { spawnEvent: HATCHLING_EVENT });
    }
    catch {
        // No room for it, the egg is gone either way
    }
}
// When the rule changes, every running step is charged for the time it spent
// at the old speed and timed again at the new one
world.afterEvents.gameRuleChange.subscribe((event) => {
    if (event.rule !== GameRule.RandomTickSpeed) {
        return;
    }
    const before = tickSpeed();
    speed = event.value;
    for (const step of steps.values()) {
        if (step.timer !== undefined) {
            system.clearRun(step.timer);
        }
        step.left -= (system.currentTick - step.since) * before;
        wind(step);
    }
});
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sniffer_egg_hatch", {
        // A player's egg goes down already knowing its ground
        beforeOnPlayerPlace(event) {
            event.permutationToPlace = eggFor(event.block, 0);
        },
        // Every new egg, however it arrived. One set down by a command or a
        // structure has not looked at its ground yet
        onPlace(event) {
            const block = event.block;
            if (block.permutation.getAllStates()[MOSS_STATE] !== onBoostingGround(block)) {
                block.setPermutation(eggFor(block, cracksOf(block)));
            }
            begin(block);
        },
        // The saved clock. It only counts for an egg the script is not timing,
        // which means one that was already in the world when it loaded
        onTick(event) {
            const block = event.block;
            if (steps.has(keyOf(block))) {
                return;
            }
            if (tickSpeed() > 0) {
                advance(block);
            }
            else {
                begin(block);
            }
        },
    });
});
