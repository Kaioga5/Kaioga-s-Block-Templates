// The bounce and the softer landing.
// Vanilla treats the cap like a bed: whatever lands on it comes back up with
// three quarters of its impact speed and is hurt as if it had fallen half as
// far. Custom blocks have no bounciness component, so the bounce is the
// block's onEntityFallOn hook launching the entity, and the softer landing
// is the entity-hurt before-event scaling the fall damage before it lands.
import { EntityDamageCause, Player, system, world, } from "@minecraft/server";
// The block that bounces. If you rename the block, rename this string too
const MUSHROOM_ID = "kai_templates:shelf_mushroom";
// Falling h blocks arrives at about 0.4 * sqrt(h) blocks per tick, and the
// cap gives back three quarters of that. The knockback call does not map one
// to one onto that speed, so the factor here is the one that put a player
// dropped from twelve blocks at the same height vanilla's cap sends them
const BOUNCINESS = 0.75;
const IMPACT_PER_SQRT_BLOCK = 0.34;
// Vanilla halves the distance the fall is measured at, not the damage
const FALL_DISTANCE_KEPT = 0.5;
// Fall damage is the distance beyond three blocks, one heart per block. The
// same formula in reverse turns the damage the game rolled back into distance
const SAFE_FALL_BLOCKS = 3;
// Drag flattens the curve past a long drop; the launch is capped at about what
// a sixteen-block fall gives back
const MAX_LAUNCH = 1.2;
// Falls shorter than this land without a bounce
const MIN_FALL_DISTANCE = 0.5;
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:shelf_mushroom_bounce", {
        onEntityFallOn(event) {
            // The entity can have died or despawned from the landing itself
            const entity = event.entity;
            if (entity === undefined || !entity.isValid) {
                return;
            }
            if (event.fallDistance < MIN_FALL_DISTANCE) {
                return;
            }
            // A sneaking player absorbs the landing instead of bouncing, the
            // same way vanilla lets a player sneak onto a bed
            if (entity instanceof Player && entity.isSneaking) {
                return;
            }
            const strength = Math.min(BOUNCINESS * IMPACT_PER_SQRT_BLOCK * Math.sqrt(event.fallDistance), MAX_LAUNCH);
            if (entity instanceof Player) {
                // Players reject applyImpulse, so the player path is knockback with
                // no horizontal part
                entity.applyKnockback({ x: 0, z: 0 }, strength);
            }
            else {
                // Everything else takes a plain impulse from rest, so the stored
                // downward speed does not eat part of the launch
                entity.clearVelocity();
                entity.applyImpulse({ x: 0, y: strength, z: 0 });
            }
        },
    });
});
// Soften the landing. This fires before the damage lands and its damage
// field is writable; the block's own hook above runs after the damage has
// already been dealt, so it cannot do this part
world.beforeEvents.entityHurt.subscribe((event) => {
    if (event.damageSource.cause !== EntityDamageCause.fall) {
        return;
    }
    const landedOn = event.hurtEntity.getBlockStandingOn();
    if (landedOn === undefined || landedOn.typeId !== MUSHROOM_ID) {
        return;
    }
    // Turn the damage back into the distance it came from, halve the distance,
    // and measure the damage again. The game rounded the fraction off when it
    // made the damage, so the middle of the block it lost is put back before
    // halving; measured against vanilla, that lands on the same number
    const distance = event.damage + SAFE_FALL_BLOCKS + 0.5;
    event.damage = Math.max(0, Math.ceil(distance * FALL_DISTANCE_KEPT - SAFE_FALL_BLOCKS));
});
