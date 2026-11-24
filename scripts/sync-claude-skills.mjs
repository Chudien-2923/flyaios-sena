#!/usr/bin/env node
// Sync .agents/skills/* -> .claude/skills/* as real files (zero symlinks, Windows-safe).
// Never modifies or removes unmanaged directories lacking .sena-managed.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MANAGED_MARKER = ".sena-managed";
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function listSourceSkills(sourceDir) {
  if (!fs.existsSync(sourceDir)) return [];
  const names = [];
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(sourceDir, entry.name, "SKILL.md");
    if (fs.existsSync(skillMd)) names.push(entry.name);
  }
  return names.sort();
}

function hashDirectory(dir, skipMarker = false) {
  const hash = crypto.createHash("sha256");
  const walk = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (skipMarker && current === dir && entry.name === MANAGED_MARKER) continue;
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        hash.update(`D:${rel}\n`);
        walk(full);
      } else if (entry.isFile()) {
        hash.update(`F:${rel}\n`);
        hash.update(fs.readFileSync(full));
        hash.update("\n");
      }
    }
  };
  walk(dir);
  return hash.digest("hex");
}

export function syncClaudeSkills(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? DEFAULT_ROOT);
  const checkOnly = Boolean(options.checkOnly);
  const sourceDir = path.join(rootDir, ".agents", "skills");
  const targetDir = path.join(rootDir, ".claude", "skills");

  const sourceSkills = listSourceSkills(sourceDir);
  const sourceSet = new Set(sourceSkills);
  const synced = [];
  const removed = [];
  const preserved = [];
  let inSync = true;

  const existingEntries = fs.existsSync(targetDir)
    ? fs.readdirSync(targetDir, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // 1. Inspect existing directories in .claude/skills/
  for (const entry of existingEntries) {
    const dst = path.join(targetDir, entry.name);
    const isManaged = fs.existsSync(path.join(dst, MANAGED_MARKER));
    if (!isManaged) {
      preserved.push(entry.name);
      continue;
    }
    if (!sourceSet.has(entry.name)) {
      inSync = false;
      removed.push(entry.name);
      if (!checkOnly) {
        fs.rmSync(dst, { recursive: true, force: true });
      }
    }
  }

  // 2. Sync each skill from .agents/skills/ -> .claude/skills/
  const preservedSet = new Set(preserved);
  if (!checkOnly && sourceSkills.length > 0) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const name of sourceSkills) {
    if (preservedSet.has(name)) {
      // Unmanaged user directory has the same name — never clobber it.
      continue;
    }
    const src = path.join(sourceDir, name);
    const dst = path.join(targetDir, name);
    const dstExists = fs.existsSync(dst);
    const srcHash = hashDirectory(src, false);
    const dstHash = dstExists ? hashDirectory(dst, true) : null;

    if (!dstExists || !fs.existsSync(path.join(dst, MANAGED_MARKER)) || srcHash !== dstHash) {
      inSync = false;
      if (!checkOnly) {
        fs.rmSync(dst, { recursive: true, force: true });
        fs.cpSync(src, dst, { recursive: true, force: true, dereference: true });
        fs.writeFileSync(
          path.join(dst, MANAGED_MARKER),
          `Managed by scripts/sync-claude-skills.mjs from .agents/skills/${name}\n`
        );
      }
    }
    synced.push(name);
  }

  return { synced, removed, preserved, targetDir, inSync };
}

function isMain() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMain()) {
  const checkOnly = process.argv.includes("--check");
  const result = syncClaudeSkills({ checkOnly });
  if (checkOnly) {
    process.stdout.write(
      result.inSync
        ? `OK: .claude/skills/ khớp .agents/skills/ (${result.synced.length} skill).\n`
        : `OUT OF SYNC: chạy "node scripts/sync-claude-skills.mjs" để đồng bộ.\n`
    );
    process.exit(result.inSync ? 0 : 1);
  }
  process.stdout.write(
    `Đã đồng bộ ${result.synced.length} skill sang .claude/skills/: ${result.synced.join(", ") || "(trống)"}\n`
  );
  if (result.removed.length > 0) {
    process.stdout.write(`Đã dọn ${result.removed.length} skill cũ do Sena quản lý: ${result.removed.join(", ")}\n`);
  }
  if (result.preserved.length > 0) {
    process.stdout.write(
      `Giữ nguyên ${result.preserved.length} thư mục tự tạo (không có ${MANAGED_MARKER}): ${result.preserved.join(", ")}\n`
    );
  }
}
