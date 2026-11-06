// Putting a vine on the face the player clicked.
// The vine has one flag per face, so the permutation the engine is about to
// place is rewritten with the right flag set before the block ever exists.
import { Block, BlockComponentPlayerPlaceBeforeEvent, BlockPermutation, Player, system } from "@minecraft/server";
import { UP_STATE, VINES_ID } from "./config.js";
import { FACE_TO_STATE, SIDE_OFFSETS, Side, canCling, readFlag, readFlags } from "./attachment.js";

// How far the player can reach to click a wall
const REACH = 8;

// Which wall is the player looking at through the vine in this cell?
//
// A vine is replaceable, so clicking one hands this hook the vine's own cell
// with the face "Up", whatever the player was aiming at. And a vine on two
// walls is selected by the whole block, so it stands in front of every other
// wall of its cell. Casting the view ray again, straight through vines, finds
// the wall the player meant, which is what lets one cell take all four walls
function wallInView(player: Player, cell: Block): Side | undefined {
    const hit = player.getBlockFromViewDirection({ excludeTypes: [VINES_ID], maxDistance: REACH });
    if (hit === undefined) {
        return undefined;
    }
    const side = FACE_TO_STATE[hit.face.toLowerCase()];
    if (side === undefined) {
        return undefined;
    }
    // The wall has to border this cell, on the side it was clicked from
    const offset = SIDE_OFFSETS[side];
    const wall = hit.block.location;
    const at = cell.location;
    if (wall.x !== at.x + offset.x || wall.y !== at.y || wall.z !== at.z + offset.z) {
        return undefined;
    }
    return side;
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:vines_place", {
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            const block = event.block;
            const existing = block.typeId === VINES_ID;

            // Into air, the clicked face says which wall the vine holds. Onto a
            // vine, the face means nothing and the view ray decides
            const side = existing
                ? event.player && wallInView(event.player, block)
                : FACE_TO_STATE[event.face.toLowerCase()];

            // The top and the underside of a block give a vine nothing to hold,
            // and neither does a click on a vine that is not aimed at a wall of
            // its own cell, so the placement is refused
            if (side === undefined) {
                event.cancel = true;
                return;
            }

            // The wall itself has to be something a vine can hold on to. The
            // placement filter cannot ask this, because the answer depends on
            // which face was clicked
            if (!canCling(block.offset(SIDE_OFFSETS[side]))) {
                event.cancel = true;
                return;
            }

            // A vine already on that wall stays as it is, and keeps the item
            if (existing && readFlag(block, side)) {
                event.cancel = true;
                return;
            }

            // A vine already in this space keeps every face it has, so each
            // wall of the cell clicked in turn adds one more, up to all four
            event.permutationToPlace = BlockPermutation.resolve(VINES_ID, {
                ...(existing ? readFlags(block) : {}),
                [side]: true,
                [UP_STATE]: canCling(block.above()),
            });
        },
    });
});
