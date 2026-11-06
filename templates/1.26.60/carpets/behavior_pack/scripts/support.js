// A backstop for the carpet's support rule. minecraft:placement_filter is
// still the primary rule, it blocks placement on nothing and pops the carpet
// when its support goes, but it does not catch every way a supporting block
// can vanish, so these events take the carpet down with it.
import { world } from "@minecraft/server";
const CARPET_ID = "kai_templates:carpet";
// Carpets stack, so pulling the bottom one has to take the whole column with
// it. The walk goes upward from the destroyed cell and stops at the first
// thing that is not a carpet, which bounds it and keeps it from revisiting a
// cell, the destruction of each carpet fires this handler again, and without
// the bound the two would chase each other.
function dropCarpetsAbove(dimension, position) {
    for (let step = 1;; step += 1) {
        const cell = { x: position.x, y: position.y + step, z: position.z };
        let block;
        try {
            block = dimension.getBlock(cell);
        }
        catch {
            // Chunk not loaded, the placement filter catches it when the
            // area loads again
            return;
        }
        if (block === undefined || block.typeId !== CARPET_ID) {
            return;
        }
        // "destroy" is what separates this from setting the cell to air: the
        // block drops its loot and plays its break effect, exactly as if it
        // had been mined.
        dimension.runCommand(`setblock ${cell.x} ${cell.y} ${cell.z} air destroy`);
    }
}
// A player mining the block underneath, or one of the carpets in the column
world.afterEvents.playerBreakBlock.subscribe((event) => {
    dropCarpetsAbove(event.dimension, event.block.location);
});
// An explosion clearing the block underneath. The event lists every cell the
// blast removed, so each one is checked
world.afterEvents.blockExplode.subscribe((event) => {
    dropCarpetsAbove(event.dimension, event.block.location);
});
