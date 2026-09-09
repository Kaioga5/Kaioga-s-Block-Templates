// The instrument table: which block under a note block produces which sound.
//
// This is the file to edit. Every entry is one instrument, and an instrument
// is just a sound id plus the blocks that select it, nothing here is tied to
// the vanilla note files, so a sound id from this pack's own
// sound_definitions.json works exactly the same way.
// The instrument used when the block below matches nothing below, which is
// also what an air gap gives you
export const DEFAULT_INSTRUMENT = "note.harp";
// How many notes one block cycles through. Vanilla is 25, two octaves plus
// the top note, and the pitch of note n is 2 ^ ((n - 12) / 12)
export const NOTE_COUNT = 25;
// The particle a note block puffs out when it plays. It is a vanilla effect
// and it reads its colour from a Molang variable, so there is no particle
// asset to ship
export const NOTE_PARTICLE = "minecraft:note_particle";
// How far above the middle of the block the particle appears. Vanilla puts it
// just clear of the top face
export const PARTICLE_HEIGHT = 1.2;
// The note the colour wheel is measured against. Vanilla divides the note by
// 24, so note 0 and note 24 come out the same colour
export const COLOUR_RANGE = 24;
// Vanilla's material-to-instrument mapping, written out. It is deliberately a
// plain list of block ids rather than a tag lookup: tags cannot be read off a
// block from a script, and being explicit means you can see at a glance which
// blocks are covered
export const INSTRUMENTS = [
    {
        sound: "note.bassattack",
        blocks: [
            "minecraft:oak_planks",
            "minecraft:spruce_planks",
            "minecraft:birch_planks",
            "minecraft:jungle_planks",
            "minecraft:acacia_planks",
            "minecraft:dark_oak_planks",
            "minecraft:oak_log",
            "minecraft:spruce_log",
            "minecraft:birch_log",
            "minecraft:jungle_log",
            "minecraft:acacia_log",
            "minecraft:dark_oak_log",
            "minecraft:crafting_table",
            "minecraft:bookshelf",
        ],
    },
    {
        sound: "note.bd",
        blocks: [
            "minecraft:stone",
            "minecraft:cobblestone",
            "minecraft:deepslate",
            "minecraft:blackstone",
            "minecraft:netherrack",
            "minecraft:obsidian",
            "minecraft:stonebrick",
        ],
    },
    {
        sound: "note.snare",
        blocks: [
            "minecraft:sand",
            "minecraft:red_sand",
            "minecraft:gravel",
            "minecraft:concrete_powder",
            "minecraft:soul_soil",
        ],
    },
    {
        sound: "note.hat",
        blocks: [
            "minecraft:glass",
            "minecraft:stained_glass",
            "minecraft:tinted_glass",
            "minecraft:sea_lantern",
            "minecraft:beacon",
        ],
    },
    {
        sound: "note.bell",
        blocks: ["minecraft:gold_block"],
    },
    {
        sound: "note.flute",
        blocks: ["minecraft:clay"],
    },
    {
        sound: "note.chime",
        blocks: ["minecraft:packed_ice"],
    },
    {
        sound: "note.guitar",
        blocks: [
            "minecraft:white_wool",
            "minecraft:black_wool",
            "minecraft:red_wool",
        ],
    },
    {
        sound: "note.xylophone",
        blocks: ["minecraft:bone_block"],
    },
    {
        sound: "note.iron_xylophone",
        blocks: ["minecraft:iron_block"],
    },
    {
        sound: "note.cow_bell",
        blocks: ["minecraft:soul_sand"],
    },
    {
        sound: "note.didgeridoo",
        blocks: ["minecraft:pumpkin", "minecraft:carved_pumpkin"],
    },
    {
        sound: "note.bit",
        blocks: ["minecraft:emerald_block"],
    },
    {
        sound: "note.banjo",
        blocks: ["minecraft:hay_block"],
    },
    {
        sound: "note.pling",
        blocks: ["minecraft:glowstone"],
    },
    {
        // A sound this pack defines itself, in
        // resource_pack/sounds/sound_definitions.json. It is here to show that
        // an instrument does not have to be one of the vanilla note sounds,
        // point the definition at your own audio file and it plays instead
        sound: "kai_templates:note.custom",
        blocks: ["minecraft:amethyst_block"],
    },
];
// One lookup built once at load, so playing a note is a map read rather than a
// walk over every entry
const SOUND_BY_BLOCK = new Map();
for (const instrument of INSTRUMENTS) {
    for (const block of instrument.blocks) {
        SOUND_BY_BLOCK.set(block, instrument.sound);
    }
}
// The instrument for whatever is under the note block
export function instrumentFor(blockId) {
    return ((blockId !== undefined ? SOUND_BY_BLOCK.get(blockId) : undefined) ??
        DEFAULT_INSTRUMENT);
}
