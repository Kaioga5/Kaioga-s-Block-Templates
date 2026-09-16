// Growing on random ticks.
// Vanilla scores the farmland around a crop and turns the score into a chance:
// watered farmland under it is worth 4, dry 2, and each of the eight blocks
// around that farmland adds 0.75 when it is watered farmland and 0.25 when it
// is dry. Crowding halves the score. The chance a random tick advances the
// crop is then 1 / (floor(25 / score) + 1), so a lone crop on dry dirt grows
// about one tick in thirteen and a well-watered row about one in three.
import {
  Block,
  BlockComponentRandomTickEvent,
  BlockPermutation,
  system,
} from "@minecraft/server";
import {
  FARMLAND_ID,
  GROWTH_STATE,
  MAX_GROWTH,
  MIN_LIGHT,
  MOISTURE_STATE,
  POINTS_DRY,
  POINTS_DRY_NEIGHBOUR,
  POINTS_WET,
  POINTS_WET_NEIGHBOUR,
  WHEAT_ID,
} from "./config.js";

// Read the growth stage, 0 for a fresh seed
export function growthOf(block: Block): number {
  const value = block.permutation.getAllStates()[GROWTH_STATE];
  return typeof value === "number" ? value : 0;
}

// Move the crop on by so many stages, never past ripe. Exported because bone
// meal takes the same step, just a bigger one
export function advance(block: Block, stages: number): void {
  const next = Math.min(MAX_GROWTH, growthOf(block) + stages);
  const states = block.permutation.getAllStates();
  block.setPermutation(
    BlockPermutation.resolve(WHEAT_ID, { ...states, [GROWTH_STATE]: next }),
  );
}

// Is this farmland, and is it watered? Farmland keeps its water level in a
// vanilla state, anything above zero counts
function farmlandPoints(block: Block | undefined, wet: number, dry: number): number {
  if (block === undefined || block.typeId !== FARMLAND_ID) {
    return 0;
  }
  const moisture = block.permutation.getState(MOISTURE_STATE);
  return typeof moisture === "number" && moisture > 0 ? wet : dry;
}

// Is the block beside this crop the same crop?
function sameCrop(block: Block | undefined): boolean {
  return block !== undefined && block.typeId === WHEAT_ID;
}

// Vanilla's growth score for this crop
function growthScore(block: Block): number {
  const soil = block.below();
  let score = farmlandPoints(soil, POINTS_WET, POINTS_DRY);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) {
        continue;
      }
      score += farmlandPoints(
        soil?.offset({ x: dx, y: 0, z: dz }),
        POINTS_WET_NEIGHBOUR,
        POINTS_DRY_NEIGHBOUR,
      );
    }
  }

  // Crowding: the same crop on a diagonal, or on both axes at once, halves
  // the score. Rows with a gap between them keep the full score, which is
  // why farms are planted in stripes
  const diagonal =
    sameCrop(block.offset({ x: 1, y: 0, z: 1 })) ||
    sameCrop(block.offset({ x: 1, y: 0, z: -1 })) ||
    sameCrop(block.offset({ x: -1, y: 0, z: 1 })) ||
    sameCrop(block.offset({ x: -1, y: 0, z: -1 }));
  const eastWest = sameCrop(block.east()) || sameCrop(block.west());
  const northSouth = sameCrop(block.north()) || sameCrop(block.south());
  if (diagonal || (eastWest && northSouth)) {
    score /= 2;
  }
  return score;
}

system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent("kai_templates:wheat_growth", {
    onRandomTick(event: BlockComponentRandomTickEvent): void {
      const { block } = event;
      if (growthOf(block) >= MAX_GROWTH) {
        return;
      }
      // Light is read at the crop itself, not above it
      if (block.getLightLevel() < MIN_LIGHT) {
        return;
      }
      const score = growthScore(block);
      if (score <= 0) {
        return;
      }
      const chance = 1 / (Math.floor(25 / score) + 1);
      if (Math.random() < chance) {
        advance(block, 1);
      }
    },
  });
});
