# Block Templates - 1.26.50

This module contains 77 block templates for Minecraft Bedrock Edition 1.26.50,
covering building blocks, plants, crops, redstone, lighting and interactive
blocks. All of them run on the current stable platform, and none require an
experimental toggle.

## How this module differs from the older ones

- **Namespace `kai_templates`** for every identifier (blocks, states, custom
  components, geometry). The historical modules keep their old `kai:` namespace.
- **Commented JSON.** Components whose purpose is not obvious carry a short `//`
  comment above them, the same way the older modules do. Minecraft accepts these
  comments; strip them before handing a file to a strict JSON parser.
- **TypeScript is the scripting source of truth.** Scripted templates keep their
  source in `src/` and ship the readable compiled JavaScript in
  `behavior_pack/scripts/`.
- **Creative grouping through the crafting item catalog.** Templates that belong in a
  collapsible creative group declare it in
  `behavior_pack/item_catalog/crafting_item_catalog.json` instead of
  `menu_category.group`.
- **Paired packs.** Each behavior pack and resource pack names the other as a
  dependency, so activating one pulls the other in with it.
- **Stable APIs only.** Traits (`placement_direction`, `placement_position`,
  `connection`, `multi_block`), voxel-shape culling, `tint_method`, and
  `@minecraft/server` 2.10.0, nothing behind a toggle.

Each template folder holds a complete behavior pack + resource pack pair and a
`.mcaddon` you can double-click to import.

## What 1.26.50 changed in this module

- **Block entities are stable.** `minecraft:block_entity` with
  `dynamic_properties` no longer needs a toggle, and scripts read those
  properties through `Block.getComponent("minecraft:dynamic_properties")`. The
  Jukebox keeps its disc there now instead of in a world property keyed by the
  block's position. The `container` field of the same component is still
  behind the Upcoming Creator Features experiment, so no template here uses
  it; the Barrel written for it is parked outside the module until the
  container ships.
- **Instruments come from the game.** `BlockInstrumentComponent` is stable in
  `@minecraft/server` 2.10.0, so the Note Block asks the block below what it
  sounds like instead of carrying a table of vanilla blocks.
- **Sounds live on the block.** `minecraft:sound` left the experiment, so every
  block names its own sound set and no template ships a `resource_pack/blocks.json`
  any more. A blocks.json entry overrides the component, permutations included,
  so a template that kept one would ignore what its own blocks ask for. A
  permutation can give a block a different sound set as its state changes, which
  blocks.json could not do.
- **Leaves carry `minecraft:leaves`.** Every vanilla leaf block has the tag from
  this release and vanilla tree features grow through anything that carries it,
  so the Leaves template does too.
- **Stairs never block a chest.** Vanilla's data-driven stairs declare
  `minecraft:chest_obstruction: never`, and the three stair templates now match.
- **Icon translations count again.** The client now applies a geometry's
  `item_display_transforms.gui.translation`, in slot pixels. The drops the
  slabs, trapdoors, carpet and fence gate carried to sit their icons low were
  ignored at 1.26.40 and pushed the icons out of the slot at 1.26.50, so they
  are gone: with `fit_to_frame` off the model keeps its block coordinates and
  a thin block already sits low like the vanilla icon. The skull now lets the
  slot fit it instead, which is what draws it as large as vanilla's.
- **Five new templates:** Shelf Mushroom, Wheat, Melon, Sugar Cane and Pink
  Petals.
- Everything else only moved to the 1.26.50 format versions and the 2.10.0
  script module.

## Template matrix

