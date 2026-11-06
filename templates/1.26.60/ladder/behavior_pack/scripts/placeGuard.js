// Registers the component that refuses ladder-on-ladder placement.
// minecraft:placement_filter can require a side face, but its block list
// is a whitelist, there is no way to say "any block except the ladder
// itself" in JSON. This hook fills that one gap, and it only runs at the
// moment of placement, never on a tick.
import { Direction, system, } from "@minecraft/server";
// The ladder block this template defines
const LADDER_ID = "kai_templates:ladder";
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:ladder_place_guard", {
        // Runs before the ladder is placed; cancelable
        beforeOnPlayerPlace(event) {
            // The event's face is the face of the clicked block, so the
            // anchor the new ladder hangs on sits opposite that face
            const { block, face } = event;
            let anchor;
            switch (face) {
                case Direction.North:
                    anchor = block.south();
                    break;
                case Direction.South:
                    anchor = block.north();
                    break;
                case Direction.East:
                    anchor = block.west();
                    break;
                case Direction.West:
                    anchor = block.east();
                    break;
                default:
                    // Up and down are already rejected by placement_filter
                    return;
            }
            // A ladder cannot hang from another ladder, its back is not a
            // solid face, matching how vanilla treats thin blocks
            if (anchor !== undefined && anchor.typeId === LADDER_ID) {
                event.cancel = true;
            }
        },
    });
});
