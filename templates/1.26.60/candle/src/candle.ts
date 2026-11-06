// Shared helpers for the candle cluster. The count is kept the way Bedrock
// keeps its own: a zero-based state where 0 means one candle. Everything that
// needs a real count converts here rather than doing the arithmetic inline,
// because that off-by-one is the easiest mistake in this block.
import { Block, BlockPermutation } from "@minecraft/server";

// The block and its two states
export const CANDLE_ID = "kai_templates:candle";
export const COUNT_STATE = "kai_templates:candles";
export const LIT_STATE = "kai_templates:lit";

// The most candles one block holds
export const MAX_CANDLES = 4;

// How many candles are standing here, 1 to 4
export function candleCount(block: Block): number {
  const value = block.permutation.getAllStates()[COUNT_STATE];
  return (typeof value === "number" ? value : 0) + 1;
}

// Whether the cluster is burning
export function isLit(block: Block): boolean {
  return block.permutation.getAllStates()[LIT_STATE] === true;
}

// Rewrite the block with a new count and lit flag. withState is typed for
// vanilla state names, so the permutation is rebuilt from the full state map
export function setCandle(block: Block, count: number, lit: boolean): void {
  const states = block.permutation.getAllStates();
  block.setPermutation(
    BlockPermutation.resolve(CANDLE_ID, {
      ...states,
      [COUNT_STATE]: count - 1,
      [LIT_STATE]: lit,
    }),
  );
}
