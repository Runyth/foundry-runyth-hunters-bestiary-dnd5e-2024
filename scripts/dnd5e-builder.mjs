import { CORE_MODULE_ID, MODULE_ID } from "./constants.mjs";
import { clone, localizeText, slugify } from "./utils.mjs";

const SIZE_WIDTH = Object.freeze({ tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 });
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

/**
 * Foundry core icon paths selected for the bundled harvest definitions.
 * These are stable paths from Foundry's built-in icon catalogue rather than
 * module-hosted assets, so they remain available offline with Foundry itself.
 */
const HARVEST_ICON_BY_NAME = Object.freeze({
  "Ashback Plate": "icons/commodities/leather/scales-brown.webp",
  "Soot Gland": "icons/commodities/biological/organ-liver-red.webp",
  "Mireglass Scale": "icons/commodities/leather/scales-blue-white.webp",
  "Paralytic Vitreous": "icons/commodities/biological/eye-lizard-green.webp",
  "Ironroot Bristle": "icons/commodities/materials/hair-tuft-brown.webp",
  "Thornhide Sheet": "icons/commodities/leather/leather-pelt-cured.webp",
  "Moonveil Antler Shard": "icons/commodities/bones/horn-antler-pink-white.webp",
  "Veil Dew": "icons/commodities/materials/liquid-droplet-blue.webp",
  "Brine Chamber": "icons/commodities/biological/organ-bladder-red.webp",
  "Mireclaw Shell": "icons/commodities/biological/shell-turtle-grey.webp",
  "Pressure Nodule": "icons/commodities/biological/eye-simple-blue.webp",
  "Wyrm Resonance Bone": "icons/commodities/bones/bone-spine-grey.webp",
  "Lantern Dust": "icons/commodities/materials/powder-teal.webp",
  "Fen Silk": "icons/commodities/materials/material-webbing.webp",
  "Whistle Mane": "icons/commodities/materials/hair-tuft-grey-brown.webp",
  "Gravewind Fang": "icons/creatures/abilities/fang-tooth-blood-red.webp",
  "Ironjaw Plate": "icons/commodities/metal/mail-plate-steel.webp",
  "Lindworm Bile": "icons/commodities/materials/liquid-green.webp",
  "Gloam Whisker": "icons/commodities/materials/hair-tuft-grey.webp",
  "Shadow Pelt": "icons/commodities/leather/fur-pelt-brown.webp",
  "Resonant Silk": "icons/commodities/materials/material-webbing.webp",
  "Bell Venom": "icons/commodities/materials/liquid-purple.webp",
  "Rimehorn Core": "icons/commodities/bones/horn-jagged-grey-blue.webp",
  "Winterfat": "icons/consumables/meat/side-pork-fat-skin-pink.webp",
  "Cinder Crop": "icons/commodities/biological/organ-stomach.webp",
  "Manticore Ember Spine": "icons/commodities/bones/bone-spine-white.webp",
  "Stormglass Pinion": "icons/commodities/materials/feather-stained-glass-blue.webp",
  "Roc Storm Gland": "icons/commodities/biological/organ-heart-red.webp",
  "Living Back Reed": "icons/commodities/materials/plant-branch-brown-green.webp",
  "Crown Scale": "icons/commodities/leather/scales-green.webp",
  "Lantern Lure": "icons/commodities/biological/organ-bladder-red.webp",
  "Eel Conductor Spine": "icons/commodities/bones/bone-spine-grey.webp",
  "Orchard Fungus": "icons/consumables/mushrooms/cluster-red-brown.webp",
  "White Antler Shelf": "icons/commodities/bones/horn-antler-pink-white.webp",
  "Mantle Plate": "icons/commodities/leather/scale-chitin-grey.webp",
  "Burrower Vibration Sac": "icons/commodities/biological/organ-bladder-red.webp",
  "Resonance Sac": "icons/commodities/biological/organ-bladder-red.webp",
  "Choir Slime": "icons/commodities/materials/slime-green.webp",
  "Living Ore Nodule": "icons/commodities/gems/gem-cluster-teal.webp",
  "Veinroot Heartwood": "icons/commodities/wood/log-cut-petrified-violet.webp",
  "Cinderwing Membrane": "icons/commodities/biological/wing-lizard-yellow.webp",
  "Drake Ember Scale": "icons/commodities/leather/scales-brown.webp",
  "Wake Keel": "icons/commodities/leather/scales-blue-white.webp",
  "Aeration Bladder": "icons/commodities/biological/organ-bladder-red.webp",
  "Coppercap Cluster": "icons/consumables/mushrooms/cluster-red-brown.webp",
  "Jackal Grooming Oil": "icons/commodities/materials/liquid-orange.webp",
  "Mirrorhide Plate": "icons/commodities/leather/scales-white.webp",
  "Borrowed-Color Fur": "icons/commodities/leather/fur-blue.webp"
});

