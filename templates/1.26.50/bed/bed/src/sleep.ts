// Putting a player to bed and getting them out again.
//
// A custom block cannot make the engine put a player to sleep: Player.isSleeping
// is read-only and nothing in the script API sets it. So the template does what
// the engine does, one piece at a time, all from script and without touching
// any player file:
//   - the player is moved onto the pillow,
//   - movement and look input are switched off so they stay there,
//   - a lying animation is played on them with Entity.playAnimation,
//   - the camera cuts to where vanilla puts a sleeper's view, and the screen
//     darkens the way vanilla's does,
//   - enough sleepers skip the night,
//   - and waking undoes each step, standing the player up beside the bed.
// Every number below was measured against the vanilla red bed.
import {
  Block,
  ButtonState,
  Difficulty,
  Dimension,
  GameMode,
  HudElement,
  HudVisibility,
  InputButton,
  InputPermissionCategory,
  MolangVariableMap,
  Player,
  PlayerPermissionLevel,
  system,
  Vector2,
  Vector3,
  WeatherType,
  world,
} from "@minecraft/server";

export const BED_ID = "kai_templates:red_bed";
export const OCCUPIED = "kai_templates:occupied";
export const FACING = "minecraft:cardinal_direction";
export const PART = "minecraft:multi_block_part";

// Stored on a sleeping player so a /reload or a rejoin can still undo the
// camera and input changes of a sleep the script no longer remembers
const SESSION_PROPERTY = "kai_templates:bed_session";

// One block from the foot towards the head, per facing
export const HEAD_STEP: Record<string, Vector3> = {
  north: { x: 0, y: 0, z: -1 },
  south: { x: 0, y: 0, z: 1 },
  west: { x: -1, y: 0, z: 0 },
  east: { x: 1, y: 0, z: 0 },
};

// The yaw that looks from the head towards the foot, per facing
const FOOTWARD_YAW: Record<string, number> = { north: 0, south: 180, west: -90, east: 90 };

// A sleeper stands on the mattress, centred on the head block. Vanilla draws
// its sleeper higher than that; the lying animation lifts the body to match
const SLEEP_HEIGHT = 0.5625;

// The sleeping view: above the pillow, a little towards the headboard,
// looking along the bed towards the foot. It opens looking 39.5 degrees up
// and then slowly lowers to level, easing in and out, over about four and a
// third seconds, the same whichever way the player was looking when they lay
// down. An eased move sent within a few ticks of the cut is dropped, so it
// goes out four ticks later, with the duration that fits vanilla's curve from
// there
const CAMERA_PRESET = "kai_templates:red_bed_sleep";
const CAMERA_HEIGHT = 1.24;
const CAMERA_HEADWARD = 0.1;
const CAMERA_PITCH = -39.5;
const CAMERA_SETTLED_PITCH = 0;
const CAMERA_SETTLE_SECONDS = 4.04;
const CAMERA_EASE_DELAY = 4;

// Vanilla's sleeping view has the player's own field of view, which is 1.1
// times the Field of View setting. A script cannot read that setting, and the
// camera command's free camera always draws at 60, so the view is set to what
// vanilla shows at the default setting of 60
const CAMERA_FOV = 66;

// Falling asleep, vanilla closes two soft dark eyelids over the view, from
// the top and bottom edges, and dims the picture under them until the room
// only just shows through. The template draws the same with a particle
// effect, spawned for the sleeper alone and held just in front of the
// sleeping camera: one quad per eyelid and one that dims the whole view.
// Its curves are in resource_pack/particles/red_bed_eyelid.json; these are
// how far ahead of the camera each quad sits, the eyelids nearest, and half
// the camera's field of view, which sets how tall the view is out there
const EYELID_PARTICLE = "kai_templates:red_bed_eyelid";
const EYELID_DISTANCE = 0.24;
const DIM_DISTANCE = 0.26;
const HALF_FOV_TAN = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);

