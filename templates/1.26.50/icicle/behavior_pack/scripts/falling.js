// The fall an icicle takes once it melts loose or loses its ceiling.
// Every segment falls as its own entity, all let go on the same tick, so
// gravity carries them down as one icicle with nothing ever teleported; a
// small lift each tick only slows them to vanilla's pace.
// In Preview a vanilla falling icicle acts like falling dripstone: each segment
// rests three ticks on the ground, then breaks and leaves its item. Landings
// report through the environment sensor in entities/falling_icicle.json; the
// sweep at the bottom catches lost reports and fallers that never land.
import { EntityDamageCause, ItemStack, system, world } from "@minecraft/server";
import { ATTACHED_PROPERTY, BREAK_PARTICLE, BREAK_SOUND, FALLING_ID, FALL_DAMAGE_MAX, FALL_LIFT, ICICLE_ID, LANDING_TICKS, THICKNESS_PROPERTY, } from "./config.js";
// Give up on a fall after thirty seconds. A faller that somehow never lands
// cannot exist forever
const MAX_FALL_TICKS = 600;
// Landing is event driven, so the sweep only has to catch a lost report and an
// entity that is stuck. Once a second is enough
const SWEEP_INTERVAL = 20;
// How long this entity has been falling, in ticks, where it started, and, on
// the tip only, how many segments fell with it. Dynamic properties rather than
// a script-side map, so a fall survives a chunk unload and a reload
const AGE_PROPERTY = "kai_templates:fall_age";
const START_PROPERTY = "kai_templates:fall_start";
const LENGTH_PROPERTY = "kai_templates:fall_length";
// The tick its landing report arrived
const LANDED_PROPERTY = "kai_templates:fall_landed";
// The segments still in the air, for the lift below. Only this file's own
// spawns go in, so after a reload the lift stops for fallers already on their
// way; they land a little sooner and nothing else changes
const inFlight = new Set();
let liftRun;
// Send one icicle on its way. The caller clears the cells first, which is what
// stops an icicle from ever existing twice. `segments` runs from the highest
// segment down to the tip
export function dropSegments(dimension, segments) {
    segments.forEach((segment, index) => {
        // Spawn in the segment's own cell, centred in it, so the icicle falls
        // straight down the shaft it came out of
        const faller = dimension.spawnEntity(FALLING_ID, {
            x: segment.location.x + 0.5,
            y: segment.location.y,
            z: segment.location.z + 0.5,
        });
        faller.setProperty(THICKNESS_PROPERTY, segment.thickness);
        faller.setProperty(ATTACHED_PROPERTY, segment.attached);
        faller.setDynamicProperty(AGE_PROPERTY, 0);
        faller.setDynamicProperty(START_PROPERTY, segment.location.y);
        // Only the point hurts anything, the same as falling dripstone, and it
        // hits harder the longer the icicle behind it was
        if (index === segments.length - 1) {
            faller.setDynamicProperty(LENGTH_PROPERTY, segments.length);
        }
        inFlight.add(faller);
    });
    startLift();
}
// Every tick, give each falling segment a little lift so it falls at the pace
// vanilla's falling blocks keep. The loop only runs while something is falling
function startLift() {
    if (liftRun !== undefined) {
        return;
    }
    liftRun = system.runInterval(() => {
        for (const faller of inFlight) {
            if (!faller.isValid) {
                inFlight.delete(faller);
                continue;
            }
            try {
                // Water and lava already slow the fall far more than this lift
                // does; lifting there as well would float the segment back up
                if (faller.isInWater || faller.dimension.getBlock(faller.location)?.isLiquid) {
                    continue;
                }
                faller.applyImpulse({ x: 0, y: FALL_LIFT, z: 0 });
            }
            catch {
                // The chunk unloaded mid-fall; the sweep takes care of it
                inFlight.delete(faller);
            }
        }
        if (inFlight.size === 0 && liftRun !== undefined) {
            system.clearRun(liftRun);
            liftRun = undefined;
        }
    }, 1);
}
// Whatever the point comes down on. Falling blocks do not collide with mobs
// on the way down, they land at their feet, so the hit is every living thing
// standing in the cell the point landed in. Measured against the vanilla
// icicle in Preview: the tip alone deals one less than the blocks it fell,
// times the length of the stalactite, in a single hit capped at
// FALL_DAMAGE_MAX. One segment falling 9 did 8, three falling 7 did 18, five
// falling 5 did 20
function hurtBelow(faller) {
    const start = faller.getDynamicProperty(START_PROPERTY);
    const length = faller.getDynamicProperty(LENGTH_PROPERTY);
    if (typeof start !== "number" || typeof length !== "number") {
        return;
    }
    // The small allowance keeps a drop of exactly 8.0 blocks from rounding up
    // to 8 damage through floating point noise
    const perBlock = Math.ceil(start - faller.location.y - 1 - 0.01);
    const damage = Math.min(perBlock * length, FALL_DAMAGE_MAX);
    if (damage <= 0) {
        return;
    }
    const at = faller.location;
    const victims = faller.dimension.getEntities({
        location: { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) },
        volume: { x: 1, y: 1, z: 1 },
    });
    for (const victim of victims) {
        // Only living things take the hit: items, boats and minecarts have no
        // health to lose, the same as under a vanilla falling block
        if (!victim.isValid || victim.getComponent("minecraft:health") === undefined) {
            continue;
        }
        victim.applyDamage(damage, { cause: EntityDamageCause.stalactite });
    }
}
// The end of a fall. A landed segment breaks where it stops and leaves its
// item, the way a block broken by hand would. A fall that ran out of time
// rather than landing hurts nobody
function shatter(faller, hurts = true) {
    inFlight.delete(faller);
    try {
        const { dimension } = faller;
        const at = faller.location;
        if (hurts) {
            hurtBelow(faller);
        }
        dimension.spawnItem(new ItemStack(ICICLE_ID), at);
        // The burst is drawn from the corner of the cell the segment is in
        dimension.spawnParticle(BREAK_PARTICLE, { x: at.x - 0.5, y: at.y, z: at.z - 0.5 });
        dimension.playSound(BREAK_SOUND, at);
    }
    finally {
        // Whatever went wrong above, the segment must not stay behind to land,
        // and hurt, a second time
        if (faller.isValid) {
            faller.remove();
        }
    }
}
// A landed segment breaks after LANDING_TICKS, unless something else has
// already taken it by then
function landed(faller) {
    // Remember when it landed, so the sweep below leaves it its rest
    faller.setDynamicProperty(LANDED_PROPERTY, system.currentTick);
    system.runTimeout(() => {
        if (!faller.isValid) {
            return;
        }
        try {
            shatter(faller);
        }
        catch {
            // The chunk went away mid-rest, the sweep below tries again
        }
    }, LANDING_TICKS);
}
// The entity's environment sensor queues
// `scriptevent kai_templates:icicle_fall landed` the moment it touches down,
// which is the only thing this file waits for
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "kai_templates:icicle_fall") {
        return;
    }
    // A sensor can fire again on the tick the entity is already being taken
    // away, so a report from an entity that has gone is not an error
    const faller = event.sourceEntity;
    if (faller === undefined || !faller.isValid || faller.typeId !== FALLING_ID) {
        return;
    }
    landed(faller);
});
// Check one entity from the sweep
function sweepFaller(faller) {
    const age = (faller.getDynamicProperty(AGE_PROPERTY) ?? 0) + SWEEP_INTERVAL;
    faller.setDynamicProperty(AGE_PROPERTY, age);
    // A segment resting after its landing report belongs to that report's
    // timer, unless the timer was lost to a /reload long enough ago
    const landedAt = faller.getDynamicProperty(LANDED_PROPERTY);
    if (typeof landedAt === "number" && system.currentTick - landedAt <= LANDING_TICKS + SWEEP_INTERVAL) {
        return;
    }
    // Landed, but the report never arrived, for example because the chunk
    // unloaded on the tick the sensor fired. The engine reports a new entity as
    // on the ground until its first physics tick, so the flag only counts from
    // the second sweep on. A fall that somehow never ends is put down as well
    if (age > SWEEP_INTERVAL && faller.isOnGround) {
        shatter(faller);
    }
    else if (age > MAX_FALL_TICKS) {
        shatter(faller, false);
    }
}
// One sweep for the whole world rather than one timer per entity. getEntities
// finds fallers again by itself after a chunk reload, so nothing has to be
// remembered between passes
system.runInterval(() => {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        const dimension = world.getDimension(dimensionId);
        for (const faller of dimension.getEntities({ type: FALLING_ID })) {
            try {
                sweepFaller(faller);
            }
            catch {
                // Chunk unloaded mid-check, the next sweep picks it up
            }
        }
    }
}, SWEEP_INTERVAL);
