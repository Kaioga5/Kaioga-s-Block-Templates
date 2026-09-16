// Registers the component that picks the pillar axis at placement. The
// custom kai_templates:axis state replaces the engine's placement traits on
// purpose: a custom state can be read, written and carried across block
// conversions by scripts, which the trait-owned states cannot always be
import { BlockPermutation, Direction, system, } from "@minecraft/server";
// The custom state declared in the block JSON
const AXIS_STATE = "kai_templates:axis";
// Turn the clicked face into the axis the block should lie along, clicking
// the ground or a ceiling stands it upright, clicking a wall lays it toward
// that wall, like vanilla logs
function axisFromFace(face) {
    switch (face) {
        case Direction.Up:
        case Direction.Down:
            return "y";
        case Direction.North:
        case Direction.South:
            return "z";
        default:
            return "x";
    }
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:hay_bale_axis", {
        // Run this code just before the block is placed. This is the one
        // moment a script can change the permutation before it lands
        beforeOnPlayerPlace(event) {
            const states = event.permutationToPlace.getAllStates();
            event.permutationToPlace = BlockPermutation.resolve(event.permutationToPlace.type.id, { ...states, [AXIS_STATE]: axisFromFace(event.face) });
        },
    });
});
