// Lets a shovel flatten this dirt into a path and a hoe till it into
// farmland. This listens to the interact-with-block before-event, the
// precise item-use path, instead of a block interact component, so the
// action is tied to the item actually being used and can be cancelled
// cleanly before anything else reacts to the click.
import {
  Block,
  EntityEquippableComponent,
  EquipmentSlot,
  GameMode,
  ItemStack,
  Player,
  system,
  world,
} from "@minecraft/server";
import { FARMLAND_BLOCK, PATH_BLOCK, grassSpreadTargets } from "./config.js";

// Take one point of durability from the player's tool, unless they are in
// creative
function damageTool(
  player: Player,
  equipment: EntityEquippableComponent,
  tool: ItemStack,
): void {
  if (player.getGameMode() === GameMode.Creative) {
    return;
  }
  // Get the durability component; some items do not have one
  const durability = tool.getComponent("minecraft:durability");
  if (durability === undefined) {
    return;
  }
  // Break the tool if this was its last point of durability. Unbreaking's
  // chance to skip the wear is engine-internal and not modeled here
  if (durability.damage + 1 >= durability.maxDurability) {
    equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
    player.playSound("random.break");
  } else {
    durability.damage += 1;
    equipment.setEquipment(EquipmentSlot.Mainhand, tool);
  }
}

// Convert the dirt and charge the tool
function convert(
  block: Block,
  targetId: string,
  sound: string,
  player: Player,
): void {
  block.setType(targetId);
  block.dimension.playSound(sound, block.center());
  const equipment = player.getComponent("minecraft:equippable");
  const held = equipment?.getEquipment(EquipmentSlot.Mainhand);
  if (equipment !== undefined && held !== undefined) {
    damageTool(player, equipment, held);
  }
}

// Watch every block interaction and claim shovel and hoe use on this dirt
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  // The engine can fire this more than once per click, act on the
  // first one only
  if (!event.isFirstEvent) {
    return;
  }

  // Only this template's dirt reacts. The spread map doubles as the list
  // of dirt blocks this template owns
  const block = event.block;
  if (!grassSpreadTargets.has(block.typeId)) {
    return;
  }

  const held = event.itemStack;
  if (held === undefined) {
    return;
  }

  // Vanilla refuses to till or flatten under another block
  const above = block.above();
  if (above !== undefined && !above.isAir) {
    return;
  }

  // Match tools by tag (not exact ids) so modded hoes and shovels that
  // carry the vanilla tool tags work too
  const dirtId = block.typeId;
  const player = event.player;
  if (held.hasTag("minecraft:is_shovel")) {
    // Cancel the click and do the world write after the read-only
    // before-event window
    event.cancel = true;
    system.run(() => {
      if (block.typeId === dirtId) {
        convert(block, PATH_BLOCK, "use.grass", player);
      }
    });
  } else if (held.hasTag("minecraft:is_hoe")) {
    event.cancel = true;
    system.run(() => {
      if (block.typeId === dirtId) {
        convert(block, FARMLAND_BLOCK, "use.gravel", player);
      }
    });
  }
});