export function buildActorData(monster, statblock) {
  if (!statblock) throw new Error(`No D&D 5e 2024 stat block is registered for '${monster?.id ?? "unknown"}'.`);
  const name = localizeText(monster.name);
  const size = statblock.size ?? "lg";
  const width = SIZE_WIDTH[size] ?? 1;
  const biography = [monster.summary, monster.ecology, monster.behavior]
    .map(localizeText)
    .filter(Boolean)
    .map(text => `<p>${escapeForRichText(text)}</p>`)
    .join("");

  const abilities = Object.fromEntries(ABILITIES.map(ability => [ability, {
    value: Number(statblock.abilities[ability]),
    proficient: statblock.savingThrows?.includes(ability) ? 1 : 0
  }]));
  const skills = Object.fromEntries(Object.entries(statblock.skills ?? {}).map(([skill, value]) => [skill, { value: Number(value) }]));
  const movement = { ...clone(statblock.speed ?? {}), units: "ft", hover: Boolean(statblock.speed?.hover) };
  delete movement.hover;
  movement.hover = Boolean(statblock.speed?.hover);
  const senses = { units: "ft", special: "", ranges: {} };
  for (const sense of ["darkvision", "blindsight", "tremorsense", "truesight"]) senses.ranges[sense] = statblock.senses?.[sense] ?? null;

  return {
    name,
    type: "npc",
    img: monster.img ?? "icons/creatures/abilities/paw-print-orange.webp",
    system: {
      abilities,
      skills,
      attributes: {
        ac: { calc: "natural", flat: Number(statblock.ac) },
        hp: { value: Number(statblock.hp.value), max: Number(statblock.hp.value), temp: null, tempmax: null, formula: String(statblock.hp.formula) },
        movement,
        senses,
        spellcasting: ""
      },
      details: {
        biography: { value: biography, public: `<p>${escapeForRichText(localizeText(monster.summary))}</p>` },
        alignment: normalizeAlignment(statblock.alignment),
        type: { value: normalizeCreatureType(statblock.creatureType) },
        cr: Number(statblock.cr),
        habitat: { value: [], custom: (monster.habitats ?? []).map(localizeText).join(", ") }
      },
      resources: {
        legact: { max: 0, spent: 0 },
        legres: { max: 0, spent: 0 },
        lair: { value: false, initiative: null, inside: false }
      },
      source: { revision: 1, rules: "2024", book: "Hunter's Bestiary", license: "Original Content" },
      traits: {
        size,
        di: { value: clone(statblock.damageImmunities ?? []), custom: "", bypasses: [] },
        dr: { value: clone(statblock.damageResistances ?? []), custom: "", bypasses: [] },
        dv: { value: clone(statblock.damageVulnerabilities ?? []), custom: "", bypasses: [] },
        ci: { value: clone(statblock.conditionImmunities ?? []), custom: "" },
        languages: { value: clone(statblock.languages ?? []), custom: "", communication: {} },
        important: Boolean(statblock.encounter?.role === "solo")
      }
    },
    items: [
      ...(statblock.traits ?? []).map((trait, index) => buildTraitItem(trait, { monster, statblock, index })),
      ...(statblock.actions ?? []).map((action, index) => buildActionItem(action, { monster, statblock, index }))
    ],
    prototypeToken: {
      name,
      displayName: 20,
      actorLink: false,
      appendNumber: true,
      width,
      height: width,
      disposition: -1,
      bar1: { attribute: "attributes.hp" },
      texture: { src: monster.img ?? "icons/creatures/abilities/paw-print-orange.webp", scaleX: 1, scaleY: 1 }
    },
    flags: {
      [MODULE_ID]: {
        statblockId: statblock.id ?? statblock.monsterId,
        rules: "2024",
        providerId: statblock.providerId
      }
    }
  };
}

export function buildHarvestItemData(monster, statblock) {
  if (!statblock) return [];
  return (statblock.harvest ?? []).map((part, index) => ({
    name: `${localizeText(part.name)} — ${localizeText(monster.name)}`,
    type: "loot",
    img: resolveHarvestIcon(part),
    system: {
      description: { value: `<p>${escapeForRichText(localizeText(part.description))}</p><p><strong>${escapeForRichText(localizeText("HBDND5E.Fields.Quarry"))}:</strong> ${escapeForRichText(localizeText(monster.name))}</p>`, chat: "" },
      source: { revision: 1, rules: "2024", book: "Hunter's Bestiary", license: "Original Content" },
      identified: true,
      quantity: Number(part.quantity ?? 1),
      weight: Number(part.weight ?? 0),
      price: { value: Number(part.priceGp ?? 0), denomination: "gp" },
      rarity: part.rarity ?? "",
      type: { value: "material", subtype: "" },
      properties: []
    },
    flags: { [MODULE_ID]: { harvestIndex: index, monsterId: monster.id, providerId: statblock.providerId } }
  }));
}

