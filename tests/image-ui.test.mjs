import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("D&D dashboard delegates image changes to the core image service", async () => {
  const source = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  const template = await readFile(new URL("../templates/dashboard.hbs", import.meta.url), "utf8");
  assert.match(source, /openMonsterImagePicker/);
  assert.match(source, /getMonsterImage/);
  assert.match(template, /data-action="changeQuarryImage"/);
  assert.match(template, /hbd5e-quarry-image-button/);
});
