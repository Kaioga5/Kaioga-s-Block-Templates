// Everything this template lets you retune lives here: what mycelium colonises,
// what tools turn it into, and how thick the ambient spore haze is.
// The mycelium block itself. Rename the block and this string follows it
export const MYCELIUM_ID = "kai_templates:mycelium";
// What each soil block becomes when mycelium spreads onto it. Keys are the
// blocks that can be colonised, values are what grows there, normally this
// block, but a second soil type can grow a second mycelium variant
export const spreadTargets = new Map([
    ["minecraft:dirt", MYCELIUM_ID],
    ["minecraft:grass_block", MYCELIUM_ID],
]);
export const toolConversions = new Map([
    ["minecraft:is_shovel", { block: "minecraft:grass_path", sound: "use.grass" }],
    ["minecraft:is_hoe", { block: "minecraft:farmland", sound: "use.gravel" }],
]);
// The spore particle mycelium puffs out. It is this pack's own copy of the
// vanilla look, defined in resource_pack/particles/spore.json, because the
// vanilla mycelium particle is a manual-rate emitter that the renderer drives
// frame by frame and a single spawnParticle call gives it nothing to draw
export const SPORE_PARTICLE = "kai_templates:mycelium_spore";
// How many spores one random tick releases, picked from this range. Vanilla
// draws them every frame from the client, so a random tick has to release a
// small burst to read as the same haze
export const SPORE_MIN = 2;
export const SPORE_MAX = 5;
