// Registers the component that weathers the copper stairs over time.
// Copper advances through four looks, shiny, exposed, weathered, oxidized,
// on random ticks. Each stage is a separate block, so advancing means
// swapping to the next stage's block. Waxed blocks never carry
// this component, so wax freezes the look with zero script cost.
import { system } from "@minecraft/server";
// Import the family table that maps each stage to the next one
import { STAGE_BY_ID, swapStairsType } from "./family.js";
// The documented per-random-tick chance that copper starts pre-oxidizing.
// Vanilla also slows this down when other copper is nearby; that check
// would scan 100+ positions per tick, so the flat chance is used instead
const OXIDIZE_CHANCE = 64 / 1125;
// Register the component before the world loads. onRandomTick needs no JSON
// component; the randomTickSpeed gamerule drives how often it runs
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:copper_stairs_oxidize", {
        // Run this code on each random tick
        onRandomTick(event) {
            // Get the block from the event
            const { block } = event;
            // Find this block's stage and the stage after it. The final
            // stage has no next entry, so fully oxidized stairs stop here
            const stage = STAGE_BY_ID.get(block.typeId);
            if (stage?.next === undefined) {
                return;
            }
            // Roll the oxidation chance
            if (Math.random() >= OXIDIZE_CHANCE) {
                return;
            }
            // Swap to the next stage's block, keeping the facing and shape
            swapStairsType(block, stage.next);
        },
    });
});
