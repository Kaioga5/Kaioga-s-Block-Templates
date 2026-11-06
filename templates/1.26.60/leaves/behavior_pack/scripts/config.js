// Everything a copy of this template usually needs to change: which blocks hold
// leaves up, how much update work runs per tick, and what falls out when they
// break.
// The leaf block itself
export const LEAVES_ID = "kai_templates:leaves";
// The three states the decay rule uses: how far this leaf is from a log,
// whether a player placed it, and whether its distance still needs measuring
export const DISTANCE_STATE = "kai_templates:distance";
export const PERSISTENT_STATE = "kai_templates:persistent";
export const UPDATE_STATE = "kai_templates:update";
// Leaves survive within this many blocks of a log, measured through connected
// leaves rather than straight through the air. A leaf that reaches this value
// has no log in range and rots
export const MAX_DISTANCE = 7;
// What holds leaves up. Tags come first because they cover whole families at
// once, the unnamespaced vanilla "log" tag is on every vanilla log, stripped
// log and wood block, so one entry supports the whole tree set. Add ids only
// for blocks that carry no useful tag
export const supportTags = ["log"];
export const supportIds = new Set();
// How many queued leaves the update worker recomputes per tick. Each one costs
// about seven block reads and at most one permutation write, so 64 keeps a
// tick under roughly 450 reads no matter how many trees are being felled.
// Raise it to settle big canopies faster, lower it on a crowded server
export const UPDATES_PER_TICK = 64;
// Chance that a random tick rots a leaf that has no log in range. 1 rots it on
// the first random tick, the same as vanilla. Lower it to spread the decay of
// a felled tree out over more time
export const DECAY_CHANCE = 1;
// The falling-leaf effect, defined in
// resource_pack/particles/falling_leaf.json
export const LEAF_PARTICLE = "kai_templates:falling_leaf";
// Chance that a random tick releases a leaf. Random ticks already reach a given
// block roughly once a minute, so this thins an already sparse effect down to
// the occasional drift instead of a steady stream. Set it to 0 to turn the
// particles off without touching any other file
export const LEAF_PARTICLE_CHANCE = 0.25;
// The particle sprite is greyscale, exactly like the leaf texture, so its
// colour has to be handed in. Nothing in the script API reports the biome
// foliage colour that "tint_method": "default_foliage" applies to the block, so
// this is a fixed colour: vanilla's plains foliage green, #77AB2F. Change it to
// suit the leaves the pack ships, evergreen and birch leaves both use their
// own tint, and a leaf that carries no tint at all wants white
export const leafParticleColor = { red: 0.467, green: 0.671, blue: 0.184 };
export const leafDrops = [
    { id: "minecraft:oak_sapling", chances: [0.05, 0.0625, 0.083333, 0.1], min: 1, max: 1 },
    { id: "minecraft:stick", chances: [0.02, 0.022222, 0.025, 0.033333, 0.1], min: 1, max: 2 },
    { id: "minecraft:apple", chances: [0.005, 0.005556, 0.00625, 0.008333, 0.025], min: 1, max: 1 },
];
