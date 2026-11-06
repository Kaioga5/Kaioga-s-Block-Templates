// A stalactite growing under packed ice.
// Measured in Minecraft Preview 26.60.29: an icicle hanging from packed ice
// grows one segment at a time until it is five long, in the dark. It grows the
// way pointed dripstone does: on a random tick of its top segment only, with a
// small chance, adding a tip below the current one. When a stalagmite tip is
// already waiting right under it, the two merge instead. Standing icicles never
// grow, and the Preview changelog says none grow in the Nether.
import { Block, BlockComponentRandomTickEvent, BlockPermutation, system } from "@minecraft/server";
import {
    ATTACHED_STATE,
    FACE_STATE,
    GROW_CHANCE,
    GROW_LENGTH,
    GROW_SOURCE,
    ICICLE_ID,
    THICKNESS_STATE,
} from "./config.js";
import { applyThickness, facing, findTip, isIcicle, neighbour, segmentsFrom, thicknessOf, updateAround } from "./column.js";
import { isMelting } from "./melt.js";

const DOWN = { x: 0, y: -1, z: 0 };
const UP = { x: 0, y: 1, z: 0 };

function grow(top: Block): void {
    // Count the stalactite from the top. One already at full length, or longer
    // because somebody built it that way, does nothing at all: measured in
    // Preview, a five-long stalactite that grew down onto a stalagmite tip
    // stayed a tip beside it and never merged
    if (segmentsFrom(top).length >= GROW_LENGTH) {
        return;
    }
    const tip = findTip(top);
    const below = neighbour(tip, DOWN);
    if (below === undefined) {
        return;
    }
    // Vanilla only grows an icicle into a cell that is dark enough for it to
    // survive there. Measured in Preview: a tip at block light 4 over a cell at
    // light 5 never grew, while tips over cells at light 3 or less grew to
    // full length
    if (isMelting(below)) {
        return;
    }

    // An unmerged stalagmite tip right underneath: the two meet and merge. Like
    // pointed dripstone, a tip that grows into the cell next to a stalagmite
    // stays a tip until the next growth roll merges them
    if (below.typeId === ICICLE_ID) {
        if (facing(below) === "up" && thicknessOf(below) === "tip" && thicknessOf(tip) === "tip") {
            applyThickness(tip, "merge");
            applyThickness(below, "merge");
            updateAround(tip);
            updateAround(below);
        }
        return;
    }

    if (!below.isAir) {
        return;
    }

    // A grown segment is never attached, the same as one placed onto an icicle
    below.setPermutation(
        BlockPermutation.resolve(ICICLE_ID, {
            [FACE_STATE]: "down",
            [THICKNESS_STATE]: "tip",
            [ATTACHED_STATE]: false,
        }),
    );
    updateAround(below);
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:icicle_grow", {
        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const block = event.block;
            if (!isIcicle(block) || facing(block) !== "down") {
                return;
            }
            // Only the top segment of a stalactite hanging from packed ice
            // grows it, so the chance is the same however long it already is
            const above = neighbour(block, UP);
            if (above === undefined || above.typeId !== GROW_SOURCE) {
                return;
            }
            if (block.dimension.id === "minecraft:nether" || Math.random() >= GROW_CHANCE) {
                return;
            }
            grow(block);
        },
    });
});
