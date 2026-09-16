// Everything about how this dripstone grows, drips, falls and hurts.

export const DRIPSTONE_ID = "kai_templates:pointed_dripstone";
export const THICKNESS_STATE = "kai_templates:thickness";

// The entity each spike of a hanging column turns into once nothing holds
// the column up. Custom blocks have no native gravity at 1.26.50 and the
// engine's falling-block conversion is hardcoded to vanilla blocks, so the
// fall is an entity of our own, the same way the Concrete Powder template does
// it, and the same way vanilla does: one falling block per spike
export const FALLING_ID = "kai_templates:falling_dripstone";

// Which shape the falling spike wears. One entity is one spike, the way
// vanilla's falling blocks are, and it keeps the shape its block had: the
// script writes it when the entity is spawned and the render controllers read
// it back. It takes the same four values as the block's own thickness state
export const THICKNESS_PROPERTY = "kai_templates:thickness";

// How long a spike that has touched down waits before it breaks. Vanilla's
// falling blocks sit on the ground for three ticks before they go, measured in
// game, and the landing report already takes one of those to reach the script
export const LANDING_TICKS = 2;

// The sound a spike makes when it comes apart, whether that is a column losing
// its support or a fallen one hitting the ground. Vanilla names it after the
// block's own sound group, the same way hit.pointed_dripstone in impact.ts is
export const BREAK_SOUND = "break.pointed_dripstone";

// The fragments a spike bursts into as it comes apart. A block breaking gets
// the engine's own effect; a spike leaving as a falling entity, or one taken
// away by a script, does not, so the pack draws the burst itself from
// resource_pack/particles/dripstone_break.json
export const BREAK_PARTICLE = "kai_templates:dripstone_break";

// The placement trait gives the block this state. "up" means the spike was
// placed on top of something and points upward, which is a stalagmite. "down"
// means it hangs from a ceiling, which is a stalactite
export const FACE_STATE = "minecraft:block_face";

// What a column can be anchored to. Vanilla asks whether the supporting block
// has a solid face on the side the spike touches, so a spike hangs from stone,
// from a ceiling of planks, from a slab that is the right way up, from
// anything with a face to grip. That question has no answer in the script API,
// so `isAnchor` in column.ts settles for the closest stand-in the API does
// offer: a block that stops water from flowing through it. These two lists are
// the overrides on either side of that rule. A column also anchors to itself,
// which is how it stacks.

// Always counts as an anchor, whatever the general rule says
export const anchorIds = new Set<string>();
export const anchorTags = ["kai_templates:dripstone_support"];

// Never counts as an anchor, even though it does stop water
export const nonAnchorIds = new Set<string>();
export const nonAnchorTags: string[] = [];

// How long a drip may make a column. Vanilla stops feeding one once it has
// this many spikes, which is what keeps a spring from growing dripstone all
// the way to the floor of the world. It is the only length this pack decides:
// a column stacked by hand, or two grown columns that meet, run as long as
// there is room for them
export const GROW_LENGTH = 8;

// Chance that a random tick on a dripping tip does anything at all. Vanilla
// dripstone grows over many minutes, and this is the knob that sets that pace
export const DRIP_CHANCE = 0.15;

// Given a drip, the chance it lengthens the column rather than only falling
export const GROW_CHANCE = 0.2;

// How far below a stalactite tip the drip looks for a cauldron or a floor
export const DRIP_RANGE = 10;

// The liquid above a column's anchor decides what drips out of it. Each entry
// gives the particle to draw and the cauldron liquid to fill with
export interface DripSource {
    // The particle the drip draws
    particle: string;
    // The value to write into the cauldron's liquid state
    cauldronLiquid: string;
    // Whether this liquid also lengthens the dripstone. Only water does
    grows: boolean;
}

export const dripSources = new Map<string, DripSource>([
    [
        "minecraft:water",
        { particle: "minecraft:stalactite_water_drip_particle", cauldronLiquid: "water", grows: true },
    ],
    [
        "minecraft:flowing_water",
        { particle: "minecraft:stalactite_water_drip_particle", cauldronLiquid: "water", grows: true },
    ],
    [
        "minecraft:lava",
        { particle: "minecraft:stalactite_lava_drip_particle", cauldronLiquid: "lava", grows: false },
    ],
    [
        "minecraft:flowing_lava",
        { particle: "minecraft:stalactite_lava_drip_particle", cauldronLiquid: "lava", grows: false },
    ],
]);

// The cauldron a drip can fill, and how full it goes
export const CAULDRON_ID = "minecraft:cauldron";
export const CAULDRON_LIQUID_STATE = "cauldron_liquid";
export const CAULDRON_FILL_STATE = "fill_level";
export const CAULDRON_FULL = 6;

// Falling onto a stalagmite hurts more than the ground would. Vanilla doubles
// the fall damage and caps it
export const IMPACT_MULTIPLIER = 2;
export const IMPACT_MAX = 40;
