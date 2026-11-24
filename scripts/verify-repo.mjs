#!/usr/bin/env node
// Static repository verification for flyaios-sena (macOS, Windows, Linux).
// Checks: 0 symlinks, valid wikilinks, 0 privacy leaks, valid JSON configs,
// SKILL.md frontmatter and vendor license preservation.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRIVACY_PATTERNS = [
  /\/Users\//i,
  /\/opt\/homebrew/i,
  /\btiamo\b/i,
  /OS Intelligence/i,
  /11-factory/i,
  /\bAIOS-[0-9]+\b/,
  /\bHola\b/,
  /Kim cũ/i,
  /personal-branding/i,
  /ai-briefline/i,
  /bu-headless/i,
  /\bOrca\b/,
  /agy-bridge/i,
  /\bio-map\b/i,
  /jobs\/2026-11-/i,
  /\bsk-[A-Za-z0-9]{16,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /@gmail\.com/i,
  /máy hiện\s+chỉ\s+trống|~\s*9\.8\s*GB/i,
  /máy anh|anh chốt|anh dặn|anh duyệt|anh yêu cầu|cho anh|với anh|của anh|báo anh|hỏi anh|nhờ anh|chờ anh/i,
];

const RUNTIME_IGNORED_PREFIXES = [
  "journal/sessions",
  ".omp/plugins",
  ".agents/vendor-skills",
  ".agents/omp-bridge",
  ".superpowers",
];

const USER_OWNED_PREFIXES = [
  "USER.md",
  "MEMORY.md",
  "WORK.md",
  "memory/",
  "jobs/",
  "journal/",
];

const PRIVACY_SKIP_PREFIXES = [
  ".agents/skills/motion-design/",
  ".agents/skills/skill-creator/",
  "scripts/verify-repo.mjs",
  "tests/verify-repo.test.mjs",
  "tests/omp-hooks.test.mjs",
];

const REQUIRED_SKILLS = [
  "hyperframes-sena",
  "remotion-sena",
  "sena-memory",
  "motion-design",
  "skill-creator",
];

const REQUIRED_FILES = [
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "VERSION",
  ".agents/skills/motion-design/LICENSE",
  ".agents/skills/skill-creator/LICENSE.txt",
];

const REQUIRED_JSON_FILES = [".omp/mcp.json", ".mcp.json", "skills-lock.json"];
const OPTIONAL_JSON_FILES = [".agents/mcp_config.json"];

function walkFiles(rootDir) {
  const files = [];
  const symlinks = [];
  const skip = new Set([".git", "node_modules", ".claude", ".venv", "venv"]);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full).replaceAll("\\", "/");
      if (RUNTIME_IGNORED_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
      if (entry.isSymbolicLink()) {
        symlinks.push(rel);
        continue;
      }
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push({ full, rel });
      }
    }
  };
  walk(rootDir);
  return { files, symlinks };
}

