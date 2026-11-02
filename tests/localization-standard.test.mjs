// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { localizeText } from "../scripts/utils.mjs";

const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
const en = JSON.parse(await readFile(new URL("../lang/en.json", import.meta.url), "utf8"));
const de = JSON.parse(await readFile(new URL("../lang/de.json", import.meta.url), "utf8"));
const dataFiles = ["../data/statblocks.json"];

test("manifest uses Foundry's standard modular localization declarations", () => {
  assert.deepEqual(manifest.languages, [
    { lang: "en", name: "English", path: "lang/en.json" },
    { lang: "de", name: "Deutsch", path: "lang/de.json" }
  ]);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
});

test("shipped data uses localization keys and contains no embedded language maps", async () => {
  const inline = [];
  const keys = [];
  const walk = (value, path = "$") => {
    if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    if (!value || typeof value !== "object") {
      if (typeof value === "string" && value.startsWith("HBDND5E.Content.")) keys.push([path, value]);
      return;
    }
    if (Object.hasOwn(value, "en") || Object.hasOwn(value, "de")) inline.push(path);
    for (const [key, entry] of Object.entries(value)) walk(entry, `${path}.${key}`);
  };
  for (const file of dataFiles) walk(JSON.parse(await readFile(new URL(file, import.meta.url), "utf8")), file);
  assert.deepEqual(inline, []);
  assert.ok(keys.length > 0);
  for (const [path, key] of keys) {
    assert.equal(typeof en[key], "string", `${path}: English missing ${key}`);
    assert.equal(typeof de[key], "string", `${path}: German missing ${key}`);
  }
});

test("localization delegates to Foundry's active game.i18n service", () => {
  const previous = globalThis.game;
  const key = Object.keys(de).find(entry => entry.startsWith("HBDND5E.Content."));
  globalThis.game = { i18n: { lang: "de", localize: value => de[value] ?? value } };
  try {
    assert.equal(localizeText(key), de[key]);
    assert.equal(localizeText("Campaign-authored text"), "Campaign-authored text");
  } finally { globalThis.game = previous; }
});

test("production has no custom language selector or translation-dictionary injection", async () => {
  const files = [
    ...manifest.esmodules.map(path => `../${path}`),
    ...["../scripts/settings.mjs", "../scripts/main.mjs", "../scripts/apps/dashboard.mjs", "../scripts/utils.mjs"]
  ];
  const sources = [];
  for (const file of new Set(files)) {
    try { sources.push(await readFile(new URL(file, import.meta.url), "utf8")); } catch { /* optional source */ }
  }
  const source = sources.join("\n");
  assert.doesNotMatch(source, /ensureModuleTranslations|installModuleTranslations|expandDottedTranslations|mergeTranslations/);
  assert.doesNotMatch(source, /fetch\([^)]*\blang\//);
  assert.doesNotMatch(source, /game\.settings\.register\([^)]*(?:language|locale)/i);
});
