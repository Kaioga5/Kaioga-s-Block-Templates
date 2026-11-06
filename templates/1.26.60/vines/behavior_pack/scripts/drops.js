// Silk Touch gets nothing from a vine, the same as vanilla.
// The engine hands a custom block its own item whenever it is mined with Silk
// Touch, whatever its loot table says, and no block component turns that off.
// So a Silk Touch break of a vine is noted just before it happens, and the one
// vine item it spawns is taken away the moment it appears. Shears still work
// through the loot table, and nothing else about the break changes: the tool
// wears down and the break effects play as usual.
import { system, world } from "@minecraft/server";
import { VINES_ID } from "./config.js";
// A break is only matched against items that turn up this many ticks after it
const MATCH_TICKS = 2;
// Silk Touch breaks waiting for their item, by cell
const pending = [];
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    if (event.block.typeId !== VINES_ID) {
        return;
    }
    const enchantable = event.itemStack?.getComponent("minecraft:enchantable");
    if (enchantable === undefined || !enchantable.hasEnchantment("silk_touch")) {
        return;
    }
    const { x, y, z } = event.block.location;
    pending.push({ dimension: event.dimension.id, x, y, z, tick: system.currentTick });
});
// Was this item dropped by one of the breaks above? Drops land inside the cell
// the block stood in
function takeMatch(entity) {
    const now = system.currentTick;
    const at = entity.location;
    for (let i = pending.length - 1; i >= 0; i--) {
        const cell = pending[i];
        if (now - cell.tick > MATCH_TICKS) {
            pending.splice(i, 1);
            continue;
        }
        if (cell.dimension === entity.dimension.id &&
            Math.floor(at.x) === cell.x &&
            Math.floor(at.y) === cell.y &&
            Math.floor(at.z) === cell.z) {
            pending.splice(i, 1);
            return true;
        }
    }
    return false;
}
world.afterEvents.entitySpawn.subscribe((event) => {
    if (pending.length === 0 || event.entity.typeId !== "minecraft:item") {
        return;
    }
    const stack = event.entity.getComponent("minecraft:item")?.itemStack;
    if (stack?.typeId === VINES_ID && takeMatch(event.entity)) {
        event.entity.remove();
    }
});
