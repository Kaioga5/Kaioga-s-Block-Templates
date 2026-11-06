// The stem on random ticks: growing, fruiting, and straightening up again.
// Vanilla scores the farmland around a stem the same way it does for wheat:
// watered farmland under it is worth 4, dry 2, each of the eight blocks
// around that farmland adds 0.75 when watered and 0.25 when dry, crowding
// halves the score, and the chance a tick does anything is
// 1 / (floor(25 / score) + 1). Below ripe, a winning tick grows the stem one
// stage. At ripe, it picks one of the four sides and grows a fruit there if
// the space is empty and stands on soil. A stem with a fruit does nothing
// until the fruit is gone, then straightens up and can fruit again.
import {
  Block,
  BlockComponentRandomTickEvent,
  BlockPermutation,
  system,
} from "@minecraft/server";
import {
  ATTACHED_STATE,
  FARMLAND_ID,
  GROWTH_STATE,
  MAX_GROWTH,
  MELON_ID,
  MIN_LIGHT,
  MOISTURE_STATE,
  POINTS_DRY,
  POINTS_DRY_NEIGHBOUR,
  POINTS_WET,
  POINTS_WET_NEIGHBOUR,
  STEM_ID,
  fruitSoilIds,
} from "./config.js";

// The four sides a fruit can grow on, and how to reach each one
const SIDES: { name: string; step: (block: Block) => Block | undefined }[] = [
  { name: "north", step: (block) => block.north() },
  { name: "south", step: (block) => block.south() },
  { name: "east", step: (block) => block.east() },
  { name: "west", step: (block) => block.west() },
];

// Read the growth stage, 0 for a fresh seed
export function growthOf(block: Block): number {
  const value = block.permutation.getAllStates()[GROWTH_STATE];
  return typeof value === "number" ? value : 0;
}

// Which side the fruit is on, or "none"
export function attachedOf(block: Block): string {
  const value = block.permutation.getAllStates()[ATTACHED_STATE];
  return typeof value === "string" ? value : "none";
}

// Write both states back at once
function setStem(block: Block, growth: number, attached: string): void {
  const states = block.permutation.getAllStates();
  block.setPermutation(
    BlockPermutation.resolve(STEM_ID, {
      ...states,
      [GROWTH_STATE]: growth,
      [ATTACHED_STATE]: attached,
    }),
  );
}

// Move the stem on by so many stages, never past ripe. Exported because bone
// meal takes the same step, just a bigger one
export function advance(block: Block, stages: number): void {
  setStem(block, Math.min(MAX_GROWTH, growthOf(block) + stages), attachedOf(block));
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

function sameCrop(block: Block | undefined): boolean {
  return block !== undefined && block.typeId === STEM_ID;
}

// Vanilla's growth score for this stem
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
  // the score
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

// Does this tick do anything at all?
function ticks(block: Block): boolean {
  if (block.getLightLevel() < MIN_LIGHT) {
    return false;
  }
  const score = growthScore(block);
  if (score <= 0) {
    return false;
  }
  return Math.random() < 1 / (Math.floor(25 / score) + 1);
}

// Try to grow a fruit on one random side of a ripe stem
function tryFruit(block: Block): void {
  const side = SIDES[Math.floor(Math.random() * SIDES.length)];
  const target = side.step(block);
  if (target === undefined || !target.isAir) {
    return;
  }
  const ground = target.below();
  if (ground === undefined || !fruitSoilIds.has(ground.typeId)) {
    return;
  }
  target.setType(MELON_ID);
  setStem(block, MAX_GROWTH, side.name);
}

// The fruit this stem is bent towards, if it is still there
function fruitOf(block: Block): Block | undefined {
  const side = SIDES.find((candidate) => candidate.name === attachedOf(block));
  const fruit = side?.step(block);
  return fruit !== undefined && fruit.typeId === MELON_ID ? fruit : undefined;
}

// Straighten a bent stem whose fruit has gone. Exported so the fruit can call
// it the moment it is broken, rather than waiting for the next tick
export function straighten(block: Block): void {
  if (attachedOf(block) !== "none") {
    setStem(block, MAX_GROWTH, "none");
  }
}

system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent("kai_templates:melon_stem_growth", {
    onRandomTick(event: BlockComponentRandomTickEvent): void {
      const { block } = event;

      // A bent stem only checks that its fruit is still there. There is no
      // neighbour-changed hook for custom blocks, so a fruit taken by a
      // piston or an explosion is noticed here
      if (attachedOf(block) !== "none") {
        if (fruitOf(block) === undefined) {
          straighten(block);
        }
        return;
      }

      if (!ticks(block)) {
        return;
      }
      if (growthOf(block) < MAX_GROWTH) {
        advance(block, 1);
        return;
      }
      tryFruit(block);
    },
  });
});