export function resolveHarvestIcon(part) {
  const explicit = String(part?.img ?? "").trim();
  if (explicit) return explicit;
  const name = localizeText(part?.name).trim();
  if (HARVEST_ICON_BY_NAME[name]) return HARVEST_ICON_BY_NAME[name];

  const normalized = name.toLocaleLowerCase();
  if (/antler|horn/.test(normalized)) return "icons/commodities/bones/horn-antler-brown.webp";
  if (/fang|tooth/.test(normalized)) return "icons/creatures/abilities/fang-tooth-blood-red.webp";
  if (/bone|spine/.test(normalized)) return "icons/commodities/bones/bone-spine-grey.webp";
  if (/fur|pelt|hide/.test(normalized)) return "icons/commodities/leather/fur-pelt-brown.webp";
  if (/bristle|whisker|mane|hair/.test(normalized)) return "icons/commodities/materials/hair-tuft-brown.webp";
  if (/silk|web/.test(normalized)) return "icons/commodities/materials/material-webbing.webp";
  if (/scale|plate|shell|keel|sheet/.test(normalized)) return "icons/commodities/leather/scales-brown.webp";
  if (/venom|bile|oil|dew|vitreous/.test(normalized)) return "icons/commodities/materials/liquid-green.webp";
  if (/slime/.test(normalized)) return "icons/commodities/materials/slime-green.webp";
  if (/dust|powder/.test(normalized)) return "icons/commodities/materials/powder-grey.webp";
  if (/fungus|mushroom/.test(normalized)) return "icons/consumables/mushrooms/crimini-button-brown.webp";
  if (/feather|pinion/.test(normalized)) return "icons/commodities/materials/feather-blue-grey.webp";
  if (/wood|reed|branch/.test(normalized)) return "icons/commodities/materials/plant-branch-brown-green.webp";
  if (/gland|organ|crop|sac|bladder|chamber|lure/.test(normalized)) return "icons/commodities/biological/organ-bladder-red.webp";
  if (/ore|nodule|crystal|glass/.test(normalized)) return "icons/commodities/gems/gem-cluster-teal.webp";
  return "icons/commodities/materials/plant-sprout-brown-green.webp";
}

export function buildEncounterProfile(monster, statblock) {
  if (!statblock) return null;
  return {
    systemId: "dnd5e",
    rules: "2024",
    monsterId: monster.id,
    name: localizeText(monster.name),
    challengeRating: Number(statblock.cr),
    experience: experienceForCr(statblock.cr),
    role: statblock.encounter?.role ?? "standard",
    suggestedGroupSize: Number(statblock.encounter?.suggestedGroupSize ?? 1),
    environments: (statblock.encounter?.environments ?? []).map(localizeText),
    actorUuid: monster.actorUuid ?? null
  };
}

export async function rollFieldCheck({ actor, skillId, modifier, dc }) {
  const skill = actor?.system?.skills?.[skillId];
  const resolvedModifier = Number(skill?.total ?? skill?.mod ?? modifier ?? 0);
  const RollClass = globalThis.CONFIG?.Dice?.D20Roll ?? globalThis.Roll;
  if (!RollClass) throw new Error("The D&D 5e D20 roll class is unavailable.");
  const options = {
    type: "skill",
    skill: skillId,
    targetValue: Number(dc),
    flavor: globalThis.CONFIG?.DND5E?.skills?.[skillId]?.label ?? skillId
  };
  const roll = await new RollClass("1d20 + @mod", { mod: resolvedModifier }, options).evaluate();
  return {
    roll,
    total: Number(roll.total),
    modifier: resolvedModifier,
    success: Number(roll.total) >= Number(dc),
    skillLabel: resolveSkillLabel(skillId)
  };
}

function buildTraitItem(trait, { monster, statblock, index }) {
  return {
    name: localizeText(trait.name),
    type: "feat",
    img: "icons/skills/wounds/anatomy-organ-heart-red.webp",
    system: {
      description: { value: `<p>${escapeForRichText(localizeText(trait.description))}</p>`, chat: "" },
      source: { revision: 1, rules: "2024", book: "Hunter's Bestiary", license: "Original Content" },
      type: { value: "monster", subtype: "" },
      properties: [],
      activities: {},
      uses: { spent: 0, recovery: [] }
    },
    flags: managedEmbeddedFlags(monster, statblock, `trait-${trait.id ?? trait.name}-${index}`)
  };
}