| Template | Traits used | Scripts | What it shows |
|---|---|---|---|
| [Planks](planks/) | none | No | A plain full-cube building block with vanilla planks break times, flammability, sounds and map color. |
| [Stone Slab](stone_slab/) | placement_position | Yes | A stone slab that places in the bottom or top half of a block from one click, merges two halves into a double slab through a scripted item-and-block component, can be waterlogged, and uses voxel-shape culling. |
| [Wooden Slab](wooden_slab/) | placement_position | Yes | An oak slab with the same placement, double-slab merging and voxel-shape culling as the Stone Slab template, plus an item that burns as furnace fuel like vanilla wooden slabs. |
| [Copper Slab](copper_slab/) | placement_position | Yes | An eight-block cut copper slab family, four oxidation stages and their waxed twins as separate identifiers, with the Stone Slab's placement, merging and culling, weathering on random ticks, sneak-waxing with honeycomb and axe scraping. |
| [Logs](logs/) | none | Yes | An oak-style log pair: log and stripped log, oriented along a custom axis state set from the clicked face, with axe stripping through the item-use event that preserves orientation, damages the axe, and is free in creative. |
| [Dirt](dirt/) | none | Yes | A complete soil block: shovels flatten it to a path, hoes till it to farmland, grass spreads onto it, bone meal grows configured plants on top, and its item composts, all driven by editable conversion tables. |
| [Grass Block](grass_block/) | none | Yes | A living grass block: biome-tinted top, spreads onto nearby dirt, dies back to dirt when smothered, turns white-sided under snow, and answers hoes with farmland and shovels with paths. |
| [Shelf Mushroom](shelf_mushroom/) | placement_position | Yes | A shelf mushroom that hangs off any wall face, grows from small to large under bone meal, drops two when large, bounces whatever lands on it and halves the fall, all against the vanilla 1.26.50 block. |
| [Flower](flower/) | none | No | A small cross-shaped flower that only survives on dirt-family blocks, pops natively when its support disappears, jitters its position like vanilla plants, and can be planted in a vanilla flower pot or this module's Flower Pot. |
| [Tall Flower](tall_flower/) | multi_block | No | A two-block-tall flower built on the multi_block trait, with engine-managed placement, support and paired breakup. |
| [Door](door/) | multi_block, placement_direction | Yes | A two-block-tall wooden door built on the multi_block trait. |
| [Fence](fence/) | connection | No | A wooden fence with engine-managed connections via the minecraft:connection trait, vanilla-fence interop, a 1.5-block-tall collision barrier and voxel-shape culling. |
| [Fence Gate](fence_gate/) | placement_direction | Yes | A fence gate that swings away from whoever opens it, responds to redstone with vanilla's latch behavior, connects to fences on both sides, and lowers itself between walls. |
| [Trapdoor](trapdoor/) | placement_direction, placement_position | Yes | A wooden trapdoor that places on the top or bottom half of a block and opens by hand or by redstone, with the vanilla trapdoor sounds and correct collision in every pose. |
| [Pink Petals](pink_petals/) | placement_direction | Yes | A patch of petals that fills a quarter at a time as more are placed on it, faces away from the placer, sits on the soils vanilla flowers do, drops one item per petal, and grows another petal under bone meal until the patch is full. |
| [Pillar](pillar/) | none | Yes | A quartz-pillar-style axis block with end-cap and side textures, orientable along all three axes through a custom axis state set from the clicked face, exactly like vanilla logs and pillars. |
| [Ice](ice/) | none | Yes | A slippery translucent cube with vanilla ice friction, light dampening and glass sounds, a silk-touch-only drop, water left behind when mined in survival, and light-driven melting. |
| [Glass](glass/) | none | No | Plain glass with data-driven face culling: touching blocks merge into one continuous sheet, and it drops nothing unless mined with Silk Touch. |
| [Flower Pot](flower_pot/) | none | Yes | A flower pot with a twenty-three-entry plant list, vanilla flowers, saplings and this module's Flower, where each plant is its own potted block, the way vanilla does it, with the Java pot geometry. |
| [Glazed Terracotta](glazed_terracotta/) | placement_direction | No | A four-way rotating pattern cube in the vanilla glazed terracotta style: the pattern turns with the player's facing on every face so blocks tile into murals, pistons can push it but never pull it back. |
| [Skull](skulls/) | placement_direction, placement_position | No | A skull that sits on the floor with sixteen-direction rotation or mounts on a wall, and pops off natively when its supporting block disappears. |
| [Wall](wall/) | connection | No | A cobblestone wall that connects to its neighbors through the minecraft:connection trait, hides its center post along straight runs, and blocks jumps with a 1.5-block-tall collision barrier. |
| [Iron Door](iron_door/) | multi_block, placement_direction | Yes | An iron door that only moves for redstone. |
| [Copper Door](copper_door/) | multi_block, placement_direction | Yes | An eight-block copper door family, four oxidation stages and their waxed twins as separate identifiers, with the Door template's placement and opening, weathering on random ticks, sneak-waxing with honeycomb and axe scraping. |
| [Iron Trapdoor](iron_trapdoor/) | placement_direction, placement_position | Yes | An iron trapdoor that ignores right-clicks and only moves for redstone, with the vanilla iron sounds. |
| [Copper Trapdoor](copper_trapdoor/) | placement_direction, placement_position | Yes | An eight-block copper trapdoor family, four oxidation stages and their waxed twins as separate identifiers, opening by hand or redstone, weathering on random ticks, with sneak-waxing and axe scraping. |
| [Iron Bars](iron_bars/) | connection | No | Iron bars built from the Java models' flat planes, arms, single-connection caps and frame plates, that connect through the connection trait, drop only to a pickaxe, and use a 2D sprite item. |
| [Copper Bars](copper_bars/) | connection | Yes | An eight-block copper bars family, four oxidation stages and their waxed twins as separate identifiers, with lattice connections, weathering on random ticks, sneak-waxing with honeycomb and axe scraping. |
| [Tinted Glass](tinted_glass/) | none | No | A translucent full-cube glass block that blocks all light, drops itself without Silk Touch, and never culls faces against its neighbors. |
| [Stained Glass](stained_glass/) | none | No | A translucent full-cube glass block in one color (blue) with same-color face culling, Silk-Touch-only drops, glass sounds and a blue map color. |
| [Glass Pane](glass_pane/) | connection | No | A thin glass pane that connects to its neighbors through the stable connection trait, culls its faces against touching panes, drops only to Silk Touch, and matches vanilla's collision down to the two-pixel post. |
| [Stained Glass Pane](stained_glass_pane/) | connection | No | A blue stained glass pane with the same connections and culling as the Glass Pane template, rendered translucent (blend) and with a matching map color. |
| [Ladder](ladder/) | placement_position | Yes | A wall-mounted, climbable ladder: jump or walk into it to ascend, sneak to hold on, slide down slowly otherwise, and it pops off natively when the wall behind it disappears. |
| [Slime Block](slime_block/) | none | Yes | A bouncy, sticky, translucent cube with the vanilla two-part model (outer shell, visible inner core), slime sounds, piston group-stickiness, redstone conduction, and a scripted fall-on bounce. |
| [Hay Bale](hay_bale/) | none | Yes | An axis pillar with hay textures on a custom axis state that cushions falls: landing on it costs one fifth of normal fall damage, exactly like vanilla hay. |
| [Carpet](carpets/) | none | No | A one-pixel-tall wool carpet that only places on top of blocks, pops off natively when its floor disappears, and uses vanilla cloth sounds and the white wool texture. |
| [Concrete Powder](concrete_powder/) | none | Yes | White concrete powder with a real falling-block entity: it visibly falls when unsupported, lands as a block again, and hardens into concrete when water touches it, including mid-fall. |
| [Amethyst](amethyst/) | placement_position | Yes | The amethyst family: the plain block, budding amethyst that grows crystals out of its faces on random ticks, three bud stages and the cluster, each attaching to any face, waterloggable and dropping only under Silk Touch. |
| [Bamboo](bamboo/) | none | Yes | A bamboo shoot and stalk that climb on random ticks, thicken three sections up, carry a leafy crown that moves up as they grow, take bone meal, and drop everything above a cut. |
| [Big Dripleaf](big_dripleaf/) | placement_direction | Yes | A big dripleaf whose leaf holds a player for half a second, tilts, drops them through and recovers, held open by redstone, grown by bone meal, facing the way it was planted, and waterloggable. |
| [Wheat](wheat/) | none | Yes | A wheat crop with eight stages, planted from its own seeds on farmland, growing on random ticks with vanilla's farmland scoring, taking bone meal, and dropping grain and Fortune-scaled seeds from data-driven loot tables. |
| [Melon](melon/) | none | Yes | Melon seeds, stem and fruit together: the stem grows through eight stages in vanilla's age colours, bends towards the melon it grows on a random tick, straightens when the fruit goes, and the fruit drops slices with Fortune or itself with Silk Touch. |
| [Sugar Cane](sugar_cane/) | none | Yes | Sugar cane that plants beside water, grows to three blocks on random ticks, goes straight to full height under bone meal like Bedrock, holds water back, and comes apart from the bottom up when the water or the ground goes. |
| [Cactus](cactus/) | none | Yes | A cactus that stands only on sand, refuses solid neighbours, grows up to three high on random ticks, hurts whatever presses into it, and pops when the sand under it goes. |
| [Cake](cake/) | none | Yes | A cake eaten one slice at a time by right-clicking it: seven bite states that each shave two pixels off the west side of the model and of the collision and selection boxes, feeding two hunger and 0.4 saturation a slice, refusing a full player, and vanishing with the last bite. Any of the seventeen candles placed on a whole cake turns it into that candle's own cake block, which lights with flint and steel, snuffs with an empty hand, and gives its candle back to the first bite. |
| [Candle](candle/) | none | Yes | One to four candles in a block, lit or unlit, with light rising per candle, added by clicking with another candle, lit by flint and steel, and returning every candle when broken. |
| [Chorus](chorus/) | none | Yes | The chorus plant and flower together: the flower climbs and branches, the stem grows arms towards its neighbours, falls when unrooted, and drops fruit about half the time. |
| [Copper Lantern](copper_lantern/) | placement_position | Yes | An eight-block copper lantern family, four oxidation stages and their waxed twins, standing or hanging like the Lantern template, weathering on random ticks, with waxing and scraping. |
| [Copper Stairs](copper_stairs/) | placement_direction, placement_position | Yes | Copper stairs through the whole weathering cycle, with the corner, upside-down and waterlogging behaviour of the other stair templates plus waxing and scraping. |
| [Coral Block](coral_block/) | none | Yes | A living coral block that needs water on one face and dies to its grey form when dry, kept alive only by Silk Touch. |
| [Coral Decoration](coral_decoration/) | placement_position | Yes | The coral plant, sea-floor fan and wall fan with their dead forms: water-dependent, waterloggable, breaking instantly and popping when their support goes. |
| [Crafting Table](crafting_table/) | none | No | A working crafting table built on the native `minecraft:crafting_table` component, opening the real crafting screen with no script. |
| [Frogspawn](frogspawn/) | none | Yes | Frogspawn that floats on water, pops when the water goes, cannot be collected, and hatches into tadpoles after a few minutes. |
| [Jukebox](jukebox/) | none | Yes | A jukebox that plays and ejects music discs, keeps the disc in its own block entity, drops it when broken, shows notes and the track title, and reports the disc to a comparator. Ships a custom music disc of its own: a `minecraft:record` item with its own namespaced sound event, streamed `.ogg`, icon and comparator signal, added without touching a vanilla disc. |
| [Kelp](kelp/) | none | Yes | Kelp that roots on the sea floor and grows upward through water on random ticks with an animated texture and a distinct tip, taking bone meal and dropping everything above a cut. |
| [Lantern](lantern/) | placement_position | No | A lantern that stands on a block or hangs under one from a single item, emits light 15, and pops off when its support is removed. No script. |
| [Leaf Litter](leaf_litter/) | placement_direction | Yes | Leaf litter covering one to four quarters of a block, thickening as more is placed, facing the player, and returning one item per quarter. |
| [Leaves](leaves/) | none | Yes | Leaves that decay when their tree is felled, persist when player-placed, shed falling leaf particles, and drop saplings, sticks and apples with Fortune taken into account. |
| [Lily Pad](lily_pad/) | none | Yes | A lily pad that floats on water and ice, with a texture that turns differently from one position to the next, popping when the water goes and breaking when a boat hits it. |
| [Mycelium](mycelium/) | none | Yes | Mycelium that spreads onto nearby dirt, dies back when covered, drops dirt, converts under a shovel or hoe, and puffs spores near players. |
| [Note Block](note_block/) | none | Yes | A note block that steps its pitch on click, plays on redstone, asks the block below for its instrument through the native component, and goes silent under a block. |
| [Ore](ores/) | none | Yes | A general ore block styled as diamond ore, with a pickaxe tier gate, Silk Touch dropping the block, the vanilla Fortune roll, and experience orbs. |
| [Pointed Dripstone](pointed_dripstone/) | placement_position | Yes | Pointed dripstone that hangs or stands in five thicknesses, merges columns, drips water or lava into cauldrons, grows over time, hurts whatever falls onto it, and drops an unsupported stalactite, however long it is, as falling spikes that break where they land. |
| [Redstone Block](redstone_block/) | none | No | A redstone block that outputs a constant signal of 15 on every side through the native `minecraft:redstone_producer` component. No script. |
| [Redstone Lamp](redstone_lamp/) | none | Yes | A redstone lamp that lights while powered and goes dark four ticks after the signal stops, with one `lit` state driving texture and light. |
| [Redstone Torch](redstone_torch/) | placement_position | Yes | A redstone torch that is lit while unpowered, powers the block above it, outputs on every side except its attachment, and burns out when toggled too fast. |
| [Sapling](sapling/) | none | Yes | A sapling that plants on soil, sits in a flower pot, grows through two stages with enough light, takes bone meal, and replaces itself with a tree described in its config. |
| [Sculk](sculk/) | none | Yes | A sculk block that returns under Silk Touch and gives experience to any other break, with the vanilla sculk sound set. |
| [Sea Pickle](sea_pickle/) | none | Yes | One to four sea pickles on a block, glowing only underwater with light rising per pickle, added by clicking, and spread by bone meal on live coral. |
| [Snow Layer](snow_layer/) | none | Yes | A snow layer with eight thicknesses that deepen when stacked, a growing collision box, per-layer snowball drops, Silk Touch drops, melting in bright light, and a real falling entity that carries the drift down at its depth when the block under it goes. |
| [Sponge](sponge/) | none | Yes | A sponge that drains up to sixty-four connected water blocks and turns wet, and a wet sponge that dries in the Nether with a puff of steam. |
| [Stone Stairs](stone_stairs/) | placement_direction, placement_position | No | Stone stairs with vanilla inner and outer corners, upside-down placement, waterlogging and walk-up collision, mined with a pickaxe only. No script. |
| [TNT](tnt/) | none | Yes | TNT lit by flint and steel, redstone or a neighbouring blast, with a primed charge that is a real entity arcing, landing and exploding. |
| [Torch](torch/) | placement_position | Yes | A torch that becomes a floor or wall torch from one item, emits light 14, pops off when its support goes, and adds flame and smoke on random ticks. |
| [Twisting Vines](twisting_vines/) | none | Yes | Twisting vines that grow upward from the floor one segment at a time with a distinct tip, take bone meal, can be climbed, and regrow from a cut. |
| [Weeping Vines](weeping_vines/) | none | Yes | Weeping vines that hang from a ceiling and grow downward one segment at a time with a distinct tip, take bone meal, can be climbed, and regrow from a cut. |
| [Wooden Stairs](wooden_stairs/) | placement_direction, placement_position | No | Wooden stairs with vanilla corners, upside-down placement, waterlogging and walk-up collision, fastest with an axe, flammable and usable as furnace fuel. No script. |

## Suggested reading order

If you are new to custom blocks: start with **Planks** (the minimal block), then
**Dirt**, **Ice** and **Slime Block** (materials and physics values), **Pillar** and
**Logs** (axis placement), **Glazed Terracotta** (facing and permutations),
**Stone Slab** (half placement and voxel culling), **Wall**, **Fence** and
**Glass Pane** (the connection trait), **Trapdoor** (states and scripts), **Door**
(multi-block), and the copper templates (**Copper Slab / Bars / Trapdoor / Door**)
for scripted weathering. **Wheat**, **Melon** and **Sugar Cane** are the crops:
random-tick growth, bone meal and data-driven drops. **Jukebox** shows
`minecraft:block_entity` with dynamic properties, and how a pack adds a music disc
of its own. **Skulls, Flower Pot, Ladder,
Grass Block and Concrete Powder** each
solve one hard problem and document the workaround.

## Requirements

- Minecraft Bedrock Edition 1.26.50.
- No experimental toggles for any template in this module.
- Scripted templates use `@minecraft/server` 2.10.0 (stable).
