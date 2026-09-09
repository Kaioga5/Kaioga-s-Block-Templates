// What a stalactite does when there is liquid above it.
// Vanilla runs the whole cycle, the drip, the cauldron, the growth of both
// spikes, from the tip, and only when the block above the column's anchor
// holds a liquid. That gating is what makes it cheap: an ordinary stalactite
// finds no liquid, does one extra block read, and stops.
import { Block, BlockComponentRandomTickEvent, BlockPermutation, system } from "@minecraft/server";
import {
    CAULDRON_FILL_STATE,
    CAULDRON_FULL,
    CAULDRON_ID,
    CAULDRON_LIQUID_STATE,
    DRIPSTONE_ID,
    DRIP_CHANCE,
    DRIP_RANGE,
    DripSource,
    FACE_STATE,
    GROW_CHANCE,
    MAX_LENGTH,
    THICKNESS_STATE,
    dripSources,
} from "./config.js";
import { facing, findAnchorEnd, findTip, isDripstone, restyle } from "./column.js";

// The liquid feeding a column, read from the block one past its anchor
function sourceFor(tip: Block): DripSource | undefined {
    const anchorEnd = findAnchorEnd(tip);
    const anchor = facing(tip) === "down" ? anchorEnd.above() : anchorEnd.below();
    if (anchor === undefined) {
        return undefined;
    }
    const feed = facing(tip) === "down" ? anchor.above() : anchor.below();
    return feed === undefined ? undefined : dripSources.get(feed.typeId);
}

// Follow the drip down until it hits something. Returns the first non-air block
// under the tip, which is the cauldron or the floor the water lands on
function landingUnder(tip: Block): Block | undefined {
    for (let step = 1; step <= DRIP_RANGE; step++) {
        const below = tip.below(step);
        if (below === undefined) {
            return undefined;
        }
        if (!below.isAir) {
            return below;
        }
    }
    return undefined;
}

// One more level in the cauldron, or nothing if it is already full or holds
// something else
function fillCauldron(cauldron: Block, liquid: string): boolean {
    if (cauldron.typeId !== CAULDRON_ID) {
        return false;
    }
    const states = cauldron.permutation.getAllStates();
    const level = states[CAULDRON_FILL_STATE];
    const current = typeof level === "number" ? level : 0;
    if (current >= CAULDRON_FULL) {
        return false;
    }
    if (current > 0 && states[CAULDRON_LIQUID_STATE] !== liquid) {
        return false;
    }
    cauldron.setPermutation(
        BlockPermutation.resolve(CAULDRON_ID, {
            ...states,
            [CAULDRON_LIQUID_STATE]: liquid,
            [CAULDRON_FILL_STATE]: current + 1,
        }),
    );
    cauldron.dimension.playSound("cauldron.fillwater", cauldron.center());
    return true;
}

// Lengthen the column by one spike, keeping the direction it already runs in
function lengthen(tip: Block): void {
    const grows = tip.below();
    if (grows === undefined || !grows.isAir) {
        return;
    }
    // Refuse to grow past the length the pack allows
    let length = 1;
    let walk: Block = tip;
    for (let step = 0; step < MAX_LENGTH; step++) {
        const back: Block | undefined = walk.above();
        if (!isDripstone(back) || facing(back) !== facing(tip)) {
            break;
        }
        length++;
        walk = back;
    }
    if (length >= MAX_LENGTH) {
        return;
    }
    grows.setPermutation(
        BlockPermutation.resolve(DRIPSTONE_ID, {
            [FACE_STATE]: facing(tip),
            [THICKNESS_STATE]: "tip",
        }),
    );
    restyle(grows);
}

// Water landing on the floor under a stalactite raises a stalagmite, and water
// landing on an existing stalagmite makes it taller. This is the half of
// vanilla's cycle that builds the spike underneath
function raiseStalagmite(landing: Block): void {
    if (isDripstone(landing) && facing(landing) === "up") {
        const tip = findTip(landing);
        const above = tip.above();
        if (above === undefined || !above.isAir) {
            return;
        }
        above.setPermutation(
            BlockPermutation.resolve(DRIPSTONE_ID, { [FACE_STATE]: "up", [THICKNESS_STATE]: "tip" }),
        );
        restyle(above);
        return;
    }

    // Bare floor: only stone-like ground grows a spike, which the anchor test
    // in column.ts already describes
    const space = landing.above();
    if (space === undefined || !space.isAir || landing.isAir || landing.isLiquid) {
        return;
    }
    space.setPermutation(
        BlockPermutation.resolve(DRIPSTONE_ID, { [FACE_STATE]: "up", [THICKNESS_STATE]: "tip" }),
    );
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:dripstone_drip", {
        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const block = event.block;

            // Only a stalactite drips, and only from its tip
            if (facing(block) !== "down") {
                return;
            }
            const thickness = block.permutation.getAllStates()[THICKNESS_STATE];
            if (thickness !== "tip" && thickness !== "merge") {
                return;
            }
            if (Math.random() >= DRIP_CHANCE) {
                return;
            }

            const source = sourceFor(block);
            if (source === undefined) {
                return;
            }

            // The drop itself, drawn just under the tip
            const point = block.center();
            block.dimension.spawnParticle(source.particle, { x: point.x, y: block.location.y, z: point.z });

            const landing = landingUnder(block);
            if (landing !== undefined && fillCauldron(landing, source.cauldronLiquid)) {
                return;
            }

            // Lava drips but never builds anything
            if (!source.grows || Math.random() >= GROW_CHANCE) {
                return;
            }

            // Vanilla splits the growth between the two ends of the drip
            if (Math.random() < 0.5) {
                lengthen(block);
            } else if (landing !== undefined) {
                raiseStalagmite(landing);
            }
        },
    });
});