function buildActionItem(action, { monster, statblock, index }) {
  const activityId = stableId(`${action.id ?? action.name}-activity`);
  const attackType = action.attackType === "ranged" ? "ranged" : "melee";
  const distance = Number(attackType === "ranged" ? action.range ?? 30 : action.reach ?? 5);
  const damage = parseDamage(action.damage);
  return {
    name: localizeText(action.name),
    type: "weapon",
    img: attackType === "ranged" ? "icons/magic/fire/projectile-fireball-smoke-orange.webp" : "icons/skills/melee/claw-slashes-orange.webp",
    system: {
      description: { value: `<p>${escapeForRichText(localizeText(action.description))}</p>`, chat: "" },
      source: { revision: 1, rules: "2024", book: "Hunter's Bestiary", license: "Original Content" },
      identified: true,
      quantity: 1,
      weight: 0,
      price: { value: 0, denomination: "gp" },
      rarity: "",
      type: { value: "natural", baseItem: "" },
      properties: [],
      proficient: 1,
      equipped: true,
      activities: {
        [activityId]: {
          _id: activityId,
          type: "attack",
          activation: { type: "action", value: null, condition: "" },
          consumption: { targets: [], scaling: { allowed: false } },
          description: { chatFlavor: "" },
          duration: { units: "inst", concentration: false, override: false },
          effects: [],
          range: { value: distance, long: null, units: "ft", special: "" },
          target: { template: { contiguous: false, units: "ft" }, affects: { choice: false, count: "1", type: "creature", special: "" }, prompt: true, override: false },
          attack: { ability: action.ability ?? "str", bonus: "", critical: { threshold: null }, flat: false, type: { value: attackType, classification: "weapon" } },
          damage: { critical: { bonus: "" }, includeBase: true, parts: [] },
          uses: { spent: 0, recovery: [] }
        }
      },
      damage: {
        base: {
          number: damage.number,
          denomination: damage.denomination,
          types: [action.damageType ?? "bludgeoning"],
          bonus: damage.bonus,
          custom: { enabled: false, formula: "" },
          scaling: { mode: "", number: 1, formula: "" }
        },
        versatile: { number: null, denomination: 0, types: [], bonus: "" }
      }
    },
    flags: managedEmbeddedFlags(monster, statblock, `action-${action.id ?? action.name}-${index}`)
  };
}

function managedEmbeddedFlags(monster, statblock, rawKey) {
  const managedKey = slugify(rawKey);
  return {
    [CORE_MODULE_ID]: {
      managedEmbedded: true,
      managedEmbeddedKey: managedKey,
      monsterId: monster.id,
      actorProviderId: statblock.providerId,
      source: `actor-embedded:${monster.id}:Item:${managedKey}`
    },
    [MODULE_ID]: {
      managedKey,
      monsterId: monster.id,
      providerId: statblock.providerId,
      rules: "2024"
    }
  };
}

function parseDamage(formula) {
  const match = String(formula ?? "1d4").replaceAll(" ", "").match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return { number: 1, denomination: 4, bonus: "" };
  return { number: Number(match[1]), denomination: Number(match[2]), bonus: match[3] ? String(Number(match[3])) : "" };
}

function normalizeCreatureType(value) {
  const allowed = new Set(["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"]);
  return allowed.has(value) ? value : "monstrosity";
}

function normalizeAlignment(value) {
  if (!value || value === "unaligned") return "Unaligned";
  return String(value);
}

function resolveSkillLabel(skillId) {
  const config = globalThis.CONFIG?.DND5E?.skills?.[skillId];
  const key = typeof config === "string" ? config : config?.label;
  return key && globalThis.game?.i18n?.has?.(key) ? game.i18n.localize(key) : (key ?? skillId);
}

function stableId(value) {
  const base = slugify(value).replaceAll("-", "").slice(0, 16);
  return (base || "hunteraction").padEnd(16, "0");
}

function experienceForCr(cr) {
  const table = new Map([[0,10],[0.125,25],[0.25,50],[0.5,100],[1,200],[2,450],[3,700],[4,1100],[5,1800],[6,2300],[7,2900],[8,3900],[9,5000],[10,5900],[11,7200],[12,8400],[13,10000],[14,11500],[15,13000],[16,15000],[17,18000],[18,20000],[19,22000],[20,25000],[21,33000],[22,41000],[23,50000],[24,62000],[25,75000],[26,90000],[27,105000],[28,120000],[29,135000],[30,155000]]);
  return table.get(Number(cr)) ?? null;
}

function escapeForRichText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
