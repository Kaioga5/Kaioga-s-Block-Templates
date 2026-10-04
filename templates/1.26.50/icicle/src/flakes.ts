// The flakes that drift down from icicle tips.
// Vanilla draws them in the client, from the tip of every hanging icicle, with
// the snow layer's falling dust particle: measured in Minecraft Preview
// 26.60.29 from frame bursts, a white flake appears at the point of the tip,
// anywhere across the width of the block, spins, shrinks and falls slowly. A
// custom block has no client hook, and a random tick comes round far too rarely
// for it, so this looks for hanging tips near each player and lets each one drop
// a flake now and then. The cost follows the number of players, not the number
// of icicles, and nothing runs where nobody is.
import { BlockPermutation, BlockVolume, system, world } from "@minecraft/server";
import {
    ATTACHED_STATE,
    FACE_STATE,
    FLAKE_CHANCE,
    FLAKE_HEIGHT,
    FLAKE_HEIGHT_IN_CELL,
    FLAKE_INTERVAL,
    FLAKE_PARTICLE,
    FLAKE_RANGE,
    ICICLE_ID,
    THICKNESS_STATE,
} from "./config.js";

// The two permutations a hanging tip can be in, attached and not. Built on
// first use: BlockPermutation.resolve is not allowed while the world is still
// loading
let hangingTips: BlockPermutation[] | undefined;

function tipPermutations(): BlockPermutation[] {
    if (hangingTips === undefined) {
        hangingTips = [false, true].map((attached) =>
            BlockPermutation.resolve(ICICLE_ID, {
                [FACE_STATE]: "down",
                [THICKNESS_STATE]: "tip",
                [ATTACHED_STATE]: attached,
            }),
        );
    }
    return hangingTips;
}

system.runInterval(() => {
    // Each tip gets one roll per pass, however many players stand near it
    const rolled = new Set<string>();
    for (const player of world.getAllPlayers()) {
        try {
            const { dimension, location } = player;
            const x = Math.floor(location.x);
            const y = Math.floor(location.y);
            const z = Math.floor(location.z);
            // Keep the box inside the world, which getBlocks will not reach past
            const bottom = Math.max(y - FLAKE_HEIGHT, dimension.heightRange.min);
            const top = Math.min(y + FLAKE_HEIGHT, dimension.heightRange.max - 1);
            const volume = new BlockVolume(
                { x: x - FLAKE_RANGE, y: bottom, z: z - FLAKE_RANGE },
                { x: x + FLAKE_RANGE, y: top, z: z + FLAKE_RANGE },
            );
            // One engine-side search returns only the hanging tips
            const tips = dimension.getBlocks(volume, { includePermutations: tipPermutations() }, true);
            for (const cell of tips.getBlockLocationIterator()) {
                const key = `${dimension.id} ${cell.x} ${cell.y} ${cell.z}`;
                if (rolled.has(key)) {
                    continue;
                }
                rolled.add(key);
                if (Math.random() >= FLAKE_CHANCE) {
                    continue;
                }
                dimension.spawnParticle(FLAKE_PARTICLE, {
                    x: cell.x + Math.random(),
                    y: cell.y + FLAKE_HEIGHT_IN_CELL,
                    z: cell.z + Math.random(),
                });
            }
        } catch {
            // The player changed dimension or the area unloaded mid-search;
            // the next pass starts over
        }
    }
}, FLAKE_INTERVAL);
