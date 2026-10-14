// The flame and smoke a burning candle gives off. Vanilla runs this from the
// renderer, so the lit states carry a minecraft:tick component instead and
// this spawns a fresh flame on every tick it sends. Measured against vanilla,
// a new flame shows every 3 to 10 seconds, about 6 on average, and each one
// burns for longer than that, shrinking as it goes, so the wick is never bare.
// The tick interval is random over 3 to 7 seconds to match. Unlit states have
// no tick component and cost nothing.
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
// Put a fresh flame on every wick. Also called the moment a candle is lit, so
// it does not stand bare until its first tick comes round
export function spawnFlames(block) {
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
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:candle_particles", {
        // Run this code on every tick the block's minecraft:tick component sends
        onTick(event) {
            // Get the block and leave unlit candles alone
            const { block } = event;
            if (isLit(block)) {
                spawnFlames(block);
            }
        },
    });
});
