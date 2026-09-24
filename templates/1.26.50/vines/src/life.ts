// A vine keeping hold and creeping outwards, all on random ticks.
// Three things happen in one pass: faces that lost their wall let go, a vine
// with nothing left holding it breaks, and a survivor occasionally grows in one
// random direction, the way vanilla does it.
import { Block, BlockComponentRandomTickEvent, system } from "@minecraft/server";
import {
    GROWTH_CHANCE,
    SIDE_STATES,
    SPREAD_HEIGHT,
    SPREAD_LIMIT,
    SPREAD_RADIUS,
    VINES_ID,
} from "./config.js";
import {
    SIDE_OFFSETS,
    Side,
    anySide,
    applyFlags,
    canCling,
    placeVine,
    readFlag,
    sameFlags,
    supportedFlags,
} from "./attachment.js";
import { letGo } from "./support.js";

// The side on the right and on the left of each direction, looking down on it
const CLOCKWISE: Record<Side, Side> = {
    "kai_templates:north": "kai_templates:east",
    "kai_templates:east": "kai_templates:south",
    "kai_templates:south": "kai_templates:west",
    "kai_templates:west": "kai_templates:north",
};
const COUNTER_CLOCKWISE: Record<Side, Side> = {
    "kai_templates:north": "kai_templates:west",
    "kai_templates:west": "kai_templates:south",
    "kai_templates:south": "kai_templates:east",
    "kai_templates:east": "kai_templates:north",
};
const OPPOSITE: Record<Side, Side> = {
    "kai_templates:north": "kai_templates:south",
    "kai_templates:south": "kai_templates:north",
    "kai_templates:east": "kai_templates:west",
    "kai_templates:west": "kai_templates:east",
};

// Up, down, or one of the four sides, each equally likely
type Direction = "up" | "down" | Side;
const DIRECTIONS: Direction[] = ["up", "down", ...SIDE_STATES];

function coinFlip(): boolean {
    return Math.random() < 0.5;
}

// Too many vines nearby stop a vine spreading up or sideways. The count stops
// as soon as it reaches the limit, so a crowded wall costs a handful of reads
function crowded(block: Block): boolean {
    let found = 0;
    for (let dx = -SPREAD_RADIUS; dx <= SPREAD_RADIUS; dx++) {
        for (let dz = -SPREAD_RADIUS; dz <= SPREAD_RADIUS; dz++) {
            for (let dy = -SPREAD_HEIGHT; dy <= SPREAD_HEIGHT; dy++) {
                let near: Block | undefined;
                try {
                    near = block.offset({ x: dx, y: dy, z: dz });
                } catch {
                    // Outside the loaded world, nothing to count
                    continue;
                }
                if (near?.typeId === VINES_ID && ++found >= SPREAD_LIMIT) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Climb into the air block above, keeping each side at random, and only the
// sides whose wall carries on up there
function growUp(block: Block, flags: Record<string, boolean>): void {
    const above = block.above();
    if (above === undefined || crowded(block)) {
        return;
    }
    const sides: Partial<Record<Side, boolean>> = {};
    for (const side of SIDE_STATES) {
        sides[side] = flags[side] && coinFlip() && canCling(above.offset(SIDE_OFFSETS[side]));
    }
    if (anySide(sides)) {
        placeVine(above, sides);
    }
}

// Spread towards a side the vine is not holding. Into air, the new vine takes
// the wall that continues beside it, or wraps round the corner when the wall
// ends. Against a wall, the vine simply grabs it
function growSideways(block: Block, flags: Record<string, boolean>, side: Side): void {
    if (crowded(block)) {
        return;
    }
    const target = block.offset(SIDE_OFFSETS[side]);
    if (target === undefined) {
        return;
    }

    if (!target.isAir) {
        if (canCling(target)) {
            applyFlags(block, { ...flags, [side]: true });
        }
        return;
    }

    const right = CLOCKWISE[side];
    const left = COUNTER_CLOCKWISE[side];

    // The wall this vine is on carries on past it
    if (flags[right] && canCling(target.offset(SIDE_OFFSETS[right]))) {
        placeVine(target, { [right]: true });
        return;
    }
    if (flags[left] && canCling(target.offset(SIDE_OFFSETS[left]))) {
        placeVine(target, { [left]: true });
        return;
    }

    // The wall ends here, so the vine wraps round its outer corner and holds on
    // to the side of the same block
    for (const wall of [right, left]) {
        if (!flags[wall]) {
            continue;
        }
        const corner = target.offset(SIDE_OFFSETS[wall]);
        if (corner !== undefined && corner.isAir && canCling(block.offset(SIDE_OFFSETS[wall]))) {
            placeVine(corner, { [OPPOSITE[side]]: true });
            return;
        }
    }
}

// Hang one block lower, keeping each side at random. The new segment holds on
// through the one above it rather than through a wall of its own, which is what
// lets a curtain reach past the bottom of the wall it started on. A vine
// already below picks up some of these sides instead
function growDown(block: Block, flags: Record<string, boolean>): void {
    const below = block.below();
    if (below === undefined) {
        return;
    }

    const sides: Partial<Record<Side, boolean>> = {};
    for (const side of SIDE_STATES) {
        sides[side] = flags[side] && coinFlip();
    }

    if (below.isAir) {
        if (anySide(sides)) {
            placeVine(below, sides);
        }
        return;
    }

    if (below.typeId === VINES_ID) {
        const merged: Record<string, boolean> = {};
        for (const side of SIDE_STATES) {
            merged[side] = readFlag(below, side) || sides[side] === true;
        }
        if (!sameFlags(below, merged)) {
            applyFlags(below, merged);
        }
    }
}

function grow(block: Block, flags: Record<string, boolean>): void {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

    // Upwards only into air. A vine with a block over it grows down instead
    if (direction === "up" && block.above()?.isAir) {
        growUp(block, flags);
        return;
    }

    // Sideways only towards a side the vine is not already holding. Picking one
    // it holds sends the vine down, as vanilla does
    if (direction !== "up" && direction !== "down" && !flags[direction]) {
        growSideways(block, flags, direction);
        return;
    }

    growDown(block, flags);
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:vines_life", {
        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const block = event.block;
            const flags = supportedFlags(block);

            // Nothing holds it any more
            if (!anySide(flags)) {
                letGo(block);
                return;
            }

            // Let go of the faces whose wall disappeared
            if (!sameFlags(block, flags)) {
                applyFlags(block, flags);
            }

            if (Math.random() < GROWTH_CHANCE) {
                grow(block, flags);
            }
        },
    });
});
