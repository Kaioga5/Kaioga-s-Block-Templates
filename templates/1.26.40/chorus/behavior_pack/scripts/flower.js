// The flower: the only part of a chorus plant that actually grows.
// Every branch in an end island's chorus forest was once a flower that decided,
// on one random tick, to climb or to turn. When it can do neither it ages out
// and the stem it leaves behind stops changing for good. The rules below are
// vanilla's, including the parts that make a forest sprawl: climbing keeps the
// flower's age, only branching spends it, a branching flower can throw several
// arms at once, and the odds get better the closer the plant is to the ground.
import { BlockPermutation, system } from "@minecraft/server";
import { AGE_STATE, FLOWER_ID, MAX_AGE, PLANT_ID, RUN_CHECK } from "./config.js";
import { SIDES, isChorus, isGround, reshape } from "./plant.js";
const HORIZONTAL = SIDES.filter((side) => side.offset.y === 0);
function readAge(block) {
    const value = block.permutation.getAllStates()[AGE_STATE];
    return typeof value === "number" ? value : 0;
}
function setAge(block, age) {
    block.setPermutation(BlockPermutation.resolve(FLOWER_ID, { [AGE_STATE]: age }));
}
// Put a new flower at `target` with the given age
function placeFlower(target, age) {
    setAge(target, Math.min(age, MAX_AGE));
    target.dimension.playSound("dig.stone", target.center());
}
// Turn this flower into stem and line the arms up with its neighbours
function becomeStem(flower) {
    flower.setType(PLANT_ID);
    reshape(flower);
    for (const side of SIDES) {
        const neighbour = flower.offset(side.offset);
        if (neighbour !== undefined && neighbour.typeId === PLANT_ID) {
            reshape(neighbour);
        }
    }
}
// A flower can only move into empty space that is not already crowded by the
// plant, otherwise a forest would grow into a solid block of itself. `ignore`
// is the side the flower itself sits on, which is allowed to be chorus
function isFreeSpace(block, ignore) {
    if (block === undefined || !block.isAir) {
        return false;
    }
    for (const side of HORIZONTAL) {
        if (ignore !== undefined && side.offset.x === ignore.x && side.offset.z === ignore.z) {
            continue;
        }
        const neighbour = block.offset(side.offset);
        if (neighbour !== undefined && isChorus(neighbour)) {
            return false;
        }
    }
    return true;
}
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:chorus_flower_growth", {
        onRandomTick(event) {
            const flower = event.block;
            const age = readAge(flower);
            // A flower that has aged out is finished
            if (age >= MAX_AGE) {
                return;
            }
            // Everything below needs the space above to be empty. Vanilla
            // ticks the flower every random tick and rolls nothing here; the
            // pace comes from how rare random ticks are
            const above = flower.above();
            if (above === undefined || !above.isAir) {
                return;
            }
            const below = flower.below();
            let canClimb = false;
            let onEndStone = false;
            if (isGround(below)) {
                // Rooted straight in the ground: always climbs once
                canClimb = true;
            }
            else if (below?.typeId === PLANT_ID) {
                // Count the straight run of stem under the flower, up to
                // RUN_CHECK deep, and remember whether it ends in ground.
                // Short runs always climb; longer ones roll against their own
                // height, and a plant on the ground rolls a wider die, which
                // is what makes a rooted trunk taller than a branch
                let run = 1;
                for (let step = 0; step < RUN_CHECK; step++) {
                    const next = flower.below(run + 1);
                    if (next === undefined || next.typeId !== PLANT_ID) {
                        onEndStone = isGround(next);
                        break;
                    }
                    run++;
                }
                const die = onEndStone ? 5 : 4;
                if (run < 2 || run <= Math.floor(Math.random() * die)) {
                    canClimb = true;
                }
            }
            else if (below?.isAir) {
                // Hanging in the air, which a broken plant can leave behind
                canClimb = true;
            }
            // Climb: the flower keeps its age, so a climbing plant never ages
            // out on the way up. The space two above has to be clear as well
            const twoAbove = flower.above(2);
            if (canClimb && isFreeSpace(above, undefined) && twoAbove !== undefined && twoAbove.isAir) {
                becomeStem(flower);
                placeFlower(above, age);
                return;
            }
            // Turn, while the flower is still young enough: try up to three
            // arms, four when rooted in ground, each in a random direction.
            // Every arm that finds room gets its own flower one age older, so
            // one tick can split a plant several ways at once
            if (age < MAX_AGE - 1) {
                let arms = Math.floor(Math.random() * 4);
                if (onEndStone) {
                    arms++;
                }
                let grew = false;
                for (let arm = 0; arm < arms; arm++) {
                    const side = HORIZONTAL[Math.floor(Math.random() * HORIZONTAL.length)];
                    const target = flower.offset(side.offset);
                    // A branch wants open air under it as well as around it
                    if (target === undefined || !target.isAir || target.below()?.isAir !== true) {
                        continue;
                    }
                    const back = { x: -side.offset.x, y: 0, z: -side.offset.z };
                    if (!isFreeSpace(target, back)) {
                        continue;
                    }
                    placeFlower(target, age + 1);
                    grew = true;
                }
                if (grew) {
                    becomeStem(flower);
                    return;
                }
            }
            // Nowhere left to go: the flower ages out and turns pale
            setAge(flower, MAX_AGE);
        },
    });
});
