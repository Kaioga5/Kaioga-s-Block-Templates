// Eating a slice.
//
// Cake is the only vanilla block a bare right-click takes a piece out of, so
// the whole behaviour fits in one interact handler: feed the player, move the
// bite counter on, and take the block away when the last slice goes.
import { system, } from "@minecraft/server";
import { CAKE_ID, MAX_BITES, biteCount, setBites } from "./cake.js";
import { EAT_SOUND, feed, heldItemId } from "./food.js";
import { isCandle } from "./candle.js";
// Take one slice out of this cake
function eatSlice(block) {
    block.dimension.playSound(EAT_SOUND, block.center());
    const bites = biteCount(block) + 1;
    if (bites > MAX_BITES) {
        // The seventh bite finishes the cake. Vanilla leaves nothing behind, not
        // even an item, so the block is simply removed
        block.setType("minecraft:air");
        return;
    }
    setBites(block, bites);
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:cake_eat", {
        // A right-click on any face eats, whatever is in the hand and whether or
        // not the player is sneaking. Both were measured on the vanilla block: a
        // stack of stone in hand still ate the cake instead of placing a block
        onPlayerInteract(event) {
            const { block, player } = event;
            if (player === undefined || block.typeId !== CAKE_ID) {
                return;
            }
            // The one exception. A candle goes on the cake instead of taking a bite
            // out of it, and candle.ts owns that click
            if (isCandle(heldItemId(player))) {
                return;
            }
            if (!feed(player)) {
                return;
            }
            eatSlice(block);
        },
    });
});
