// Makes the ladder climbable. Custom blocks have no native climbable
// component, so movement is scripted: a short per-player loop reads the
// block at the player's feet and steers vertical velocity. The loop is
// player-driven, its cost scales with the player count, never with how
// many ladders exist in the world, and each pass is one getBlock call
// per player when no ladder is involved.
import {
  Block,
  ButtonState,
  EntityDamageCause,
  InputButton,
  Player,
  system,
  world,
} from "@minecraft/server";

// The ladder block this template defines
const LADDER_ID = "kai_templates:ladder";

// Vanilla ladder movement, measured in game tick by tick: climbing moves
// exactly 0.2 blocks a tick from the first tick of input, sneaking holds the
// player exactly still, and a player who lets go falls under ordinary gravity
// until the ladder caps the slide at 0.2 blocks a tick
const CLIMB_SPEED = 0.2;
const SLIDE_SPEED = 0.2;

// The vertical knockback that produces each of those, written every tick the
// player is on the ladder. The engine's answer to a vertical knockback is not
// the number itself: 0.2 does move a player 0.2 a tick, but holding still
// takes a small upward push against gravity, and capping the slide takes a
// much smaller downward one than the speed it holds. All three were read off
// the same per-tick recording as the vanilla figures above
const CLIMB_KNOCKBACK = 0.2;
const HOLD_KNOCKBACK = 0.033;
const SLIDE_KNOCKBACK = -0.05;

// Get the ladder block the player currently overlaps, if any. The ladder's
// collision plate is thin, so a player pressed against the wall stands
// inside the ladder's block space
function ladderAt(player: Player): Block | undefined {
  const loc = player.location;
  // Feet first, then chest. Checking both keeps the climb continuous as
  // the player crosses from one ladder block into the next, which is
  // where a feet-only test drops the player for a tick
  for (const y of [loc.y, loc.y + 1]) {
    try {
      const block = player.dimension.getBlock({
        x: Math.floor(loc.x),
        y: Math.floor(y),
        z: Math.floor(loc.z),
      });
      if (block !== undefined && block.typeId === LADDER_ID) {
        return block;
      }
    } catch {
      // Chunk not loaded, treat it as no ladder
    }
  }
  return undefined;
}

// Vanilla climbs whenever the player is inside the ladder and pressing
// forward, it does not check which way the ladder faces. Testing the yaw
// against the ladder's face made the climb switch on and off as the player
// looked around, which is what the stutter was
function pushesIntoLadder(player: Player): boolean {
  // Read the raw stick/keyboard input: x is strafe, y is forward
  return player.inputInfo.getMovementVector().y > 0;
}

// Gravity and drag, the engine's own per-tick change to vertical speed. Only
// the slide needs them, to tell whether the next tick would pass the cap
const GRAVITY = 0.08;
const DRAG = 0.98;

// Write one vertical knockback. Vanilla sets the climb speed outright every
// tick rather than nudging towards it, and so does this: a fixed value each
// tick cannot oscillate, where correcting by the difference to a speed read a
// tick late did, because a player's velocity reaches the script one tick
// behind the client that owns it
function push(player: Player, knockback: number): void {
  player.applyKnockback({ x: 0, z: 0 }, knockback);
}

// Steer one player who is on a ladder this tick
function steer(player: Player): void {
  // Jumping or walking into the ladder climbs, like vanilla
  const jumpHeld =
    player.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed;
  if (jumpHeld || pushesIntoLadder(player)) {
    push(player, CLIMB_KNOCKBACK);
    return;
  }

  // Sneaking parks the player on the ladder
  if (player.isSneaking) {
    push(player, HOLD_KNOCKBACK);
    return;
  }

  // Otherwise gravity takes them down and the ladder only caps the speed. The
  // velocity read here is a tick old, which is fine for a one-sided cap
  if ((player.getVelocity().y - GRAVITY) * DRAG < -SLIDE_SPEED) {
    push(player, SLIDE_KNOCKBACK);
  }
}

// The movement loop. Runs every tick because climbing is continuous
// motion; everything it does per player is a block read and some math
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    // Flying creative players steer themselves
    if (player.isFlying) {
      continue;
    }
    const ladder = ladderAt(player);
    if (ladder === undefined) {
      continue;
    }
    steer(player);
  }
}, 1);

// Landing in a ladder must not hurt, the slow slide keeps speeds low,
// but a player can still grab a ladder mid-fall
world.beforeEvents.entityHurt.subscribe((event) => {
  if (event.damageSource.cause !== EntityDamageCause.fall) {
    return;
  }
  const entity = event.hurtEntity;
  if (entity.typeId !== "minecraft:player") {
    return;
  }
  const loc = entity.location;
  const block = entity.dimension.getBlock({
    x: Math.floor(loc.x),
    y: Math.floor(loc.y),
    z: Math.floor(loc.z),
  });
  if (block !== undefined && block.typeId === LADDER_ID) {
    event.cancel = true;
  }
});
