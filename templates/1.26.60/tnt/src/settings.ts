// The parts of the charge that live on the script side.
//
// The fuse, the blast and the explosion particle are not here: they are the
// "minecraft:explode" component on the primed entity, which is the engine's
// own TNT behaviour. Editing the blast means editing
// behavior_pack/entities/primed_tnt.json.

// The block and the entity it turns into
export const TNT_ID = "kai_templates:tnt";
export const PRIMED_ID = "kai_templates:primed_tnt";

// How long a charge lit by hand or by redstone burns, in seconds. This is the
// fuse_length in the entity's base explode component, repeated here so the
// client can be told about it; keep the two in step. The fuse property only
// accepts 0 to 10 seconds, so a longer fuse means raising that range in
// behavior_pack/entities/primed_tnt.json first, or setProperty throws
export const FUSE_SECONDS = 4;

// The entity property the client reads the fuse length from. The render
// controller and the animation count down from it against the entity's age
export const FUSE_PROPERTY = "kai_templates:fuse";

// The shorter fuses a charge gets when another explosion lights it, which is
// what spreads a chain reaction out instead of setting a pile off on one
// tick. Vanilla draws from half a second to two seconds; each length here is
// a component group in the entity file, swapped in by the named event, because
// the explode component cannot be handed a number from a script
export const CHAIN_FUSES = [
  { seconds: 0.5, event: "kai_templates:chain_lit_short" },
  { seconds: 1.0, event: "kai_templates:chain_lit_medium" },
  { seconds: 1.5, event: "kai_templates:chain_lit_long" },
  { seconds: 2.0, event: "kai_templates:chain_lit_longest" },
];

// The upward kick a charge gets when it is primed, and the sideways drift.
// Vanilla pops the charge straight up with a small random lean, which is what
// stops a stack of them landing on top of each other
export const LAUNCH_UP = 0.2;
export const LAUNCH_DRIFT = 0.02;

// What lights a charge by hand
export const IGNITERS = ["minecraft:flint_and_steel", "minecraft:fire_charge"];

// Vanilla's fuse sound
export const FUSE_SOUND = "random.fuse";
