// What the bush does to entities inside it: slows them down and pricks them
// while they move.
// There is no block hook for "an entity is inside me", so the check runs from
// the player list every tick: entities near a player are tested against the
// bush cells their box overlaps. The cost follows the player count, not the
// number of bushes in the world.
//
// Vanilla resets an entity's speed every tick it is inside a bush and lets it
// cover only part of what it would have moved. Scripts cannot touch the move
// itself, so the same effect is built from two parts: the movement attribute
// is lowered while the entity is inside, which scales how hard it can push
// itself along, and mobs have their speed cleared every tick so no momentum
// carries over. A player's speed belongs to the client and cannot be cleared
// from the server, so players get a lower attribute instead, tuned to land on
// vanilla's speed.
//
// Where it still differs from vanilla, measured side by side:
// - A player reaches the slow walking speed over four ticks instead of at
//   once, and starting to sprint inside a bush is fast for a few ticks until
//   the server's lower value reaches the client.
// - A jump inside a bush rises 0.42 blocks on its first tick, not 0.315. That
//   first tick is the client's, before the script hears about the jump. It
//   still cannot clear a full block.
// - A mob that is hit or pushed inside a bush moves its full first step, then
//   stops. Vanilla shortens that step too.
// - Mobs path straight through the bush. Vanilla mobs route around it because
//   the engine knows its bush hurts, and there is no way to tell it the same
//   about a custom block.
import {
  Entity,
  EntityDamageCause,
  EntityMovementComponent,
  GameMode,
  Player,
  system,
  world,
} from "@minecraft/server";
import {
  BUSH_ID,
  CONTACT_DAMAGE,
  DAMAGING_FROM_GROWTH,
  GROWTH_STATE,
  HORIZONTAL_FACTOR,
  MOVING_THRESHOLD,
  PLAYER_RANGE,
  PLAYER_SINK_KNOCKBACK,
  PLAYER_SPEED_FACTOR,
  PRICK_TICKS,
  UNHURT_TYPES,
  UNSLOWED_TYPES,
  VERTICAL_FACTOR,
} from "./config.js";

// The entity's own speed before the bush lowered it. Kept on the entity, so a
// script reload or a chunk unload in the middle of a bush cannot lose it and
// end up treating the lowered value as the normal one
const SPEED_PROPERTY = "kai_templates:bush_speed";

// Gravity and drag, the engine's per-tick change to a falling mob's speed
const GRAVITY = 0.08;
const DRAG = 0.98;

// What the script last wrote into each entity's movement attribute
const written = new Map<string, number>();

// The highest growth stage among the bush cells the entity's box overlaps,
// or -1 when it is not inside any. Vanilla treats the whole cell as the bush,
// not the drawn shape, so a box that only grazes the cell still counts
function bushInside(entity: Entity): number {
  const box = entity.getAABB();
  const minX = Math.floor(box.center.x - box.extent.x);
  const maxX = Math.floor(box.center.x + box.extent.x - 1e-7);
  const minY = Math.floor(box.center.y - box.extent.y);
  const maxY = Math.floor(box.center.y + box.extent.y - 1e-7);
  const minZ = Math.floor(box.center.z - box.extent.z);
  const maxZ = Math.floor(box.center.z + box.extent.z - 1e-7);
  let best = -1;
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        let block;
        try {
          block = entity.dimension.getBlock({ x, y, z });
        } catch {
          continue;
        }
        if (block?.typeId !== BUSH_ID) {
          continue;
        }
        const growth = block.permutation.getAllStates()[GROWTH_STATE];
        best = Math.max(best, typeof growth === "number" ? growth : 0);
      }
    }
  }
  return best;
}

// Lower the movement attribute to a share of the entity's own speed. The
// engine recalculates the attribute whenever something changes it, a player
// starting to sprint for one, so a value that is not the one written last
// tick is taken as the entity's new normal speed
function lowerSpeed(entity: Entity, movement: EntityMovementComponent, factor: number): void {
  const current = movement.currentValue;
  const last = written.get(entity.id);
  let normal = entity.getDynamicProperty(SPEED_PROPERTY);
  if (typeof normal !== "number" || (last !== undefined && Math.abs(current - last) > 1e-6)) {
    normal = current;
    entity.setDynamicProperty(SPEED_PROPERTY, normal);
  }
  const target = normal * factor;
  if (Math.abs(current - target) > 1e-6) {
    movement.setCurrentValue(target);
  }
  written.set(entity.id, target);
}

