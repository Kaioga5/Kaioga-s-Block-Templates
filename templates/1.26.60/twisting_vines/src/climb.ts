// Climbing a twisting vine.
// Custom blocks have no climbable component, so the movement is steered from
// the player side. The loop costs one block read per player per tick and never
// looks at how many vines exist.
import { ButtonState, EntityDamageCause, InputButton, Player, system, world } from "@minecraft/server";
import { CLIMB_SPEED, DESCEND_SPEED, VINE_ID } from "./config.js";

// The engine takes a tick of gravity off vertical speed after this runs, so
// every correction aims past its target by exactly that much
const GRAVITY = 0.08;

// Correcting the whole error in one tick turns any overshoot into a visible
// twitch. Taking most of it settles in two or three ticks and reads as smooth
const CLIMB_CORRECTION = 0.8;
const DESCEND_CORRECTION = 0.35;

// Below this, the player is already moving at the target and is left alone
const DEADBAND = 0.02;

// Feet and chest are both checked so the climb does not drop for a tick as the
// player crosses from one segment into the next
function onVine(player: Player): boolean {
    const location = player.location;
    for (const y of [location.y, location.y + 1]) {
        try {
            const block = player.dimension.getBlock({
                x: Math.floor(location.x),
                y: Math.floor(y),
                z: Math.floor(location.z),
            });
            if (block !== undefined && block.typeId === VINE_ID) {
                return true;
            }
        } catch {
            // Chunk not loaded
        }
    }
    return false;
}

function hold(player: Player, target: number, share: number): void {
    const error = target + GRAVITY - player.getVelocity().y;
    if (Math.abs(error) < DEADBAND) {
        return;
    }
    player.applyKnockback({ x: 0, z: 0 }, error * share);
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (player.isFlying || !onVine(player)) {
            continue;
        }
        const jumping = player.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed;
        if (jumping || player.inputInfo.getMovementVector().y > 0) {
            hold(player, CLIMB_SPEED, CLIMB_CORRECTION);
            continue;
        }
        if (player.isSneaking) {
            hold(player, 0, DESCEND_CORRECTION);
            continue;
        }
        hold(player, DESCEND_SPEED, DESCEND_CORRECTION);
    }
}, 1);

// Catching a vine mid-fall should save the player, not hurt them
world.beforeEvents.entityHurt.subscribe((event) => {
    if (event.damageSource.cause !== EntityDamageCause.fall) {
        return;
    }
    const entity = event.hurtEntity;
    if (entity.typeId !== "minecraft:player") {
        return;
    }
    const location = entity.location;
    const block = entity.dimension.getBlock({
        x: Math.floor(location.x),
        y: Math.floor(location.y),
        z: Math.floor(location.z),
    });
    if (block !== undefined && block.typeId === VINE_ID) {
        event.cancel = true;
    }
});
