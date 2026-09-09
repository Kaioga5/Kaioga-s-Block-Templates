// What a lily pad floats on, and what runs it down.
export const LILY_PAD_ID = "kai_templates:lily_pad";
// Anything in here destroys a pad it moves into. Vanilla breaks a pad when a
// boat hits it, which is the whole reason a lake of pads is worth clearing.
// Bedrock ships one entity per boat kind, not one per wood type, so these two
// identifiers cover every vanilla boat
export const crushingEntities = new Set([
    "minecraft:boat",
    "minecraft:chest_boat",
]);
// Set false for pads that survive being run over, which is what a build-focused
// pack usually wants
export const BOATS_BREAK_PADS = true;
