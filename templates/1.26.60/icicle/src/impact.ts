// Landing on an icicle that stands on a floor.
// Nothing here is scheduled: the `minecraft:entity_fall_on` component tells the
// engine how far something has to fall before the block is told about it, and
// `onEntityFallOn` carries the distance with it. The rule is pointed
// dripstone's, which the vanilla icicle copies.
import { BlockComponentEntityFallOnEvent, EntityDamageCause, system } from "@minecraft/server";
import { FACE_STATE, IMPACT_MULTIPLIER, THICKNESS_STATE } from "./config.js";

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:icicle_impact", {
        onEntityFallOn(event: BlockComponentEntityFallOnEvent): void {
            const entity = event.entity;
            // Only living things are hurt; an item or a boat has no health to lose
            if (entity === undefined || entity.getComponent("minecraft:health") === undefined) {
                return;
            }

            // Only an upward-pointing icicle has a point to land on
            const states = event.block.permutation.getAllStates();
            if (states[FACE_STATE] !== "up") {
                return;
            }
            // A buried segment is not what anybody lands on
            if (states[THICKNESS_STATE] !== "tip") {
                return;
            }

            // Vanilla's rule is the whole fall, doubled and less two. The engine
            // has already dealt the ordinary fall damage by now, and a second
            // hit this soon only lands the part that is larger than the first,
            // so asking for the full amount leaves the entity down exactly
            // what vanilla takes from it
            const damage = Math.ceil(IMPACT_MULTIPLIER * (event.fallDistance - 1));
            if (damage <= 0) {
                return;
            }
            entity.applyDamage(damage, { cause: EntityDamageCause.stalagmite });
        },
    });
});
