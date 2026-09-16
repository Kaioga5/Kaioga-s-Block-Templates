// Registers the component that bounces entities landing on the slime block.
// Bedrock has no data-driven "bouncy block" component (vanilla slime bounce
// is hardcoded), so the custom component's onEntityFallOn hook launches the
// entity back up. The hook fires from the custom component alone, no
// minecraft:entity_fall_on JSON component is needed, and the fall-distance
// threshold lives here in the script instead.
import {
  system,
  BlockComponentEntityFallOnEvent,
  CustomComponentParameters,
  Player,
} from "@minecraft/server";

// Both values are overridable from the block JSON (see the parameters the
// block attaches to kai_templates:slime_bounce). Defaults live here so the
// component still works if someone strips the parameters out.
interface SlimeBounceParams {
  // Launch strength gained per square root of a block of fall distance.
  bounce_power?: number;
  // Hard ceiling on the launch strength, whatever the fall distance was.
  max_launch?: number;
}

// Vanilla slime returns the entity to roughly the height it fell from, so
// the launch speed has to match the impact speed. Falling h blocks under
// Minecraft's gravity of 0.08 blocks per tick squared arrives at
// sqrt(2 * 0.08 * h) = 0.4 * sqrt(h), which is where this coefficient comes
// from rather than from tuning by feel.
const DEFAULT_BOUNCE_POWER = 0.4;

// Drag flattens the curve past a long drop; this caps the launch at about
// what a sixteen-block fall arrives with.
const DEFAULT_MAX_LAUNCH = 1.6;

// Falls shorter than this land without a bounce
const MIN_FALL_DISTANCE = 0.5;

// Custom components register during the startup before-event, which runs in
// early execution, before any world or entity exists. Only registration-type
// work is legal here; the hooks themselves run later, in normal execution,
// where touching entities is allowed.
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:slime_bounce",
    {
      onEntityFallOn(
        e: BlockComponentEntityFallOnEvent,
        p: CustomComponentParameters,
      ) {
        // The entity is optional in the event payload, and it can have died or
        // despawned from the very landing that fired this hook. Bail out
        // rather than throw.
        const entity = e.entity;
        if (entity === undefined || !entity.isValid) {
          return;
        }

        // Short hops land normally, like vanilla
        if (e.fallDistance < MIN_FALL_DISTANCE) {
          return;
        }

        // A sneaking player absorbs the landing instead of bouncing,
        // vanilla's slime block works the same way. (fallCushion.ts applies
        // the matching damage rule.)
        if (entity instanceof Player && entity.isSneaking) {
          return;
        }

        const params = p.params as SlimeBounceParams;
        const bouncePower = params.bounce_power ?? DEFAULT_BOUNCE_POWER;
        const maxLaunch = params.max_launch ?? DEFAULT_MAX_LAUNCH;

        // Compute the launch strength. The event reports fall distance, not
        // impact speed; free-fall speed grows with the square root of the
        // drop height, so scaling by sqrt(fallDistance) makes tall drops
        // bounce proportionally higher. The cap stops extreme falls from
        // launching entities absurdly high
        const strength = Math.min(
          bouncePower * Math.sqrt(e.fallDistance),
          maxLaunch,
        );
        if (strength <= 0) {
          return;
        }

        if (entity instanceof Player) {
          // Players reject applyImpulse (it throws UnsupportedFunctionalityError
          // on them), so the player path uses knockback: a horizontal force of
          // zero plus a vertical strength gives a straight-up launch.
          entity.applyKnockback({ x: 0, z: 0 }, strength);
        } else {
          // Everything else takes a plain impulse. Zero the velocity first:
          // whatever downward speed the engine still has stored for the entity
          // would otherwise eat part of the launch and make bounce heights
          // land-dependent and twitchy.
          entity.clearVelocity();
          entity.applyImpulse({ x: 0, y: strength, z: 0 });
        }
      },
    },
  );
});
