// Cancels fall damage for entities landing on the slime block. The block's
// own onEntityFallOn hook fires AFTER the damage has already been applied,
// so it cannot prevent it. The hook that can is
// world.beforeEvents.entityHurt: it fires before the damage lands and can
// cancel it outright. One world-level subscription covers every slime
// block, so there is nothing to wire up in the block JSON for this concern.
import { world, EntityDamageCause } from "@minecraft/server";
// The block that cushions. If you rename the block, rename this string too
const SLIME_ID = "kai_templates:slime_block";
// Subscribe at module load, world.beforeEvents subscriptions are allowed
// in early execution, before the world exists
world.beforeEvents.entityHurt.subscribe((event) => {
    // Return unless this is fall damage. This event fires for every hurt
    // entity in the world, so filter cheaply first
    if (event.damageSource.cause !== EntityDamageCause.fall) {
        return;
    }
    // Check what the entity landed on. getBlockStandingOn picks the solid
    // block under the entity's center, the same block vanilla credits for
    // breaking the fall. Reading world state is allowed inside a before
    // event; only writes are blocked
    const entity = event.hurtEntity;
    const landedOn = entity.getBlockStandingOn();
    if (landedOn === undefined || landedOn.typeId !== SLIME_ID) {
        return;
    }
    // A landing arrives still moving down. An ender pearl's damage, which the
    // game also counts as a fall, arrives standing still and is not a landing
    if (entity.getVelocity().y >= 0) {
        return;
    }
    // Slime absorbs the whole fall, for a sneaking player too: vanilla's slime
    // block has cancelled sneaking falls as well since 1.21.50
    event.cancel = true;
});
