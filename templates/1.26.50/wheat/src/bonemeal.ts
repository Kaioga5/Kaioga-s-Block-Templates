// Bone meal on the crop.
// One use moves the crop on by two to five stages, the same roll vanilla
// makes, and a ripe crop takes none. The click arrives through the
// interact-with-block before-event, because that is the path a held item
// takes. It is cancelled so the vanilla bone meal handler does not also run,
// and the growth happens a tick later, outside the read-only before-event
// window.
import { Block, EquipmentSlot, GameMode, Player, system, world } from "@minecraft/server";
import {
  BONE_MEAL_ID,
  BONE_MEAL_MAX_STAGES,
  BONE_MEAL_MIN_STAGES,
  MAX_GROWTH,
  WHEAT_ID,
} from "./config.js";
import { advance, growthOf } from "./growth.js";

// The green sparkle vanilla shows when bone meal takes
const GROWTH_PARTICLE = "minecraft:crop_growth_emitter";

// Inclusive random integer
function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Take one bone meal from the stack, unless the player is in creative
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
    return;
  }
  equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
}

function applyBoneMeal(block: Block, player: Player): void {
  advance(block, randomInt(BONE_MEAL_MIN_STAGES, BONE_MEAL_MAX_STAGES));
  block.dimension.spawnParticle(GROWTH_PARTICLE, block.center());
  block.dimension.playSound("item.bone_meal.use", block.center());
  consumeOne(player);
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  if (!event.isFirstEvent) {
    return;
  }
  if (event.block.typeId !== WHEAT_ID) {
    return;
  }
  if (event.itemStack?.typeId !== BONE_MEAL_ID) {
    return;
  }
  // Ripe wheat takes no bone meal, and the click falls through so none is
  // spent on it
  if (growthOf(event.block) >= MAX_GROWTH) {
    return;
  }

  const { block, player } = event;
  event.cancel = true;
  system.run(() => {
    if (block.isValid && block.typeId === WHEAT_ID && growthOf(block) < MAX_GROWTH) {
      applyBoneMeal(block, player);
    }
  });
});
