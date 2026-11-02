// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { readFile, readdir, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { StatblockRegistry } from "../scripts/registry.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const passes = [];
const fail = message => errors.push(message);
const pass = message => passes.push(message);

async function json(path) {
  try { return JSON.parse(await readFile(join(root, path), "utf8")); }
  catch (error) { fail(`${path}: ${error.message}`); return null; }
}

async function filesUnder(directory) {
  const output = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else output.push(path);
    }
  }
  await walk(join(root, directory));
  return output;
}

const manifest = await json("module.json");
const statblocks = await json("data/statblocks.json");
const en = await json("lang/en.json");
const de = await json("lang/de.json");

if (manifest) {
  if (manifest.id !== "hunters-bestiary-dnd5e-2024") fail("unexpected module id");
  if (manifest.version !== "1.2.2") fail("unexpected module version");
  const requires = manifest.relationships?.requires ?? [];
  if (!requires.some(entry => entry.id === "hunters-bestiary" && entry.type === "module" && entry.compatibility?.minimum === "1.4.2")) fail("core module v1.4.2 relationship is missing");
  if (!requires.some(entry => entry.id === "dnd5e" && entry.type === "system")) fail("dnd5e system relationship is missing");
  for (const path of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map(entry => entry.path), manifest.readme, manifest.changelog, manifest.license, ...(manifest.media ?? []).map(entry => entry.url)].filter(Boolean)) {
    try { await access(join(root, path), fsConstants.R_OK); }
    catch { fail(`manifest path is missing: ${path}`); }
  }
  if (JSON.stringify(manifest.esmodules ?? []) !== JSON.stringify(["main.mjs"])) fail("manifest must load the single bundled root entry main.mjs");
  pass("manifest, dependencies, and referenced files");
}

if (statblocks) {
  const registry = new StatblockRegistry();
  try {
    const result = registry.register("bundled", statblocks.records);
    if (!result.complete) fail("bundled stat blocks are incomplete");
  } catch (error) {
    fail(`statblock validation: ${error.message}`);
  }
  if (statblocks.records?.length !== 24) fail("exactly 24 bundled stat blocks are required");
  const ids = statblocks.records?.map(record => record.monsterId) ?? [];
  if (ids.length !== new Set(ids).size) fail("duplicate monsterId in stat blocks");
  for (const record of statblocks.records ?? []) {
    if ((record.harvest?.length ?? 0) < 2) fail(`${record.monsterId} requires at least two harvest records`);
    if (!record.encounter?.role) fail(`${record.monsterId} requires an encounter role`);
  }
  pass("24 complete stat blocks, actions, harvest records, and encounter roles");
  const invalidLegacyIcon = "icons/commodities/biological/shell-ridged-brown.webp";
  const builderText = await readFile(join(root, "scripts/dnd5e-builder.mjs"), "utf8");
  if (builderText.includes(`img: "${invalidLegacyIcon}"`)) fail("invalid legacy harvest icon remains hard-coded");
  if (!builderText.includes("HARVEST_ICON_BY_NAME")) fail("harvest icon mapping is missing");
  pass("harvest Item icon mapping and legacy-path rejection");
}

