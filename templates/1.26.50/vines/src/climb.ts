// Climbing a vine.
// Custom blocks have no climbable component, so the movement is steered from
// the player side: a per-player loop reads the block the player is standing in
// and sets their vertical speed. The cost follows the player count, never the
// number of vines in the world, and a player who is not on a vine costs one
// block read.
import { ButtonState, EntityDamageCause, InputButton, Player, system, world } from "@minecraft/server";
import { CLIMB_KNOCKBACK, HOLD_KNOCKBACK, SLIDE_KNOCKBACK, SLIDE_SPEED, VINES_ID } from "./config.js";

// Gravity and drag, the engine's own per-tick change to vertical speed. Only
// the slide needs them, to tell whether the next tick would pass the cap
const GRAVITY = 0.08;
const DRAG = 0.98;

// Is the player inside a vine? Feet and chest are both checked so the climb
// stays continuous as they cross from one vine block into the next
function onVine(player: Player): boolean {
    const location = player.location;
    for (const y of [location.y, location.y + 1]) {
        try {
            const block = player.dimension.getBlock({
                x: Math.floor(location.x),
                y: Math.floor(y),
                z: Math.floor(location.z),
            });
            if (block !== undefined && block.typeId === VINES_ID) {
                return true;
            }
        } catch {
            // Chunk not loaded, treat it as no vine
        }
    }
    return false;
}

// Write one vertical knockback. Vanilla sets the climb speed outright every
// tick rather than nudging towards it, and so does this: a fixed value each
// tick cannot oscillate, where correcting towards a speed read a tick late
// does, because a player's velocity reaches the script one tick behind the
// client that owns it
function push(player: Player, knockback: number): void {
    player.applyKnockback({ x: 0, z: 0 }, knockback);
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        // Creative flight steers itself
        if (player.isFlying || !onVine(player)) {
            continue;
        }

        // Jumping or walking into the vine climbs, exactly like vanilla, which
        // does not care which way the vine faces
        const jumping = player.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed;
        if (jumping || player.inputInfo.getMovementVector().y > 0) {
            push(player, CLIMB_KNOCKBACK);
            continue;
        }

        // Sneaking parks the player on the vine
        if (player.isSneaking) {
            push(player, HOLD_KNOCKBACK);
            continue;
        }

        // Otherwise gravity takes them down and the vine only caps the speed.
        // The velocity read here is a tick old, which is fine for a one-sided cap
        if ((player.getVelocity().y - GRAVITY) * DRAG < -SLIDE_SPEED) {
            push(player, SLIDE_KNOCKBACK);
        }
    }
}, 1);

// A player who catches a vine mid-fall should not be hurt by the landing
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
    if (block !== undefined && block.typeId === VINES_ID) {
        event.cancel = true;
    }
});
