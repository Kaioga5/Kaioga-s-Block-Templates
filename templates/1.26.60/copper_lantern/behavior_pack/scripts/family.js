// The copper lantern family, one entry per oxidation stage. Every stage is
// its own block identifier, and so is every waxed version, the copper family
// is flattened into separate blocks rather than folded into an oxidation
// state, which is how vanilla does it too. The scripts move between
// identifiers using this table, so adding a stage only touches this file.
import { BlockPermutation } from "@minecraft/server";
// The four stages in weathering order
export const STAGES = [
    {
        id: "kai_templates:copper_lantern",
        waxedId: "kai_templates:waxed_copper_lantern",
        next: "kai_templates:exposed_copper_lantern",
    },
    {
        id: "kai_templates:exposed_copper_lantern",
        waxedId: "kai_templates:waxed_exposed_copper_lantern",
        next: "kai_templates:weathered_copper_lantern",
        previous: "kai_templates:copper_lantern",
    },
    {
        id: "kai_templates:weathered_copper_lantern",
        waxedId: "kai_templates:waxed_weathered_copper_lantern",
        next: "kai_templates:oxidized_copper_lantern",
        previous: "kai_templates:exposed_copper_lantern",
    },
    {
        id: "kai_templates:oxidized_copper_lantern",
        waxedId: "kai_templates:waxed_oxidized_copper_lantern",
        previous: "kai_templates:weathered_copper_lantern",
    },
];
// Look up a stage from its unwaxed block id
export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));
// Look up a stage from its waxed block id
export const STAGE_BY_WAXED_ID = new Map(STAGES.map((s) => [s.waxedId, s]));
// Swap a lantern to another family member. Every state comes across, so a
// hanging lantern stays hanging while its look changes, that is the whole
// reason this is one call and not a rebuild from scratch
export function swapLanternType(block, newId) {
    block.setPermutation(BlockPermutation.resolve(newId, block.permutation.getAllStates()));
}
