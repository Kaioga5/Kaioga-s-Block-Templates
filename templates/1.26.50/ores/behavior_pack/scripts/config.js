// Everything an ore is, in one place. Change these values and the block
// behaves like a different ore, nothing else in the template needs editing.
// The block this template defines
export const ORE_ID = "kai_templates:ore";
// What a normal (non Silk Touch) break yields
export const DROP_ITEM = "minecraft:diamond";
// How many of DROP_ITEM a break yields before Fortune is applied. Diamond ore
// gives exactly one; redstone ore gives 4-5, so it has a range
export const DROP_MIN = 1;
export const DROP_MAX = 1;
// Which item tags count as a tool that can harvest this ore. A pickaxe below
// this tier still breaks the block, it just drops nothing, the same rule
// vanilla uses. Gold sits at the wooden harvest level, so it is not here
export const HARVEST_TIERS = [
    "minecraft:iron_tier",
    "minecraft:diamond_tier",
    "minecraft:netherite_tier",
];
// The tool family that can harvest at all
export const HARVEST_TOOL_TAG = "minecraft:is_pickaxe";
// Experience a break awards, rolled between the two. Diamond ore is 3-7.
// Set both to 0 for an ore that gives none, the way iron and copper do
export const XP_MIN = 3;
export const XP_MAX = 7;
// How Fortune changes the count:
//   "ore"  - the vanilla ore rule: a multiplier of 1 to level+1, with 1 twice
//            as likely as the rest. Used by diamond, coal, emerald, lapis,
//            redstone and nether quartz ore
//   "none" - Fortune does nothing, the way it does for iron and copper ore
export const FORTUNE_MODE = "ore";
// How far orbs scatter from the middle of the broken cell, in blocks. Vanilla
// spreads them a little so a big drop does not land as one stack of entities
export const XP_SCATTER = 0.25;
