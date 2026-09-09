// Lighting and putting out a candle.
//
// Flint and steel, fire charges and water bottles are vanilla items, and a
// pack cannot add a component to a vanilla item without overriding it for
// every other pack in the world. So this listens to the interact-with-block
// before-event, which still tells us exactly what was held and can be
// cancelled, it is the precise path, not a catch-all interact handler.
import {
  Block,
  EntityEquippableComponent,
  EquipmentSlot,
  GameMode,
  ItemStack,
  Player,
  system,
  world,
} from "@minecraft/server";

import { CANDLE_ID, candleCount, isLit, setCandle } from "./candle.js";

// The items that light a candle, and the ones that put it out
const IGNITERS = ["minecraft:flint_and_steel", "minecraft:fire_charge"];
const EXTINGUISHERS = ["minecraft:water_bucket", "minecraft:potion"];

// Vanilla sounds for each action
const LIGHT_SOUND = "fire.ignite";
const EXTINGUISH_SOUND = "extinguish.candle";

// Take one point of durability off flint and steel, or one item off a stack
function payForIgnition(
  player: Player,
  equipment: EntityEquippableComponent,
  held: ItemStack,
): void {
  if (player.getGameMode() === GameMode.Creative) {
    return;
  }
  const durability = held.getComponent("minecraft:durability");
  if (durability !== undefined) {
    // Break the tool if that was its last point
    if (durability.damage + 1 >= durability.maxDurability) {
      equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    } else {
      durability.damage += 1;
      equipment.setEquipment(EquipmentSlot.Mainhand, held);
    }
    return;
  }
  // A fire charge is consumed instead
  if (held.amount > 1) {
    held.amount -= 1;
    equipment.setEquipment(EquipmentSlot.Mainhand, held);
  } else {
    equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
  }
}

// Flip the cluster's lit flag, keeping the candle count it already has
function setFlame(block: Block, lit: boolean, sound: string): void {
  setCandle(block, candleCount(block), lit);
  block.dimension.playSound(sound, block.center());
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { block, player, itemStack: held } = event;

  // Anything that is not this candle falls straight through
  if (block.typeId !== CANDLE_ID) {
    return;
  }

  const lit = isLit(block);

  // An empty hand snuffs a burning candle, which is how vanilla does it
  if (held === undefined) {
    if (lit) {
      event.cancel = true;
      system.run(() => {
        if (block.typeId === CANDLE_ID && isLit(block)) {
          setFlame(block, false, EXTINGUISH_SOUND);
        }
      });
    }
    return;
  }

  const equipment = player.getComponent("minecraft:equippable");
  if (equipment === undefined) {
    return;
  }

  // Water puts a candle out without breaking it
  if (lit && EXTINGUISHERS.includes(held.typeId)) {
    event.cancel = true;
    system.run(() => {
      if (block.typeId === CANDLE_ID && isLit(block)) {
        setFlame(block, false, EXTINGUISH_SOUND);
      }
    });
    return;
  }

  // Flint and steel or a fire charge lights an unlit candle
  if (!lit && IGNITERS.includes(held.typeId)) {
    event.cancel = true;
    system.run(() => {
      if (block.typeId === CANDLE_ID && !isLit(block)) {
        setFlame(block, true, LIGHT_SOUND);
        payForIgnition(player, equipment, held);
      }
    });
  }
});