// The effect sits in the air cell above the pillow, and vanilla's clears the
// moment the player wakes. A particle cannot be stopped from script, but it
// ends itself inside structure void, so waking turns that air to structure
// void for a few ticks and then back
const EYELID_CLEAR = "minecraft:structure_void";
const EYELID_CLEAR_TICKS = 3;

// Vanilla's eyelids start closing a moment after the view cuts to the pillow
const EYELID_DELAY_TICKS = 6;

// Where something other than air fills that cell, the eyelids could not be
// cleared on waking, so the screen darkens with a camera fade instead: to the
// colour vanilla dims to, starting 0.7 seconds into the sleep and taking 2.5.
// A camera fade cannot be cut short and lasts at least half a second, so once
// dark the screen is kept dark by a fade sent every tick that holds for a
// single tick: waking leaves at most half a second of fading out
const FADE_COLOR = "9 9 15";
const FADE_START_TICKS = 14;
const FADE_IN_SECONDS = 2.5;
const FADE_KEEP_HOLD = 0.05;
const FADE_KEEP_OUT = 0.45;

// Vanilla ends the night once every sleeper needed has slept this long
const NIGHT_SKIP_TICKS = 100;

// The pose stops by itself once the player is away from the sleeping spot,
// so it goes out the tick after the move, and again every second in case one
// is lost or a player arrives mid-sleep
const POSE_DELAY = 1;
const POSE_RESEND = 20;

// The client keeps a playAnimation controller by name, and after /reload all
// a controller it already had stops accepting animations. A name fresh to
// each script load keeps the pose working through reloads
const POSE_CONTROLLER = `kai_templates:red_bed_sleep_${Math.floor(Math.random() * 1e9).toString(36)}`;

// Vanilla's sleeping screen shows no HUD. Touch controls stay, because on a
// touch screen the jump button is the way out of bed
const HIDDEN_HUD = [
  HudElement.PaperDoll,
  HudElement.Armor,
  HudElement.ToolTips,
  HudElement.Crosshair,
  HudElement.Hotbar,
  HudElement.Health,
  HudElement.ProgressBar,
  HudElement.Hunger,
  HudElement.AirBubbles,
  HudElement.HorseHealth,
  HudElement.StatusEffects,
  HudElement.ItemText,
];

interface Session {
  dimension: string;
  head: Vector3;
  foot: Vector3;
  facing: string;
  since: number;
  // HUD elements this sleep hid, so waking gives back only those
  hud: HudElement[];
  // Where the player was looking when they lay down, given back on waking
  look: Vector2;
  // Whether the eyelids were drawn, or the screen fades instead
  eyelids?: boolean;
}

// Sleepers by player id
const sessions = new Map<string, Session>();

// The stable API can change the weather but not read it, so the last change
// is remembered per dimension in a world property. A world loaded mid-storm
// reads as clear until the weather next changes. The event names the
// dimension without its namespace ("overworld"), so it is looked up to get
// the same id a Dimension carries
const WEATHER_PROPERTY = "kai_templates:bed_weather";

world.afterEvents.weatherChange.subscribe((event) => {
  let id = event.dimension;
  try {
    id = world.getDimension(event.dimension).id;
  } catch {
    // Keep the name as given
  }
  world.setDynamicProperty(`${WEATHER_PROPERTY}:${id}`, event.newWeather);
});

export function weatherIn(dimensionId: string): WeatherType {
  const weather = world.getDynamicProperty(`${WEATHER_PROPERTY}:${dimensionId}`);
  return typeof weather === "string" ? (weather as WeatherType) : WeatherType.Clear;
}

export function isThundering(dimensionId: string): boolean {
  return weatherIn(dimensionId) === WeatherType.Thunder;
}

function same(a: Vector3, b: Vector3): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function fmt(n: number): string {
  return (Math.round(n * 10000) / 10000).toString();
}

