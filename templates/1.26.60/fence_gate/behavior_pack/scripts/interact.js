// Registers the component that opens and closes the fence gate. Vanilla
// gates never swing into your face: the gate checks which side you stand on
// and opens toward the other side. That choice is stored in the
// kai_templates:open_away state, which the JSON bone_visibility uses to pick
// the forward or backward open bone.
import { BlockPermutation, system, } from "@minecraft/server";
// The custom states declared in blocks/fence_gate.json
const OPEN_STATE = "kai_templates:open";
const AWAY_STATE = "kai_templates:open_away";
// Unit vectors for each value of minecraft:cardinal_direction. The model's
// forward bone points at the faced direction after the JSON rotation, so
// "away" is decided by which side of that axis the player stands on
const FACING_VECTOR = {
    north: [0, -1],
    south: [0, 1],
    west: [-1, 0],
    east: [1, 0],
};
// Register the component before the world loads
system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("kai_templates:fence_gate_interact", {
        // Run this code whenever the player interacts with the gate
        onPlayerInteract(event) {
            // Get the block, dimension and player from the event
            const { block, dimension, player } = event;
            // Read the current states. Custom states are not in the typed
            // vanilla state list, so they go through getAllStates
            const states = block.permutation.getAllStates();
            const wasOpen = states[OPEN_STATE] === true;
            // Close the gate. Closing needs no side decision, the leaves
            // just come back
            if (wasOpen) {
                block.setPermutation(BlockPermutation.resolve(block.typeId, {
                    ...states,
                    [OPEN_STATE]: false,
                }));
                dimension.playSound("close.fence_gate", block.center());
                return;
            }
            // Work out which side the player is standing on. Project the
            // player's offset from the gate's center onto the facing axis:
            // a positive dot product means they stand on the faced side, so
            // the gate must swing the other way. Without a player (a
            // dispenser interaction has none) the previous swing is kept
            let away = states[AWAY_STATE] === true;
            if (player !== undefined) {
                const facing = FACING_VECTOR[String(states["minecraft:cardinal_direction"])];
                if (facing !== undefined) {
                    const center = block.center();
                    const dx = player.location.x - center.x;
                    const dz = player.location.z - center.z;
                    const playerOnFacedSide = dx * facing[0] + dz * facing[1] > 0;
                    away = !playerOnFacedSide;
                }
            }
            block.setPermutation(BlockPermutation.resolve(block.typeId, {
                ...states,
                [OPEN_STATE]: true,
                [AWAY_STATE]: away,
            }));
            dimension.playSound("open.fence_gate", block.center());
        },
    });
});
