// Inverts the redstone torch: powered means dark, unpowered means lit.
// A block may carry "minecraft:redstone_producer" or
// "minecraft:redstone_consumer", never both, and a torch has to produce
// power. So there is no onRedstoneUpdate here. Instead the support block's
// power is read on the block's own "minecraft:tick", which only runs for
// loaded chunks, and whose two-tick interval matches the redstone tick a
// vanilla torch switches on.
import {
  Block,
  BlockComponentTickEvent,
  BlockPermutation,
  Vector3,
  system,
} from "@minecraft/server";

// The state that says whether the torch is burning
const LIT_STATE = "kai_templates:lit";

// Vanilla burns a torch out if it changes state more than eight times inside
// sixty ticks, and keeps it dark for eight seconds afterwards
const BURNOUT_CHANGES = 8;
const BURNOUT_WINDOW_TICKS = 60;
const BURNOUT_TICKS = 160;

// Roughly one in twelve ticks throws a speck of dust off a lit torch
const DUST_CHANCE = 1 / 12;

// Which way the support block lies, per placement face. Clicking a face puts
// the new block on the far side of it, so the block holding the torch up is
// always the opposite direction from the face that was clicked
const SUPPORT_OFFSETS: Record<string, Vector3> = {
  up: { x: 0, y: -1, z: 0 },
  down: { x: 0, y: 1, z: 0 },
  north: { x: 0, y: 0, z: 1 },
  south: { x: 0, y: 0, z: -1 },
  east: { x: -1, y: 0, z: 0 },
  west: { x: 1, y: 0, z: 0 },
};

// Where the flame sits, per placement face. A wall torch leans away from its
// wall, so its flame is off centre by about a third of a block
const FLAME_OFFSETS: Record<string, Vector3> = {
  up: { x: 0.5, y: 0.7, z: 0.5 },
  north: { x: 0.5, y: 0.75, z: 0.65 },
  south: { x: 0.5, y: 0.75, z: 0.35 },
  east: { x: 0.35, y: 0.75, z: 0.5 },
  west: { x: 0.65, y: 0.75, z: 0.5 },
};

// Recent state changes per torch, as tick numbers. Entries older than the
// window are dropped every time the list is touched, so it never grows
const recentChanges = new Map<string, number[]>();

// Torches that are burnt out, with the tick they recover on
const burntOut = new Map<string, number>();

// One string key per block cell, usable as a map key
function keyOf(block: Block): string {
  return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}

// Read a custom state. getState is typed for vanilla state names only, so
// custom states go through getAllStates instead
function stateOf(block: Block, name: string): string | number | boolean {
  return block.permutation.getAllStates()[name];
}

// Flip the torch, keeping the placement face it was built with
function setLit(block: Block, lit: boolean): void {
  const states = block.permutation.getAllStates();
  block.setPermutation(
    BlockPermutation.resolve(block.typeId, { ...states, [LIT_STATE]: lit }),
  );
}

// Is anything feeding power into the block this torch is attached to? Vanilla
// judges a torch by its support block, not by the torch's own cell, so that is
// what gets read here. getRedstonePower returns undefined for a block redstone
// has no opinion about, which counts as unpowered
function supportIsPowered(block: Block, face: string): boolean {
  const offset = SUPPORT_OFFSETS[face];
  if (offset === undefined) {
    return false;
  }
  const support = block.offset(offset);
  if (support === undefined) {
    return false;
  }
  return (support.getRedstonePower() ?? 0) > 0;
}

// Record a state change and report whether it just tripped the burnout rule
function tripsBurnout(key: string, tick: number): boolean {
  const changes = (recentChanges.get(key) ?? []).filter(
    (t) => tick - t < BURNOUT_WINDOW_TICKS,
  );
  changes.push(tick);
  recentChanges.set(key, changes);
  return changes.length > BURNOUT_CHANGES;
}

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:redstone_torch_invert",
    {
      // Runs every two ticks while the torch is in a loaded chunk
      onTick(event: BlockComponentTickEvent): void {
        const { block } = event;
        const face = String(stateOf(block, "minecraft:block_face"));
        const lit = stateOf(block, LIT_STATE) === true;

        // Powered means dark. That inversion is the whole point of the block:
        // it is what lets a torch turn a signal into its opposite
        const wanted = !supportIsPowered(block, face);

        if (wanted === lit) {
          // Settled. The dust specks are the only thing left to do, and they
          // are the reason this early exit does not simply return
          if (lit && Math.random() < DUST_CHANCE) {
            const flame = FLAME_OFFSETS[face] ?? FLAME_OFFSETS["up"];
            block.dimension.spawnParticle(
              "minecraft:redstone_torch_dust_particle",
              {
                x: block.x + flame.x,
                y: block.y + flame.y,
                z: block.z + flame.z,
              },
            );
          }
          return;
        }

        const key = keyOf(block);
        // A burnt-out torch ignores its support until it recovers
        if (burntOut.has(key)) {
          return;
        }

        const tick = system.currentTick;
        if (tripsBurnout(key, tick)) {
          // Hold it dark, then let the next tick settle it back to whatever
          // its support says by then. One timer per torch, no scanning
          burntOut.set(key, tick + BURNOUT_TICKS);
          recentChanges.delete(key);
          setLit(block, false);
          system.runTimeout(() => burntOut.delete(key), BURNOUT_TICKS);
          return;
        }

        setLit(block, wanted);
      },
    },
  );
});
