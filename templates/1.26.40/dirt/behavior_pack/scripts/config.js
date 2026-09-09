// One place to configure everything this dirt can turn into. Every map in
// this file accepts custom or vanilla identifiers on both sides, so a pack
// with its own grass, path or farmland blocks only edits these tables.
// What each dirt-type block becomes when grass spreads onto it. The spread
// script looks the ticking block up here, so extra dirt variants are extra
// rows, not extra code
export const grassSpreadTargets = new Map([
    ["kai_templates:dirt", "minecraft:grass_block"],
]);
// The blocks that count as living grass when the spread script looks for a
// source nearby. Add custom grass blocks here so they can spread onto this
// dirt too
export const grassSources = new Set([
    "minecraft:grass_block",
    "kai_templates:grass_block",
]);
// What using a shovel and a hoe turn this dirt into
export const PATH_BLOCK = "minecraft:grass_path";
export const FARMLAND_BLOCK = "minecraft:farmland";
export const boneMealPlants = [
    { id: "minecraft:short_grass", weight: 60 },
    { id: "minecraft:tall_grass", weight: 15, tall: true },
    { id: "minecraft:dandelion", weight: 10 },
    { id: "minecraft:poppy", weight: 10 },
    { id: "minecraft:oxeye_daisy", weight: 5 },
];
