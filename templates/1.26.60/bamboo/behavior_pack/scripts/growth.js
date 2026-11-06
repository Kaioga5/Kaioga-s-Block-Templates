// Bamboo growing, and the shoot it starts from.
// Only the top of a plant does any work: the shoot until it has raised its
// first section, then whichever section has nothing bamboo above it.
// Everything under the top asks one question, is there bamboo above me?, and
// stops, which is what keeps a grove of sixteen-tall stalks cheap on random
// ticks.
import { system, } from "@minecraft/server";
import { BAMBOO_ID, GROWTH_CHANCE, MIN_LIGHT } from "./config.js";
import { findTop, growFrom, isBamboo, isMature, isShoot, nextSection, settle } from "./stalk.js";
// The space a shoot or a stalk would grow into has to be empty and lit, which
// is vanilla's pair of conditions
function spaceIsReady(above) {
    return above !== undefined && above.isAir && above.getLightLevel() >= MIN_LIGHT;
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:bamboo_growth", {
        // Bamboo placed on soil is the shoot, which is the block's default
        // permutation, so nothing needs doing. Bamboo placed on bamboo is the
        // next section of that stalk, and the permutation is rewritten here,
        // before anything lands, so the section is right on its first frame
        beforeOnPlayerPlace(event) {
            const below = event.block.below();
            if (!isBamboo(below)) {
                return;
            }
            event.permutationToPlace = nextSection(below, false);
        },
        // A block that landed on a stalk brings that stalk up to date: any
        // shoot with bamboo on it becomes a plain stem, the crown moves up and
        // the stalk fattens once it is tall enough. This also covers bamboo set
        // by a command or a structure, which arrives as the shoot
        onPlace(event) {
            // Rewriting a state on an existing bamboo block fires this too, and
            // that block was just settled. Only a fresh block counts, which is
            // also what stops settle's own writes coming back round
            if (event.previousBlock.type.id === BAMBOO_ID) {
                return;
            }
            // Shape the stalk from its top, wherever in the column the new
            // block landed. A fill or a structure drops its blocks in whatever
            // order it likes, and the top is the block that knows what the
            // sections under it should look like
            settle(findTop(event.block));
        },
        onRandomTick(event) {
            const block = event.block;
            // Anything with bamboo above it is stem and does not grow
            if (isBamboo(block.above())) {
                return;
            }
            // A section that has finished growing stays where it is. A shoot
            // is never finished; it grows the moment it has room and light
            if (!isShoot(block) && isMature(block)) {
                return;
            }
            if (Math.random() >= GROWTH_CHANCE) {
                return;
            }
            if (!spaceIsReady(block.above())) {
                return;
            }
            growFrom(block);
        },
    });
});
