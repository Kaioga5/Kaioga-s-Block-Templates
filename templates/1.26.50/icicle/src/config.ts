// Everything about how this icicle hangs, grows, melts, falls and hurts.
// The numbers are measured against the vanilla icicle in Minecraft Preview
// 26.60.29, where it sits behind the "Drop 4 of 2026" experiment. When Mojang
// changes the block, these are the values to check first.

export const ICICLE_ID = "kai_templates:icicle";
export const THICKNESS_STATE = "kai_templates:thickness";

// Vanilla's attached_bit. Placing an icicle by hand against any block that is
// not an icicle sets it; placing one onto another icicle, or growing one,
// leaves it false. Nothing recalculates it afterwards. An attached segment
// draws the plate and side planes and never melts
export const ATTACHED_STATE = "kai_templates:attached";

// The placement trait gives the block this state. "down" means the icicle
// hangs from a ceiling. "up" means it was placed on a floor and points upward
export const FACE_STATE = "minecraft:block_face";

// The entity each segment turns into once it comes loose. Custom blocks have
// no native gravity, so the fall is an entity of our own, one per segment, the
// same way the Pointed Dripstone template does it
export const FALLING_ID = "kai_templates:falling_icicle";

// Which shape the falling segment wears, and whether it carries the plate and
// side planes. The script writes both when the entity is spawned and the
// render controllers read them back
export const THICKNESS_PROPERTY = "kai_templates:thickness";
export const ATTACHED_PROPERTY = "kai_templates:attached";

// How long a segment that has touched down waits before it breaks. Vanilla's
// falling icicles rest three ticks on the ground, the same as falling
// dripstone, and the landing report already takes one of those
export const LANDING_TICKS = 2;

// The sound a segment makes when it comes apart, whether it landed or lost
// its floor. The block uses the glass sound set, and this is its break sound
export const BREAK_SOUND = "random.glass";

// The fragments a segment bursts into, drawn by
// resource_pack/particles/icicle_break.json. A block breaking gets the
// engine's own effect; a segment taken away by a script, or one that was a
// falling entity, does not
export const BREAK_PARTICLE = "kai_templates:icicle_break";

// What a column can be anchored to. Vanilla asks whether the supporting block
// has a solid face on the side the icicle touches. That question has no answer
// in the script API, so `isAnchor` in column.ts settles for the closest
// stand-in the API does offer: a block that stops water from flowing through
// it. These lists are the overrides on either side of that rule. A column also
// anchors to itself, which is how it stacks.

// Always counts as an anchor, whatever the general rule says
export const anchorIds = new Set<string>();
export const anchorTags = ["kai_templates:icicle_support"];

// Never counts as an anchor, even though it does stop water
export const nonAnchorIds = new Set<string>();
export const nonAnchorTags: string[] = [];

// Melting. A segment that is not attached melts on a random tick once the
// block light on it reaches this level. In Preview, tips at every block light
// from 5 to 14 melted within a few ticks, and one at 4 never did. Sky light
// does not count: an icicle at sky light 12 with no block light stayed up. A
// hanging segment falls with everything below it; a standing one breaks where
// it is, with everything above it. The Nether melts them at any light, which
// comes from the Preview changelog rather than a measurement
export const MELT_LIGHT = 5;

// Growth. A stalactite hanging from packed ice grows one segment at a time,
// on a random tick of its top segment, with this chance. Counted in Preview by
// growing vanilla and this template side by side in one dark room over five
// runs: 206 vanilla growths, which puts vanilla's chance at about 0.0145.
// Four-long stalactites grew no faster than one-long ones, so only the top
// segment rolls. Stone, dirt, ice, blue ice and snow above it grew nothing
export const GROW_CHANCE = 0.0145;
export const GROW_SOURCE = "minecraft:packed_ice";

// Growth stops once the stalactite is this many segments long. One that is
// already longer, built by hand, keeps its length
export const GROW_LENGTH = 5;

// The flakes that drift down from a hanging tip now and then. Vanilla uses the
// snow layer's falling dust particle, measured from frame bursts in Preview:
// white, spinning, shrinking, falling slowly. A custom block has no client
// hook for effects like this, so every FLAKE_INTERVAL ticks the script looks
// for tips around each player and gives each one this chance of a flake.
// 0.03 every 10 ticks is about 0.06 flakes a second from each tip, the rate
// vanilla tips showed when five of each were filmed side by side
export const FLAKE_PARTICLE = "minecraft:falling_dust_top_snow_particle";
export const FLAKE_INTERVAL = 10;
export const FLAKE_CHANCE = 0.03;
// How far around each player to look: FLAKE_RANGE blocks sideways and
// FLAKE_HEIGHT blocks up and down. Vanilla tips kept dropping flakes with the
// player 60 blocks away; past 32 a flake is a few pixels across, so the search
// stops there sideways. Up and down it stops at 24 to keep the search small;
// a cave ceiling is rarely that far overhead
export const FLAKE_RANGE = 32;
export const FLAKE_HEIGHT = 24;
// The point of the vanilla tip texture is three pixels above the bottom of
// its cell, and that is where the flakes start
export const FLAKE_HEIGHT_IN_CELL = 3 / 16;

// A falling icicle's tip hurts whatever it lands on: one less than the blocks
// it fell, times the length of the icicle, in one hit. Measured in Preview
// against an iron golem: one segment falling 9 did 8, three falling 7 did 18,
// five falling 5 did 20. This is the most one fall can do
export const FALL_DAMAGE_MAX = 40;

// How fast a falling icicle speeds up. Vanilla's falling blocks gain about 0.04
// blocks per tick each tick; an entity with minecraft:physics gains 0.08, and
// there is no JSON setting for it. The script lifts each falling segment by
// this much every tick. 0.032 rather than 0.04 is the value that made a
// segment take the same 20 ticks as a vanilla one to fall 8 blocks, measured
export const FALL_LIFT = 0.032;

// Falling onto an icicle standing on a floor hurts more than the ground would:
// twice one less than the fall, with no cap. Measured against vanilla pointed
// dripstone, which the vanilla icicle copies
export const IMPACT_MULTIPLIER = 2;
