// Letting go the moment a wall goes.
// A vanilla vine drops its face, or comes away entirely, on the same tick its
// wall is mined, and every segment hanging from it follows. Custom blocks get
// no neighbour-changed hook, so the events that remove or add a block are
// watched instead and the vines around the change are checked there and then.
// Anything these events cannot see, a /setblock, a piston, is picked up by the
// random tick in life.ts a few seconds later.
import { Block, Dimension, Vector3, world } from "@minecraft/server";
import { VINES_ID } from "./config.js";
import { anySide, applyFlags, sameFlags, supportedFlags } from "./attachment.js";

// A hanging curtain is checked one segment at a time, top to bottom, so this
// bounds the walk well beyond the tallest curtain a world is likely to hold
const MAX_CHECKS = 512;

// The vine comes away. "destroy" is what separates this from setting the cell
// to air: the break particles and sound play, and the loot table runs with no
// tool, which for a vine means nothing drops, the same as vanilla
export function letGo(block: Block): void {
    const { x, y, z } = block.location;
    block.dimension.runCommand(`setblock ${x} ${y} ${z} air destroy`);
}

// Re-check the vine at each queued position. A vine that loses a face or comes
// away changes what holds up the one under it, so that one is queued next
function settle(dimension: Dimension, start: Vector3[]): void {
    const queue = [...start];
    for (let checks = 0; queue.length > 0 && checks < MAX_CHECKS; checks++) {
        const at = queue.shift() as Vector3;
        let block: Block | undefined;
        try {
            block = dimension.getBlock(at);
        } catch {
            // Chunk not loaded, the random tick catches it later
            continue;
        }
        if (block === undefined || block.typeId !== VINES_ID) {
            continue;
        }

        const flags = supportedFlags(block);
        if (sameFlags(block, flags)) {
            continue;
        }
        if (anySide(flags)) {
            applyFlags(block, flags);
        } else {
            letGo(block);
        }
        queue.push({ x: at.x, y: at.y - 1, z: at.z });
    }
}

// A block changed here. The vines beside it may have used it as a wall, and
// the one under it draws its ceiling leaf from it or hung from it
function blockChanged(dimension: Dimension, at: Vector3): void {
    settle(dimension, [
        { x: at.x, y: at.y - 1, z: at.z },
        { x: at.x + 1, y: at.y, z: at.z },
        { x: at.x - 1, y: at.y, z: at.z },
        { x: at.x, y: at.y, z: at.z + 1 },
        { x: at.x, y: at.y, z: at.z - 1 },
    ]);
}

// A player mining a wall, a ceiling, or a vine that others hang from
world.afterEvents.playerBreakBlock.subscribe((event) => {
    blockChanged(event.dimension, event.block.location);
});

// An explosion clearing the wall. The event fires once for every cell the blast
// removed
world.afterEvents.blockExplode.subscribe((event) => {
    blockChanged(event.dimension, event.block.location);
});

// A block placed over a vine gives it a ceiling leaf
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    blockChanged(event.dimension, event.block.location);
});
