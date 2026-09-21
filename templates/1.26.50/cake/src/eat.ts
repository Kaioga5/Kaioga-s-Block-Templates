// Eating a slice.
//
// Cake is the only vanilla block a bare right-click takes a piece out of, so
// the whole behaviour fits in one interact handler: feed the player, move the
// bite counter on, and take the block away when the last slice goes.
import {
  Block,
  BlockComponentPlayerInteractEvent,
  Player,
  system,
} from "@minecraft/server";

import { CAKE_ID, MAX_BITES, biteCount, setBites } from "./cake.js";

// What one slice is worth. Measured against the vanilla block: a click took the
// hunger bar from 6 to 8 and the saturation from 0 to 0.4.
const HUNGER_PER_SLICE = 2;
const SATURATION_PER_SLICE = 0.4;

// Vanilla's eating sound
const EAT_SOUND = "random.eat";

// Put one slice into the player. Returns false when they are too full to eat,
// which is vanilla's rule for refusing the click: a cake clicked with a full
// hunger bar keeps its slice. Creative is not a special case, also measured:
// a creative player whose hunger has been pushed down eats normally
function feed(player: Player): boolean {
  const hunger = player.getComponent("minecraft:player.hunger");
  if (hunger === undefined || hunger.currentValue >= hunger.effectiveMax) {
    return false;
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

// Take one slice out of this cake
function eatSlice(block: Block): void {
  block.dimension.playSound(EAT_SOUND, block.center());
  const bites = biteCount(block) + 1;
  if (bites > MAX_BITES) {
    // The seventh bite finishes the cake. Vanilla leaves nothing behind, not
    // even an item, so the block is simply removed
    block.setType("minecraft:air");
    return;
  }
  setBites(block, bites);
}

system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent("kai_templates:cake_eat", {
    // A right-click on any face eats, whatever is in the hand and whether or
    // not the player is sneaking. Both were measured on the vanilla block: a
    // stack of stone in hand still ate the cake instead of placing a block
    onPlayerInteract(event: BlockComponentPlayerInteractEvent): void {
      const { block, player } = event;
      if (player === undefined || block.typeId !== CAKE_ID) {
        return;
      }
      if (!feed(player)) {
        return;
      }
      eatSlice(block);
    },
  });
});
