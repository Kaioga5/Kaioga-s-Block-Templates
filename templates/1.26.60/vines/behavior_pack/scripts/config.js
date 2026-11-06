// The vine's growth rate, what it will cling to, and how it feels to climb.
export const VINES_ID = "kai_templates:vines";
// One boolean state per horizontal face the vine can cling to, plus one for a
// ceiling overhead. The geometry switches a bone on for each one through
// bone_visibility
export const SIDE_STATES = ["kai_templates:north", "kai_templates:south", "kai_templates:east", "kai_templates:west"];
export const UP_STATE = "kai_templates:up";
// Chance that one random tick tries to grow. Vanilla rolls one in four
export const GROWTH_CHANCE = 0.25;
// Vanilla stops a vine spreading up or sideways once this many vines, itself
// included, stand in the box around it. Growing down is never limited, which
// is why a wall ends up with a patch at the top and curtains below it
export const SPREAD_LIMIT = 5;
export const SPREAD_RADIUS = 4;
export const SPREAD_HEIGHT = 1;
// What counts as a wall. There is no "full solid face" query in the stable
// script API, so the rule leans on the liquid one: a block that cannot hold
// water and is not washed away by it is a solid block. That matches the vanilla
// vine on every block measured except the ones listed here
export const clingingIds = new Set([
    // Waterloggable, but full blocks all the same
    "minecraft:piston",
    "minecraft:sticky_piston",
    "minecraft:barrier",
]);
// Leaves can hold water too, and vanilla vines hang off every kind of them
export const clingingTags = ["minecraft:leaves"];
// Blocks that pass the liquid test but that a vanilla vine still lets go of
export const nonClingingIds = new Set([
    // Its sides sit a pixel in from the edge of the block
    "minecraft:honey_block",
]);
// Climbing, measured on the vanilla vine tick by tick: climbing moves exactly
// 0.2 blocks a tick from the first tick of input, sneaking holds the player
// exactly still, and a player who lets go falls under ordinary gravity until
// the vine caps the slide at 0.2 blocks a tick. Those are the ladder's numbers
// to the last digit.
//
// The knockback that produces each one is not the number itself, and it was
// measured the same way. The climb is 0.2 again. Holding still and capping
// the slide each came out a thousandth stronger than on the ladder: at these
// two values the player stays within a few thousandths of a block a tick of
// the vanilla speed, and the hold does not drift over time
export const SLIDE_SPEED = 0.2;
export const CLIMB_KNOCKBACK = 0.2;
export const HOLD_KNOCKBACK = 0.034;
export const SLIDE_KNOCKBACK = -0.051;
