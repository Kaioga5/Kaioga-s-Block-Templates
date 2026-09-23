// The disc registry. This is the only file to edit to add a disc: each row is
// the item that goes in the slot, the sound it plays, the author and title
// shown on the "Now playing" line, how long it runs, and the comparator value.
// The rows below are every music disc the game ships, followed by the one this
// template adds itself, so a disc from another pack only has to fill in the
// same five fields.

export interface Disc {
  // The item that has to be used on the jukebox
  item: string;
  // The sound id played. Anything the client can resolve works: a vanilla
  // record, or one this pack defines in sound_definitions.json
  sound: string;
  // Who made the track, and what it is called. These two are what the
  // "Now playing" line is built from
  author: string;
  title: string;
  // How long the sound runs, in seconds. The jukebox uses this to stop the
  // note particles and forget a track that has finished on its own
  seconds: number;
  // What a comparator reads while this disc is in. Optional: leave it out and
  // the disc takes its position in the list, wrapped into the 1-15 a
  // comparator can express
  signal?: number;
}

// The widest signal a comparator can carry, which is also the largest value
// the block's state holds
export const MAX_SIGNAL = 15;

// Every vanilla disc, in the order their comparator signals run, followed by
// the ones added after the signal range filled up. A disc from another pack is
// one more row of the same shape.
//
// Reorder these and existing jukeboxes in a saved world keep playing the right
// track, the disc's item id is what gets stored, not its position, but their
// comparator signals will move, so append rather than insert.
export const DISCS: Disc[] = [
  {
    item: "minecraft:music_disc_13",
    sound: "record.13",
    author: "C418",
    title: "13",
    seconds: 178,
  },
  {
    item: "minecraft:music_disc_cat",
    sound: "record.cat",
    author: "C418",
    title: "cat",
    seconds: 185,
  },
  {
    item: "minecraft:music_disc_blocks",
    sound: "record.blocks",
    author: "C418",
    title: "blocks",
    seconds: 345,
  },
  {
    item: "minecraft:music_disc_chirp",
    sound: "record.chirp",
    author: "C418",
    title: "chirp",
    seconds: 185,
  },
  {
    item: "minecraft:music_disc_far",
    sound: "record.far",
    author: "C418",
    title: "far",
    seconds: 174,
  },
  {
    item: "minecraft:music_disc_mall",
    sound: "record.mall",
    author: "C418",
    title: "mall",
    seconds: 197,
  },
  {
    item: "minecraft:music_disc_mellohi",
    sound: "record.mellohi",
    author: "C418",
    title: "mellohi",
    seconds: 96,
  },
  {
    item: "minecraft:music_disc_stal",
    sound: "record.stal",
    author: "C418",
    title: "stal",
    seconds: 150,
  },
  {
    item: "minecraft:music_disc_strad",
    sound: "record.strad",
    author: "C418",
    title: "strad",
    seconds: 188,
  },
  {
    item: "minecraft:music_disc_ward",
    sound: "record.ward",
    author: "C418",
    title: "ward",
    seconds: 251,
  },
  {
    item: "minecraft:music_disc_11",
    sound: "record.11",
    author: "C418",
    title: "11",
    seconds: 71,
  },
  {
    item: "minecraft:music_disc_wait",
    sound: "record.wait",
    author: "C418",
    title: "wait",
    seconds: 238,
  },
  {
    item: "minecraft:music_disc_otherside",
    sound: "record.otherside",
    author: "Lena Raine",
    title: "otherside",
    seconds: 195,
  },
  {
    item: "minecraft:music_disc_5",
    sound: "record.5",
    author: "Samuel Åberg",
    title: "5",
    seconds: 178,
  },
  {
    item: "minecraft:music_disc_pigstep",
    sound: "record.pigstep",
    author: "Lena Raine",
    title: "Pigstep",
    seconds: 149,
  },

  // Past this point the comparator range is used up, so these carry an
  // explicit signal and share it with a disc above. Vanilla has the same
  // problem and solves it the same way: a comparator cannot tell every disc
  // apart once there are more than fifteen
  {
    item: "minecraft:music_disc_relic",
    sound: "record.relic",
    author: "Aaron Cherof",
    title: "Relic",
    seconds: 218,
    signal: 14,
  },
  {
    item: "minecraft:music_disc_creator",
    sound: "record.creator",
    author: "Lena Raine",
    title: "Creator",
    seconds: 176,
    signal: 12,
  },
  {
    item: "minecraft:music_disc_creator_music_box",
    sound: "record.creator_music_box",
    author: "Lena Raine",
    title: "Creator (Music Box)",
    seconds: 73,
    signal: 11,
  },
  {
    item: "minecraft:music_disc_precipice",
    sound: "record.precipice",
    author: "Aaron Cherof",
    title: "Precipice",
    seconds: 299,
    signal: 13,
  },
  {
    item: "minecraft:music_disc_tears",
    sound: "record.tears",
    author: "Amos Roddy",
    title: "Tears",
    seconds: 175,
    signal: 10,
  },
  {
    item: "minecraft:music_disc_lava_chicken",
    sound: "record.lava_chicken",
    author: "Hyper Potions",
    title: "Lava Chicken",
    seconds: 134,
    signal: 9,
  },
  {
    item: "minecraft:music_disc_bounce",
    sound: "record.bounce",
    author: "fingerspit",
    title: "Bounce",
    seconds: 105,
    signal: 8,
  },

  // The disc this template adds itself, and the row to copy for another one.
  // Everything it needs sits in four files: the item that carries
  // minecraft:record, the sound event in
  // resource_pack/sounds/sound_definitions.json, the .ogg that event points at,
  // and this row. The sound is namespaced because it is not a vanilla record,
  // seconds is the length of that .ogg to the sample, and the signal is written
  // out because the fifteen a comparator can express are already taken by the
  // rows above.
  //
  // This row is what makes the disc play. A vanilla jukebox will not take a
  // custom record at all, measured at 1.26.50: the same click that loads a
  // vanilla disc into a vanilla jukebox leaves this one in the player's hand,
  // because the block's accepted items are the game's own disc ids and nothing
  // else. So a custom track reaches a jukebox through this template's block,
  // which reads the row below and plays the sound itself.
  {
    item: "kai_templates:music_disc_start",
    sound: "kai_templates:record.start",
    author: "Kaioga",
    title: "Start",
    seconds: 40,
    signal: 15,
  },
];

// One lookup built once at load, so a click is a map read
const BY_ITEM = new Map<string, Disc>(DISCS.map((disc) => [disc.item, disc]));

// The disc for an item, or undefined when the item is not a disc at all
export function discForItem(itemId: string): Disc | undefined {
  return BY_ITEM.get(itemId);
}

// What a comparator reads while this disc is in. A disc without an explicit
// signal takes its position in the list, wrapped so it always lands in 1-15
export function signalFor(disc: Disc): number {
  if (disc.signal !== undefined) {
    return disc.signal;
  }
  const index = DISCS.indexOf(disc);
  return (index % MAX_SIGNAL) + 1;
}

// The line the jukebox puts on screen when a track starts
export function nowPlaying(disc: Disc): string {
  return `§dNow playing: ${disc.author} - ${disc.title}`;
}
