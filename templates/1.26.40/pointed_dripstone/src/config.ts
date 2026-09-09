// Everything about how this dripstone grows, drips and hurts.

export const DRIPSTONE_ID = "kai_templates:pointed_dripstone";
export const THICKNESS_STATE = "kai_templates:thickness";

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

// How long a column may get. Every walk in this template is bounded by it, so
// no loop can run away on a strange world
export const MAX_LENGTH = 8;

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
