// The flame and smoke a burning candle gives off. Vanilla runs this from the
// renderer every frame; a pack has no hook that cheap, so this rides the random
// tick instead, no timer, no ticking component, and the block is only touched
// when the world picks it. The puffs are far rarer than vanilla's as a result;
// randomTickSpeed is the knob for a denser effect, and the README says so.
import { system } from "@minecraft/server";
import { candleCount, isLit } from "./candle.js";
// Vanilla's own candle flame, paired with an occasional wisp of smoke. Both
// are self-contained particle files: they read no Molang variables, so they
// can be spawned with a bare position. The small flame used by torches is
// not, it expects a direction and a speed to be handed in, and spawning it
// bare draws nothing and fills the Content Log with unknown-variable errors
const FLAME = "minecraft:candle_flame_particle";
const SMOKE = "minecraft:basic_smoke_particle";
// Vanilla's chance of adding smoke on top of the flame
const SMOKE_CHANCE = 0.3;
// Where each wick sits inside the block, as a fraction of a block, listed for
// one, two, three and four candles. These are world positions. The geometry
// file is authored with X mirrored, because Bedrock draws model -X on the
// world's east side, so the numbers here are the reference model's own
// offsets and NOT the mirrored coordinates the geometry uses; mirroring them
// too puts every flame over the wrong candle. Each entry is the top centre of
// a candle body plus two pixels, which is where vanilla puts the flame
const WICKS = [
    [[0.5, 0.5, 0.5]],
    [
        [0.375, 0.4375, 0.5],
        [0.625, 0.5, 0.4375],
    ],
    [
        [0.5, 0.3125, 0.625],
        [0.375, 0.4375, 0.5],
        [0.5625, 0.5, 0.4375],
    ],
    [
        [0.4375, 0.3125, 0.5625],
        [0.625, 0.4375, 0.5625],
        [0.375, 0.4375, 0.375],
        [0.5625, 0.5, 0.375],
    ],
];
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:candle_particles", {
        // Run this code when the world random-ticks this block
        onRandomTick(event) {
            // Get the block and leave unlit candles alone
            const { block } = event;
            if (!isLit(block)) {
                return;
            }
            // Every candle standing here burns, so each one gets its own flame
            for (const wick of WICKS[candleCount(block) - 1]) {
                const at = {
                    x: block.x + wick[0],
                    y: block.y + wick[1],
                    z: block.z + wick[2],
                };
                block.dimension.spawnParticle(FLAME, at);
                if (Math.random() < SMOKE_CHANCE) {
                    block.dimension.spawnParticle(SMOKE, at);
                }
            }
        },
    });
});
