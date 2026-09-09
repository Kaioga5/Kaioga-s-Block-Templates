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

// Vanilla ladder speeds, in blocks per tick. Climbing is 2.35 blocks per
// second and slipping down is 3.0, which is where these two numbers come
// from, they are not tuned by feel
// 0.1175 is vanilla's own climb rate, but the correction only lands once per
// tick and the engine moves the player in between, so the target has to sit
// above it for the result to arrive at vanilla speed. Descent is the same
// number vanilla uses; there the engine helps rather than fights.
const CLIMB_SPEED = 0.235;
const DESCEND_SPEED = -0.15;

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

// Gravity the engine takes off vertical speed every tick. Correcting only
// by the difference to the target leaves the player permanently one tick of
// gravity short of it, which is why the climb crawled and the slide sawtoothed
// between falling and being yanked back
const GRAVITY = 0.08;

// How much of the remaining error to take out each tick. Correcting the whole
// error in one go is dead-beat control: the smallest overshoot turns into a
// visible twitch, and applying a full-strength impulse every tick reads as a
// series of little jumps. Taking most of it and letting the rest follow
// converges in two or three ticks and looks continuous
// Climbing wants to reach the target quickly; descending wants to settle onto
// it without a visible step, so it takes a gentler share of the error.
const CLIMB_CORRECTION = 0.8;
const DESCEND_CORRECTION = 0.35;

// Errors below this are left alone, so a player already moving at the target
// speed is not nudged every tick for nothing
const DEADBAND = 0.02;

// Hold the player at one vertical speed. The same correction runs whatever
// they are doing, so control never alternates with free fall
function hold(player: Player, target: number, share: number): void {
  // The engine will take a tick of gravity off after this runs, so the
  // correction aims past the target by exactly that much
  const error = target + GRAVITY - player.getVelocity().y;
  if (Math.abs(error) < DEADBAND) {
    return;
  }
  player.applyKnockback({ x: 0, z: 0 }, error * share);
}

// Steer one player who is on a ladder this tick
function steer(player: Player): void {
  // Jumping or walking into the ladder climbs, like vanilla
  const jumpHeld =
    player.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed;
  if (jumpHeld || pushesIntoLadder(player)) {
    hold(player, CLIMB_SPEED, CLIMB_CORRECTION);
    return;
  }

  // Sneaking parks the player on the ladder
  if (player.isSneaking) {
    hold(player, 0, DESCEND_CORRECTION);
    return;
  }

  // Otherwise the ladder slides them down at its own steady speed
  hold(player, DESCEND_SPEED, DESCEND_CORRECTION);
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
