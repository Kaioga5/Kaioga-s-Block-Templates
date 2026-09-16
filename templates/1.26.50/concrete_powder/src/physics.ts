// Registers the block-side half of concrete powder's behavior: curing when
// water touches it, and handing the block over to a falling entity when its
// support disappears. Custom blocks have no native gravity at 1.26.50, the
// engine's falling-block conversion is hardcoded to vanilla blocks, so the
// fall itself is done by our own entity (see falling.ts).
import {
  Block,
  BlockComponentOnPlaceEvent,
  BlockComponentTickEvent,
  Dimension,
  Direction,
  LiquidType,
  MolangVariableMap,
  Vector3,
  system,
  world,
} from "@minecraft/server";
import {
  concreteConversions,
  DEFAULT_DUST_COLOR,
  DUST_MAX,
  DUST_MIN,
  DUST_PARTICLE,
  dustColors,
  ENTITY_ID,
  PROP_AGE,
  PROP_BLOCK,
  PROP_CURED,
} from "./config.js";

// One Molang map per powder colour, built the first time that colour sheds
// dust. MolangVariableMap is a native class and cannot be constructed during
// early execution, so nothing here is created at load
const dustVariables = new Map<string, MolangVariableMap>();

// Get the Molang variables that tint the dust for this powder
function dustColorFor(blockId: string): MolangVariableMap {
  let variables = dustVariables.get(blockId);
  if (variables === undefined) {
    const color = dustColors.get(blockId) ?? DEFAULT_DUST_COLOR;
    variables = new MolangVariableMap();
    // The vanilla particle reads variable.color.r/g/b/a
    variables.setColorRGBA("variable.color", { ...color, alpha: 1 });
    dustVariables.set(blockId, variables);
  }
  return variables;
}

// Is the space under the block open enough for dust to fall into? Air and
// liquids count, and so does anything that does not stop water, a torch for
// example. A full block stops water and stops the dust. In game a fence counts
// as blocking here, so powder on a fence post sheds nothing
function isOpenBelow(below: Block): boolean {
  if (below.isAir || below.isLiquid) {
    return true;
  }
  return !below.isLiquidBlocking(LiquidType.Water);
}

// Shed a few motes of dust from the underside of the block. Vanilla shows
// these on any falling block that is resting on something it could fall
// through, with each mote at a random spot under the block
function shedDust(block: Block): void {
  const span = DUST_MAX - DUST_MIN + 1;
  const count = DUST_MIN + Math.floor(Math.random() * span);
  const variables = dustColorFor(block.typeId);
  for (let mote = 0; mote < count; mote++) {
    block.dimension.spawnParticle(
      DUST_PARTICLE,
      {
        x: block.x + Math.random(),
        y: block.y - 0.05,
        z: block.z + Math.random(),
      },
      variables,
    );
  }
}

// Check whether any of the six neighbors is a water block. Only water cures
// powder, vanilla ignores lava
function touchesWater(block: Block): boolean {
  const neighbors = [
    block.above(),
    block.below(),
    block.north(),
    block.south(),
    block.east(),
    block.west(),
  ];
  return neighbors.some(
    (n) => n !== undefined && n.isLiquid && n.typeId.includes("water"),
  );
}

