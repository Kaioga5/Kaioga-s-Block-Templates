// What a crystal is allowed to grow out of.
// Vanilla asks whether the face behind the bud is a full, sturdy one. No stable
// script API answers that, so the rule is written the other way round: a short
// list of things that cannot hold a crystal up, which starts with the crystals
// themselves. A bud growing out of another bud is the case the in-game test
// found, and it is the one vanilla refuses outright.
import { Block, BlockComponentPlayerPlaceBeforeEvent, system } from "@minecraft/server";
import { FACE_STATE, budStages } from "./config.js";

// The neighbour a bud on this face is holding on to. A bud that reads "north"
// was placed against the north face of its support, so the support is the block
// to the north of it
const SUPPORT_OFFSETS: Record<string, { x: number; y: number; z: number }> = {
    up: { x: 0, y: -1, z: 0 },
    down: { x: 0, y: 1, z: 0 },
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 },
    east: { x: 1, y: 0, z: 0 },
    west: { x: -1, y: 0, z: 0 },
};

// Anything on this list has no face solid enough to carry a crystal. The bud
// stages lead it because they are the case that actually comes up: a geode
// grows them side by side and a player will try to stack them
const unsupportiveIds = new Set<string>([...budStages, "minecraft:barrier", "minecraft:light_block"]);

// Whole families at once, for blocks that carry no useful identifier
const unsupportiveTags = ["plant", "flower"];

export function canGrowOn(support: Block | undefined): boolean {
    // Nothing at all, or something a crystal would fall straight through
    if (support === undefined || support.isAir || support.isLiquid) {
        return false;
    }
    if (unsupportiveIds.has(support.typeId)) {
        return false;
    }
    return !unsupportiveTags.some((tag) => support.hasTag(tag));
}

// The face a bud is about to be placed against, read from the permutation the
// engine has already worked out
export function supportFor(block: Block, face: string): Block | undefined {
    const offset = SUPPORT_OFFSETS[face];
    return offset === undefined ? undefined : block.offset(offset);
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:amethyst_support", {
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            const face = event.permutationToPlace.getAllStates()[FACE_STATE];
            if (typeof face !== "string") {
                return;
            }
            if (!canGrowOn(supportFor(event.block, face))) {
                event.cancel = true;
            }
        },
    });
});
