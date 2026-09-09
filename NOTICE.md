# Notices

## What the repository license covers

The [LICENSE](LICENSE) (PolyForm Noncommercial License 1.0.0) covers the
material in this repository that Kaioga wrote and owns:

- the block, item and pack JSON definitions
- the block geometry and animation files
- the TypeScript sources and the JavaScript compiled from them
- the language files and pack icons
- the README and per-template documentation

Everything else below is outside that license and is not being relicensed.

## Minecraft, Mojang Studios and Microsoft

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG
OR MICROSOFT.

Minecraft is a trademark of Mojang Studios. Mojang and Microsoft own Minecraft,
the Minecraft Bedrock Edition add-on platform, and the vanilla game assets.
Nothing in this repository grants any right in them.

That includes:

- the add-on formats and every `minecraft:` identifier the templates use --
  block components, traits, states, block tags, sound events, entity and item
  ids. These are the platform's own vocabulary, not authored content.
- the `@minecraft/server` scripting API. It is listed as a development
  dependency for type checking and is provided by the game at runtime. No copy
  of it ships in this repository.
- the vanilla textures the templates reference by short name (for example
  `wool_colored_white` or `stone`). Those files live in the game's own resource
  pack and are resolved at runtime. They are referenced here, never copied.

Using these templates in content you publish is subject to Mojang's own terms
for Minecraft, including the Minecraft EULA and the Minecraft Usage Guidelines.
Those apply on top of this repository's license, not instead of it.

## Third-party textures in the historical modules

Four texture files in the older modules reproduce vanilla Minecraft artwork
rather than original art (three of them are the same image, copied into three
modules). They are kept so the historical templates still look right, but Kaioga
does not own them and does not license them to anyone. They remain the property
of Mojang Studios and are covered by Mojang's terms:

| File | Note |
|---|---|
| `templates/1.20.80/leaves/resource_pack/textures/blocks/oak_leaves.png` | Vanilla oak leaves artwork, pre-tinted green. |
| `templates/1.20.80/pink_petals/resource_pack/textures/blocks/pink_petals_stem.png` | Vanilla pink petals stem artwork, recolored. |
| `templates/1.20.50/pink_petals/resource_pack/textures/blocks/pink_petals_stem.png` | Same file as above. |
| `templates/1.20.60/pink_petals/resource_pack/textures/blocks/pink_petals_stem.png` | Same file as above. |

Copies of these files also sit inside the `.mcaddon` archives for those
templates. If you fork this repository and want everything in it under a single
license, replace them with your own art.

The 1.26.40 module ships no vanilla artwork. Its only bundled textures are the
pack icon and `kai_templates_candle_flame.png`, both original.

## Co-authored content

The Block Data Viewer pack in `resources/block_data/` lists two authors in its
manifest: Kaioga and xkingdark. The license here is granted over Kaioga's own
contribution to that pack only; xkingdark's rights in it are unaffected. Anyone
asking for a commercial license that includes this pack should expect it to need
both authors' agreement. Every other pack in this repository is Kaioga's alone.

## Previously released versions

Releases published before this license change were distributed under the GNU
General Public License v3.0. That grant stands for the copies it was given
with; it is not withdrawn here. The PolyForm Noncommercial License applies to
this version onward.
