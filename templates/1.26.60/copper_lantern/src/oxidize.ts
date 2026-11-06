// Weathers the copper lantern over time. Copper walks through four looks,
// shiny, exposed, weathered, oxidized, on random ticks. Each stage is a
// separate block, so advancing means swapping the block for the next stage's
// id. Waxed lanterns never carry this component, so wax freezes the look with
// no script cost at all.
import { BlockComponentRandomTickEvent, system } from "@minecraft/server";

import { STAGE_BY_ID, swapLanternType } from "./family.js";

// The per-random-tick chance that copper starts pre-oxidizing. Vanilla also
// slows this down when other copper is nearby; that check would scan a
// hundred positions per tick, so the flat chance is used instead
const OXIDIZE_CHANCE = 64 / 1125;

// Register the component before the world loads. onRandomTick needs no JSON
// component of its own; the randomTickSpeed gamerule drives how often it runs
system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent(
    "kai_templates:copper_lantern_oxidize",
    {
      // Run this code on each random tick
      onRandomTick(event: BlockComponentRandomTickEvent): void {
        const { block } = event;

        // Find this block's stage and the stage after it. The final stage
        // has no next entry, so oxidized lanterns stop here
        const stage = STAGE_BY_ID.get(block.typeId);
        if (stage?.next === undefined) {
          return;
        }

        // Roll the oxidation chance
        if (Math.random() >= OXIDIZE_CHANCE) {
          return;
        }

        swapLanternType(block, stage.next);
      },
    },
  );
});
