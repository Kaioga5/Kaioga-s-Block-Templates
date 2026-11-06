// The copper stairs family, one entry per oxidation stage. Every stage is its
// own block identifier, and so is every waxed version, oxidation is not a
// block state, mirroring how vanilla flattens the copper family into
// separate blocks. The scripts move between identifiers using this table,
// so adding a stage or renaming a block only touches this file.
import { BlockPermutation } from "@minecraft/server";
// The four stages in weathering order
export const STAGES = [
    {
        id: "kai_templates:copper_stairs",
        waxedId: "kai_templates:waxed_copper_stairs",
        next: "kai_templates:exposed_copper_stairs",
    },
    {
        id: "kai_templates:exposed_copper_stairs",
        waxedId: "kai_templates:waxed_exposed_copper_stairs",
        next: "kai_templates:weathered_copper_stairs",
        previous: "kai_templates:copper_stairs",
    },
    {
        id: "kai_templates:weathered_copper_stairs",
        waxedId: "kai_templates:waxed_weathered_copper_stairs",
        next: "kai_templates:oxidized_copper_stairs",
        previous: "kai_templates:exposed_copper_stairs",
    },
    {
        id: "kai_templates:oxidized_copper_stairs",
        waxedId: "kai_templates:waxed_oxidized_copper_stairs",
        previous: "kai_templates:weathered_copper_stairs",
    },
];
// Look up a stage from its unwaxed block id
export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));
// Look up a stage from its waxed block id
export const STAGE_BY_WAXED_ID = new Map(STAGES.map((s) => [s.waxedId, s]));
// Every block id in the family, waxed and unwaxed
export const FAMILY_IDS = new Set([
    ...STAGES.map((s) => s.id),
    ...STAGES.map((s) => s.waxedId),
]);
// Swap a stair block to another family member. It keeps every state it has,
// facing, corner shape and vertical half included, so a top inner corner
// stays a top inner corner while its look changes
export function swapStairsType(block, newId) {
    block.setPermutation(BlockPermutation.resolve(newId, block.permutation.getAllStates()));
}