function stripCodeForWikilinks(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let fence = null;
  for (const line of lines) {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      continue;
    }
    // Strip inline code spans so syntax examples like `[[foo]]` are ignored.
    out.push(line.replace(/`[^`]*`/g, ""));
  }
  return out.join("\n");
}

function resolveWikilinkTarget(rootDir, rawTarget) {
  const cleaned = rawTarget.split("|")[0].split("#")[0].trim();
  if (!cleaned) return true;
  const candidates = [
    path.join(rootDir, cleaned),
    path.join(rootDir, `${cleaned}.md`),
    path.join(rootDir, cleaned, "README.md"),
  ];
  return candidates.some((c) => fs.existsSync(c));
}

export function verifyRepo(rootDir = DEFAULT_ROOT, options = {}) {
  const absRoot = path.resolve(rootDir);
  const ciMode = Boolean(options.ciMode);
  const errors = [];
  const { files, symlinks } = walkFiles(absRoot);

  // 1. Zero symlinks
  for (const sym of symlinks) {
    errors.push(`Symlink forbidden (breaks Windows clone): ${sym}`);
  }

  // 2. Required legal/vendor files
  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(absRoot, rel))) {
      errors.push(`Missing required file: ${rel}`);
    }
  }

  // 3. Valid JSON configs
  for (const rel of [...REQUIRED_JSON_FILES, ...OPTIONAL_JSON_FILES]) {
    const full = path.join(absRoot, rel);
    if (!fs.existsSync(full)) {
      if (REQUIRED_JSON_FILES.includes(rel)) errors.push(`Missing required JSON config: ${rel}`);
      continue;
    }
    try {
      JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (err) {
      errors.push(`Invalid JSON in ${rel}: ${err.message}`);
    }
  }

  // 4. Bundled skills frontmatter
  let skillsChecked = 0;
  for (const skill of REQUIRED_SKILLS) {
    const rel = `.agents/skills/${skill}/SKILL.md`;
    const full = path.join(absRoot, rel);
    if (!fs.existsSync(full)) {
      errors.push(`Missing required skill: ${rel}`);
      continue;
    }
    skillsChecked++;
    const content = fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
    if (!/^---\n[\s\S]*?name:\s*\S+[\s\S]*?description:\s*\S+[\s\S]*?\n---/m.test(content)) {
      errors.push(`Invalid or missing YAML frontmatter (name/description) in ${rel}`);
    }
  }

  // 5. Wikilinks & Privacy scan across Markdown / text files
  let markdownFiles = 0;
  let wikilinksChecked = 0;
  const textExts = new Set([".md", ".mjs", ".js", ".ts", ".json", ".yml", ".yaml", ".txt"]);

  for (const { full, rel } of files) {
    const ext = path.extname(rel).toLowerCase();
    if (!textExts.has(ext)) continue;
    const raw = fs.readFileSync(full, "utf8");

    if (ext === ".md") {
      markdownFiles++;
      if (!rel.startsWith(".agents/skills/motion-design/") && !rel.startsWith(".agents/skills/skill-creator/")) {
        const stripped = stripCodeForWikilinks(raw);
        for (const match of stripped.matchAll(/\[\[([^\]]+)\]\]/g)) {
          wikilinksChecked++;
          const target = match[1];
          if (!resolveWikilinkTarget(absRoot, target)) {
            errors.push(`Broken wikilink in ${rel}: [[${target}]]`);
          }
        }
      }
    }

    const isUserOwned = USER_OWNED_PREFIXES.some((p) => rel === p || rel.startsWith(p));
    const skipPrivacy =
      PRIVACY_SKIP_PREFIXES.some((p) => rel === p || rel.startsWith(p)) || (!ciMode && isUserOwned);
    if (!skipPrivacy) {
      const sanitized = raw
        .replace(/https:\/\/github\.com\/Chudien-2923\/flyaios-sena(?:\.git)?/gi, "")
        .replace(/https:\/\/github\.com\/Chudien-2923\/flyaios(?:\.git)?/gi, "");
      for (const rx of PRIVACY_PATTERNS) {
        const hit = rx.exec(sanitized);
        if (hit) {
          errors.push(`Privacy leak in ${rel}: matched ${rx} ("${hit[0]}")`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    stats: { markdownFiles, wikilinksChecked, skillsChecked },
    errors,
  };
}

function isMain() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMain()) {
  const ciMode = process.argv.includes("--ci");
  const res = verifyRepo(DEFAULT_ROOT, { ciMode });
  if (res.ok) {
    process.stdout.write(
      `OK: ${res.stats.markdownFiles} markdown files, ${res.stats.wikilinksChecked} wikilinks, ${res.stats.skillsChecked} skills verified, 0 symlinks, 0 privacy leaks.\n`
    );
    process.exit(0);
  }
  process.stderr.write(`FAILED (${res.errors.length} errors):\n`);
  for (const err of res.errors) process.stderr.write(`- ${err}\n`);
  process.exit(1);
}
