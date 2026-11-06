// The bed block's custom component: what a click on either half does.
//
// The checks run in vanilla's order, each with vanilla's chat message:
// the Overworld, the distance, whether someone is already in it, water over
// the pillow, the spawn point, the time of day and nearby monsters.
import { ButtonState, Direction, EntityDamageCause, EquipmentSlot, GameMode, InputButton, Player, system, WeatherType, world, } from "@minecraft/server";
import { BED_ID, FACING, HEAD_STEP, PART, isSleeping, sleep, sleeperOf, weatherIn } from "./sleep.js";
// A click counts from under two and a half blocks of the head block's centre,
// measured from the player's feet
const REACH = 2.5;
// Monsters this close to the head block, horizontally and vertically, keep a
// survival player awake
const MONSTER_RANGE = { horizontal: 8, vertical: 5 };
// Both halves of the bed, whichever one was clicked
function bedParts(block) {
    const parts = block.getParts();
    if (!parts)
        return undefined;
    const head = parts.find((p) => p.permutation.getState(PART) === 1);
    const foot = parts.find((p) => p.permutation.getState(PART) === 0);
    if (!head || !foot)
        return undefined;
    const facing = String(head.permutation.getState(FACING));
    return { head, foot, facing };
}
// Vanilla lets a player sleep at any time in a thunderstorm, from 12010 to
// 23991 in the rain, and from 12542 to 23459 otherwise: the rain darkens the
// sky early. All four ends were measured against the vanilla bed
function canSleepNow(block) {
    const weather = weatherIn(block.dimension.id);
    if (weather === WeatherType.Thunder)
        return true;
    const time = world.getTimeOfDay();
    if (weather === WeatherType.Rain)
        return time >= 12010 && time <= 23991;
    return time >= 12542 && time <= 23459;
}
function tell(player, key) {
    player.sendMessage({ translate: key });
}
function centre(block) {
    return { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
}
function monstersNear(head) {
    const { x, y, z } = { x: head.x + 0.5, y: head.y, z: head.z + 0.5 };
    const monsters = head.dimension.getEntities({
        families: ["monster"],
        location: { x, y, z },
        maxDistance: Math.hypot(MONSTER_RANGE.horizontal, MONSTER_RANGE.vertical, MONSTER_RANGE.horizontal),
    });
    return monsters.some((m) => Math.abs(m.location.x - x) <= MONSTER_RANGE.horizontal &&
        Math.abs(m.location.y - y) <= MONSTER_RANGE.vertical &&
        Math.abs(m.location.z - z) <= MONSTER_RANGE.horizontal);
}
// Vanilla points the spawn at the block the player stood on when they used
// the bed, and says so only when that changes the spawn point
function setSpawn(player) {
    const at = {
        x: Math.floor(player.location.x),
        y: Math.floor(player.location.y),
        z: Math.floor(player.location.z),
    };
    const current = player.getSpawnPoint();
    if (current &&
        current.dimension.id === player.dimension.id &&
        current.x === at.x &&
        current.y === at.y &&
        current.z === at.z) {
        return;
    }
    player.setSpawnPoint({ dimension: player.dimension, ...at });
    tell(player, "tile.bed.respawnSet");
}
// A spawn point a bed set lasts only as long as the bed. In vanilla a player
// whose bed has gone comes back at the world spawn and is told "Your home bed
// was missing or obstructed". The bed that set a player's spawn is remembered
// on the player; once a second the bed is looked for, and when it has gone the
// spawn point is dropped, so the game itself sends the player to the world
// spawn, and the message waits for their next respawn
const HOME_PROPERTY = "kai_templates:bed_home";
function rememberHome(player, head) {
    const spawn = player.getSpawnPoint();
    if (!spawn)
        return;
    const home = {
        dimension: head.dimension.id,
        head: head.location,
        spawn: { x: spawn.x, y: spawn.y, z: spawn.z },
    };
    player.setDynamicProperty(HOME_PROPERTY, JSON.stringify(home));
}
function readHome(player) {
    try {
        const raw = player.getDynamicProperty(HOME_PROPERTY);
        return typeof raw === "string" ? JSON.parse(raw) : undefined;
    }
    catch {
        return undefined;
    }
}
function checkHome(player) {
    const home = readHome(player);
    if (!home || home.missing)
        return;
    const spawn = player.getSpawnPoint();
    // A spawn point set some other way since is not this bed's business
    if (!spawn ||
        spawn.dimension.id !== home.dimension ||
        spawn.x !== home.spawn.x ||
        spawn.y !== home.spawn.y ||
        spawn.z !== home.spawn.z) {
        player.setDynamicProperty(HOME_PROPERTY, undefined);
        return;
    }
    let bed;
    try {
        bed = world.getDimension(home.dimension).getBlock(home.head);
    }
    catch {
        return; // Not loaded: the bed may well be there
    }
    if (bed === undefined)
        return;
    if (bed.typeId === BED_ID && bed.permutation.getState(PART) === 1)
        return;
    player.setSpawnPoint(undefined);
    player.setDynamicProperty(HOME_PROPERTY, JSON.stringify({ ...home, missing: true }));
}
system.runInterval(() => {
    for (const player of world.getAllPlayers())
        checkHome(player);
}, 20);
// The same check at death catches a bed lost in the last second
world.afterEvents.entityDie.subscribe((event) => {
    if (event.deadEntity instanceof Player)
        checkHome(event.deadEntity);
});
world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn)
        return;
    const home = readHome(event.player);
    if (!home?.missing)
        return;
    event.player.setDynamicProperty(HOME_PROPERTY, undefined);
    tell(event.player, "tile.bed.notValid");
});
// A bed used anywhere but the Overworld blows up, as vanilla's does
function explode(head, foot) {
    if (!world.gameRules.respawnBlocksExplode)
        return;
    const at = centre(head);
    const dimension = head.dimension;
    head.setType("minecraft:air");
    if (foot.isValid && foot.typeId === BED_ID)
        foot.setType("minecraft:air");
    dimension.createExplosion(at, 5, { causesFire: true, breaksBlocks: true });
}
function tryToSleep(player, block) {
    if (isSleeping(player))
        return;
    const bed = bedParts(block);
    if (!bed)
        return;
    const { head, foot, facing } = bed;
    if (!HEAD_STEP[facing])
        return;
    if (head.dimension.id !== "minecraft:overworld") {
        explode(head, foot);
        return;
    }
    const c = centre(head);
    const p = player.location;
    if (Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) >= REACH) {
        tell(player, "tile.bed.tooFar");
        return;
    }
    if (sleeperOf(head.dimension, head.location)) {
        tell(player, "tile.bed.occupied");
        return;
    }
    // A bed whose head is under water does nothing at all, not even set the
    // spawn point, unless the player can breathe there
    if (head.isWaterlogged && !player.getEffect("water_breathing") && !player.getEffect("conduit_power"))
        return;
    setSpawn(player);
    rememberHome(player, head);
    if (!canSleepNow(head)) {
        tell(player, "tile.bed.noSleep");
        return;
    }
    const mode = player.getGameMode();
    if (mode !== GameMode.Creative && mode !== GameMode.Spectator && monstersNear(head)) {
        tell(player, "tile.bed.notSafe");
        return;
    }
    sleep(player, head, foot, facing);
}
// For a creature the first step up is 0.7409 x the speed at touchdown, less
// 0.0195: a fit to 80 vanilla bounces that lands within 0.005 of every one
const CREATURE = { gravity: 0.08, drag: 0.98, kept: 0.7409, loss: 0.0195 };
// A chicken lands at its flapping speed and bounces less than that fit gives
const CHICKEN = { ...CREATURE, maxSpeed: 0.114, loss: 0.0465 };
// An object keeps three quarters of its speed, and then the tick's gravity and
// drag make its first step up
const ITEM = { gravity: 0.04, drag: 0.98, kept: 0.75, loss: 0, pushIsSpeed: true };
const BOAT = { gravity: 0.04, drag: 0.98, kept: 0.75, loss: 0 };
// A minecart falls without air drag, and keeps a little less
const MINECART = { gravity: 0.04, drag: 1, kept: 0.7125, loss: 0, pushIsSpeed: true };
const OBJECTS = {
    "minecraft:item": ITEM,
    "minecraft:boat": BOAT,
    "minecraft:chest_boat": BOAT,
    "minecraft:minecart": MINECART,
    "minecraft:chest_minecart": MINECART,
    "minecraft:hopper_minecart": MINECART,
    "minecraft:tnt_minecart": MINECART,
    "minecraft:command_block_minecart": MINECART,
};
// The speed at the moment of touching down after a fall of this length,
// replayed tick by tick from rest
function touchdownSpeed(faller, distance) {
    let covered = 0;
    let speed = 0;
    for (let tick = 0; tick < 400; tick++) {
        let next = (speed + faller.gravity) * faller.drag;
        if (faller.maxSpeed !== undefined)
            next = Math.min(next, faller.maxSpeed);
        if (covered + next >= distance)
            return speed + (next - speed) * ((distance - covered) / next);
        covered += next;
        speed = next;
    }
    return speed;
}
// The first step back up, in blocks, for a fall of this length
function reboundStep(faller, distance) {
    const touch = touchdownSpeed(faller, distance);
    if (faller === CREATURE || faller === CHICKEN)
        return faller.kept * touch - faller.loss;
    // An object's speed is taken over its whole landing tick, which averages
    // half a tick of gravity more than at touchdown
    const speed = touch + (faller.gravity * faller.drag) / 2;
    return (faller.kept * speed - faller.gravity) * faller.drag;
}
function fallerOf(entity) {
    const object = OBJECTS[entity.typeId];
    if (object)
        return object;
    if (!entity.getComponent("minecraft:health"))
        return undefined;
    return entity.typeId === "minecraft:chicken" ? CHICKEN : CREATURE;
}
function bounce(event) {
    const entity = event.entity;
    if (!entity?.isValid)
        return;
    if (entity instanceof Player) {
        if (entity.isSneaking)
            return;
        if (entity.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed)
            return;
    }
    const faller = fallerOf(entity);
    if (!faller)
        return;
    // The event's distance leaves out the landing tick's own short step onto
    // the mattress, which is the entity's velocity now
    const velocity = entity.getVelocity();
    const step = reboundStep(faller, event.fallDistance + Math.max(0, -velocity.y));
    if (step <= 0)
        return;
    if (entity instanceof Player) {
        // Players refuse applyImpulse; a knockback is the only launch, and it
        // carries on the sideways speed, as vanilla's bounce does. A small one
        // given on the landing tick comes out short, by an amount measured to be
        // steady, so it is sent a little larger
        const send = step < PLAYER_SHORT_BELOW ? (step + PLAYER_SHORT_LOSS) / PLAYER_SHORT_GAIN : step;
        entity.applyKnockback({ x: velocity.x, z: velocity.z }, send);
    }
    else {
        // Keep the sideways speed, replace the fall with the rebound
        const push = faller.pushIsSpeed ? step / faller.drag + faller.gravity : step;
        entity.clearVelocity();
        entity.applyImpulse({ x: velocity.x, y: push, z: velocity.z });
    }
}
// A knockback of k below 0.19 given to a player on the landing tick moves
// them up 1.21k - 0.04 on the next
const PLAYER_SHORT_BELOW = 0.19;
const PLAYER_SHORT_GAIN = 1.21;
const PLAYER_SHORT_LOSS = 0.04;
// Halving the fall means taking fall damage for half the distance: vanilla
// takes a point per block past the first three, so d points from a normal
// landing become (d - 3) / 2, rounded up. The damage the event carries has
// already been cut by the entity's Feather Falling, Protection and
// Resistance, which vanilla applies after the halving, so the cut is taken
// off first and put back after
function fallDamageScale(entity) {
    let points = 0;
    const equipment = entity.getComponent("minecraft:equippable");
    if (equipment) {
        for (const slot of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet]) {
            const enchantments = equipment.getEquipment(slot)?.getComponent("minecraft:enchantable");
            if (!enchantments)
                continue;
            points += enchantments.getEnchantment("protection")?.level ?? 0;
            if (slot === EquipmentSlot.Feet)
                points += 3 * (enchantments.getEnchantment("feather_falling")?.level ?? 0);
        }
    }
    // Four percent less per point, up to twenty points
    let scale = 1 - 0.04 * Math.min(20, points);
    // Twenty percent less per level of Resistance
    const resistance = entity.getEffect("resistance");
    if (resistance)
        scale *= Math.max(0, 1 - 0.2 * (resistance.amplifier + 1));
    return scale;
}
world.beforeEvents.entityHurt.subscribe((event) => {
    if (event.damageSource.cause !== EntityDamageCause.fall)
        return;
    const entity = event.hurtEntity;
    if (entity.getBlockStandingOn()?.typeId !== BED_ID)
        return;
    // A landing arrives still moving down. An ender pearl's damage, which the
    // game also counts as a fall, arrives standing still, and vanilla does not
    // halve it on a bed
    if (entity.getVelocity().y >= 0)
        return;
    const scale = fallDamageScale(entity);
    if (scale <= 0)
        return;
    const full = Math.round(event.damage / scale);
    const halved = Math.ceil((full - 3) / 2);
    if (halved <= 0)
        event.cancel = true;
    else
        event.damage = halved * scale;
});
// Vanilla only places a bed whose two halves both stand on something that
// could hold a torch: a full-height top at the middle of the block. Glass and
// fences count; air, water, bottom slabs, leaves, carpet, grass and torches do
// not. Once placed, the bed stays put whatever happens underneath it
function supportsBed(block) {
    if (!block || block.isAir || block.isLiquid)
        return false;
    if (block.hasTag("minecraft:leaves"))
        return false;
    // Drop a ray down the middle from half a block above. It has to land on
    // the top of this block, and that top has to be at full height: the hit's
    // faceLocation.y reads 0 for a full-height top and 0.5 for a bottom slab
    const hit = block.dimension.getBlockFromRay({ x: block.x + 0.5, y: block.y + 1.5, z: block.z + 0.5 }, { x: 0, y: -1, z: 0 }, { maxDistance: 1, includePassableBlocks: false, includeLiquidBlocks: false });
    if (!hit || hit.face !== Direction.Up)
        return false;
    if (hit.block.x !== block.x || hit.block.y !== block.y || hit.block.z !== block.z)
        return false;
    const top = hit.faceLocation.y;
    return top < 0.01 || top > 0.99;
}
function checkPlacement(event) {
    const facing = String(event.permutationToPlace.getState(FACING));
    const step = HEAD_STEP[facing];
    if (!step)
        return;
    const foot = event.block;
    const head = foot.offset(step);
    if (!supportsBed(foot.below()) || !supportsBed(head?.below()))
        event.cancel = true;
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:bed", {
        onPlayerInteract(event) {
            const { block, player } = event;
            if (!player || block.typeId !== BED_ID)
                return;
            tryToSleep(player, block);
        },
        onEntityFallOn: bounce,
        beforeOnPlayerPlace: checkPlacement,
    });
});