// The player sleeping in the bed whose head is at this position, if any
export function sleeperOf(dimension: Dimension, head: Vector3): Player | undefined {
  for (const [id, session] of sessions) {
    if (session.dimension === dimension.id && same(session.head, head)) {
      const player = world.getEntity(id);
      if (player instanceof Player && player.isValid) return player;
    }
  }
  return undefined;
}

export function isSleeping(player: Player): boolean {
  return sessions.has(player.id);
}

// Write the occupied state on both halves
export function setOccupied(block: Block, occupied: boolean): void {
  const parts = block.getParts() ?? [block];
  for (const part of parts) {
    if (part.typeId !== BED_ID) continue;
    if (part.permutation.getState(OCCUPIED as never) === occupied) continue;
    part.setPermutation(part.permutation.withState(OCCUPIED as never, occupied as never));
  }
}

function blockAt(dimension: Dimension, at: Vector3): Block | undefined {
  try {
    return dimension.getBlock(at);
  } catch {
    return undefined;
  }
}

function lockInput(player: Player, locked: boolean): void {
  const input = player.inputPermissions;
  input.setPermissionCategory(InputPermissionCategory.Movement, !locked);
  input.setPermissionCategory(InputPermissionCategory.Camera, !locked);
}

function sleepSpot(session: Session): Vector3 {
  return { x: session.head.x + 0.5, y: session.head.y + SLEEP_HEIGHT, z: session.head.z + 0.5 };
}

// The lying pose. Vanilla's animation.player.sleeping reads the bed's
// direction from query.sleep_rotation, which only a real sleeper has, so it
// always lays a scripted sleeper head-west. The template's copy of it, one
// per facing in resource_pack/animations, fixes that direction instead.
// A second animation, sent to the sleeper alone, hides their own body from
// the sleeping view, which vanilla's first-person view never shows. Both stop
// by themselves the moment the player leaves the spot, so waking needs no
// separate stop command
function playPose(player: Player, session: Session): void {
  const spot = sleepSpot(session);
  // Horizontal only: on the client a player's height reads at eye level
  const away =
    `math.abs(q.position(0) - (${fmt(spot.x)})) > 0.3 || ` +
    `math.abs(q.position(2) - (${fmt(spot.z)})) > 0.3`;
  player.playAnimation(`animation.kai_templates.red_bed.sleep_${session.facing}`, {
    controller: POSE_CONTROLLER,
    stopExpression: away,
    blendOutTime: 0,
  });
  // A second playAnimation on the same player in the same tick replaces the
  // first on the client, so the hide goes out a tick later
  system.runTimeout(() => {
    if (!player.isValid) return;
    player.playAnimation("animation.kai_templates.red_bed.hide_self", {
      controller: `${POSE_CONTROLLER}_self`,
      stopExpression: away,
      blendOutTime: 0,
      players: [player],
    });
  }, 1);
}

function setSleepCamera(player: Player, session: Session): void {
  const step = HEAD_STEP[session.facing];
  const cam = {
    x: session.head.x + 0.5 + step.x * CAMERA_HEADWARD,
    y: session.head.y + CAMERA_HEIGHT,
    z: session.head.z + 0.5 + step.z * CAMERA_HEADWARD,
  };
  const pos = `pos ${fmt(cam.x)} ${fmt(cam.y)} ${fmt(cam.z)}`;
  const yaw = FOOTWARD_YAW[session.facing];
  player.runCommand(`camera @s set ${CAMERA_PRESET} ${pos} rot ${CAMERA_PITCH} ${yaw}`);
  player.runCommand(`camera @s fov_set ${CAMERA_FOV}`);
  system.runTimeout(() => {
    if (!player.isValid || sessions.get(player.id) !== session) return;
    player.runCommand(
      `camera @s set ${CAMERA_PRESET} ease ${CAMERA_SETTLE_SECONDS} in_out_cubic ${pos} ` +
        `rot ${CAMERA_SETTLED_PITCH} ${yaw}`,
    );
  }, CAMERA_EASE_DELAY);
  if (!session.eyelids) return;
  system.runTimeout(() => {
    if (!player.isValid || sessions.get(player.id) !== session) return;
    closeEyes(player, session, cam);
  }, EYELID_DELAY_TICKS);
}

