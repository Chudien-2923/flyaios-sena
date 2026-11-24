import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { verifyRepo } from "../scripts/verify-repo.mjs";

function makeValidRepo(label = "verify repo spaces") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
  fs.mkdirSync(path.join(root, ".omp"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agents", "skills", "hyperframes-sena"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agents", "skills", "remotion-sena"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agents", "skills", "sena-memory"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agents", "skills", "motion-design"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agents", "skills", "skill-creator"), { recursive: true });

  fs.writeFileSync(path.join(root, "LICENSE"), "MIT License\n");
  fs.writeFileSync(path.join(root, "THIRD_PARTY_NOTICES.md"), "# Notices\n");
  fs.writeFileSync(path.join(root, "VERSION"), "1.0.0\n");
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Sena\nXem [[ROLE]] và https://github.com/Chudien-2923/flyaios-sena\n");
  fs.writeFileSync(path.join(root, "ROLE.md"), "# Role\n## Muc 1\n");
  fs.writeFileSync(path.join(root, ".omp", "mcp.json"), JSON.stringify({ mcpServers: { editatlas: { type: "http", url: "https://edit.trysometh.ing/mcp" } } }));
  fs.writeFileSync(path.join(root, ".mcp.json"), JSON.stringify({ mcpServers: { editatlas: { type: "http", url: "https://edit.trysometh.ing/mcp" } } }));
  fs.writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 1, skills: {} }));

  for (const name of ["hyperframes-sena", "remotion-sena", "sena-memory", "motion-design", "skill-creator"]) {
    fs.writeFileSync(
      path.join(root, ".agents", "skills", name, "SKILL.md"),
      `---\nname: ${name}\ndescription: Skill ${name}\n---\n# ${name}\n`
    );
  }
  fs.writeFileSync(path.join(root, ".agents", "skills", "motion-design", "LICENSE"), "MIT\n");
  fs.writeFileSync(path.join(root, ".agents", "skills", "skill-creator", "LICENSE.txt"), "Apache-2.0\n");
  return root;
}

test("passes on a valid minimal fixture including spaces in path and allowed public repo URLs", () => {
  const root = makeValidRepo("My Video Repo");
  try {
    const res = verifyRepo(root);
    assert.equal(res.ok, true, res.errors.join("\n"));
    assert.equal(res.errors.length, 0);
    assert.equal(res.stats.skillsChecked, 5);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails when any symlink exists inside the repo", () => {
  const root = makeValidRepo();
  try {
    fs.symlinkSync(path.join(root, "ROLE.md"), path.join(root, "ROLE-link.md"));
    const res = verifyRepo(root);
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => /symlink/i.test(e)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails on broken [[wikilink]] outside fenced code blocks", () => {
  const root = makeValidRepo();
  try {
    fs.writeFileSync(
      path.join(root, "AGENTS.md"),
      "# Sena\n```md\n[[khong-ton-tai-trong-code-block]]\n```\nLink gãy thật: [[khong-ton-tai]]\n"
    );
    const res = verifyRepo(root);
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.includes("khong-ton-tai") && !e.includes("code-block")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails on privacy leak patterns while allowing public flyaios URLs", () => {
  const root = makeValidRepo();
  try {
    fs.writeFileSync(path.join(root, "ROLE.md"), "Private path /Users/alice/foo and tiamo\n");
    const res = verifyRepo(root);
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => /privacy/i.test(e)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails on invalid JSON MCP config or missing vendor LICENSE or missing SKILL frontmatter", () => {
  const root = makeValidRepo();
  try {
    fs.writeFileSync(path.join(root, ".mcp.json"), "{ broken");
    fs.rmSync(path.join(root, ".agents", "skills", "motion-design", "LICENSE"));
    fs.writeFileSync(path.join(root, ".agents", "skills", "sena-memory", "SKILL.md"), "# No frontmatter\n");

    const res = verifyRepo(root);
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.includes(".mcp.json")));
    assert.ok(res.errors.some((e) => e.includes("motion-design/LICENSE")));
    assert.ok(res.errors.some((e) => e.includes("sena-memory/SKILL.md")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("ignores post-setup runtime dirs and user-owned files in default mode, but enforces strict privacy in ciMode", () => {
  const root = makeValidRepo();
  try {
    // Post-setup runtime directories containing personal paths or third-party symlinks
    fs.mkdirSync(path.join(root, "journal", "sessions"), { recursive: true });
    fs.writeFileSync(path.join(root, "journal", "sessions", "2026-11-24-abc.md"), "Path /Users/bob/Videos\n");
    fs.mkdirSync(path.join(root, ".omp", "plugins", "node_modules"), { recursive: true });
    fs.symlinkSync(path.join(root, "ROLE.md"), path.join(root, ".omp", "plugins", "node_modules", "ext"));
    fs.mkdirSync(path.join(root, ".agents", "vendor-skills", "editatlas"), { recursive: true });
    fs.writeFileSync(path.join(root, ".agents", "vendor-skills", "editatlas", "note.md"), "[[broken-vendor]]\n");
    fs.mkdirSync(path.join(root, ".superpowers"), { recursive: true });
    fs.writeFileSync(path.join(root, ".superpowers", "tmp.md"), "/Users/bob/x\n");
    // User-owned files customized by user
    fs.writeFileSync(path.join(root, "USER.md"), "# User\n- Path: /Users/bob/MyVideos\n");

    const defaultRes = verifyRepo(root);
    assert.equal(defaultRes.ok, true, defaultRes.errors.join("\n"));

    const ciRes = verifyRepo(root, { ciMode: true });
    assert.equal(ciRes.ok, false);
    assert.ok(ciRes.errors.some((e) => e.includes("USER.md")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("catches leaked personal machine disk measurement (~9.8 GB)", () => {
  const root = makeValidRepo();
  try {
    fs.writeFileSync(path.join(root, "ROLE.md"), "Hết đĩa; máy hiện chỉ trống ~9.8 GB\n");
    const res = verifyRepo(root, { ciMode: true });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => /privacy/i.test(e)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
