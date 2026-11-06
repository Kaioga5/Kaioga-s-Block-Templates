// How long frogspawn takes to hatch and what comes out of it.

export const FROGSPAWN_ID = "kai_templates:frogspawn";

// What hatches, and how many. Vanilla lays between two and five tadpoles
export const HATCHLING_ID = "minecraft:tadpole";
export const HATCH_MIN = 2;
export const HATCH_MAX = 5;

// Vanilla picks a hatch delay in this range when the spawn is laid, which works
// out at three to ten minutes
export const HATCH_DELAY_MIN = 3600;
export const HATCH_DELAY_MAX = 12000;

// Frogspawn that was already in the world when the pack loaded never got a
// timer, so a random tick gives it this chance of hatching instead. At the
// default randomTickSpeed a block is ticked roughly once a minute, which puts
// the average hatch inside the same window the timer uses
export const HATCH_TICK_CHANCE = 0.15;
