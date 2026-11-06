// Kelp growing upwards through water.
// Only the top block of a strand grows, and only while it is standing in water.
// Everything under it asks one question, is there kelp above me?, and stops,
// so a forest of tall strands costs almost nothing on random ticks.
import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentPlayerBreakEvent,
    BlockComponentPlayerPlaceBeforeEvent,
    BlockComponentRandomTickEvent,
    BlockPermutation,
    system,
} from "@minecraft/server";
import {
    AGE_STATE,
    GROWTH_CHANCE,
    KELP_ID,
    MAX_AGE,
    TIP_STATE,
    unrootableIds,
    unrootableTags,
} from "./config.js";

export function readAge(block: Block): number {
    const value = block.permutation.getAllStates()[AGE_STATE];
    return typeof value === "number" ? value : 0;
}

export function isTip(block: Block): boolean {
    return block.permutation.getAllStates()[TIP_STATE] === true;
}

function setStates(block: Block, age: number, tip: boolean): void {
    block.setPermutation(BlockPermutation.resolve(KELP_ID, { [AGE_STATE]: age, [TIP_STATE]: tip }));
}

// Kelp only lives in water. A block that is not waterlogged is out of its
// element and lets go
export function inWater(block: Block): boolean {
    return block.isWaterlogged;
}

// What a strand may root on. More kelp is always fine; everything else has to
// be something with a real face
export function canRootOn(below: Block | undefined): boolean {
    if (below === undefined || below.isAir || below.isLiquid) {
        return false;
    }
    if (below.typeId === KELP_ID) {
        return true;
    }
    if (unrootableIds.has(below.typeId)) {
        return false;
    }
    return !unrootableTags.some((tag) => below.hasTag(tag));
}

// Add one block on top. The old tip becomes plant and the new block takes over
// as the growing end. Returns false when the strand has nowhere left to go,
// which is how bone meal knows to stop
export function extend(tip: Block): boolean {
    const age = readAge(tip);
    if (age >= MAX_AGE) {
        return false;
    }
    const above = tip.above();
    // Kelp grows into water and nothing else
    if (above === undefined || !above.isLiquid) {
        return false;
    }
    setStates(tip, age, false);
    // Write the kelp first and flood it second. The cell above is still a
    // water block at this point, and water cannot be waterlogged, so calling
    // setWaterlogged on it throws "Block type cannot be waterlogged". Once the
    // cell holds kelp, which declares can_contain_liquid, the call is valid and
    // puts the water back around the new segment
    setStates(above, age + 1, true);
    above.setWaterlogged(true);
    return true;
}

// A strand with no water around it comes apart, leaving its item behind
function wither(block: Block): void {
    const drop = block.getItemStack(1, true);
    const { dimension } = block;
    const centre = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, centre);
    }
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:kelp_growth", {
        // Kelp planted on nothing, or out of the water, is refused rather than
        // placed and then withered a moment later
        beforeOnPlayerPlace(event: BlockComponentPlayerPlaceBeforeEvent): void {
            if (!canRootOn(event.block.below()) || !event.block.isLiquid) {
                event.cancel = true;
            }
        },

        // A block placed on top of a strand takes over as the growing end
        onPlace(event: BlockComponentOnPlaceEvent): void {
            const below = event.block.below();
            if (below !== undefined && below.typeId === KELP_ID && isTip(below)) {
                setStates(below, readAge(below), false);
            }
        },

        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const block = event.block;

            // Out of water, kelp does not last
            if (!inWater(block)) {
                wither(block);
                return;
            }
            // Anything with kelp above it is plant, and plant never grows
            if (!isTip(block)) {
                return;
            }
            if (Math.random() >= GROWTH_CHANCE) {
                return;
            }
            extend(block);
        },

        // Cutting a strand leaves the block below as the new growing end.
        // Everything above has lost its footing and the engine pops it
        onPlayerBreak(event: BlockComponentPlayerBreakEvent): void {
            const below = event.block.below();
            if (below === undefined || below.typeId !== KELP_ID) {
                return;
            }
            const age = readAge(below);
            system.run(() => {
                if (below.typeId === KELP_ID) {
                    setStates(below, age, true);
                }
            });
        },
    });
});
