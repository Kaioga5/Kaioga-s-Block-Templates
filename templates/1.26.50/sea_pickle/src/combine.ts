// Adds a pickle to a cluster that is already standing.
//
// The same component is registered twice, the way this module's slabs do it:
// as a block component, to catch the normal placement path, and as an item
// component, to catch clicks the engine never turns into a placement. A click
// on any face of a cluster with room adds to it; anything else falls through
// to the block placer and places a new cluster.
import {
  Block,
  BlockComponentPlayerPlaceBeforeEvent,
  Direction,
  EquipmentSlot,
  GameMode,
  ItemComponentUseOnEvent,
  Player,
  system,
} from "@minecraft/server";

import {
  MAX_PICKLES,
  PICKLE_ID,
  isDead,
  pickleCount,
  setPickle,
} from "./pickle.js";

// Vanilla plays the slime place sound when a pickle joins a cluster
const ADD_SOUND = "place.slime";

// Cells where a cluster was placed normally in the last few ticks. The item
// handler checks this so it never adds to a cluster the same click just placed
const justPlaced = new Map<string, number>();

// One string key per block cell, usable as a map key
function keyOf(block: Block): string {
  return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}

// Step from the placement cell back through the clicked face to the block the
// player actually clicked
function clickedThrough(block: Block, face: Direction): Block | undefined {
  switch (face) {
    case Direction.Up:
      return block.below();
    case Direction.Down:
      return block.above();
    case Direction.North:
      return block.south();
    case Direction.South:
      return block.north();
    case Direction.East:
      return block.west();
    case Direction.West:
      return block.east();
  }
}

// True if the block is a cluster of this pickle with room for one more
function hasRoom(block: Block | undefined): block is Block {
  return (
    block !== undefined &&
    block.typeId === PICKLE_ID &&
    pickleCount(block) < MAX_PICKLES
  );
}

// Take one pickle out of the player's hand, except in creative
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

// Put one more pickle on the cluster and pay for it
function addPickle(block: Block, player: Player | undefined): void {
  setPickle(block, pickleCount(block) + 1, isDead(block));
  block.dimension.playSound(ADD_SOUND, block.center());
  if (player !== undefined) {
    consumeOne(player);
  }
}

// The normal placement path: the player clicked a face of an existing cluster
// and the engine wants to put a new cluster in the cell on the far side.
// Cancel that and add to the clicked cluster instead
function beforeOnPlayerPlace(
  event: BlockComponentPlayerPlaceBeforeEvent,
): void {
  const { block, face, player } = event;
  const clicked = clickedThrough(block, face);
  if (hasRoom(clicked)) {
    // Before-events are read-only, cancel now, mutate next tick
    event.cancel = true;
    system.run(() => {
      if (hasRoom(clicked)) {
        addPickle(clicked, player);
      }
    });
    return;
  }

  // A normal placement. Record the cell so the item handler below never
  // adds to the cluster this click just placed
  justPlaced.set(keyOf(block), system.currentTick);
}

// The item path: clicks where the engine never fires a placement, for example
// because the cell on the far side of the clicked face is occupied. The
// clicked block itself is the only candidate here
function onUseOn(event: ItemComponentUseOnEvent): void {
  const { block, source } = event;
  if (!hasRoom(block)) {
    return;
  }
  const cell = keyOf(block);

  // Wait a tick: if this same click just placed that cluster, or the block
  // path already added to it, skip so one click never counts twice
  system.runTimeout(() => {
    if (system.currentTick - (justPlaced.get(cell) ?? -100) <= 5) {
      return;
    }
    if (!hasRoom(block)) {
      return;
    }
    addPickle(block, source instanceof Player ? source : undefined);
  }, 1);
}

// Register the same component name in both registries before world load
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:sea_pickle_combine",
    {
      beforeOnPlayerPlace,
    },
  );
  init.itemComponentRegistry.registerCustomComponent(
    "kai_templates:sea_pickle_combine",
    {
      onUseOn,
    },
  );
});
