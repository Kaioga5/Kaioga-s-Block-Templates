// A lily pad being run down.
// Vanilla destroys a pad when a boat moves into it. There is no "an entity
// touched me" hook for a custom block, but there are two that come close and
// cost nothing when nothing happens: onStepOn fires when something moves onto
// the pad, and onEntityFallOn when something lands on it. Both are native, so a
// pad nobody is near never runs a line of script.
import { Block, BlockComponentEntityFallOnEvent, BlockComponentStepOnEvent, system } from "@minecraft/server";
import { BOATS_BREAK_PADS, LILY_PAD_ID, crushingEntities } from "./config.js";

// Break the pad and leave its item, which is what a boat running one over does
function crush(block: Block): void {
    if (!block.isValid || block.typeId !== LILY_PAD_ID) {
        return;
    }
    const drop = block.getItemStack(1, true);
    const { dimension } = block;
    const centre = block.center();
    block.setType("minecraft:air");
    if (drop !== undefined) {
        dimension.spawnItem(drop, centre);
    }
    dimension.playSound("dig.grass", centre);
}

function crushedBy(typeId: string | undefined): boolean {
    if (!BOATS_BREAK_PADS || typeId === undefined) {
        return false;
    }
    // Add-ons often give each wood type its own boat identifier, so match the
    // suffix as well as the list instead of naming twenty of them
    if (crushingEntities.has(typeId)) {
        return true;
    }
    return typeId.endsWith("_boat") || typeId.endsWith("_chest_boat") || typeId.endsWith("_raft");
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:lily_pad_life", {
        onStepOn(event: BlockComponentStepOnEvent): void {
            if (crushedBy(event.entity?.typeId)) {
                const block = event.block;
                system.run(() => crush(block));
            }
        },

        onEntityFallOn(event: BlockComponentEntityFallOnEvent): void {
            if (crushedBy(event.entity?.typeId)) {
                const block = event.block;
                system.run(() => crush(block));
            }
        },
    });
});
