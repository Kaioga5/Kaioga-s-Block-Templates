// The living-to-dead mapping for the solid coral blocks. Adding a colour means
// two more block files and one more row here.
// Each living coral block and the dead block it becomes
export const deadForms = new Map([
    ["kai_templates:coral_block", "kai_templates:dead_coral_block"],
]);
// Living coral blocks die out of water. Turn this off for purely decorative
// coral that survives anywhere
export const DIES_OUT_OF_WATER = true;
