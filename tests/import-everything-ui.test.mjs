import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("dashboard exposes one primary import-everything action", async () => {
  const template = await readFile(new URL("../templates/dashboard.hbs", import.meta.url), "utf8");
  const source = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  assert.match(template, /data-action="importEverything"/);
  assert.match(template, /hbd5e-primary-action/);
  assert.match(source, /async function importEverything\(\)/);
  assert.match(source, /updateExisting:\s*true/);
  assert.match(source, /importOrUpdateAllHarvestItems/);
});
