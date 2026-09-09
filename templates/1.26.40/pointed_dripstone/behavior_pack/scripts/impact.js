// Landing on a stalagmite.
// This is the one part of dripstone that needs no scheduling at all: the
// `minecraft:entity_fall_on` component tells the engine how far something has
// to fall before the block is told about it, and `onEntityFallOn` carries the
// distance with it.
import { EntityDamageCause, system } from "@minecraft/server";
import { FACE_STATE, IMPACT_MAX, IMPACT_MULTIPLIER, THICKNESS_STATE } from "./config.js";
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:dripstone_impact", {
        onEntityFallOn(event) {
            const entity = event.entity;
            if (entity === undefined) {
                return;
            }
            // Only an upward-pointing spike has a point to land on
            const states = event.block.permutation.getAllStates();
            if (states[FACE_STATE] !== "up") {
                return;
            }
            // A buried segment is not what anybody lands on
            if (states[THICKNESS_STATE] === "base" || states[THICKNESS_STATE] === "middle") {
                return;
            }
            // The engine has already applied ordinary fall damage; this is the
            // extra the spike adds on top, capped the way vanilla caps it
            const extra = Math.min(Math.floor(event.fallDistance * IMPACT_MULTIPLIER) - Math.floor(event.fallDistance), IMPACT_MAX);
            if (extra <= 0) {
                return;
            }
            entity.applyDamage(extra, { cause: EntityDamageCause.fallingBlock });
            event.block.dimension.playSound("hit.pointed_dripstone", event.block.center());
        },
    });
});
