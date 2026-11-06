// Putting a disc in, taking it out, and the music in between.
//
// Two things have to be remembered: which disc is in, and what a comparator
// should read. The comparator number is a block state, because that is what
// drives the redstone. The disc itself is a dynamic property on the block's
// own block entity, because there are more discs than the sixteen values a
// custom block state can hold, and because two discs that share a comparator
// signal still have to come back out as the right item. The block entity
// comes from minecraft:block_entity in the block JSON and lives and dies with
// the block, so nothing has to be cleaned up when a jukebox goes away.
import { BlockPermutation, EquipmentSlot, GameMode, ItemStack, MolangVariableMap, system, world, } from "@minecraft/server";
import { discForItem, nowPlaying, signalFor } from "./discs.js";
// The block and the state that carries the comparator signal
const JUKEBOX_ID = "kai_templates:jukebox";
const SIGNAL_STATE = "kai_templates:signal";
// The key the disc is stored under. Block dynamic properties are private to
// this pack, so the name only has to be unique within it
const DISC_PROPERTY = "disc";
// How loud a record plays. Vanilla records carry to about 64 blocks, and the
// sound definitions already set that distance
const MUSIC_VOLUME = 1;
// How far the "Now playing" line reaches. Vanilla shows it to anyone close
// enough to hear the record start
const ANNOUNCE_RADIUS = 16;
// The note particle a playing jukebox throws, how often, and how far above the
// block it starts
const NOTE_PARTICLE = "minecraft:note_particle";
const NOTE_INTERVAL_TICKS = 10;
const NOTE_HEIGHT = 1.1;
// One channel of a note's colour. Vanilla picks a random pitch for every note
// and turns it into a colour with three sine waves a third of a turn apart,
// which is why notes cycle through the whole rainbow. This is that formula
function noteChannel(pitch, phase) {
    return Math.max(0, Math.sin((pitch + phase) * Math.PI * 2) * 0.65 + 0.35);
}
// The Molang variables for one note. minecraft:note_particle reads its tint
// from variable.note_color, so every spawn hands in a fresh random colour. The
// map is built here, per note, rather than once at load: MolangVariableMap is
// a native class and cannot be constructed during early execution
function noteColour() {
    const pitch = Math.floor(Math.random() * 25) / 24;
    const variables = new MolangVariableMap();
    variables.setColorRGB("variable.note_color", {
        red: noteChannel(pitch, 0),
        green: noteChannel(pitch, 1 / 3),
        blue: noteChannel(pitch, 2 / 3),
    });
    return variables;
}
// The track each jukebox is currently playing, so it can be stopped when the
// disc comes out. Only jukeboxes that are actually playing are in here, and
// every entry owns exactly two timers that are cleared together
const playing = new Map();
// One string key per block cell, usable as a map key
function keyOf(block) {
    return `${block.dimension.id}:${block.x},${block.y},${block.z}`;
}
// Which disc is in this jukebox, by item id, or undefined when it is empty.
// The component is missing while the block is being removed, which reads as
// empty too
function discIn(block) {
    const stored = block
        .getComponent("minecraft:dynamic_properties")
        ?.get(DISC_PROPERTY);
    return typeof stored === "string" ? discForItem(stored) : undefined;
}
// Record the disc and set the signal the comparator reads, or clear both.
// Changing a state keeps the block entity, so the disc survives the signal
// write that follows it
function setDisc(block, disc) {
    block
        .getComponent("minecraft:dynamic_properties")
        ?.set(DISC_PROPERTY, disc?.item);
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve(JUKEBOX_ID, {
        ...states,
        [SIGNAL_STATE]: disc === undefined ? 0 : signalFor(disc),
    }));
}
// Stop whatever the jukebox at this key is playing and drop both of its
// timers. It takes the key rather than the block so it still works for a
// block that has just been broken
function stopMusic(key) {
    const track = playing.get(key);
    if (track === undefined) {
        return;
    }
    track.sound.stop();
    system.clearRun(track.notes);
    system.clearRun(track.ends);
    playing.delete(key);
}
// Start a track: the sound, the note particles over the block, and the line on
// screen for anyone near enough to hear it.
//
// The particles are a timer rather than anything attached to the block,
// because they only run while a track does. It starts when the disc goes in and
// is cleared the moment the music stops, so a world of silent jukeboxes costs
// nothing at all
function startMusic(block, disc) {
    const key = keyOf(block);
    stopMusic(key);
    const centre = block.center();
    const sound = block.dimension.playSound(disc.sound, centre, {
        volume: MUSIC_VOLUME,
    });
    const notes = system.runInterval(() => {
        if (!block.isValid || block.typeId !== JUKEBOX_ID) {
            stopMusic(key);
            return;
        }
        block.dimension.spawnParticle(NOTE_PARTICLE, {
            x: centre.x + (Math.random() - 0.5) * 0.6,
            y: block.y + NOTE_HEIGHT,
            z: centre.z + (Math.random() - 0.5) * 0.6,
        }, noteColour());
    }, NOTE_INTERVAL_TICKS);
    // A track that runs out on its own stops the notes and clears the entry.
    // The disc stays in the jukebox, the way it does in vanilla
    const ends = system.runTimeout(() => stopMusic(key), Math.ceil(disc.seconds * 20));
    playing.set(key, { sound, notes, ends });
    for (const player of block.dimension.getPlayers({
        location: centre,
        maxDistance: ANNOUNCE_RADIUS,
    })) {
        player.onScreenDisplay.setActionBar(nowPlaying(disc));
    }
}
// Eject the disc onto the top of the jukebox, the way vanilla does. It goes on
// the block rather than into the player's hands so a disc can never end up in
// two places at once
function ejectDisc(block, disc) {
    block.dimension.spawnItem(new ItemStack(disc.item, 1), {
        x: block.x + 0.5,
        y: block.y + 1.05,
        z: block.z + 0.5,
    });
}
// Take one disc out of the player's hand, except in creative
function consumeOne(player, held) {
    if (player.getGameMode() === GameMode.Creative) {
        return;
    }
    const equipment = player.getComponent("minecraft:equippable");
    if (equipment === undefined) {
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
// Music discs are vanilla items, so none of them can carry a custom component.
// The interact-with-block before-event names the exact item used and can be
// cancelled, which is what stops the disc from being placed or consumed twice
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { block, player, itemStack: held, isFirstEvent } = event;
    if (block.typeId !== JUKEBOX_ID || !isFirstEvent) {
        return;
    }
    const loaded = discIn(block);
    // A loaded jukebox ejects whatever is in it, whether or not the player is
    // holding anything
    if (loaded !== undefined) {
        event.cancel = true;
        system.run(() => {
            if (block.typeId !== JUKEBOX_ID || discIn(block)?.item !== loaded.item) {
                return;
            }
            stopMusic(keyOf(block));
            setDisc(block, undefined);
            ejectDisc(block, loaded);
        });
        return;
    }
    // An empty one takes a disc, and nothing else
    if (held === undefined) {
        return;
    }
    const disc = discForItem(held.typeId);
    if (disc === undefined) {
        return;
    }
    event.cancel = true;
    system.run(() => {
        if (block.typeId !== JUKEBOX_ID || discIn(block) !== undefined) {
            return;
        }
        setDisc(block, disc);
        startMusic(block, disc);
        consumeOne(player, held);
    });
});
// Breaking a loaded jukebox stops the music and drops the disc. The block
// entity is already gone by the time the block's own break hooks run, so the
// disc has to be read here, in the before-event, while the block still
// stands. Everything else waits a tick: a before-event may not spawn items or
// stop sounds, and by then the break has either happened or been cancelled
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const { block, player } = event;
    if (block.typeId !== JUKEBOX_ID) {
        return;
    }
    const loaded = discIn(block);
    if (loaded === undefined) {
        return;
    }
    const key = keyOf(block);
    const { dimension, x, y, z } = block;
    const creative = player.getGameMode() === GameMode.Creative;
    system.run(() => {
        // Still a jukebox: something cancelled the break, so the disc stays in
        if (block.isValid && block.typeId === JUKEBOX_ID) {
            return;
        }
        stopMusic(key);
        if (creative) {
            return;
        }
        dimension.spawnItem(new ItemStack(loaded.item, 1), {
            x: x + 0.5,
            y: y + 0.5,
            z: z + 0.5,
        });
    });
});