// The air cell above the pillow, where the eyelids are drawn
function eyelidCell(session: Session): Vector3 {
  return { x: session.head.x, y: session.head.y + 1, z: session.head.z };
}

// Spawn the eyelids and the dimming for the sleeper alone, at the camera,
// told how the camera moves so they keep in front of it
function closeEyes(player: Player, session: Session, cam: Vector3): void {
  const layers = [
    { side: 1, distance: EYELID_DISTANCE },
    { side: -1, distance: EYELID_DISTANCE },
    { side: 0, distance: DIM_DISTANCE },
  ];
  for (const { side, distance } of layers) {
    const vars = new MolangVariableMap();
    vars.setFloat("variable.yaw", FOOTWARD_YAW[session.facing]);
    vars.setFloat("variable.pitch0", CAMERA_PITCH);
    // When the camera starts to ease, counted from the spawn
    vars.setFloat("variable.delay", (CAMERA_EASE_DELAY - EYELID_DELAY_TICKS) / 20);
    vars.setFloat("variable.span", CAMERA_SETTLE_SECONDS);
    vars.setFloat("variable.d", distance);
    vars.setFloat("variable.hh", distance * HALF_FOV_TAN);
    vars.setFloat("variable.side", side);
    player.spawnParticle(EYELID_PARTICLE, cam, vars);
  }
}

// Open the sleeper's eyes: end the eyelid particles by filling their cell
// with structure void for a moment
function openEyes(session: Session): void {
  const cell = blockAt(world.getDimension(session.dimension), eyelidCell(session));
  if (!cell?.isAir) return;
  cell.setType(EYELID_CLEAR);
  system.runTimeout(() => {
    if (cell.isValid && cell.typeId === EYELID_CLEAR) cell.setType("minecraft:air");
  }, EYELID_CLEAR_TICKS);
}

function fade(player: Player, fadeIn: number, hold: number, fadeOut: number): void {
  player.runCommand(`camera @s fade time ${fadeIn} ${hold} ${fadeOut} color ${FADE_COLOR}`);
}

// Put the player to bed. The caller has already checked every vanilla rule
export function sleep(player: Player, head: Block, foot: Block, facing: string): void {
  const session: Session = {
    dimension: head.dimension.id,
    head: head.location,
    foot: foot.location,
    facing,
    since: system.currentTick,
    hud: HIDDEN_HUD.filter((e) => !player.onScreenDisplay.isForcedHidden(e)),
    look: player.getRotation(),
    eyelids: blockAt(head.dimension, { x: head.x, y: head.y + 1, z: head.z })?.isAir ?? false,
  };
  sessions.set(player.id, session);
  player.setDynamicProperty(SESSION_PROPERTY, JSON.stringify(session));
  setOccupied(head, true);

  lockInput(player, true);
  player.onScreenDisplay.setHudVisibility(HudVisibility.Hide, session.hud);
  // A vanilla sleeper's head rests straight on the pillow whichever way they
  // were looking. The lying pose cannot take the look out of the head, so
  // the player is turned to look along the bed, level, while asleep: they
  // cannot see it behind the sleeping view, and waking gives back the look
  // they had, as vanilla keeps it
  player.teleport(sleepSpot(session), {
    dimension: head.dimension,
    rotation: { x: 0, y: FOOTWARD_YAW[facing] },
    keepVelocity: false,
  });
  // The view cuts to the pillow together with the pose, so the sleeper never
  // sees their own body standing there
  system.runTimeout(() => {
    if (!player.isValid || sessions.get(player.id) !== session) return;
    playPose(player, session);
    setSleepCamera(player, session);
  }, POSE_DELAY);
}

