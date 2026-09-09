// A dripleaf getting taller, by bone meal or by hand, and coming down as one
// plant when any part of it is broken.
// Growing pushes the head up one block and leaves a stem segment behind, which
// is exactly how vanilla builds a tall dripleaf. Two things can start that:
// bone meal, claimed on the interact-with-block before-event so the vanilla
// handler does not also fire; and a player stacking one dripleaf on another,
// which arrives through this file's own block component.
import { BlockPermutation, EquipmentSlot, GameMode, system, world, } from "@minecraft/server";
import { BONE_MEAL_CHANCE, BONE_MEAL_ID, CASCADE_TICKS, DRIPLEAF_ID, FACING_STATE, HEAD_STATE, MAX_HEIGHT, TILT_STATE, } from "./config.js";
const GROWTH_PARTICLE = "minecraft:crop_growth_emitter";
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
        return;
    }
    equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
}
// Walk up to the leaf at the top of this plant
function findHead(block) {
    let current = block;
    for (let step = 0; step < MAX_HEIGHT; step++) {
        if (current.permutation.getAllStates()[HEAD_STATE] === true) {
            return current;
        }
        const above = current.above();
        if (above === undefined || above.typeId !== DRIPLEAF_ID) {
            return undefined;
        }
        current = above;
    }
    return undefined;
}
// How many blocks of plant stand under and including this one
function heightOf(head) {
    let height = 1;
    for (let step = 1; step < MAX_HEIGHT; step++) {
        const below = head.below(step);
        if (below === undefined || below.typeId !== DRIPLEAF_ID) {
            break;
        }
        height++;
    }
    return height;
}
function grow(head) {
    if (heightOf(head) >= MAX_HEIGHT) {
        return;
    }
    const above = head.above();
    if (above === undefined || !above.isAir) {
        return;
    }
    // The head moves up and what it leaves behind becomes stem. Keeping the
    // facing means a grown dripleaf still points the way it was planted
    const states = head.permutation.getAllStates();
    above.setPermutation(BlockPermutation.resolve(DRIPLEAF_ID, { ...states, [HEAD_STATE]: true, [TILT_STATE]: "none" }));
    head.setPermutation(BlockPermutation.resolve(DRIPLEAF_ID, { ...states, [HEAD_STATE]: false, [TILT_STATE]: "none" }));
}
// Break the plant block at `cell` the way a player would, so it drops its
// item and plays its break effect, then move on to the next one in the same
// direction a moment later. The chain stops at the first block that is not
// this plant, and each step reads the world again, so a block that is already
// gone ends the chain rather than being broken twice
function cascade(dimension, cell, step) {
    let block;
    try {
        block = dimension.getBlock(cell);
    }
    catch {
        // Unloaded or out of the world, nothing more to bring down
        return;
    }
    if (block === undefined || block.typeId !== DRIPLEAF_ID) {
        return;
    }
    dimension.runCommand(`setblock ${cell.x} ${cell.y} ${cell.z} air destroy`);
    system.runTimeout(() => cascade(dimension, { x: cell.x, y: cell.y + step, z: cell.z }, step), CASCADE_TICKS);
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:dripleaf_growth", {
        // A dripleaf placed on top of another one joins the plant, so it takes
        // the facing of the block under it rather than the player's. The
        // permutation is rewritten here, before anything lands, which is the
        // one moment a script can change what gets placed
        beforeOnPlayerPlace(event) {
            const below = event.block.below();
            if (below === undefined || below.typeId !== DRIPLEAF_ID) {
                return;
            }
            const facing = below.permutation.getAllStates()[FACING_STATE];
            if (facing === undefined) {
                return;
            }
            const states = event.permutationToPlace.getAllStates();
            event.permutationToPlace = BlockPermutation.resolve(DRIPLEAF_ID, {
                ...states,
                [FACING_STATE]: facing,
            });
        },
        // Placing a dripleaf onto another one raises the plant rather than
        // leaving two heads stacked on top of each other: the new block becomes
        // the head and the one it landed on turns into stem
        onPlace(event) {
            const block = event.block;
            const below = block.below();
            if (below === undefined || below.typeId !== DRIPLEAF_ID) {
                return;
            }
            if (below.permutation.getAllStates()[HEAD_STATE] !== true) {
                return;
            }
            const states = below.permutation.getAllStates();
            below.setPermutation(BlockPermutation.resolve(DRIPLEAF_ID, {
                ...states,
                [HEAD_STATE]: false,
                [TILT_STATE]: "none",
            }));
        },
        // Breaking any part of the plant brings the whole plant down, the way
        // vanilla's stem and head depend on each other: the stems below the
        // cut have nothing to hold up and the blocks above have nothing to
        // stand on. Both chains start from the broken cell and run away from
        // it one block at a time, so a tall plant visibly collapses rather
        // than vanishing
        onPlayerBreak(event) {
            const { block, dimension } = event;
            const { x, y, z } = block;
            system.run(() => {
                cascade(dimension, { x, y: y - 1, z }, -1);
                cascade(dimension, { x, y: y + 1, z }, 1);
            });
        },
    });
});
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!event.isFirstEvent) {
        return;
    }
    if (event.block.typeId !== DRIPLEAF_ID || event.itemStack?.typeId !== BONE_MEAL_ID) {
        return;
    }
    const { block, player } = event;
    event.cancel = true;
    system.run(() => {
        if (block.typeId !== DRIPLEAF_ID) {
            return;
        }
        const head = findHead(block);
        if (head === undefined) {
            return;
        }
        block.dimension.spawnParticle(GROWTH_PARTICLE, head.center());
        block.dimension.playSound("item.bone_meal.use", head.center());
        consumeOne(player);
        if (Math.random() < BONE_MEAL_CHANCE) {
            grow(head);
        }
    });
});
