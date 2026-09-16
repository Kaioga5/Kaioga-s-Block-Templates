// Note cycling, note playing and the note particle.
//
// The note is stored across two block states rather than one. A custom state
// may declare at most 16 values and a note block needs 25, so the note is
// split into an octave (0-2) and a step within it (0-11), and every read and
// write goes through noteOf and setNote below.
import {
  Block,
  BlockComponentPlayerInteractEvent,
  BlockComponentRedstoneUpdateEvent,
  BlockPermutation,
  MolangVariableMap,
  RGB,
  system,
} from "@minecraft/server";

import {
  COLOUR_RANGE,
  NOTE_COUNT,
  NOTE_PARTICLE,
  PARTICLE_HEIGHT,
  instrumentFor,
} from "./instruments.js";

// The block and the two states that together hold one note
const NOTE_BLOCK_ID = "kai_templates:note_block";
const OCTAVE_STATE = "kai_templates:note_octave";
const STEP_STATE = "kai_templates:note_step";

// Steps in an octave, which is the base the two states are packed in
const STEPS_PER_OCTAVE = 12;

// Read the note back out of the two states, 0 to 24
function noteOf(block: Block): number {
  const states = block.permutation.getAllStates();
  const octave = states[OCTAVE_STATE];
  const step = states[STEP_STATE];
  const value =
    (typeof octave === "number" ? octave : 0) * STEPS_PER_OCTAVE +
    (typeof step === "number" ? step : 0);
  // A combination above the top note can only come from a hand-edited world,
  // so it is folded back into range rather than trusted
  return value % NOTE_COUNT;
}

// Write a note back into the two states
function setNote(block: Block, note: number): void {
  const states = block.permutation.getAllStates();
  block.setPermutation(
    BlockPermutation.resolve(NOTE_BLOCK_ID, {
      ...states,
      [OCTAVE_STATE]: Math.floor(note / STEPS_PER_OCTAVE),
      [STEP_STATE]: note % STEPS_PER_OCTAVE,
    }),
  );
}

// Vanilla's pitch curve: note 12 is the middle of the range and plays the
// sound at its own pitch, and every step is one semitone from there
function pitchFor(note: number): number {
  return Math.pow(2, (note - 12) / 12);
}

// Vanilla's note colour: the note's position in the range run through three
// sine waves a third of a turn apart, which is what makes the particle walk a
// rainbow as the note climbs
function colourFor(note: number): RGB {
  const position = note / COLOUR_RANGE;
  const wave = (offset: number) =>
    Math.max(0, Math.sin((position + offset) * Math.PI * 2) * 0.65 + 0.35);
  return { red: wave(0), green: wave(1 / 3), blue: wave(2 / 3) };
}

// Puff out the coloured note. The particle is a vanilla effect that reads its
// tint from variable.note_color, so the colour is passed in rather than baked
// into a particle asset of its own
function spawnNoteParticle(block: Block, note: number): void {
  const variables = new MolangVariableMap();
  variables.setColorRGB("note_color", colourFor(note));
  block.dimension.spawnParticle(
    NOTE_PARTICLE,
    {
      x: block.x + 0.5,
      y: block.y + PARTICLE_HEIGHT,
      z: block.z + 0.5,
    },
    variables,
  );
}

// Play the note this block is set to, using the instrument the block below
// selects. Vanilla stays silent when something is sitting on top of the note
// block, and that check is kept, the particle is skipped too, because it
// would have nowhere to rise
function playNote(block: Block): void {
  if (block.above()?.isAir !== true) {
    return;
  }
  const note = noteOf(block);
  const sound = instrumentFor(block.below());
  block.dimension.playSound(sound, block.center(), { pitch: pitchFor(note) });
  spawnNoteParticle(block, note);
}

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:note_block_play",
    {
      // A click steps the note on and plays it. This is the one place where a
      // plain block interaction is the right hook rather than an item-specific
      // one: vanilla tunes a note block with whatever is in your hand, so
      // filtering on the item would be wrong
      onPlayerInteract(event: BlockComponentPlayerInteractEvent): void {
        const { block } = event;
        const next = (noteOf(block) + 1) % NOTE_COUNT;
        setNote(block, next);
        playNote(block);
      },

      // Redstone plays the note without changing it. Only the rising edge
      // counts, so a block that stays powered plays once rather than
      // retriggering on every update
      onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
        const { block, powerLevel, previousPowerLevel } = event;
        if (powerLevel > 0 && previousPowerLevel === 0) {
          playNote(block);
        }
      },
    },
  );
});
