// Registers the component that bounces entities landing on the slime block.
// Bedrock has no data-driven "bouncy block" component (vanilla slime bounce
// is hardcoded), so the custom component's onEntityFallOn hook launches the
// entity back up. The block JSON sets minecraft:entity_fall_on to a minimum
// fall of zero, so the hook fires on every landing, down to the last small
// hop of a bounce dying out.
//
// Vanilla's bounce, measured tick by tick against the vanilla slime block
// from drops of 0.1 to 40 blocks:
//   - Mobs, players and armor stands come back up at almost the speed they
//     landed with, over and over, each bounce a little lower.
//   - Items, boats and minecarts bounce too, keeping a fixed share of their
//     speed; a minecart, which falls without air drag, keeps the most.
//   - Chickens and the other flapping or flying mobs do not bounce.
//   - A sneaking player does not bounce.
import {
  system,
  world,
  BlockComponentEntityFallOnEvent,
  Entity,
  Player,
} from "@minecraft/server";

// How each kind falls (gravity and drag per tick) and how it bounces
interface Faller {
  gravity: number;
  drag: number;
  // For an object, the first step back up is this share of the speed it
  // had in the tick before it landed
  kept?: number;
  // applyImpulse sets an item's or a minecart's speed and the game then
  // spends a tick of gravity and drag on it before it moves; everything else
  // moves by the push itself
  pushIsSpeed?: boolean;
}

const CREATURE: Faller = { gravity: 0.08, drag: 0.98 };
// An item's push comes out a little long, so its share is set to what gives
// vanilla's first step in game rather than the 0.9796 vanilla keeps
const ITEM: Faller = { gravity: 0.04, drag: 0.98, kept: 0.959, pushIsSpeed: true };
const BOAT: Faller = { gravity: 0.04, drag: 0.98, kept: 0.958 };
const MINECART: Faller = { gravity: 0.04, drag: 1, kept: 0.945, pushIsSpeed: true };
const OBJECTS: Record<string, Faller> = {
  "minecraft:item": ITEM,
  "minecraft:boat": BOAT,
  "minecraft:chest_boat": BOAT,
  "minecraft:minecart": MINECART,
  "minecraft:chest_minecart": MINECART,
  "minecraft:hopper_minecart": MINECART,
  "minecraft:tnt_minecart": MINECART,
  "minecraft:command_block_minecart": MINECART,
};

// Mobs that land on vanilla slime without bouncing: they flap, fly or float
// down rather than fall
const NO_BOUNCE = new Set([
  "minecraft:chicken",
  "minecraft:bat",
  "minecraft:bee",
  "minecraft:parrot",
  "minecraft:phantom",
  "minecraft:ghast",
  "minecraft:vex",
]);

// The last launch given to each entity, so its next landing can be worked
// out from where its flight really started. Kept for as long as a flight
// could last, then dropped
interface Launch {
  step: number;
  tick: number;
}
const launches = new Map<string, Launch>();
const LAUNCH_KEPT_TICKS = 600;

// The speed an entity had in the tick before it landed, replayed tick by
// tick over the distance it fell, with how many ticks the flight took. A
// first fall starts at rest; a fall after a bounce starts from the launch,
// which tops out still moving a little, so the replay follows the whole
// flight from the launch instead
function replayFall(faller: Faller, fallDistance: number, launch?: Launch): { speed: number; ticks: number } {
  let speed = launch ? launch.step : 0;
  let covered = 0;
  for (let tick = 1; tick < 1200; tick++) {
    const next = (speed - faller.gravity) * faller.drag;
    if (next < 0) {
      if (covered - next > fallDistance + 0.01) return { speed: Math.max(0, -speed), ticks: tick };
      covered -= next;
    }
    speed = next;
  }
  return { speed: Math.max(0, -speed), ticks: 1200 };
}

// The launch, if this landing ends the flight it started: the replay from it
// must take as long as the entity has really been in the air
const FLIGHT_TOLERANCE_TICKS = 3;
function speedBeforeLanding(faller: Faller, fallDistance: number, launch?: Launch): number {
  if (launch) {
    const flight = replayFall(faller, fallDistance, launch);
    if (Math.abs(flight.ticks - (system.currentTick - launch.tick)) <= FLIGHT_TOLERANCE_TICKS) return flight.speed;
  }
  return replayFall(faller, fallDistance).speed;
}

// Vanilla's creature bounces come out this much under the fit, on average
// over every landing measured, first and later ones alike
const CREATURE_LOSS = 0.0015;

// The first step back up, in blocks, for a landing after this fall.
// A creature's comes from the step the landing tick tried to take and the
// part of it that was cut short by the block: a fit to every vanilla landing
// measured, first bounces and later ones, within about 0.003 of each.
// An object keeps a fixed share of its speed
function reboundStep(faller: Faller, before: number, landingStep: number): number {
  if (faller.kept !== undefined) return faller.kept * before;
  const attempted = (before + faller.gravity) * faller.drag;
  if (attempted <= 0) return 0;
  const cutShort = Math.min(1, Math.max(0, landingStep / attempted));
  return faller.drag * (attempted - faller.gravity * (1 - cutShort)) - CREATURE_LOSS;
}

