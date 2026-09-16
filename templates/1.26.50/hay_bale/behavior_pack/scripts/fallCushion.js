// Reduces fall damage for entities landing on the hay bale.
// Vanilla hay bales absorb 80% of fall damage. No JSON component exists for
// this, and the block's own onEntityFallOn hook fires AFTER the damage has
// already been applied, so it cannot soften it. The hook that can is
// world.beforeEvents.entityHurt: it fires before the damage lands and its
// damage field is writable. One world-level subscription covers every hay
// bale, so there is nothing to wire up in the block JSON for this concern.
import { world, EntityDamageCause } from "@minecraft/server";
// The block that cushions. If you rename the block, rename this string too
const HAY_BALE_ID = "kai_templates:hay_bale";
// Vanilla keeps one fifth of the computed damage (the 80% reduction)
const DAMAGE_KEPT = 0.2;
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
    const landedOn = event.hurtEntity.getBlockStandingOn();
    if (landedOn === undefined || landedOn.typeId !== HAY_BALE_ID) {
        return;
    }
    // Reduce the damage. Math.ceil mirrors vanilla's rounding: any fall
    // that hurt at all still costs at least half a heart, and health values
    // stay whole numbers
    event.damage = Math.ceil(event.damage * DAMAGE_KEPT);
});
