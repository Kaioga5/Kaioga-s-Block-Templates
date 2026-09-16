// Budding amethyst pushing crystals out of its faces.
// Vanilla runs this on a random tick: pick one of the six faces, and either
// start a bud there or move the bud that is already there one stage on. That
// makes the whole geode a set of independent one-in-five rolls rather than
// anything that has to be tracked, so nothing here polls or schedules.
import { Block, BlockComponentRandomTickEvent, BlockPermutation, system } from "@minecraft/server";
import { FACE_STATE, GROWTH_CHANCE, budStages } from "./config.js";
import { canGrowOn } from "./support.js";

// The six faces a crystal can grow from, each with the block_face value a bud
// growing there would have been placed with. Clicking a neighbour's north face
// puts the block to the north of it, so a bud on that side reads "north"
const FACES = [
    { offset: { x: 0, y: 1, z: 0 }, face: "up" },
    { offset: { x: 0, y: -1, z: 0 }, face: "down" },
    { offset: { x: 0, y: 0, z: -1 }, face: "north" },
    { offset: { x: 0, y: 0, z: 1 }, face: "south" },
    { offset: { x: 1, y: 0, z: 0 }, face: "east" },
    { offset: { x: -1, y: 0, z: 0 }, face: "west" },
];

// A crystal can start in air or in water, and nowhere else
function isFreeSpace(block: Block): boolean {
    return block.isAir || (block.isLiquid && block.typeId.includes("water"));
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:amethyst_budding", {
        onRandomTick(event: BlockComponentRandomTickEvent): void {
            if (Math.random() >= GROWTH_CHANCE) {
                return;
            }

            // One face per tick, chosen at random. Trying all six would fill a
            // geode six times faster and cost six block reads every tick
            const choice = FACES[Math.floor(Math.random() * FACES.length)];
            const target = event.block.offset(choice.offset);
            if (target === undefined) {
                return;
            }

            const stage = budStages.indexOf(target.typeId);

            // Nothing there yet: start the smallest bud, pointing away from the
            // block it grew out of
            if (stage === -1) {
                // The budding block is the support here, so a face that is
                // already carrying something else grows nothing
                if (!isFreeSpace(target) || !canGrowOn(event.block)) {
                    return;
                }
                target.setPermutation(
                    BlockPermutation.resolve(budStages[0], { [FACE_STATE]: choice.face }),
                );
                return;
            }

            // A finished cluster stops growing
            if (stage >= budStages.length - 1) {
                return;
            }

            // Move it one stage on, keeping the way it faces
            const states = target.permutation.getAllStates();
            target.setPermutation(
                BlockPermutation.resolve(budStages[stage + 1], {
                    [FACE_STATE]: states[FACE_STATE] ?? choice.face,
                }),
            );
        },
    });
});
