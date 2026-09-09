// The knobs for this cactus: what it grows on, how tall it gets, what counts as
// a blocking neighbour, and how hard it pricks.

// The cactus block itself
export const CACTUS_ID = "kai_templates:cactus";

// How many cacti may stack on one patch of sand. Vanilla stops at three
export const MAX_HEIGHT = 3;

// The name of the growth-counter state, kept in one place because both the
// block JSON and the script have to agree on it
export const AGE_STATE = "kai_templates:age";

// The age state runs 0..15. A random tick raises it by one, and the tick that
// would push it past the top grows a new segment instead
export const MAX_AGE = 15;

// Blocks that may sit beside a cactus without killing it. Air and water are
// always allowed; lava always kills. Everything else is checked against this
// set of identifiers and this list of block tags, so a torch or a tuft of grass
// beside a cactus is harmless while a placed stone block is not
export const passableNeighbourIds = new Set<string>([
    "minecraft:short_grass",
    "minecraft:tall_grass",
    "minecraft:dead_bush",
    "minecraft:torch",
    "minecraft:snow_layer",
]);

export const passableNeighbourTags = ["plant", "flower"];

// Damage a cactus deals to anything touching it, and how often. Vanilla applies
// one point every half second, which is what these two numbers are
export const CONTACT_DAMAGE = 1;
export const CONTACT_INTERVAL = 10;

// Only entities within this many blocks of a player are considered. Cactus
// damage is a thing players watch happen, and bounding the sweep by the player
// list keeps the cost independent of how many cacti the world holds
export const CONTACT_PLAYER_RANGE = 24;

// Entities are treated as a box of this half-width and this height when
// testing whether they overlap a cactus. Most mobs sit between 0.3 and 0.45
// wide and one to two blocks tall; a player is 0.3 by 1.8
export const ENTITY_RADIUS = 0.3;
export const ENTITY_HEIGHT = 1.8;
