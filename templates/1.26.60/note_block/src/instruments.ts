// Which sound the block under a note block selects.
//
// The game already knows this for every block it ships: each vanilla block
// carries an instrument, and the script API reads it back through the
// block's minecraft:instrument_sound component as the sound id to play
// (note.bassattack for planks, note.bell for gold, note.harp for anything
// without one). So there is no table of vanilla blocks here. The list below
// is only for blocks that should sound different from what the game says,
// which is where a sound from this pack's own sound_definitions.json goes.
import { Block, Direction } from "@minecraft/server";

export interface Instrument {
  // The sound id played for this instrument. Anything the client can
  // resolve works: a vanilla note sound, or one this pack defines
  sound: string;
  // Blocks that select this instrument when one sits under the note block
  blocks: string[];
}

// The instrument used when nothing sits under the note block, which is
// also what the game gives any block without an instrument of its own
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

// Blocks that override what the game would play. Vanilla blocks work with no
// entry here at all; add a row to give a block a sound of this pack's own
export const OVERRIDES: Instrument[] = [
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
const OVERRIDE_BY_BLOCK = new Map<string, string>();
for (const instrument of OVERRIDES) {
  for (const block of instrument.blocks) {
    OVERRIDE_BY_BLOCK.set(block, instrument.sound);
  }
}

// The instrument for whatever is under the note block: an override from the
// list above first, then whatever the game says the block sounds like, read
// off its top face, and the harp when there is no block at all
export function instrumentFor(below: Block | undefined): string {
  if (below === undefined) {
    return DEFAULT_INSTRUMENT;
  }
  const override = OVERRIDE_BY_BLOCK.get(below.typeId);
  if (override !== undefined) {
    return override;
  }
  const instrument = below.getComponent("minecraft:instrument_sound");
  return instrument?.getInstrumentName(Direction.Up) ?? DEFAULT_INSTRUMENT;
}
