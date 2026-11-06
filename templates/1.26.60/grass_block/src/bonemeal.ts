// Lets bone meal grow the configured plants on and around this grass, like
// vanilla bone meal on a grass block. Uses the interact-with-block
// before-event, the precise item-use path, not a block interact component.
import {
  Block,
  BlockPermutation,
  EquipmentSlot,
  GameMode,
  Player,
  system,
  world,
} from "@minecraft/server";
import { GRASS_ID, boneMealPlants } from "./config.js";

// How many grow attempts one bone meal makes, and how far they land.
// Vanilla seeds a whole patch, not a single plant
const ATTEMPTS = 12;
const RADIUS = 3;

// Remove one bone meal from the player's main hand, unless they are in
// creative
function consumeOne(player: Player): void {
  if (player.getGameMode() === GameMode.Creative) {
    return;
  }
  const equipment = player.getComponent("minecraft:equippable");
  const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
  if (equipment === undefined || held === undefined) {
    return;
  }
  if (held.amount > 1) {
    held.amount -= 1;
    equipment.setEquipment(EquipmentSlot.Mainhand, held);
  } else {
    equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
  }
}

// Pick one plant from the weighted table
function pickPlant() {
  const total = boneMealPlants.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  for (const plant of boneMealPlants) {
    roll -= plant.weight;
    if (roll < 0) {
      return plant;
    }
  }
  return boneMealPlants[0];
}

// Try to grow one plant on top of one grass block
function growAt(ground: Block): boolean {
  // Plants only appear on this grass with free air above
  if (ground.typeId !== GRASS_ID) {
    return false;
  }
  const above = ground.above();
  if (above === undefined || !above.isAir) {
    return false;
  }
  const plant = pickPlant();
  if (plant === undefined) {
    return false;
  }

  if (plant.tall === true) {
    // A two-block plant needs the cell above the plant free too
    const top = above.above();
    if (top === undefined || !top.isAir) {
      return false;
    }
    // Place both halves; the upper half carries the vanilla upper bit
    above.setType(plant.id);
    top.setPermutation(
      BlockPermutation.resolve(plant.id, { upper_block_bit: true }),
    );
  } else {
    above.setType(plant.id);
  }
  return true;
}

// Seed a patch around the clicked block
function growPatch(block: Block, player: Player): void {
  const { x, y, z } = block.location;
  let grown = growAt(block) ? 1 : 0;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const dx = Math.floor(Math.random() * (RADIUS * 2 + 1)) - RADIUS;
    const dy = Math.floor(Math.random() * 3) - 1;
    const dz = Math.floor(Math.random() * (RADIUS * 2 + 1)) - RADIUS;
    try {
      const ground = block.dimension.getBlock({
        x: x + dx,
        y: y + dy,
        z: z + dz,
      });
      if (ground !== undefined && growAt(ground)) {
        grown++;
      }
    } catch {
      // Unloaded position, skip this attempt
    }
  }

  // Even a fruitless click plays the effects and costs the bone meal,
  // like vanilla
  block.dimension.playSound("item.bone_meal.use", block.center());
  block.dimension.spawnParticle(
    "minecraft:crop_growth_emitter",
    block.above()?.center() ?? block.center(),
  );
  consumeOne(player);
}

// Watch every block interaction and claim bone meal use on the grass
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  // The engine can fire this more than once per click, act on the
  // first one only
  if (!event.isFirstEvent) {
    return;
  }

  // Only this template's grass reacts
  const block = event.block;
  if (block.typeId !== GRASS_ID) {
    return;
  }

  // Only bone meal triggers the growth
  if (event.itemStack?.typeId !== "minecraft:bone_meal") {
    return;
  }

  // Cancel the click and do the world writes after the read-only
  // before-event window
  const player = event.player;
  event.cancel = true;
  system.run(() => {
    if (block.typeId === GRASS_ID) {
      growPatch(block, player);
    }
  });
});
