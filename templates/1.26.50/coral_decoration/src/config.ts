// The living-to-dead mapping and the rule that decides when coral has drowned
// in air. Adding a colour to this family means adding two blocks and one row.

// Every living decoration and the dead block it becomes. The script only ever
// reads this map, so nothing else has to know the family exists
export const deadForms = new Map<string, string>([
    ["kai_templates:coral", "kai_templates:dead_coral"],
    ["kai_templates:coral_fan", "kai_templates:dead_coral_fan"],
    ["kai_templates:coral_wall_fan", "kai_templates:dead_coral_wall_fan"],
]);

// Every block in this family, so a fan can never be planted on a fan. Vanilla
// wants a full solid face behind a decoration, and no stable script API reports
// one, so the rule is written as the list of things that cannot carry it
export const familyIds = new Set<string>([
    "kai_templates:coral",
    "kai_templates:dead_coral",
    "kai_templates:coral_fan",
    "kai_templates:dead_coral_fan",
    "kai_templates:coral_wall_fan",
    "kai_templates:dead_coral_wall_fan",
]);

export const unsupportiveTags = ["plant", "flower"];

// Coral survives while it is waterlogged or has water against it. Turning this
// off leaves the blocks purely decorative, which is what a build-focused pack
// usually wants
export const DIES_OUT_OF_WATER = true;