// Give the entity its own speed back once it is out of every bush
function restoreSpeed(entity: Entity): void {
  written.delete(entity.id);
  const normal = entity.getDynamicProperty(SPEED_PROPERTY);
  if (typeof normal !== "number") {
    return;
  }
  entity.setDynamicProperty(SPEED_PROPERTY, undefined);
  entity.getComponent("minecraft:movement")?.setCurrentValue(normal);
}

// Slow one entity down for this tick
function slow(entity: Entity): void {
  const movement = entity.getComponent("minecraft:movement");
  if (entity instanceof Player) {
    if (movement !== undefined) {
      lowerSpeed(entity, movement, PLAYER_SPEED_FACTOR);
    }
    // In the air, set the player's vertical speed every tick so a jump stops
    // rising after its first tick and sinks back at vanilla's slow, steady
    // rate. Knockback is the one way to set a player's speed from the server
    if (!entity.isOnGround && !entity.isFlying && !entity.isGliding) {
      entity.applyKnockback({ x: 0, z: 0 }, PLAYER_SINK_KNOCKBACK);
    }
    return;
  }
  if (movement !== undefined) {
    lowerSpeed(entity, movement, HORIZONTAL_FACTOR);
  }
  // No momentum carries over from one tick to the next. A mob in the air is
  // handed the small upward push that turns a free fall into vanilla's slow
  // sink through the bush
  entity.clearVelocity();
  if (!entity.isOnGround) {
    entity.applyImpulse({ x: 0, y: GRAVITY - GRAVITY * VERTICAL_FACTOR * DRAG, z: 0 });
  }
}

// Did the entity move sideways this tick? Vanilla only pricks a moving entity
function isMoving(entity: Entity): boolean {
  const velocity = entity.getVelocity();
  return Math.abs(velocity.x) >= MOVING_THRESHOLD || Math.abs(velocity.z) >= MOVING_THRESHOLD;
}

// The tick each entity was last pricked. The engine's own hurt cooldown does
// not stop applyDamage reporting a hit, so the bush keeps its own rhythm and
// the hurt sound plays once per prick
const lastPrick = new Map<string, number>();

// Prick a moving entity, at most once every PRICK_TICKS ticks
function prick(entity: Entity): void {
  if (UNHURT_TYPES.has(entity.typeId)) {
    return;
  }
  if (entity instanceof Player) {
    const mode = entity.getGameMode();
    if (mode === GameMode.Creative || mode === GameMode.Spectator) {
      return;
    }
  }
  const last = lastPrick.get(entity.id);
  if (last !== undefined && system.currentTick - last < PRICK_TICKS) {
    return;
  }
  const hurt = entity.applyDamage(CONTACT_DAMAGE, { cause: EntityDamageCause.contact });
  if (!hurt) {
    return;
  }
  lastPrick.set(entity.id, system.currentTick);
  if (entity instanceof Player) {
    entity.dimension.playSound("block.sweet_berry_bush.hurt", entity.location);
  }
}

// Entities that were inside a bush last tick, so the ones that walked out
// (or out of range) get their speed back
let insideLastTick = new Map<string, Entity>();

system.runInterval(() => {
  const insideNow = new Map<string, Entity>();
  const checked = new Set<string>();

  for (const player of world.getPlayers()) {
    let nearby: Entity[];
    try {
      nearby = player.dimension.getEntities({ location: player.location, maxDistance: PLAYER_RANGE });
    } catch {
      continue;
    }
    for (const entity of nearby) {
      if (checked.has(entity.id) || UNSLOWED_TYPES.has(entity.typeId)) {
        continue;
      }
      checked.add(entity.id);
      const growth = bushInside(entity);
      if (growth < 0) {
        continue;
      }
      insideNow.set(entity.id, entity);
      // Read before slow(), which clears a mob's speed
      const moving = isMoving(entity);
      slow(entity);
      if (moving && growth >= DAMAGING_FROM_GROWTH) {
        prick(entity);
      }
    }
  }

  for (const [id, entity] of insideLastTick) {
    if (!insideNow.has(id) && entity.isValid) {
      restoreSpeed(entity);
    }
  }
  insideLastTick = insideNow;

  // Forget pricks whose wait is over
  for (const [id, tick] of lastPrick) {
    if (system.currentTick - tick >= PRICK_TICKS) {
      lastPrick.delete(id);
    }
  }
}, 1);

// A player who left the world while inside a bush comes back with the
// lowered speed saved on them. Give it back if they are no longer in one
world.afterEvents.playerSpawn.subscribe((event) => {
  if (bushInside(event.player) < 0) {
    restoreSpeed(event.player);
  }
});
