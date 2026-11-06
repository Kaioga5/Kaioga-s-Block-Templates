// The half of a wall the connection trait cannot see: the block sitting on top.
// Vanilla asks that block two separate questions, does it cover the middle four
// pixels of the wall top, and does it cover the two-pixel strip running from the
// middle out to each connected side. The first decides the centre post, the
// second raises that one side from 14 pixels to 16. Nothing here ticks; the five
// states are rewritten on the tick after the cell above a wall changes, after
// the wall gains or loses a neighbour, and after a wall it is stacked under
// changes shape.
import { BlockPermutation, LiquidType, system, world, } from "@minecraft/server";
const WALL_ID = "kai_templates:wall";
const SIDES = ["north", "south", "east", "west"];
// Written by this file and read by the block's bone_visibility
const POST_COVER = "kai_templates:post_cover";
const TALL = {
    north: "kai_templates:tall_north",
    south: "kai_templates:tall_south",
    east: "kai_templates:tall_east",
    west: "kai_templates:tall_west",
};
// Written by the connection trait. Read only, never set from script
const CONNECTION = {
    north: "minecraft:connection_north",
    south: "minecraft:connection_south",
    east: "minecraft:connection_east",
    west: "minecraft:connection_west",
};
// A vanilla wall keeps the same two answers under its own names, so one of
// ours standing under one can read them instead of guessing. Both names come
// from the vanilla block palette: wall_post_bit is a boolean, and each
// wall_connection_type_* is "none", "short" or "tall"
const VANILLA_POST = "wall_post_bit";
const VANILLA_CONNECTION = {
    north: "wall_connection_type_north",
    south: "wall_connection_type_south",
    east: "wall_connection_type_east",
    west: "wall_connection_type_west",
};
// Vanilla forces the post under a short list of blocks that rest on almost none
// of the wall top, torches, tripwire, signs, banners, pressure plates. Bedrock
// has no tag for that set, so it is spelled out. Add to it freely
const POST_OVERRIDE_IDS = new Set([
    "minecraft:torch",
    "minecraft:soul_torch",
    "minecraft:redstone_torch",
    "minecraft:unlit_redstone_torch",
    "minecraft:copper_torch",
    "minecraft:underwater_torch",
    "minecraft:colored_torch_blue",
    "minecraft:colored_torch_green",
    "minecraft:colored_torch_purple",
    "minecraft:colored_torch_red",
    "minecraft:trip_wire",
    "minecraft:standing_banner",
    "minecraft:wall_banner",
    // The oak sign and the oak wall sign carry no wood prefix, so the suffix
    // list below never matches them
    "minecraft:standing_sign",
    "minecraft:wall_sign",
]);
// The families vanilla stores as one tag each, matched by name ending. Hanging
// signs are not in vanilla's list, so they are left out on purpose
const POST_OVERRIDE_SUFFIXES = [
    "_pressure_plate",
    "_standing_sign",
    "_wall_sign",
];
// A block from any pack can join the list by carrying this tag, so a custom
// torch works without this file naming it
const POST_OVERRIDE_TAG = "kai_templates:wall_post_override";
const NOTHING = {
    centre: false,
    sides: { north: false, south: false, east: false, west: false },
    forcesPost: false,
};
const EVERYTHING = {
    centre: true,
    sides: { north: true, south: true, east: true, west: true },
    forcesPost: false,
};
// A torch or a pressure plate covers the middle and nothing else
const CENTRE_ONLY = {
    centre: true,
    sides: { north: false, south: false, east: false, west: false },
    forcesPost: false,
};
function connected(states, side) {
    return states[CONNECTION[side]] === true;
}
// The shape rule behind the block's bone_visibility: a wall keeps its post
// unless it runs straight through or meets on all four sides
function structuralPost(states) {
    const north = connected(states, "north");
    const south = connected(states, "south");
    const east = connected(states, "east");
    const west = connected(states, "west");
    const bare = !north && !south && !east && !west;
    return bare || north !== south || east !== west;
}
// Turn the shape of a wall sitting on top into the strips it presses on. Each
// arm runs from its edge past the middle of the block, so an arm covers the
// strip vanilla measures on that side and the middle four pixels on its own,
// post or no post. The post covers the middle and nothing else: it stops 4
// pixels short of every edge, so it never reaches a side strip
function coverFromArms(post, sides) {
    return {
        centre: post || sides.north || sides.south || sides.east || sides.west,
        sides,
        forcesPost: post,
    };
}
// One of our walls on top. Its post is worked out from the world above it
// rather than read back from its own state, so a wall whose states have not
// caught up yet cannot pass a wrong answer down the column
function coverFromWall(above) {
    const states = above.permutation.getAllStates();
    return coverFromArms(showsPost(above), {
        north: connected(states, "north"),
        south: connected(states, "south"),
        east: connected(states, "east"),
        west: connected(states, "west"),
    });
}
// A vanilla wall on top. Same shape, different state names. A short arm counts
// the same as a tall one here: both are full height for collision, and the
// strips are measured against collision
function coverFromVanillaWall(states) {
    return coverFromArms(states[VANILLA_POST] === true, {
        north: states[VANILLA_CONNECTION.north] !== "none",
        south: states[VANILLA_CONNECTION.south] !== "none",
        east: states[VANILLA_CONNECTION.east] !== "none",
        west: states[VANILLA_CONNECTION.west] !== "none",
    });
}
// Is this one of the blocks vanilla lets force the post on its own?
function isPostOverride(block) {
    if (POST_OVERRIDE_IDS.has(block.typeId)) {
        return true;
    }
    for (const suffix of POST_OVERRIDE_SUFFIXES) {
        if (block.typeId.endsWith(suffix)) {
            return true;
        }
    }
    return block.hasTag(POST_OVERRIDE_TAG);
}
// Read the cell above and work out what it covers
function coverAbove(wall) {
    let above;
    try {
        above = wall.above();
    }
    catch {
        // Chunk not loaded, treat it as nothing rather than guess
        return NOTHING;
    }
    if (above === undefined || above.isAir || above.isLiquid) {
        return NOTHING;
    }
    if (above.typeId === WALL_ID) {
        return coverFromWall(above);
    }
    const states = above.permutation.getAllStates();
    // The state itself picks out a vanilla wall, so no list of ids has to be
    // kept up to date. The border block carries the same states and is built to
    // the same shape, so it goes down this path too
    if (states[VANILLA_POST] !== undefined) {
        return coverFromVanillaWall(states);
    }
    if (isPostOverride(above)) {
        return CENTRE_ONLY;
    }
    // Scripts cannot ask a block for the shape of its underside, so this stands
    // in for that test: a block that stops water from flowing has a face solid
    // enough to rest a wall against. Full blocks and bottom slabs pass, torches
    // and flowers do not. A top slab passes too, where vanilla would not, the
    // one place this approximation shows
    return above.isLiquidBlocking(LiquidType.Water) ? EVERYTHING : NOTHING;
}
// A side only rises if the wall connects that way and the block above reaches
// out over it
function tallSides(states, cover) {
    return {
        north: connected(states, "north") && cover.sides.north,
        south: connected(states, "south") && cover.sides.south,
        east: connected(states, "east") && cover.sides.east,
        west: connected(states, "west") && cover.sides.west,
    };
}
// The half of the post rule that belongs to the block above, in the order
// vanilla applies it. The shape half, dead ends, corners and T-junctions, is
// left to bone_visibility, which reads the connection states live, so a wall
// that turns into a straight run drops its post without this script running
function postFor(cover, tall) {
    // A wall directly under another wall's post always shows its own
    if (cover.forcesPost) {
        return true;
    }
    // Two opposite sides already raised to 16 fill the top on their own, so the
    // post would only make the wall bulge from 6 pixels wide to 8
    if ((tall.north && tall.south) || (tall.east && tall.west)) {
        return false;
    }
    // Otherwise it comes down to whether the middle four pixels are covered
    return cover.centre;
}
// The five states this wall should be carrying, worked out from the world
// every time. Nothing is read back from the states themselves, so the answer
// never depends on which wall was refreshed first
function shapeFor(wall) {
    const states = wall.permutation.getAllStates();
    const cover = coverAbove(wall);
    const tall = tallSides(states, cover);
    return { post: postFor(cover, tall), tall };
}
// What a wall is drawing right now, the same test as the post bone's Molang.
// The shape rule is checked first: a dead end, corner or T-junction keeps its
// post whatever sits above, so the column above it never has to be walked
function showsPost(wall) {
    if (structuralPost(wall.permutation.getAllStates())) {
        return true;
    }
    return shapeFor(wall).post;
}
// Write the five states onto one wall, keeping every other state it carries,
// then pass the change down to the wall underneath
function refresh(wall) {
    const states = wall.permutation.getAllStates();
    const { post, tall } = shapeFor(wall);
    // Skip the write if nothing moved. setPermutation is not free, and this
    // runs for a handful of walls every time a block changes
    let changed = states[POST_COVER] !== post;
    for (const side of SIDES) {
        changed = changed || states[TALL[side]] !== tall[side];
    }
    if (changed) {
        const updated = { ...states, [POST_COVER]: post };
        for (const side of SIDES) {
            updated[TALL[side]] = tall[side];
        }
        wall.setPermutation(BlockPermutation.resolve(wall.typeId, updated));
    }
    // The wall underneath reads this wall's arms and post. The arms follow the
    // connection states, which the engine moves without any of the states
    // written here changing, so the wall below is looked at even when nothing
    // was written. Each step goes one block down, so the chain ends
    refreshWallAt(wall.dimension, { x: wall.x, y: wall.y - 1, z: wall.z });
}
// Refresh whatever is at this position, if it is one of our walls
function refreshWallAt(dimension, position) {
    try {
        const block = dimension.getBlock(position);
        if (block !== undefined && block.typeId === WALL_ID) {
            refresh(block);
        }
    }
    catch {
        // Chunk not loaded, nothing to update
    }
}
// A change at one cell reaches the cell itself, when a wall was placed there,
// and its four horizontal neighbours, which just gained or lost a connection,
// so their arms moved. Each of those five cells is also checked one block down,
// because a wall there measures the shape of the block on top of it, and that
// shape has just changed. Refreshing one of our walls walks its own column
// down from there, so this only has to reach the first wall in each column
function refreshAround(dimension, position) {
    const { x, y, z } = position;
    const cells = [
        { x, y, z },
        { x: x + 1, y, z },
        { x: x - 1, y, z },
        { x, y, z: z + 1 },
        { x, y, z: z - 1 },
    ];
    for (const cell of cells) {
        refreshWallAt(dimension, cell);
        // Going down from every neighbour, not only from the changed cell: a
        // vanilla wall next door grows an arm from this change as well, and it is
        // not one of ours to walk down from
        refreshWallAt(dimension, { x: cell.x, y: cell.y - 1, z: cell.z });
    }
}
// Wait a tick, then look around that cell. The engine settles the connection
// states of a changed block and its neighbours as part of the change, and a
// script reading them in the middle of that can see the shape from before the
// block joined the run. One tick later they are final, and a wall stacked
// under another one is measuring the shape the upper wall settled on
function scheduleRefresh(dimension, position) {
    const { x, y, z } = position;
    system.run(() => refreshAround(dimension, { x, y, z }));
}
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:wall_above", {
        // Catches every way a wall can appear, a command and a structure
        // included, not just a player placing one
        onPlace(event) {
            scheduleRefresh(event.block.dimension, event.block.location);
        },
    });
});
// Something was placed on a wall, next to one, or is one
world.afterEvents.playerPlaceBlock.subscribe((event) => {
    scheduleRefresh(event.dimension, event.block.location);
});
// Something was taken off a wall, or from beside one
world.afterEvents.playerBreakBlock.subscribe((event) => {
    scheduleRefresh(event.dimension, event.block.location);
});
// Or blown away. The event names every cell the blast cleared
world.afterEvents.blockExplode.subscribe((event) => {
    scheduleRefresh(event.dimension, event.block.location);
});
