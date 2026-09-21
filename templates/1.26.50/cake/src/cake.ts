// Shared helpers for the cake block.
//
// The bite counter is kept the way vanilla keeps its own: 0 is a whole cake and
// 6 is the last sliver still standing. There is no seventh value, because the
// bite that would produce it takes the block away instead.
import { Block, BlockPermutation } from "@minecraft/server";

// The block and its one state
export const CAKE_ID = "kai_templates:cake";
export const BITE_STATE = "kai_templates:bite_counter";

// The highest bite counter a cake can stand at
export const MAX_BITES = 6;

// How many slices have already been eaten here, 0 to 6
export function biteCount(block: Block): number {
  const value = block.permutation.getAllStates()[BITE_STATE];
  return typeof value === "number" ? value : 0;
}

// Rewrite the block with a new bite counter
export function setBites(block: Block, bites: number): void {
  block.setPermutation(
    BlockPermutation.resolve(CAKE_ID, { [BITE_STATE]: bites }),
  );
}
