import { world, system, Player } from "@minecraft/server";
system.runInterval(
	() => {
		const players = world.getAllPlayers();
		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			try {
				const { block, face } = player.getBlockFromViewDirection();
				if (!block) {
					player.onScreenDisplay.setActionBar( "Not looking at a Block." );
					return;
				};
				
				player.onScreenDisplay.setActionBar(
					`§rblock: §7${block.typeId}§r, face: §7${face}§r, xyz: §6${block.location.x} §r/ §6${block.location.y} §r/ §6${block.location.z}§r,\n`
					+ `data: §7${JSON.stringify(block.permutation.getAllStates(), null, 4)}`
				);
			} catch {
				player.onScreenDisplay.setActionBar( "Not looking at a Block." );
			};
		};
	},
);