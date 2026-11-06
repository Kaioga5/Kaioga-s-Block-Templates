// The three ways a charge gets lit: by hand, by redstone, and by another
// explosion.
import {
  BlockComponentRedstoneUpdateEvent,
  EntityEquippableComponent,
  EquipmentSlot,
  GameMode,
  ItemStack,
  Player,
  system,
  world,
} from "@minecraft/server";

import { IGNITERS, TNT_ID } from "./settings.js";
import { primeBlock } from "./prime.js";

// Take one point of durability off a tool, or one item off a stack
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
    if (durability.damage + 1 >= durability.maxDurability) {
      equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    } else {
      durability.damage += 1;
      equipment.setEquipment(EquipmentSlot.Mainhand, held);
    }
    return;
  }
  if (held.amount > 1) {
    held.amount -= 1;
    equipment.setEquipment(EquipmentSlot.Mainhand, held);
  } else {
    equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
  }
}

// Flint and steel and fire charges are vanilla items, so they cannot carry a
// component of their own. Cancelling the interact-with-block event is also
// what stops the flint and steel setting fire to the block face instead
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { block, player, itemStack: held } = event;
  if (
    block.typeId !== TNT_ID ||
    held === undefined ||
    !IGNITERS.includes(held.typeId)
  ) {
    return;
  }
  const equipment = player.getComponent("minecraft:equippable");
  if (equipment === undefined) {
    return;
  }

  event.cancel = true;
  system.run(() => {
    if (block.typeId !== TNT_ID) {
      return;
    }
    payForIgnition(player, equipment, held);
    primeBlock(block, false);
  });
});

// An explosion that would break a charge lights it instead. The before-event
// hands over the list of blocks the blast is about to destroy and lets it be
// rewritten, so the charges are pulled out of the list and primed, which is
// exactly how a chain reaction works
world.beforeEvents.explosion.subscribe((event) => {
  const impacted = event.getImpactedBlocks();
  const charges = impacted.filter((block) => block.typeId === TNT_ID);
  if (charges.length === 0) {
    return;
  }

  event.setImpactedBlocks(impacted.filter((block) => block.typeId !== TNT_ID));
  system.run(() => {
    for (const charge of charges) {
      if (charge.typeId === TNT_ID) {
        // Chained charges get the entity's short random fuse, which is what
        // spreads a pile out instead of setting it all off on one tick
        primeBlock(charge, true);
      }
    }
  });
});

// Redstone lights a charge the moment a signal arrives
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent("kai_templates:tnt", {
    onRedstoneUpdate(event: BlockComponentRedstoneUpdateEvent): void {
      const { block, powerLevel, previousPowerLevel } = event;
      // Only the rising edge counts, so a charge sitting in a powered
      // circuit is not re-primed on every neighbour update
      if (powerLevel > 0 && previousPowerLevel === 0) {
        primeBlock(block, false);
      }
    },
  });
});