// Blocks a player is kept from standing up onto while anywhere else will do
const DANGEROUS = new Set([
  "minecraft:lava",
  "minecraft:flowing_lava",
  "minecraft:fire",
  "minecraft:soul_fire",
  "minecraft:magma",
  "minecraft:campfire",
  "minecraft:soul_campfire",
  "minecraft:cactus",
  "minecraft:sweet_berry_bush",
  "minecraft:wither_rose",
  "minecraft:powder_snow",
]);

function standableAt(dimension: Dimension, x: number, y: number, z: number, safe: boolean): boolean {
  const feet = blockAt(dimension, { x, y, z });
  const head = blockAt(dimension, { x, y: y + 1, z });
  const floor = blockAt(dimension, { x, y: y - 1, z });
  if (!feet || !head || !floor) return false;
  if (!feet.isAir || !head.isAir) return false;
  if (floor.isAir || floor.isLiquid) return false;
  if (safe && DANGEROUS.has(floor.typeId)) return false;
  return true;
}

// Vanilla stands a player up a tenth of a block above the floor, and they
// drop onto it
const STAND_UP_LIFT = 0.1;

// Where vanilla stands a player up: the table Java's BedBlock uses, which
// Bedrock matched in every case measured. It walks round the bed starting on
// the head's clockwise side, or on the other side when the player is looking
// that way, and ends on top of the bed itself
function standUpSpot(dimension: Dimension, session: Session, player: Player): Vector3 {
  const { head } = session;
  const step = HEAD_STEP[session.facing];
  const dir = { x: step.x, z: step.z };
  let side = { x: -dir.z, z: dir.x };
  const yaw = ((session.look ?? player.getRotation()).y * Math.PI) / 180;
  if (side.x * -Math.sin(yaw) + side.z * Math.cos(yaw) > 1e-6) side = { x: -side.x, z: -side.z };
  const offsets = [
    [side.x, side.z],
    [side.x - dir.x, side.z - dir.z],
    [side.x - dir.x * 2, side.z - dir.z * 2],
    [-dir.x * 2, -dir.z * 2],
    [-side.x - dir.x * 2, -side.z - dir.z * 2],
    [-side.x - dir.x, -side.z - dir.z],
    [-side.x, -side.z],
    [-side.x + dir.x, -side.z + dir.z],
    [dir.x, dir.z],
    [side.x + dir.x, side.z + dir.z],
  ];
  for (const safe of [true, false]) {
    for (const [dx, dz] of offsets) {
      if (standableAt(dimension, head.x + dx, head.y, head.z + dz, safe)) {
        return { x: head.x + dx + 0.5, y: head.y + STAND_UP_LIFT, z: head.z + dz + 0.5 };
      }
    }
  }
  // Nowhere beside it: stand on the bed, head end first, as vanilla does
  for (const at of [head, session.foot]) {
    const above = blockAt(dimension, { x: at.x, y: at.y + 1, z: at.z });
    const above2 = blockAt(dimension, { x: at.x, y: at.y + 2, z: at.z });
    if (above?.isAir && above2?.isAir) return onBed(at, session);
  }
  return onBed(head, session);
}

function onBed(at: Vector3, session: Session): Vector3 {
  const step = HEAD_STEP[session.facing];
  // On the head block, stand a little towards the foot: never on the
  // sleeping spot itself, because leaving that spot is what ends the pose
  const shift = same(at, session.head) ? -0.32 : 0;
  return {
    x: at.x + 0.5 + step.x * shift,
    y: at.y + SLEEP_HEIGHT,
    z: at.z + 0.5 + step.z * shift,
  };
}

