// The stem: which way it reaches, and whether it is still attached.
// A chorus plant draws one arm per neighbour it touches, which makes its six
// booleans the same kind of thing a fence's connection states are, except a
// chorus plant connects up and down as well, so the built-in connection trait
// cannot supply them.
import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentRandomTickEvent,
    BlockPermutation,
    system,
} from "@minecraft/server";
import { FLOWER_ID, PLANT_ID, groundIds, groundTags } from "./config.js";

export const SIDES: Array<{ state: string; offset: { x: number; y: number; z: number } }> = [
    { state: "kai_templates:up", offset: { x: 0, y: 1, z: 0 } },
    { state: "kai_templates:down", offset: { x: 0, y: -1, z: 0 } },
    { state: "kai_templates:north", offset: { x: 0, y: 0, z: -1 } },
    { state: "kai_templates:south", offset: { x: 0, y: 0, z: 1 } },
    { state: "kai_templates:east", offset: { x: 1, y: 0, z: 0 } },
    { state: "kai_templates:west", offset: { x: -1, y: 0, z: 0 } },
];

export function isChorus(block: Block | undefined): block is Block {
    return block !== undefined && (block.typeId === PLANT_ID || block.typeId === FLOWER_ID);
}

export function isGround(block: Block | undefined): boolean {
    if (block === undefined) {
        return false;
    }
    return groundIds.has(block.typeId) || groundTags.some((tag) => block.hasTag(tag));
}

// Vanilla's survival rule, and it is entirely local: a stem stands if what is
// under it is ground or more chorus, or if a horizontal neighbour is chorus
// that is itself standing on something. That second clause is what holds a
// branch out over empty air
export function isRooted(block: Block): boolean {
    const below = block.below();
    if (isGround(below) || isChorus(below)) {
        return true;
    }
    for (const side of SIDES) {
        if (side.offset.y !== 0) {
            continue;
        }
        const neighbour = block.offset(side.offset);
        if (!isChorus(neighbour)) {
            continue;
        }
        const under = neighbour.below();
        if (isGround(under) || isChorus(under)) {
            return true;
        }
    }
    return false;
}

// Point an arm at every neighbour that is chorus, plus the ground below
function armsFor(block: Block): Record<string, boolean> {
    const arms: Record<string, boolean> = {};
    for (const side of SIDES) {
        const neighbour = block.offset(side.offset);
        arms[side.state] =
            isChorus(neighbour) || (side.offset.y === -1 && isGround(neighbour));
    }
    return arms;
}

export function reshape(block: Block): void {
    if (block.typeId !== PLANT_ID) {
        return;
    }
    const arms = armsFor(block);
    const states = block.permutation.getAllStates();
    if (SIDES.every((side) => states[side.state] === arms[side.state])) {
        return;
    }
    block.setPermutation(BlockPermutation.resolve(PLANT_ID, { ...states, ...arms }));
}

function uproot(block: Block): void {
    const drop = block.getItemStack(1, true);
    const { dimension } = block;
    const centre = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, centre);
    }
    dimension.playSound("dig.stone", centre);
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:chorus_plant_shape", {
        onPlace(event: BlockComponentOnPlaceEvent): void {
            reshape(event.block);
            // The neighbours gained an arm too
            for (const side of SIDES) {
                const neighbour = event.block.offset(side.offset);
                if (neighbour !== undefined && neighbour.typeId === PLANT_ID) {
                    reshape(neighbour);
                }
            }
        },

        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const block = event.block;
            if (!isRooted(block)) {
                uproot(block);
                return;
            }
            reshape(block);
        },

        // Cutting a stem leaves its neighbours with an arm pointing at nothing,
        // and anything the cut left floating comes down on its next random tick
        onPlayerBreak(event: BlockComponentPlayerBreakEvent): void {
            const neighbours = SIDES.map((side) => event.block.offset(side.offset));
            system.run(() => {
                for (const neighbour of neighbours) {
                    if (neighbour === undefined || neighbour.typeId !== PLANT_ID) {
                        continue;
                    }
                    if (isRooted(neighbour)) {
                        reshape(neighbour);
                    } else {
                        uproot(neighbour);
                    }
                }
            });
        },
    });
});
