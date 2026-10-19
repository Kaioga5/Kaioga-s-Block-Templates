// Everything about the bush that a pack normally wants to change: the block,
// the berries, how it grows, what picking it gives, and how it treats the
// entities that walk through it.

// The bush, its growth state and the berries that plant it
export const BUSH_ID = "kai_templates:sweet_berry_bush";
export const GROWTH_STATE = "kai_templates:growth";
export const BERRIES_ID = "kai_templates:sweet_berries";

// The blocks the berries plant on. Keep this in step with use_on in
// items/sweet_berries.json: aiming at one of these, a full player still plants
export const SOIL_IDS = new Set<string>([
  "minecraft:grass_block",
  "minecraft:dirt",
  "minecraft:coarse_dirt",
  "minecraft:dirt_with_roots",
  "minecraft:farmland",
  "minecraft:podzol",
  "minecraft:mycelium",
  "minecraft:moss_block",
  "minecraft:mud",
  "minecraft:muddy_mangrove_roots",
]);

// The full bush. Stages run 0 to 3 like vanilla
export const MAX_GROWTH = 3;

// The chance a random tick moves the bush on one stage. Vanilla Bedrock grows
// in any light and under any block, so nothing else is checked
export const GROWTH_CHANCE = 0.2;

// Picking a bush with berries on it. The stage it drops back to, and the
// berry count for each stage that has any, smallest and largest
export const PICKED_GROWTH = 1;
export const PICK_COUNTS: Record<number, [number, number]> = {
  2: [1, 2],
  3: [2, 3],
};

// The item that counts as bone meal
export const BONE_MEAL_ID = "minecraft:bone_meal";

// Bone meal on a bush with no berries yet brings it straight to this stage,
// the first one with berries; on a bush that has some it adds one stage
export const BONE_MEAL_BERRY_GROWTH = 2;

// Moving through the bush. Vanilla resets an entity's speed every tick it is
// inside and lets it cover only part of what it would have moved, so a player
// walks at about a third of the open-ground speed and drifts down slowly when
// it jumps
export const HORIZONTAL_FACTOR = 0.8;
export const VERTICAL_FACTOR = 0.75;

// A player's walking speed comes from the client, so the script lowers the
// movement attribute instead. This is the share of the normal value that gives
// vanilla's 0.078 blocks a tick walking and 0.102 sprinting
export const PLAYER_SPEED_FACTOR = 0.36;

// The vertical knockback a player in the air gets every tick inside a bush.
// The client adds gravity and drag on top, so 0.01 comes out as vanilla's
// sink of about 0.058 blocks a tick
export const PLAYER_SINK_KNOCKBACK = 0.01;

// Damage for walking through a bush with any berries stage past the sprout,
// one prick every PRICK_TICKS ticks at most, vanilla's half-second rhythm
export const CONTACT_DAMAGE = 1;
export const PRICK_TICKS = 10;
export const DAMAGING_FROM_GROWTH = 1;

// An entity has to move at least this far sideways in a tick to be pricked.
// Standing still or jumping in place inside a bush does not hurt
export const MOVING_THRESHOLD = 0.003;

// Entities the bush leaves alone entirely. Vanilla never slows these
export const UNSLOWED_TYPES = new Set<string>([
  "minecraft:item",
  "minecraft:xp_orb",
  "minecraft:minecart",
  "minecraft:chest_minecart",
  "minecraft:hopper_minecart",
  "minecraft:tnt_minecart",
  "minecraft:command_block_minecart",
  "minecraft:boat",
  "minecraft:chest_boat",
]);

// Entities that are slowed but never pricked. Vanilla foxes and bees carry
// a damage sensor for the vanilla bush, which a custom bush does not trip
export const UNHURT_TYPES = new Set<string>(["minecraft:fox", "minecraft:bee"]);

// Only entities within this many blocks of a player are checked
export const PLAYER_RANGE = 32;
