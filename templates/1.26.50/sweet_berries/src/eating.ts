// Eating the berries.
// Like vanilla's, they can only be eaten while the hunger bar has room. The
// food component says so too (can_always_eat is off), and this check stops
// the use before it starts when the bar is full. Aiming at soil is left
// alone, so a full player can still plant the berries.
import { Direction, Player, world } from "@minecraft/server";
import { BERRIES_ID, SOIL_IDS } from "./config.js";

// How far the player could be planting from
const REACH = 6;

function isFull(player: Player): boolean {
  const hunger = player.getComponent("minecraft:player.hunger");
  return hunger !== undefined && hunger.currentValue >= hunger.effectiveMax;
}

function aimingAtSoil(player: Player): boolean {
  const hit = player.getBlockFromViewDirection({ maxDistance: REACH });
  return hit !== undefined && hit.face === Direction.Up && SOIL_IDS.has(hit.block.typeId);
}

world.beforeEvents.itemUse.subscribe((event) => {
  if (event.itemStack.typeId !== BERRIES_ID) {
    return;
  }
  if (isFull(event.source) && !aimingAtSoil(event.source)) {
    event.cancel = true;
  }
});
