// Everything the hatch turns on, in one place.
export const EGG_ID = "kai_templates:sniffer_egg";
// Vanilla calls this cracked_state, with the values no_cracks, cracked and
// max_cracked. Numbers are easier to step through and to compare in Molang
export const CRACK_STATE = "kai_templates:cracks";
export const MAX_CRACKS = 2;
// Set while the egg's current step is the short one. The block JSON gives the
// two values of this state their own minecraft:tick range
export const MOSS_STATE = "kai_templates:on_moss";
// The ground that halves each step. Pale moss and moss carpet do not count
export const BOOSTING_GROUND = new Set(["minecraft:moss_block"]);
// How long one step takes, in ticks: a third of the 20 minute hatch, give or
// take a tenth. These are the same numbers as the two minecraft:tick ranges in
// the block JSON, so change them together
export const STEP_TICKS = [7200, 8800];
export const STEP_TICKS_ON_MOSS = [3600, 4400];
// What hatches. The spawn event is what makes the sniffer a snifflet
export const HATCHLING_ID = "minecraft:sniffer";
export const HATCHLING_EVENT = "minecraft:entity_born";
// Where the snifflet appears, measured from the egg's lowest corner. Vanilla
// does not centre it: it stands on that corner, a little to the north
export const HATCHLING_OFFSET = { x: 0, y: 0, z: -0.3025 };
// Sounds, both real vanilla sound ids, at the volume and pitch vanilla's own
// crack and hatch events play them
export const SOUND_CRACK = "block.sniffer_egg.crack";
export const SOUND_HATCH = "block.sniffer_egg.hatch";
export const SOUND_OPTIONS = { volume: 0.85, pitch: 0.8 };
// The green sparkles vanilla scatters through the egg's block at every crack,
// on any ground. Most start out hidden inside the shell and drift into view
export const PARTICLE_CRACK = "minecraft:villager_happy";
export const PARTICLE_CRACK_COUNT = 4;
