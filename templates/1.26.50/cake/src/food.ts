// What a slice of cake is worth, and how it reaches the player.
//
// Both cake blocks feed the same way, so the numbers and the refusal rule live
// here rather than being written twice.
import { EquipmentSlot, GameMode, Player } from "@minecraft/server";

// Measured against the vanilla block: a click took the hunger bar from 6 to 8
// and the saturation from 0 to 0.4.
const HUNGER_PER_SLICE = 2;
const SATURATION_PER_SLICE = 0.4;

// Vanilla's eating sound
export const EAT_SOUND = "random.eat";

// Put one slice into the player, and say whether the bite happens at all.
//
// Two rules, both measured against the vanilla block. A survival player with a
// full hunger bar is refused the click outright and the cake keeps its slice.
// A creative player is never refused: a full bar still takes a slice, and a
// creative player whose bar has been pushed down is fed by it like anyone else.
export function feed(player: Player): boolean {
  const creative = player.getGameMode() === GameMode.Creative;
  const hunger = player.getComponent("minecraft:player.hunger");
  if (hunger === undefined || hunger.currentValue >= hunger.effectiveMax) {
    return creative;
  }
  const fed = Math.min(hunger.effectiveMax, hunger.currentValue + HUNGER_PER_SLICE);
  hunger.setCurrentValue(fed);

  // Saturation rides behind the hunger bar and never overtakes it
  const saturation = player.getComponent("minecraft:player.saturation");
  if (saturation !== undefined) {
    saturation.setCurrentValue(
      Math.min(fed, saturation.currentValue + SATURATION_PER_SLICE),
    );
  }
  return true;
}

// What the player is holding, or undefined for an empty hand. The interact
// component does not carry the item, so it is read off the player
export function heldItemId(player: Player): string | undefined {
  return player
    .getComponent("minecraft:equippable")
    ?.getEquipment(EquipmentSlot.Mainhand)?.typeId;
}
