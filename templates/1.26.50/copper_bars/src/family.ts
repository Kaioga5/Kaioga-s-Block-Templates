// The copper bars family, one entry per oxidation stage. Every stage is its
// own block identifier, and so is every waxed version, oxidation is not a
// block state, mirroring how vanilla flattens the copper family into
// separate blocks. The scripts move between identifiers using this table,
// so adding a stage or renaming a block only touches this file.

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
    id: "kai_templates:copper_bars",
    waxedId: "kai_templates:waxed_copper_bars",
    next: "kai_templates:exposed_copper_bars",
  },
  {
    id: "kai_templates:exposed_copper_bars",
    waxedId: "kai_templates:waxed_exposed_copper_bars",
    next: "kai_templates:weathered_copper_bars",
    previous: "kai_templates:copper_bars",
  },
  {
    id: "kai_templates:weathered_copper_bars",
    waxedId: "kai_templates:waxed_weathered_copper_bars",
    next: "kai_templates:oxidized_copper_bars",
    previous: "kai_templates:exposed_copper_bars",
  },
  {
    id: "kai_templates:oxidized_copper_bars",
    waxedId: "kai_templates:waxed_oxidized_copper_bars",
    previous: "kai_templates:weathered_copper_bars",
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
