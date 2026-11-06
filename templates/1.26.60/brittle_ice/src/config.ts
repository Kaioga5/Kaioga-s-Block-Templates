// Everything about how brittle ice cracks.
// The numbers come from Java Edition 26.4 Snapshot 4, where the block is
// new: read from the game's own BrittleIceBlock code and then timed in game.
// When Mojang changes the block, these are the values to check first.

export const BRITTLE_ICE_ID = "kai_templates:brittle_ice";
export const AGE_STATE = "kai_templates:age";

// The last crack stage. Cracking a block at this stage breaks it
export const MAX_AGE = 3;

// Ticks between two cracks of the same block. Java schedules a tick this far
// ahead every time the block cracks, and nothing can crack it again until
// that tick has run. Timed in Java: a mob, an armor stand or a player
// standing still cracked a block at 0, 24 and 48 ticks and broke it at 72
export const CRACK_DELAY = 24;

// Entity types that never crack the ice. Java's list is the
// does_not_break_brittle_ice entity tag, which holds only the frostbite, a
// mob Bedrock does not have yet. Add your own mobs here
export const exemptTypes = new Set<string>(["minecraft:frostbite"]);

// The sound of each crack before the last. Java plays its own new
// block.brittle_ice.crack sound, which Bedrock does not have, so this borrows
// the closest vanilla Bedrock sound. Point it at your own sound definition to
// change it. The final break uses the block's sound set instead
export const CRACK_SOUND = "block.turtle_egg.crack";

// The chips the block throws off on its first crack, drawn by
// resource_pack/particles/brittle_ice_crack.json. Java shows its block-break
// effect there, but silently and only for that first crack
export const CRACK_PARTICLE = "kai_templates:brittle_ice_crack";

// A mob that arrives on the ice without stepping onto it (summoned or
// spawned on top, teleported there, or already standing on it when the
// script loads) gives no step event. Mobs near each player are checked this
// often, and this far out, to catch those. Spawns are also checked one tick
// after they happen
export const MOB_SWEEP_INTERVAL = 20;
export const MOB_SWEEP_RANGE = 64;

