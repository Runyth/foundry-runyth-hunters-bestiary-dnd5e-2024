import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
const template = await readFile(new URL("../templates/dashboard.hbs", import.meta.url), "utf8");
const css = await readFile(new URL("../styles/hunters-bestiary-dnd5e.css", import.meta.url), "utf8");

test("dashboard exposes separated repair and strict deletion workflows", () => {
  assert.match(template, /data-action="repairFolders"/);
  assert.match(template, /class="hbd5e-danger-zone"/);
  assert.match(template, /data-action="deleteImported"/);
  assert.match(dashboard, /confirmDestructiveAction/);
  assert.match(dashboard, /moduleApi\.deleteImportedResources/);
  assert.match(css, /\.hbd5e-danger-zone/);
  assert.match(css, /\.hbd5e-danger-button/);
});
