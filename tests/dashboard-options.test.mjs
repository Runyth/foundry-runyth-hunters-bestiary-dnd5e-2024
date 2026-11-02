import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
const base = await readFile(new URL("../scripts/apps/base-app.mjs", import.meta.url), "utf8");

test("ApplicationV2 position defaults contain only supported geometry fields", () => {
  const match = dashboard.match(/position:\s*\{([^}]*)\}/);
  assert.ok(match, "dashboard position defaults are present");
  assert.match(match[1], /width:\s*960/);
  assert.match(match[1], /height:\s*720/);
  assert.doesNotMatch(match[1], /minWidth|minHeight/);
});

test("minimum dashboard geometry remains enforced outside ApplicationPosition", () => {
  assert.match(base, /minWidth:\s*this\.options\.position\?\.minWidth \?\? 560/);
  assert.match(base, /minHeight:\s*this\.options\.position\?\.minHeight \?\? 420/);
});
