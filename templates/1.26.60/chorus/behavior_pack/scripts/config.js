// How a chorus plant branches, how far it climbs, and what it will root in.
export const PLANT_ID = "kai_templates:chorus_plant";
export const FLOWER_ID = "kai_templates:chorus_flower";
export const AGE_STATE = "kai_templates:age";
// The flower runs out of growth at this age and turns pale. Vanilla stops at
// five as well
export const MAX_AGE = 5;
// What a chorus plant can root in. Vanilla only accepts end stone; adding a tag
// here lets a custom ground work without editing anything else
export const groundIds = new Set(["minecraft:end_stone"]);
export const groundTags = ["kai_templates:chorus_ground"];
// How far down a straight run of stem the flower looks before deciding whether
// to keep climbing. Vanilla checks four blocks: a run shorter than two always
// climbs, a longer one rolls against its own height, and a run that reaches
// the ground within these four blocks rolls a wider die. That is what makes a
// rooted trunk taller than a branch and why a forest thins out as it rises
export const RUN_CHECK = 4;
