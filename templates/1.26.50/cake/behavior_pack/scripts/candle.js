// The candle on the cake: putting it there, lighting it, snuffing it, and
// what happens when somebody eats the cake out from under it.
//
// Candles and igniters are vanilla items, and a pack cannot add a component to
// a vanilla item without overriding it for every other pack in the world. So
// the two clicks that arrive with an item in hand are caught on the
// interact-with-block before-event, which still says exactly what was held and
// can be cancelled. Everything else is a plain interact on the block.
import { BlockPermutation, EquipmentSlot, GameMode, ItemStack, system, world, } from "@minecraft/server";
import { BITE_STATE, CAKE_ID, CANDLE_CAKE_ID, LIT_STATE, biteCount, isLit, setLit, } from "./cake.js";
import { EAT_SOUND, feed, heldItemId } from "./food.js";
// Vanilla gives every candle colour a cake block of its own: seventeen
// identifiers, not one block with a colour state, because a block state cannot
// carry a texture. This template matches that, so the plain candle and all
// sixteen dyed ones each have their own block, their own textures and their
// own loot table. Leaving one out is not a cosmetic gap: the white candle is
// hard to tell from the plain one in the inventory, so a missing colour reads
// as "candles do not work".
const CANDLE_COLOURS = [
    "white",
    "orange",
    "magenta",
    "light_blue",
    "yellow",
    "lime",
    "pink",
    "gray",
    "light_gray",
    "cyan",
    "purple",
    "blue",
    "brown",
    "green",
    "red",
    "black",
];
// The plain candle first, then one entry per colour. Both sides are derived
// from the same name, so a new candle is one line in the list above plus its
// block, loot table and textures
const CANDLE_CAKES = [
    { item: "minecraft:candle", block: CANDLE_CAKE_ID },
    ...CANDLE_COLOURS.map((colour) => ({
        item: `minecraft:${colour}_candle`,
        block: `kai_templates:${colour}_candle_cake`,
    })),
];
const CAKE_BY_CANDLE = new Map(CANDLE_CAKES.map((pair) => [pair.item, pair.block]));
// What the block hands back when the candle comes off, whether that is a bite
// or a pickaxe. Kept next to the table above so the two stay in step
const CANDLE_BY_CAKE = new Map(CANDLE_CAKES.map((pair) => [pair.block, pair.item]));
// The items that light a candle
const IGNITERS = ["minecraft:flint_and_steel", "minecraft:fire_charge"];
// Vanilla's own candle flame, paired with an occasional wisp of smoke. Both
// are self-contained particle files: they read no Molang variables, so they
// can be spawned with a bare position
const FLAME_PARTICLE = "minecraft:candle_flame_particle";
const SMOKE_PARTICLE = "minecraft:basic_smoke_particle";
// Vanilla's chance of adding smoke on top of the flame
const SMOKE_CHANCE = 0.3;
// Where the flame sits: the top of the candle body, two pixels up, on the
// block's centre line. The geometry is authored with X mirrored, because
// Bedrock draws model -X on the world's east side, but this candle is
// centred, so the mirroring makes no difference to the number
const FLAME_OFFSET = { x: 0.5, y: 1, z: 0.5 };
// Vanilla sounds for each action
const ADD_SOUND = "cake.add_candle";
const LIGHT_SOUND = "fire.ignite";
const EXTINGUISH_SOUND = "extinguish.candle";
// True for an item this cake accepts as a candle. eat.ts asks so that a candle
// click is never also a bite
export function isCandle(itemId) {
    return itemId !== undefined && CAKE_BY_CANDLE.has(itemId);
}
// Take one item out of the player's main hand, except in creative
function consumeOne(player) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const equipment = player.getComponent("minecraft:equippable");
    const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
    if (equipment === undefined || held === undefined) {
        return;
    }
    if (held.amount > 1) {
        held.amount -= 1;
        equipment.setEquipment(EquipmentSlot.Mainhand, held);
    }
    else {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    }
}
// Take one point of durability off flint and steel, or one item off a stack
function payForIgnition(player, equipment, held) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const durability = held.getComponent("minecraft:durability");
    if (durability !== undefined) {
        // Break the tool if that was its last point
        if (durability.damage + 1 >= durability.maxDurability) {
            equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
        }
        else {
            durability.damage += 1;
            equipment.setEquipment(EquipmentSlot.Mainhand, held);
        }
        return;
    }
    // A fire charge is consumed instead
    if (held.amount > 1) {
        held.amount -= 1;
        equipment.setEquipment(EquipmentSlot.Mainhand, held);
    }
    else {
        equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    }
}
// Put the candle back into the world, which is what both eating the cake and
// breaking the block do
function dropCandle(block) {
    const item = CANDLE_BY_CAKE.get(block.typeId);
    if (item === undefined) {
        return;
    }
    block.dimension.spawnItem(new ItemStack(item, 1), block.center());
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { block, player, itemStack: held } = event;
    const heldId = held?.typeId;
    if (heldId === undefined) {
        return;
    }
    // A candle on a whole cake. A cake with a bite out of it refuses, the same
    // way vanilla does: the candle cake has no bite counter to carry
    const cakeBlock = CAKE_BY_CANDLE.get(heldId);
    if (cakeBlock !== undefined && block.typeId === CAKE_ID && biteCount(block) === 0) {
        // Before-events are read-only, cancel now, mutate next tick
        event.cancel = true;
        system.run(() => {
            if (block.typeId !== CAKE_ID || biteCount(block) !== 0) {
                return;
            }
            block.setPermutation(BlockPermutation.resolve(cakeBlock, { [LIT_STATE]: false }));
            block.dimension.playSound(ADD_SOUND, block.center());
            consumeOne(player);
        });
        return;
    }
    // An igniter on a candle that is not already burning
    if (CANDLE_BY_CAKE.has(block.typeId) && IGNITERS.includes(heldId) && !isLit(block)) {
        const equipment = player.getComponent("minecraft:equippable");
        // Before-events are read-only, cancel now, mutate next tick
        event.cancel = true;
        system.run(() => {
            if (!CANDLE_BY_CAKE.has(block.typeId) || isLit(block)) {
                return;
            }
            setLit(block, true);
            block.dimension.playSound(LIGHT_SOUND, block.center());
            if (equipment !== undefined && held !== undefined) {
                payForIgnition(player, equipment, held);
            }
        });
    }
});
system.beforeEvents.startup.subscribe((init) => {
    // Vanilla runs the flame and the smoke from the renderer every frame; a pack
    // has no hook that cheap, so this rides the random tick instead, with no
    // timer and no ticking component, and the block is only touched when the
    // world picks it. The puffs are far rarer than vanilla's as a result;
    // randomTickSpeed is the knob for a denser effect
    init.blockComponentRegistry.registerCustomComponent("kai_templates:candle_cake_particles", {
        onRandomTick(event) {
            const { block } = event;
            if (!isLit(block)) {
                return;
            }
            const at = {
                x: block.x + FLAME_OFFSET.x,
                y: block.y + FLAME_OFFSET.y,
                z: block.z + FLAME_OFFSET.z,
            };
            block.dimension.spawnParticle(FLAME_PARTICLE, at);
            if (Math.random() < SMOKE_CHANCE) {
                block.dimension.spawnParticle(SMOKE_PARTICLE, at);
            }
        },
    });
    init.blockComponentRegistry.registerCustomComponent("kai_templates:candle_cake_interact", {
        onPlayerInteract(event) {
            const { block, player } = event;
            if (player === undefined || !CANDLE_BY_CAKE.has(block.typeId)) {
                return;
            }
            // Lighting arrives through the before-event above, so leave that click
            // alone rather than eating the cake out from under it
            const heldId = heldItemId(player);
            if (heldId !== undefined && IGNITERS.includes(heldId)) {
                return;
            }
            // A burning candle is snuffed first. Only once it is out does the same
            // click start taking slices
            if (isLit(block)) {
                setLit(block, false);
                block.dimension.playSound(EXTINGUISH_SOUND, block.center());
                return;
            }
            if (!feed(player)) {
                return;
            }
            // The first bite knocks the candle off and leaves a cake missing a
            // slice, which is where the bite counter starts again
            dropCandle(block);
            block.dimension.playSound(EAT_SOUND, block.center());
            block.setPermutation(BlockPermutation.resolve(CAKE_ID, { [BITE_STATE]: 1 }));
        },
    });
});
