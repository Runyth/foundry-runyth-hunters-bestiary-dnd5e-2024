import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname } from "node:path";

async function files(url) {
  const output = [];
  for (const entry of await readdir(url, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), url);
    if (entry.isDirectory()) output.push(...await files(child));
    else output.push(child);
  }
  return output;
}

test("D&D integration owns no sheet, HUD, Chat, Scene Control, or canvas render hooks", async () => {
  const paths = await files(new URL("../scripts/", import.meta.url));
  const source = (await Promise.all(paths.filter(path => extname(path.pathname) === ".mjs").map(path => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(source, /Hooks\.on\(/);
  assert.doesNotMatch(source, /renderApplication|renderActorSheet|renderItemSheet|renderTokenHUD|renderChatMessage|getSceneControlButtons/);
  assert.doesNotMatch(source, /html\.(?:find|on|data|attr)\(|\bjQuery\s*\(|(?:^|[^A-Za-z0-9_$])\$\s*\(/m);
  assert.doesNotMatch(source, /\bPIXI\b|canvasReady|canvasTearDown|refreshToken/);
  assert.doesNotMatch(source, /data-action=["']tab["']/);
});

test("D&D integration CSS is scoped to module-owned roots and prefixes", async () => {
  const css = await readFile(new URL("../styles/hunters-bestiary-dnd5e.css", import.meta.url), "utf8");
  for (const forbidden of [
    /^\s*\.window-header\b/m,
    /^\s*\.window-content\b/m,
    /^\s*\.application\b/m,
    /^\s*\.sr-only\b/m,
    /^\s*(?:button|input|select|label)\b[^,{]*\{/m,
    /(^|,)\s*\.(?:muted|table-scroll)\b/m
  ]) assert.doesNotMatch(css, forbidden);
  for (const selectorBlock of css.matchAll(/([^@{}][^{}]*)\{/g)) {
    for (const selector of selectorBlock[1].trim().split(",")) {
      const trimmed = selector.trim();
      if (!trimmed || trimmed.startsWith("@")) continue;
      assert.ok(trimmed.startsWith(".hbd5e-") || trimmed.startsWith(".hunters-bestiary-dnd5e"), `unscoped selector: ${trimmed}`);
    }
  }
});
