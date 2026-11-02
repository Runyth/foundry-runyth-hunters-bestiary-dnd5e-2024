// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { readFile, readdir, mkdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const manifest = JSON.parse(await readFile(join(root, "module.json"), "utf8"));
const statblocks = JSON.parse(await readFile(join(root, "data/statblocks.json"), "utf8"));
const folder = manifest.id;
const version = manifest.version;

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

const bundle = spawnSync(process.execPath, [join(root, "tools/bundle-runtime.mjs")], { stdio: "inherit" });
if (bundle.status !== 0) process.exit(bundle.status ?? 1);

const check = spawnSync(process.execPath, [join(root, "tools/check.mjs")], { stdio: "inherit" });
if (check.status !== 0) process.exit(check.status ?? 1);
const tests = spawnSync(process.execPath, ["--test", "tests/*.test.mjs"], { cwd: root, stdio: "inherit", shell: true });
if (tests.status !== 0) process.exit(tests.status ?? 1);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const installTop = new Set(["module.json", "README.md", "CHANGELOG.md", "LICENSE", "main.mjs", "assets", "data", "lang", "styles", "templates"]);
const allFiles = await collect(root, path => !path.startsWith("dist/") && !path.startsWith(".git/"));
const installFiles = allFiles.filter(path => installTop.has(path.split("/")[0]));
const sourceFiles = allFiles;

const installName = `${folder}-v${version}.zip`;
const sourceName = `${folder}-source-v${version}.zip`;
await writeZip(join(dist, installName), installFiles);
await writeZip(join(dist, sourceName), sourceFiles);

const hashes = [];
for (const name of [installName, sourceName]) {
  const bytes = await readFile(join(dist, name));
  hashes.push(`${createHash("sha256").update(bytes).digest("hex")}  ${name}`);
}
await writeFile(join(dist, `${folder}-v${version}-SHA256SUMS.txt`), `${hashes.join("\n")}\n`);

const report = `# Hunter's Bestiary - D&D 5e 2024 v${version} — Build Report

## Deliverables

- Installable module ZIP: \`${installName}\`
- Reproducible source ZIP: \`${sourceName}\`
- SHA-256 checksums: \`${folder}-v${version}-SHA256SUMS.txt\`

## Bundled D&D 5e content

- ${statblocks.records.length} original 2024-rules NPC stat blocks
- ${statblocks.records.reduce((sum, record) => sum + record.actions.length, 0)} natural-weapon Actions
- ${statblocks.records.reduce((sum, record) => sum + record.traits.length, 0)} monster Traits
- ${statblocks.records.reduce((sum, record) => sum + record.harvest.length, 0)} harvest loot Item definitions
- Encounter profiles for every quarry

## Implemented integration

- Core system-adapter registration for D&D 5e
- Legacy-compatible explicit Actor adapter registration
- Native D&D D20 field checks
- NPC Actor and hostile prototype Token generation
- D&D loot Item generation with gp prices
- CR, XP, encounter-role, count, and environment metadata
- Strict provider registry and atomic full-monster-pack API
- Persistent GM dashboard and configurable Actor/Item folders
- Core-owned Actor image overrides synchronized with generated prototype Tokens
- Foundry-standard modular localization with English fallback and extensible language dictionaries\n- Bulk harvest Item operations, cached stat-block loading, indexed dashboard context, and non-blocking geometry persistence

## Validation performed

- Manifest, dependency, localization, path, and stat-block validation
- JavaScript syntax checks with \`node --check\`
- Unit tests for registry strictness, Actor source generation, Activities, harvest Items, encounter profiles, and Foundry v13 entrypoint shape
- Deprecated Foundry V1 API scan
- Deterministic ZIP creation with non-versioned \`${folder}/\` root folder
- SHA-256 generation

## Runtime qualification

The build environment cannot launch a real Foundry VTT client. The module targets Foundry v13.351 and D&D 5e 5.3.3 and has been statically and unit-tested. Complete \`docs/TEST-PLAN.md\` in the intended world before campaign use.
`;
await writeFile(join(dist, `${folder}-v${version}-build-report.md`), report);

console.log(`Built ${installName} and ${sourceName} in ${dist}`);

async function collect(base, include) {
  const output = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = join(current, entry.name);
      const path = relative(base, absolute).replaceAll("\\", "/");
      if (!include(path)) continue;
      if (entry.isDirectory()) await walk(absolute);
      else output.push(path);
    }
  }
  await walk(base);
  return output;
}

async function writeZip(outputPath, files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

  for (const path of [...files].sort()) {
    const data = await readFile(join(root, path));
    const compressed = deflateRawSync(data, { level: 9 });
    const name = Buffer.from(`${folder}/${path}`, "utf8");
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  await writeFile(outputPath, Buffer.concat([...localParts, centralDirectory, end]));
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
