// One place to configure what each powder hardens into. Both sides accept
// custom or vanilla identifiers, so a pack with many powder colors only
// needs more rows here, the physics and falling scripts all read this map
export const concreteConversions = new Map<string, string>([
  ["kai_templates:concrete_powder", "minecraft:white_concrete"],
]);

// The entity that represents a powder block while it falls
export const ENTITY_ID = "kai_templates:falling_powder";

// The dust a powder block sheds when nothing solid is under it. Vanilla's
// falling_dust_concrete_powder particle reads its tint from variable.color,
// so one particle serves every colour and the script hands the colour in
export const DUST_PARTICLE = "minecraft:falling_dust_concrete_powder_particle";

// The colour each powder hands to the dust, as 0-1 RGB. These are the average
// colours of the vanilla powder textures. A block that is not listed here
// falls back to DEFAULT_DUST_COLOR, so a new colour only needs a row when its
// dust should match
export interface DustColor {
  red: number;
  green: number;
  blue: number;
}

export const DEFAULT_DUST_COLOR: DustColor = { red: 0.885, green: 0.892, blue: 0.893 };

export const dustColors = new Map<string, DustColor>([
  ["kai_templates:concrete_powder", { red: 0.885, green: 0.892, blue: 0.893 }],
  // Vanilla's sixteen powders, for a pack that converts them or copies one
  ["minecraft:white_concrete_powder", { red: 0.885, green: 0.892, blue: 0.893 }],
  ["minecraft:orange_concrete_powder", { red: 0.891, green: 0.517, blue: 0.125 }],
  ["minecraft:magenta_concrete_powder", { red: 0.756, green: 0.329, blue: 0.724 }],
  ["minecraft:light_blue_concrete_powder", { red: 0.291, green: 0.709, blue: 0.837 }],
  ["minecraft:yellow_concrete_powder", { red: 0.913, green: 0.781, blue: 0.215 }],
  ["minecraft:lime_concrete_powder", { red: 0.492, green: 0.742, blue: 0.164 }],
  ["minecraft:pink_concrete_powder", { red: 0.897, green: 0.601, blue: 0.71 }],
  ["minecraft:gray_concrete_powder", { red: 0.302, green: 0.318, blue: 0.333 }],
  ["minecraft:light_gray_concrete_powder", { red: 0.607, green: 0.608, blue: 0.581 }],
  ["minecraft:cyan_concrete_powder", { red: 0.144, green: 0.58, blue: 0.616 }],
  ["minecraft:purple_concrete_powder", { red: 0.517, green: 0.218, blue: 0.696 }],
  ["minecraft:blue_concrete_powder", { red: 0.275, green: 0.287, blue: 0.654 }],
  ["minecraft:brown_concrete_powder", { red: 0.492, green: 0.333, blue: 0.211 }],
  ["minecraft:green_concrete_powder", { red: 0.381, green: 0.467, blue: 0.175 }],
  ["minecraft:red_concrete_powder", { red: 0.66, green: 0.212, blue: 0.199 }],
  ["minecraft:black_concrete_powder", { red: 0.099, green: 0.105, blue: 0.125 }],
]);

// How many dust motes one check releases when the block below is open
export const DUST_MIN = 1;
export const DUST_MAX = 3;

// Dynamic property keys stored on each falling entity. Keeping the block ids
// on the entity (instead of in a script-side map) means a fall survives a
// chunk unload or a full world reload without losing its identity
export const PROP_BLOCK = "kai_templates:block_id";
export const PROP_CURED = "kai_templates:cured_id";
export const PROP_AGE = "kai_templates:age";