const bundledEntry = join(root, "main.mjs");
try {
  const bundledText = await readFile(bundledEntry, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", bundledEntry], { encoding: "utf8" });
  if (syntax.status !== 0) fail(`main.mjs syntax: ${syntax.stderr.trim()}`);
  if (/^\s*import\b/m.test(bundledText) || /\bimport\s*\(/.test(bundledText)) fail("bundled root entry contains a runtime import");
  for (const marker of ["registerSettings", "HuntersBestiaryDnd5eAPI", "DashboardApp", "importOrUpdateHarvestItems", "deleteImportedResources"]) {
    if (!bundledText.includes(marker)) fail(`bundled root entry is missing runtime marker: ${marker}`);
  }
  pass("single-file bundled runtime entry and settings bootstrap");
} catch (error) {
  fail(`bundled runtime entry: ${error.message}`);
}

const scripts = await filesUnder("scripts");
for (const path of scripts.filter(path => extname(path) === ".mjs")) {
  const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  if (result.status !== 0) fail(`${relative(root, path)} syntax: ${result.stderr.trim()}`);
}
pass(`${scripts.length} script files syntax-checked`);

for (const path of scripts) {
  const text = await readFile(path, "utf8");
  for (const [pattern, label] of [[/\bFormApplication\b/, "FormApplication"], [/\bFilePicker\b/, "FilePicker"], [/\bDialog\.(confirm|prompt|wait)\b/, "legacy Dialog"]]) {
    if (pattern.test(text)) fail(`${relative(root, path)} contains ${label}`);
  }
}
pass("deprecated V1 API scan");

const productionText = (await Promise.all(scripts.map(path => readFile(path, "utf8")))).join("\n");
for (const [pattern, label] of [
  [/Hooks\.on\(/, "runtime render hook"],
  [/renderApplication|renderActorSheet|renderItemSheet|renderTokenHUD|renderChatMessage|getSceneControlButtons/, "Foundry UI injection"],
  [/html\.(?:find|on|data|attr)\(/, "jQuery-style hook argument usage"],
  [/\bjQuery\s*\(/, "jQuery usage"],
  [/data-action=["']tab["']/, "reserved ApplicationV2 tab action"],
  [/\bPIXI\b|canvasReady|canvasTearDown|refreshToken/, "canvas overlay integration"]
]) if (pattern.test(productionText)) fail(`production source contains ${label}`);
pass("UI ownership, native DOM, Chat, Scene Controls, and canvas isolation audit");

for (const path of scripts) {
  const text = await readFile(path, "utf8");
  for (const match of text.matchAll(/(?:from\s+|import\s*\()\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    const target = resolve(dirname(path), match[1]);
    try { await access(target, fsConstants.R_OK); }
    catch { fail(`${relative(root, path)} imports missing file: ${match[1]}`); }
  }
}
pass("all production relative imports resolve");

for (const path of await filesUnder("styles")) {
  const css = await readFile(path, "utf8");
  for (const [pattern, label] of [
    [/^\s*\.window-header\b/m, ".window-header"],
    [/^\s*\.window-content\b/m, ".window-content"],
    [/^\s*\.application\b/m, ".application"],
    [/^\s*\.sr-only\b/m, ".sr-only"],
    [/^\s*(?:button|input|select|label)\b[^,{]*\{/m, "bare form/control element"],
    [/(^|,)\s*\.(?:muted|table-scroll)\b/m, "generic utility selector"]
  ]) if (pattern.test(css)) fail(`${relative(root, path)} contains unscoped ${label} rule`);
}
pass("stylesheet isolation audit");

if (en && de) {
  const enKeys = Object.keys(en).sort();
  const deKeys = Object.keys(de).sort();
  if (JSON.stringify(enKeys) !== JSON.stringify(deKeys)) fail("modular English/German localization key mismatch");
  const contents = [...scripts, ...(await filesUnder("templates"))];
  const referenced = new Set();
  for (const path of contents) {
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(/["'](HBDND5E\.[A-Za-z0-9_.-]+)["']/g)) referenced.add(match[1]);
  }
  for (const key of referenced) if (!(key in en)) fail(`missing localization key: ${key}`);
  pass(`${enKeys.length} modular localization keys and references`);
}

const templateText = (await Promise.all((await filesUnder("templates")).map(path => readFile(path, "utf8")))).join("\n");
const actions = [...templateText.matchAll(/data-action="([A-Za-z0-9_-]+)"/g)].map(match => match[1]);
const scriptText = productionText;
for (const action of actions) if (!new RegExp(`\\b${action}\\s*[,}:]`).test(scriptText)) fail(`template action has no handler: ${action}`);
pass(`${actions.length} dashboard actions mapped`);

if (errors.length) {
  console.error(`D&D 5e integration validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`D&D 5e integration validation passed (${passes.length} groups):`);
for (const message of passes) console.log(`- ${message}`);
