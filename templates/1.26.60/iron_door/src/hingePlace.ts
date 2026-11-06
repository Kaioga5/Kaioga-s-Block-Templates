// Registers the component that picks the door's hinge side at placement,
// following vanilla's rules: pair with a door beside you first, otherwise
// hug the more solid side of the doorway. The default is a left hinge.
import {
  Block,
  BlockComponentPlayerPlaceBeforeEvent,
  BlockPermutation,
  system,
} from "@minecraft/server";

const HINGE_STATE = "kai_templates:hinge_right";

// The doors this one can pair with as a double door. If you rename the
// block, rename it here too
const FAMILY_IDS = new Set(["kai_templates:iron_door"]);

// For each facing, the world offset that sits to the door's left when you
// look at the closed door from outside. Right is the same offset negated
const LEFT_OFFSET: Record<string, [number, number]> = {
  north: [-1, 0],
  south: [1, 0],
  west: [0, 1],
  east: [0, -1],
};

// Get a block by offset, or undefined at unloaded/out-of-world positions
function blockAt(
  origin: Block,
  dx: number,
  dy: number,
  dz: number,
): Block | undefined {
  try {
    const { x, y, z } = origin.location;
    return origin.dimension.getBlock({ x: x + dx, y: y + dy, z: z + dz });
  } catch {
    return undefined;
  }
}

// Check whether a block is the lower half of a door we can pair with,
// any member of this family, or a vanilla door
function isLowerDoor(block: Block | undefined): boolean {
  if (block === undefined) {
    return false;
  }
  if (FAMILY_IDS.has(block.typeId)) {
    return block.permutation.getAllStates()["minecraft:multi_block_part"] === 0;
  }
  // Vanilla doors all end in _door and mark their top half with a bit
  if (block.typeId.startsWith("minecraft:") && block.typeId.endsWith("_door")) {
    return block.permutation.getAllStates()["upper_block_bit"] === false;
  }
  return false;
}

// Read a door's hinge side, working for both this family and vanilla doors
function hasRightHinge(block: Block): boolean {
  if (FAMILY_IDS.has(block.typeId)) {
    return block.permutation.getAllStates()[HINGE_STATE] === true;
  }
  return block.permutation.getAllStates()["door_hinge_bit"] === true;
}

// The multi_block trait places the upper half itself, from the permutation
// the placement started with, it does not carry across a hinge chosen here.
// Writing the same hinge onto the upper half a tick later is what keeps the
// two halves showing one door instead of two mirrored ones.
function syncUpperHalf(block: Block, hingeRight: boolean): void {
  system.run(() => {
    const upper = blockAt(block, 0, 1, 0);
    if (upper === undefined || upper.typeId !== block.typeId) {
      return;
    }
    const states = upper.permutation.getAllStates();
    if (
      states["minecraft:multi_block_part"] !== 1 ||
      states[HINGE_STATE] === hingeRight
    ) {
      return;
    }
    upper.setPermutation(
      BlockPermutation.resolve(upper.typeId, {
        ...states,
        [HINGE_STATE]: hingeRight,
      }),
    );
  });
}

// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:iron_door_hinge",
    {
      // Run this code just before the block is placed. This is the one
      // moment a script can change the permutation before it lands
      beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
        // Read the states the placement already decided (facing comes
        // from the placement_direction trait)
        const states = event.permutationToPlace.getAllStates();
        const facing = String(states["minecraft:cardinal_direction"]);

        // Work out which world offsets are left and right for this facing
        const offset = LEFT_OFFSET[facing];
        if (offset === undefined) {
          return;
        }
        const left = blockAt(event.block, offset[0], 0, offset[1]);
        const right = blockAt(event.block, -offset[0], 0, -offset[1]);

        // A left-hinged door on our left means we are the second leaf of
        // a double door, mirror it with a right hinge so the pair
        // opens outward from the middle
        if (isLowerDoor(left) && !hasRightHinge(left!)) {
          event.permutationToPlace = BlockPermutation.resolve(
            event.permutationToPlace.type.id,
            { ...states, [HINGE_STATE]: true },
          );
          syncUpperHalf(event.block, true);
          return;
        }

        // A door on our right pairs with our default left hinge,
        // nothing to change
        if (isLowerDoor(right)) {
          syncUpperHalf(event.block, false);
          return;
        }

        // No door to pair with: hug the more solid side of the doorway,
        // like vanilla. Count the solid blocks beside each side of the
        // door opening
        // The stable API has no full-solid query, so anything that is
        // not air or liquid counts as wall here, close enough for the
        // doorway shapes this rule is about
        const aboveLeft = blockAt(event.block, offset[0], 1, offset[1]);
        const aboveRight = blockAt(event.block, -offset[0], 1, -offset[1]);
        const isWall = (b: Block | undefined): number =>
          b !== undefined && !b.isAir && !b.isLiquid ? 1 : 0;
        const rightSolid = isWall(right) + isWall(aboveRight);
        const leftSolid = isWall(left) + isWall(aboveLeft);

        // More wall on the right side puts the hinge on the right
        const hingeRight = rightSolid > leftSolid;
        if (hingeRight) {
          event.permutationToPlace = BlockPermutation.resolve(
            event.permutationToPlace.type.id,
            { ...states, [HINGE_STATE]: true },
          );
        }
        syncUpperHalf(event.block, hingeRight);
      },
    },
  );
});