// Undo everything sleep() did. Safe to call on a player the script has
// forgotten about, which is what the reload recovery relies on. A player
// something else has already moved or killed keeps where they are
export function wake(player: Player, standUp: boolean | "inPlace" = true): void {
  const session = sessions.get(player.id) ?? readStoredSession(player);
  sessions.delete(player.id);
  try {
    player.setDynamicProperty(SESSION_PROPERTY, undefined);
  } catch {
    // The player is leaving; nothing to clear
  }
  if (!player.isValid) return;

  lockInput(player, false);
  player.runCommand("camera @s fov_clear");
  player.runCommand("camera @s clear");
  if (!session) return;
  if (session.eyelids) openEyes(session);
  player.onScreenDisplay.setHudVisibility(HudVisibility.Reset, session.hud ?? HIDDEN_HUD);

  const dimension = world.getDimension(session.dimension);
  const head = blockAt(dimension, session.head);
  if (head?.typeId === BED_ID) setOccupied(head, false);
  // Leaving the spot also ends the lying animation. The player looks where
  // they looked before lying down
  const rotation = session.look;
  if (standUp === "inPlace") {
    // Vanilla leaves a player whose bed has gone where they lay, to drop to
    // the floor; the small step off the sleeping spot is what ends the pose
    player.teleport(onBed(session.head, session), { dimension, rotation, keepVelocity: false });
  } else if (standUp) {
    player.teleport(standUpSpot(dimension, session, player), { dimension, rotation, keepVelocity: false });
  } else if (rotation) {
    // Moved by something else: give the look back unless that turned them too
    const now = player.getRotation();
    const turned = (((now.y - FOOTWARD_YAW[session.facing]) % 360) + 540) % 360 - 180;
    if (Math.abs(now.x) < 0.5 && Math.abs(turned) < 0.5) player.setRotation(rotation);
  }
}

function readStoredSession(player: Player): Session | undefined {
  try {
    const raw = player.getDynamicProperty(SESSION_PROPERTY);
    return typeof raw === "string" ? (JSON.parse(raw) as Session) : undefined;
  } catch {
    return undefined;
  }
}

// Jump leaves the bed, as it does in vanilla. Sneaking does not, in vanilla
// either
world.afterEvents.playerButtonInput.subscribe((event) => {
  if (event.newButtonState !== ButtonState.Pressed) return;
  if (event.button !== InputButton.Jump) return;
  if (sessions.has(event.player.id)) wake(event.player);
});

// The night passes when enough players are asleep, counting vanilla sleepers
// as well as this bed's. What it takes, and what the sleeper is told, follow
// vanilla: the playersSleepingPercentage game rule, then morning, clear
// weather and everyone up
function nightCheck(): void {
  if (sessions.size === 0) return;
  const players = world.getAllPlayers().filter((p) => p.getGameMode() !== GameMode.Spectator);
  const asleep = players.filter((p) => p.isSleeping || sessions.has(p.id));
  const percentage = world.gameRules.playersSleepingPercentage;
  const needed = Math.max(1, Math.ceil((players.length * percentage) / 100));

  // What vanilla's sleeping screen says, in its own words. Those keys belong
  // to the game's bedtime screen but resolve in any rawtext
  if (system.currentTick % 20 === 0) {
    const storm = isThundering("minecraft:overworld") ? "Thunderstorm" : "Night";
    const missing = needed - asleep.length;
    for (const id of sessions.keys()) {
      const player = world.getEntity(id);
      if (!(player instanceof Player)) continue;
      let key: string;
      const args: string[] = [];
      if (percentage > 100) {
        key =
          player.playerPermissionLevel === PlayerPermissionLevel.Operator
            ? "hbui.Bedtime.sleepingNotPossibleWorldOwner"
            : "hbui.Bedtime.sleepingNotPossibleNotWorldOwner";
      } else if (missing <= 0) {
        key = `hbui.Bedtime.messageAllPlayersSleeping${storm}`;
      } else if (missing === 1) {
        key = `hbui.Bedtime.messageWaitingForOthersSingular${storm}`;
      } else {
        key = `hbui.Bedtime.messageWaitingForOthersPlural${storm}`;
        args.push(String(missing));
      }
      player.onScreenDisplay.setActionBar({ translate: key, with: args });
    }
  }

  if (percentage > 100 || asleep.length < needed) return;
  for (const p of asleep) {
    const session = sessions.get(p.id);
    if (session && system.currentTick - session.since < NIGHT_SKIP_TICKS) return;
  }
  if (world.gameRules.doDayLightCycle) world.setTimeOfDay(0);
  if (world.gameRules.doWeatherCycle) world.getDimension("overworld").setWeather(WeatherType.Clear);
  // On Peaceful, a night slept through restores full health, as in vanilla
  if (world.getDifficulty() === Difficulty.Peaceful) {
    for (const id of sessions.keys()) {
      const health = world.getEntity(id)?.getComponent("minecraft:health");
      if (health) health.setCurrentValue(health.effectiveMax);
    }
  }
  for (const id of [...sessions.keys()]) {
    const player = world.getEntity(id);
    if (player instanceof Player) wake(player);
  }
}

