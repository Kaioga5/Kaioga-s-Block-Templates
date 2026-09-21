# Minecraft Bedrock Block Templates by Kaioga

Welcome to the Minecraft Bedrock Block Templates repository, curated by Kaioga! 🌍✨

## Overview

Explore a collection of meticulously crafted block templates for Minecraft Bedrock Edition. Whether you're a seasoned builder looking to enhance your creations or a beginner seeking inspiration, these templates provide a solid foundation for your Minecraft adventures.

The repository is organized into version modules under `templates/`, each targeting a specific Minecraft Bedrock release:

| Module | Templates | Notes |
|---|---|---|
| [1.26.50](templates/1.26.50/) | 77 | **The modern module.** Building, nature, crops, redstone and interactive blocks on stable APIs, with TypeScript-sourced scripts. Start here. |
| [1.26.40](templates/1.26.40/) | 71 | The previous module, kept as it shipped for 1.26.40. |
| [1.20.80](templates/1.20.80/) | 16 | Historical module (Beta-API experimental toggle). |
| [preview-1.20.80.24](templates/preview-1.20.80.24/) | 7 | Historical preview-branch experiments. |
| [1.20.60](templates/1.20.60/) | 8 | Historical module. |
| [1.20.50](templates/1.20.50/) | 11 | Historical module. |

Each template is a complete behavior pack + resource pack pair with a ready-to-import `.mcaddon`. The older modules are preserved as-is for the versions they were written for.

## The 1.26.50 module

The newest module rebuilds building, nature, redstone and interactive blocks on the current stable platform, with no experimental toggles anywhere. It adds a few things the older modules never had:

- **Paired packs.** Each template's behavior pack and resource pack name each other as dependencies, so enabling one brings the other along.
- **TypeScript sources.** Scripted templates keep commented TypeScript in `src/` and ship the readable compiled JavaScript that runs in the behavior pack.

See the [module README](templates/1.26.50/README.md) for the full 76-template matrix, what changed in 1.26.50, and a suggested reading order.

## Usage

1. **Clone or Download:** Get the templates by cloning the repository or downloading the ZIP file.
2. **Import:** Double-click any template's `.mcaddon` to import it into Minecraft, or copy the `behavior_pack`/`resource_pack` folders into your development pack folders.
3. **Customization:** Swap in your own textures, then rename the `kai_templates` namespace to your own across the block definitions, the language files and any scripts.

## Why This Project?

Creating this repository stems from my passion for contributing to the Minecraft Bedrock Edition Add-Ons community. Here are my reasons:

1. **Community Support:** I aim to help the Minecraft Bedrock Edition Add-Ons community in creating new and unique blocks, fostering the development of wonderful content.
2. **Coding Enjoyment:** I find joy in coding blocks, and my expertise allows me to contribute high-quality templates.
3. **Addressing a Gap:** I identified a challenge within the vanilla packs – the absence of block files. To overcome this issue, I decided to create my own block templates, providing a solution for the community.

## Credits

This project is exclusively crafted by Kaioga. Special thanks to the Minecraft community for their continuous support and inspiration.

## License

This repository is source-available and free for noncommercial use under the
[PolyForm Noncommercial License 1.0.0](LICENSE). In short:

- **Noncommercial use is free.** Use the templates, learn from them, change them,
  build on them and share them, as long as the purpose is noncommercial. You do
  not need to ask.
- **Commercial use is not included.** Paid add-ons, Marketplace products, paid
  courses, client work and use inside a for-profit organisation all need a
  separate commercial license from me first. [COMMERCIAL_USE.md](COMMERCIAL_USE.md)
  covers what counts and how to ask.
- **Read the real thing.** The summary above is a convenience. The
  [LICENSE](LICENSE) file is what actually applies.

Because commercial use is restricted, this is *not* an OSI-approved open source
license. "Source-available" and "free for noncommercial use" are the accurate
descriptions.

The license covers the material I own. It does not cover Minecraft, the Bedrock
add-on platform, or Mojang's own assets, and a few textures in the historical
modules are vanilla artwork I cannot license. [NOTICE.md](NOTICE.md) sets out the
scope and the third-party notices.

Releases published before this change were under the GNU General Public License
v3.0. That grant stands for the copies it was given with; the new license applies
from this version onward.

Feel free to explore, build, and create with these block templates. Happy crafting! 🛠️🎮
