// A sponge drinking the water around it.
// The search is a breadth-first walk through connected water, so a sponge in a
// corridor drains the corridor rather than a cube of ocean around it, which is
// both what vanilla does and what keeps the block count low. Two caps bound the
// work: how far the walk may travel, and how much it may take.
import {
    Block,
    BlockComponentOnPlaceEvent,
    BlockComponentRandomTickEvent,
    system,
} from "@minecraft/server";
import { ABSORB_LIMIT, ABSORB_RANGE, MIN_ABSORBED, SPONGE_ID, WET_SPONGE_ID } from "./config.js";

const NEIGHBOURS = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
];

// A plain boolean rather than a type guard: the callers have already ruled out
// undefined, and a guard there would narrow the false branch to nothing
function isWater(block: Block): boolean {
    return block.isLiquid && block.typeId.includes("water");
}

function key(block: Block): string {
    return `${block.location.x},${block.location.y},${block.location.z}`;
}

// Walk outwards through connected water, clearing as it goes. Returns how much
// was taken so the caller knows whether the sponge got wet
function drink(sponge: Block): number {
    const seen = new Set<string>([key(sponge)]);
    let frontier: Block[] = [sponge];
    let taken = 0;

    for (let depth = 0; depth < ABSORB_RANGE && taken < ABSORB_LIMIT; depth++) {
        const next: Block[] = [];
        for (const block of frontier) {
            for (const offset of NEIGHBOURS) {
                if (taken >= ABSORB_LIMIT) {
                    break;
                }
                const neighbour = block.offset(offset);
                if (neighbour === undefined || seen.has(key(neighbour))) {
                    continue;
                }
                seen.add(key(neighbour));

                // A waterlogged block keeps its block and loses its water; a
                // plain water block goes altogether
                if (neighbour.isWaterlogged) {
                    neighbour.setWaterlogged(false);
                    taken++;
                    next.push(neighbour);
                    continue;
                }
                if (!isWater(neighbour)) {
                    continue;
                }
                neighbour.setType("minecraft:air");
                taken++;
                next.push(neighbour);
            }
        }
        if (next.length === 0) {
            break;
        }
        frontier = next;
    }
    return taken;
}

function absorb(sponge: Block): void {
    if (!sponge.isValid || sponge.typeId !== SPONGE_ID) {
        return;
    }
    const taken = drink(sponge);
    if (taken < MIN_ABSORBED) {
        return;
    }
    sponge.setType(WET_SPONGE_ID);
    sponge.dimension.playSound("block.sponge.absorb", sponge.center());
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:sponge_absorb", {
        // The usual case: a sponge dropped into water. The search runs a tick
        // later so the placement itself has finished writing the block
        onPlace(event: BlockComponentOnPlaceEvent): void {
            const block = event.block;
            system.run(() => absorb(block));
        },

        // The other case: a dry sponge already sitting somewhere that water
        // later reaches. There is no neighbour-changed hook, so the sponge
        // notices on a random tick, and only after the cheapest possible test,
        // which is whether any of its six faces is wet at all
        onRandomTick(event: BlockComponentRandomTickEvent): void {
            const block = event.block;
            const touching = NEIGHBOURS.some((offset) => {
                const neighbour = block.offset(offset);
                if (neighbour === undefined) {
                    return false;
                }
                return isWater(neighbour) || neighbour.isWaterlogged;
            });
            if (touching) {
                absorb(block);
            }
        },
    });
});
