// What the fruit does when it goes: the stem it grew from straightens up.
// The stem would notice on its own on a later random tick, but vanilla
// straightens the moment the fruit is taken, and the fruit's own break hook
// is the moment to do it. Only a stem bent towards this very block is
// touched, so a stem pointing at a different fruit is left alone.
import { system } from "@minecraft/server";
import { STEM_ID } from "./config.js";
import { attachedOf, straighten } from "./stem.js";
// The four stems that could be bent towards this fruit, and the side name a
// stem in that spot would carry if it were
const NEIGHBOURS = [
    // A stem to the north of the fruit points south at it, and so on
    { side: "south", step: (block) => block.north() },
    { side: "north", step: (block) => block.south() },
    { side: "west", step: (block) => block.east() },
    { side: "east", step: (block) => block.west() },
];
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:melon_fruit", {
        onBreak(event) {
            for (const neighbour of NEIGHBOURS) {
                const stem = neighbour.step(event.block);
                if (stem !== undefined && stem.typeId === STEM_ID && attachedOf(stem) === neighbour.side) {
                    straighten(stem);
                }
            }
        },
    });
});
