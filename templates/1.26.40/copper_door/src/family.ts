// The copper door family, one entry per oxidation stage. Every stage is its
// own block identifier, and so is every waxed version, oxidation is not a
// block state, mirroring how vanilla flattens the copper family into
// separate blocks. The scripts move between identifiers using this table,
// so adding a stage or renaming a block only touches this file.
import { Block, BlockPermutation } from "@minecraft/server";

// What one stage knows: its block, its waxed twin, and its neighbors on
// the weathering line
export interface CopperStage {
  // The unwaxed block for this stage
  id: string;
  // The waxed block for this stage
  waxedId: string;
  // The next (more oxidized) stage, absent on the final stage
  next?: string;
  // The previous (less oxidized) stage, absent on the first stage
  previous?: string;
}

// The four stages in weathering order
export const STAGES: CopperStage[] = [
  {
    id: "kai_templates:copper_door",
    waxedId: "kai_templates:waxed_copper_door",
    next: "kai_templates:exposed_copper_door",
  },
  {
    id: "kai_templates:exposed_copper_door",
    waxedId: "kai_templates:waxed_exposed_copper_door",
    next: "kai_templates:weathered_copper_door",
    previous: "kai_templates:copper_door",
  },
  {
    id: "kai_templates:weathered_copper_door",
    waxedId: "kai_templates:waxed_weathered_copper_door",
    next: "kai_templates:oxidized_copper_door",
    previous: "kai_templates:exposed_copper_door",
  },
  {
    id: "kai_templates:oxidized_copper_door",
    waxedId: "kai_templates:waxed_oxidized_copper_door",
    previous: "kai_templates:weathered_copper_door",
  },
];

// Look up a stage from its unwaxed block id
export const STAGE_BY_ID = new Map<string, CopperStage>(
  STAGES.map((s) => [s.id, s]),
);

// Look up a stage from its waxed block id
export const STAGE_BY_WAXED_ID = new Map<string, CopperStage>(
  STAGES.map((s) => [s.waxedId, s]),
);

// Every block id in the family, waxed and unwaxed
export const FAMILY_IDS = new Set<string>([
  ...STAGES.map((s) => s.id),
  ...STAGES.map((s) => s.waxedId),
]);

// Swap every part of a door to another family member. Each half keeps its
// own states (open, hinge, facing, upper/lower), so the door does not move
// or flip while it changes look. Both halves are written in one pass so the
// multi_block trait never sees a half-converted pair across a tick
export function swapDoorType(block: Block, newId: string): void {
  const parts = block.getParts() ?? [block];

  // Read every half before writing any of them. Replacing one half makes
  // the engine re-check the pair, so a state read taken after that point
  // can come back already altered, which is how a converting door ended
  // up with mismatched halves
  const snapshot = parts.map((part) => ({
    part,
    states: part.permutation.getAllStates(),
  }));

  for (const { part, states } of snapshot) {
    part.setPermutation(BlockPermutation.resolve(newId, states));
  }
}
