// Turning a TNT block into a primed charge.
//
// The charge is a real entity carrying "minecraft:explode", so the fuse, the
// blast, the explosion particle and the sound are all the engine's own. That
// is why there is no timer here: nothing has to be re-armed after a reload,
// and a charge that is still in the air when its fuse runs out explodes
// wherever it happens to be.
import { Block, Dimension, Entity, Vector3 } from "@minecraft/server";

import {
  CHAIN_FUSES,
  FUSE_PROPERTY,
  FUSE_SECONDS,
  FUSE_SOUND,
  LAUNCH_DRIFT,
  LAUNCH_UP,
  PRIMED_ID,
} from "./settings.js";

// Put a primed charge at a block position. `chained` gives the charge one of
// the short fuses another explosion lights, picked at random, instead of the
// full four seconds
export function primeAt(
  dimension: Dimension,
  position: Vector3,
  chained: boolean,
): Entity {
  const charge = dimension.spawnEntity(PRIMED_ID, {
    x: Math.floor(position.x) + 0.5,
    y: Math.floor(position.y),
    z: Math.floor(position.z) + 0.5,
  });

  // Pick the fuse. The entity file holds one component group per fuse
  // length, because the explode component cannot be handed a number from a
  // script; the event named after the chosen fuse swaps that group in
  let seconds = FUSE_SECONDS;
  if (chained) {
    const pick = CHAIN_FUSES[Math.floor(Math.random() * CHAIN_FUSES.length)];
    seconds = pick.seconds;
    charge.triggerEvent(pick.event);
  }

  // Tell the client how long the fuse is. The render controller and the
  // animation count down from this number against the entity's age, which
  // is how the flash quickens and the swell lands exactly on the blast
  charge.setProperty(FUSE_PROPERTY, seconds);

  // Vanilla pops the charge straight up with a small random lean
  charge.applyImpulse({
    x: (Math.random() - 0.5) * LAUNCH_DRIFT,
    y: LAUNCH_UP,
    z: (Math.random() - 0.5) * LAUNCH_DRIFT,
  });
  dimension.playSound(FUSE_SOUND, charge.location);
  return charge;
}

// Replace a TNT block with a primed charge. The block is cleared first, so the
// charge is never spawned inside anything solid
export function primeBlock(block: Block, chained: boolean): void {
  const { dimension, x, y, z } = block;
  block.setType("minecraft:air");
  primeAt(dimension, { x, y, z }, chained);
}