// Getting hurt wakes a sleeper and stands them up beside the bed, as it does
// in vanilla. Dying just ends the sleep
world.afterEvents.entityHurt.subscribe((event) => {
  const player = event.hurtEntity;
  if (player instanceof Player && sessions.has(player.id)) wake(player);
});

world.afterEvents.entityDie.subscribe((event) => {
  const player = event.deadEntity;
  if (player instanceof Player && sessions.has(player.id)) wake(player, false);
});

// Every tick: keep the screen dark, wake a sleeper whose bed has gone or who
// has been moved off it, free the bed of one who has gone themselves, and see
// whether the night is over
system.runInterval(() => {
  const now = system.currentTick;
  const faded = FADE_START_TICKS + Math.round(FADE_IN_SECONDS * 20);
  for (const [id, session] of [...sessions]) {
    const player = world.getEntity(id);
    const dimension = world.getDimension(session.dimension);
    if (!(player instanceof Player) || !player.isValid) {
      sessions.delete(id);
      const head = blockAt(dimension, session.head);
      if (head?.typeId === BED_ID) setOccupied(head, false);
      continue;
    }
    const head = blockAt(dimension, session.head);
    if (head === undefined) continue; // unloaded; leave it
    if (head.typeId !== BED_ID) {
      wake(player, "inPlace");
      continue;
    }
    // Teleported, pushed or otherwise carried away: wake where they are
    const spot = sleepSpot(session);
    const moved =
      player.dimension.id !== session.dimension ||
      Math.abs(player.location.x - spot.x) > 0.5 ||
      Math.abs(player.location.z - spot.z) > 0.5 ||
      Math.abs(player.location.y - spot.y) > 1;
    if (moved && now - session.since > POSE_DELAY) {
      wake(player, false);
      continue;
    }
    const asleepFor = now - session.since;
    if (asleepFor > POSE_DELAY && (asleepFor - POSE_DELAY) % POSE_RESEND === 0) playPose(player, session);
    if (session.eyelids) continue;
    if (asleepFor === FADE_START_TICKS) fade(player, FADE_IN_SECONDS, FADE_KEEP_HOLD, FADE_KEEP_OUT);
    else if (asleepFor >= faded) fade(player, 0, FADE_KEEP_HOLD, FADE_KEEP_OUT);
  }
  nightCheck();
}, 1);

// A player who was asleep when the script last stopped, through /reload or by
// leaving the world, still has their camera and input switched off. Put them
// right as soon as they are seen again
function recover(player: Player): void {
  if (sessions.has(player.id)) return;
  if (readStoredSession(player)) wake(player);
}

world.afterEvents.worldLoad.subscribe(() => {
  for (const player of world.getAllPlayers()) recover(player);
});

world.afterEvents.playerSpawn.subscribe((event) => {
  recover(event.player);
});