function fallerOf(entity: Entity): Faller | undefined {
  const object = OBJECTS[entity.typeId];
  if (object) return object;
  if (NO_BOUNCE.has(entity.typeId)) return undefined;
  // Anything with health falls like a creature; projectiles, orbs, TNT and
  // falling blocks have none and land as usual
  if (!entity.getComponent("minecraft:health")) return undefined;
  return CREATURE;
}

// A player moves on their own device and does not fall in step with a
// replay from rest, so their real falling speed is read every tick instead,
// keeping the last two readings
interface Reading {
  tick: number;
  speed: number;
}
const playerReadings = new Map<string, [Reading?, Reading?]>();

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const readings = playerReadings.get(player.id) ?? [];
    playerReadings.set(player.id, [readings[1], { tick: system.currentTick, speed: -player.getVelocity().y }]);
  }
});

world.afterEvents.playerLeave.subscribe((event) => playerReadings.delete(event.playerId));

// The speed the player fell with in the tick before this landing, and the
// landing's own short step. A player's landing can reach the hook a tick
// late, standing still already; the readings then end with the short step,
// which fell less than free fall from the reading before it would have
function playerLanding(player: Player, landingStep: number, faller: Faller): Landing | undefined {
  const readings = (playerReadings.get(player.id) ?? []).filter(
    (r): r is Reading => r !== undefined && r.tick < system.currentTick,
  );
  const [older, newer] = readings.length === 2 ? readings : [undefined, readings[0]];
  if (!newer) return undefined;
  if (landingStep < 1e-3 && older && older.speed > 0) {
    const freeFall = (older.speed + faller.gravity) * faller.drag;
    if (newer.speed > 1e-3 && newer.speed < freeFall - 0.01) return { before: older.speed, landingStep: newer.speed };
  }
  for (const reading of [newer, older]) {
    if (!reading || Math.abs(reading.speed - landingStep) < 1e-3) continue;
    if (reading.speed > 0) return { before: reading.speed, landingStep };
  }
  return undefined;
}

interface Landing {
  before: number;
  landingStep: number;
}

// A knockback of k below 0.19 given to a player on the landing tick moves
// them up 1.21k - 0.04 on the next, so a small one is sent a little larger
const PLAYER_SHORT_BELOW = 0.19;
const PLAYER_SHORT_GAIN = 1.21;
const PLAYER_SHORT_LOSS = 0.04;

function bounce(event: BlockComponentEntityFallOnEvent): void {
  // The entity is optional in the event payload, and it can have died or
  // despawned from the very landing that fired this hook
  const entity = event.entity;
  if (entity === undefined || !entity.isValid) return;

  // A sneaking player lands without bouncing, as on vanilla slime.
  // (fallCushion.ts still takes away the fall damage.)
  if (entity instanceof Player && entity.isSneaking) return;

  const faller = fallerOf(entity);
  if (!faller) return;

  // The event's fall distance leaves out the landing tick's own short step
  // onto the block, which is the entity's velocity now
  const velocity = entity.getVelocity();
  const shortStep = Math.max(0, -velocity.y);
  const landing = (entity instanceof Player ? playerLanding(entity, shortStep, faller) : undefined) ?? {
    before: speedBeforeLanding(faller, event.fallDistance, launches.get(entity.id)),
    landingStep: shortStep,
  };
  const step = reboundStep(faller, landing.before, landing.landingStep);
  if (step <= 0.001) {
    launches.delete(entity.id);
    return;
  }
  launches.set(entity.id, { step, tick: system.currentTick });

  if (entity instanceof Player) {
    // Players reject applyImpulse, so the player path uses knockback. The
    // sideways speed goes in as the horizontal force, so it carries through
    // the bounce as it does in vanilla
    const send = step < PLAYER_SHORT_BELOW ? (step + PLAYER_SHORT_LOSS) / PLAYER_SHORT_GAIN : step;
    entity.applyKnockback({ x: velocity.x, z: velocity.z }, send);
  } else {
    // Keep the sideways speed, replace the fall with the rebound
    const push = faller.pushIsSpeed ? step / faller.drag + faller.gravity : step;
    entity.clearVelocity();
    entity.applyImpulse({ x: velocity.x, y: push, z: velocity.z });
  }
}

// Forget the launches of entities that have long since stopped bouncing
system.runInterval(() => {
  for (const [id, launch] of launches) {
    if (system.currentTick - launch.tick > LAUNCH_KEPT_TICKS) launches.delete(id);
  }
}, LAUNCH_KEPT_TICKS);

// Custom components register during the startup before-event, which runs in
// early execution, before any world or entity exists. The hook itself runs
// later, in normal execution, where touching entities is allowed.
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent("kai_templates:slime_bounce", {
    onEntityFallOn: bounce,
  });
});