// Run the full check for one block: cure on water contact first, then start
// a fall if nothing supports it. Does nothing when the block is not one of
// the configured powders
function checkPowder(block: Block): void {
  // Get the block this powder should turn into
  const curedId = concreteConversions.get(block.typeId);

  // Stop here if this block is not a configured powder
  if (curedId === undefined) {
    return;
  }

  const dimension = block.dimension;

  // Check water first, vanilla hardens powder in place even when it is
  // also unsupported
  if (touchesWater(block)) {
    block.setType(curedId);
    dimension.playSound("dig.sand", block.center());
    return;
  }

  // Return while something supports the block. A block that is not air or
  // liquid holds the powder up, but if it does not stop water, a torch say,
  // the powder sheds dust into the gap under it the way vanilla's falling
  // blocks do
  const below = block.below();
  if (below === undefined) {
    return;
  }
  if (!below.isAir && !below.isLiquid) {
    if (isOpenBelow(below)) {
      shedDust(block);
    }
    return;
  }

  // The block is unsupported. Remember its ids, remove it, and spawn the
  // falling entity in its place. Removing the block BEFORE spawning means
  // there is never a moment where both the block and the entity exist,
  // so nothing can duplicate
  const powderId = block.typeId;
  const { x, y, z } = block.location;
  block.setType("minecraft:air");

  // Spawn the entity centered on the block cell so it falls straight
  // down the column
  const faller = dimension.spawnEntity(ENTITY_ID, {
    x: x + 0.5,
    y: y,
    z: z + 0.5,
  });

  // Store what this entity should turn back into on the entity itself.
  // Dynamic properties survive chunk unloads and world reloads, so the
  // identity is never lost mid-fall
  faller.setDynamicProperty(PROP_BLOCK, powderId);
  faller.setDynamicProperty(PROP_CURED, curedId);
  faller.setDynamicProperty(PROP_AGE, 0);

  // The powder above this one just lost its support, re-check the
  // neighbors next tick so a whole column falls together
  system.run(() => checkAround(dimension, { x, y, z }));
}

// The six neighbor offsets, used to find powder around a changed cell
const NEIGHBOR_OFFSETS: Vector3[] = [
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
  { x: -1, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
];

// Re-check every configured powder around one cell
function checkAround(dimension: Dimension, location: Vector3): void {
  for (const offset of NEIGHBOR_OFFSETS) {
    try {
      const neighbor = dimension.getBlock({
        x: location.x + offset.x,
        y: location.y + offset.y,
        z: location.z + offset.z,
      });
      if (neighbor !== undefined && concreteConversions.has(neighbor.typeId)) {
        checkPowder(neighbor);
      }
    } catch {
      // Neighbor chunk not loaded, the fallback tick covers it
    }
  }
}

// Turn a clicked face into the offset of the cell on that face
function faceOffset(face: Direction): Vector3 {
  switch (face) {
    case Direction.Up:
      return { x: 0, y: 1, z: 0 };
    case Direction.Down:
      return { x: 0, y: -1, z: 0 };
    case Direction.North:
      return { x: 0, y: 0, z: -1 };
    case Direction.South:
      return { x: 0, y: 0, z: 1 };
    case Direction.West:
      return { x: -1, y: 0, z: 0 };
    default:
      return { x: 1, y: 0, z: 0 };
  }
}

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:concrete_powder_physics",
    {
      // Check right away when the powder is placed, so powder set next to
      // water or over a hole reacts immediately instead of waiting for
      // the fallback tick
      onPlace(event: BlockComponentOnPlaceEvent): void {
        checkPowder(event.block);
      },
      // Fallback check every 20 ticks (from minecraft:tick). The event
      // subscriptions below catch the common causes instantly; this
      // catches what they cannot see, like water flowing in from afar
      onTick(event: BlockComponentTickEvent): void {
        checkPowder(event.block);
      },
    },
  );
});

// Breaking a block can remove the support under a powder column, check the
// powder around the broken cell right away
world.afterEvents.playerBreakBlock.subscribe((event) => {
  checkAround(event.dimension, event.block.location);
});

// Emptying a water bucket is the usual way water appears next to powder.
// The bucket fills the clicked block when it can hold liquid, otherwise the
// cell on the clicked face, checking around both covers the two cases.
// The check runs one tick later so the water block exists when it looks
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  if (event.itemStack?.typeId !== "minecraft:water_bucket") {
    return;
  }
  const dimension = event.block.dimension;
  const clicked = event.block.location;
  const offset = faceOffset(event.blockFace);
  system.run(() => {
    checkAround(dimension, clicked);
    checkAround(dimension, {
      x: clicked.x + offset.x,
      y: clicked.y + offset.y,
      z: clicked.z + offset.z,
    });
  });
});
