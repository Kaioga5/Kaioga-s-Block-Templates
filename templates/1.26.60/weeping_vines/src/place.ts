// Hanging weeping vines by hand.
// Almost anything is allowed to replace a nether vine, and vanilla makes one
// exception: the vine's own item adds a segment instead of swapping the one
// under the cursor. `minecraft:replaceable` has no way to express that
// exception, so a click that would replace a segment is taken here instead and
// turned into another segment under the curtain.
import { system, world } from "@minecraft/server";
import { VINE_ID } from "./config.js";
import { extend, findTip } from "./growth.js";
import { consumeOne } from "./hand.js";

const PLACE_SOUND = "block.weeping_vines.place";

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }

    // The block-placer item shares the block's identifier, so one comparison
    // covers both sides of the check
    if (event.block.typeId !== VINE_ID || event.itemStack?.typeId !== VINE_ID) {
        return;
    }

    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (block.typeId !== VINE_ID) {
            return;
        }

        // Clicking anywhere on the curtain works on its growing end, so a
        // player does not have to line the cursor up with the lowest segment
        const tip = findTip(block);

        // A hand-placed segment is not held back by the age cap the way random
        // growth is, so the curtain keeps going as long as there is room
        if (tip === undefined || !extend(tip, false)) {
            return;
        }
        block.dimension.playSound(PLACE_SOUND, (tip.below() ?? tip).center());
        consumeOne(player);
    });
});
