// Makes two half slabs merge into a double slab, the way vanilla slabs do.
// The engine has no native support for this on custom blocks, so one custom
// component is registered twice: as a block component (to catch the normal
// placement path) and as an item component (to catch clicks the engine never
// turns into a placement, because the target cell is already occupied).
import { BlockPermutation, Direction, EntityComponentTypes, EquipmentSlot, GameMode, ItemStack, Player, system, } from "@minecraft/server";
// The double state every slab in this template declares, and the place sound
const DOUBLE_STATE = "kai_templates:double";
const PLACE_SOUND = "use.stone";
// Whether the extra double-slab drop needs a pickaxe, matching the loot table
const NEEDS_PICKAXE = true;
// Cells where a slab was placed normally in the last few ticks. The item
// handler checks this so it never merges a slab the same click just placed
const justPlaced = new Map();
// One string key per block cell, usable as a map key
function keyOf(block) {
    return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}
// Step from a block to the neighbor through a face. With opposite=true the
// step goes the other way, from a placement cell back to the clicked block
function throughFace(block, face, opposite) {
    switch (face) {
        case Direction.Up:
            return opposite ? block.below() : block.above();
        case Direction.Down:
            return opposite ? block.above() : block.below();
        case Direction.North:
            return opposite ? block.south() : block.north();
        case Direction.South:
            return opposite ? block.north() : block.south();
        case Direction.East:
            return opposite ? block.west() : block.east();
        case Direction.West:
            return opposite ? block.east() : block.west();
    }
}
// True if the block is the given slab as a single half, not yet doubled.
// Matching by the exact id means only the same slab merges, anything else
// places normally instead.
// getState is typed for vanilla state names only, so custom states are read
// through getAllStates instead
function isHalfSlabOf(block, slabId) {
    return (block !== undefined &&
        block.typeId === slabId &&
        block.permutation.getAllStates()[DOUBLE_STATE] === false);
}
// Take one item from the player's main hand, except in creative mode
function consumeOne(player) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const equip = player.getComponent(EntityComponentTypes.Equippable);
    const held = equip?.getEquipment(EquipmentSlot.Mainhand);
    if (equip === undefined || held === undefined) {
        return;
    }
    if (held.amount > 1) {
        held.amount -= 1;
        equip.setEquipment(EquipmentSlot.Mainhand, held);
    }
    else {
        equip.setEquipment(EquipmentSlot.Mainhand, undefined);
    }
}
// Flip a half slab to its double state, keeping every other state it has
function makeDouble(block, player) {
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(block.typeId, { ...states, [DOUBLE_STATE]: true }));
    // A double slab is a full cube, so it cannot stay waterlogged
    if (block.isWaterlogged) {
        block.setWaterlogged(false);
    }
    block.dimension.playSound(PLACE_SOUND, block.center());
    if (player !== undefined) {
        consumeOne(player);
    }
}
// The normal placement path: the player clicked the flat face of an existing
// half slab, and the engine wants to place a new slab in the next cell over.
// Cancel that and double the existing slab instead
function beforeOnPlayerPlace(event) {
    const { block, face, player } = event;
    // The block the player actually clicked sits on the other side of the
    // face the placement came through
    const clicked = throughFace(block, face, true);
    // Only the exposed flat face of the same slab merges: the top of a
    // bottom slab, or the bottom of a top slab. Side clicks and every other
    // target place a new slab, like vanilla
    if (isHalfSlabOf(clicked, event.permutationToPlace.type.id)) {
        const half = clicked.permutation.getAllStates()["minecraft:vertical_half"];
        const slabId = clicked.typeId;
        if ((half === "bottom" && face === Direction.Up) ||
            (half === "top" && face === Direction.Down)) {
            // Before-events are read-only, cancel now, mutate next tick
            event.cancel = true;
            system.run(() => {
                if (isHalfSlabOf(clicked, slabId)) {
                    makeDouble(clicked, player);
                }
            });
            return;
        }
    }
    // A normal placement. Record the cell on EVERY path that does not merge,
    // so the item handler below never doubles the slab this click just
    // placed, missing this guard is how a fresh slab doubles instantly
    justPlaced.set(keyOf(block), system.currentTick);
}
// A double slab is two slabs. The engine drops one; add the second
function onPlayerBreak(event) {
    if (event.brokenBlockPermutation.getAllStates()[DOUBLE_STATE] !== true) {
        return;
    }
    const player = event.player;
    if (player === undefined || player.getGameMode() === GameMode.Creative) {
        return;
    }
    // The loot table only drops with the right tool, match that here, or
    // hand-breaking a double slab would still give one item
    if (NEEDS_PICKAXE) {
        const held = player
            .getComponent(EntityComponentTypes.Equippable)
            ?.getEquipment(EquipmentSlot.Mainhand);
        if (held === undefined || !held.hasTag("minecraft:is_pickaxe")) {
            return;
        }
    }
    const { x, y, z } = event.block.location;
    event.dimension.spawnItem(new ItemStack(event.brokenBlockPermutation.type.id), { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
}
// The item path: clicks where the engine never fires a placement because the
// target cell is already occupied, for example clicking a block whose
// neighbor cell holds the matching half slab
function onUseOn(event) {
    const { block, blockFace, source, itemStack } = event;
    if (itemStack === undefined) {
        return;
    }
    const slabId = itemStack.typeId;
    // Case 1: the cell on the far side of the clicked face already holds a
    // matching half slab. Placing into an occupied slab cell from a neighbor
    // always completes it, whichever face was clicked, vanilla does the same
    const target = throughFace(block, blockFace, false);
    let merge;
    if (isHalfSlabOf(target, slabId)) {
        merge = target;
    }
    else if (isHalfSlabOf(block, slabId)) {
        // Case 2: the clicked block itself is the half slab, clicked on its
        // exposed flat face
        const half = block.permutation.getAllStates()["minecraft:vertical_half"];
        if ((half === "bottom" && blockFace === Direction.Up) ||
            (half === "top" && blockFace === Direction.Down)) {
            merge = block;
        }
    }
    if (merge === undefined) {
        return;
    }
    const cell = keyOf(merge);
    const mergeBlock = merge;
    // Wait a tick: if this same click just placed that slab (or the block
    // path already merged it), skip so one click never counts twice
    system.runTimeout(() => {
        if (system.currentTick - (justPlaced.get(cell) ?? -100) <= 5) {
            return;
        }
        if (!isHalfSlabOf(mergeBlock, slabId)) {
            return;
        }
        makeDouble(mergeBlock, source instanceof Player ? source : undefined);
    }, 1);
}
// Register the same component name in both registries before world load
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:stone_slab_combine", {
        beforeOnPlayerPlace,
        onPlayerBreak,
    });
    init.itemComponentRegistry.registerCustomComponent("kai_templates:stone_slab_combine", {
        onUseOn,
    });
});
