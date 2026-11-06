// One place to configure what this grass block interacts with. Every table
// accepts custom or vanilla identifiers, so a pack with its own dirt or
// plants only edits this file.

// The grass block itself. If you rename the block, rename it here once
export const GRASS_ID = "kai_templates:grass_block";

// What each dirt-type block becomes when THIS grass spreads onto it. Keys
// are dirt blocks, values are the grass they grow into, usually this
// block, but a custom dirt can grow a custom grass of its own
export const spreadTargets = new Map<string, string>([
  ["minecraft:dirt", GRASS_ID],
]);

// What bone meal can grow on top of this grass. Weights are relative, a
// weight-60 entry appears four times as often as a weight-15 one. Two-block
// plants are marked so the script places both halves
export interface BoneMealPlant {
  // The plant block to place
  id: string;
  // The relative pick weight
  weight: number;
  // True for two-block-tall plants like tall grass
  tall?: boolean;
}

export const boneMealPlants: BoneMealPlant[] = [
  { id: "minecraft:short_grass", weight: 60 },
  { id: "minecraft:tall_grass", weight: 15, tall: true },
  { id: "minecraft:dandelion", weight: 10 },
  { id: "minecraft:poppy", weight: 10 },
  { id: "minecraft:oxeye_daisy", weight: 5 },
];
