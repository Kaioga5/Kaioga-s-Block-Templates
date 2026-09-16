// One place to configure what this grass block interacts with. Every table
// accepts custom or vanilla identifiers, so a pack with its own dirt or
// plants only edits this file.
// The grass block itself. If you rename the block, rename it here once
export const GRASS_ID = "kai_templates:grass_block";
// What each dirt-type block becomes when THIS grass spreads onto it. Keys
// are dirt blocks, values are the grass they grow into, usually this
// block, but a custom dirt can grow a custom grass of its own
export const spreadTargets = new Map([
    ["minecraft:dirt", GRASS_ID],
]);
export const boneMealPlants = [
    { id: "minecraft:short_grass", weight: 60 },
    { id: "minecraft:tall_grass", weight: 15, tall: true },
    { id: "minecraft:dandelion", weight: 10 },
    { id: "minecraft:poppy", weight: 10 },
    { id: "minecraft:oxeye_daisy", weight: 5 },
];
