import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { MANAGED_MARKER, syncClaudeSkills } from "../scripts/sync-claude-skills.mjs";

function makeFixture(label = "sena sync spaces") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
  const alpha = path.join(root, ".agents", "skills", "alpha-skill");
  const beta = path.join(root, ".agents", "skills", "beta-skill", "references");
  fs.mkdirSync(alpha, { recursive: true });
  fs.mkdirSync(beta, { recursive: true });
  fs.writeFileSync(path.join(alpha, "SKILL.md"), "---\nname: alpha-skill\ndescription: A\n---\n# Alpha\n");
  fs.writeFileSync(path.join(root, ".agents", "skills", "beta-skill", "SKILL.md"), "---\nname: beta-skill\ndescription: B\n---\n# Beta\n");
  fs.writeFileSync(path.join(beta, "guide.md"), "Guide content\n");
  // Non-skill helper file at root of .agents/skills/ must be ignored
  fs.writeFileSync(path.join(root, ".agents", "skills", "README.md"), "# Skills\n");
  return root;
}

test("copies every skill directory containing SKILL.md as real files with .sena-managed marker", () => {
  const root = makeFixture("My Videos Folder");
  try {
    const res = syncClaudeSkills({ rootDir: root });
    assert.deepEqual(res.synced.sort(), ["alpha-skill", "beta-skill"]);
    assert.deepEqual(res.removed, []);
    assert.deepEqual(res.preserved, []);

    const targetAlpha = path.join(root, ".claude", "skills", "alpha-skill");
    assert.equal(fs.lstatSync(targetAlpha).isSymbolicLink(), false);
    assert.equal(fs.existsSync(path.join(targetAlpha, "SKILL.md")), true);
    assert.equal(fs.existsSync(path.join(targetAlpha, MANAGED_MARKER)), true);
    assert.equal(
      fs.readFileSync(path.join(root, ".claude", "skills", "beta-skill", "references", "guide.md"), "utf8"),
      "Guide content\n"
    );
    assert.equal(fs.existsSync(path.join(root, ".claude", "skills", "README.md")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("preserves user-authored skill in .claude/skills/ lacking .sena-managed marker", () => {
  const root = makeFixture();
  try {
    const customDir = path.join(root, ".claude", "skills", "my-vlog-style");
    fs.mkdirSync(customDir, { recursive: true });
    fs.writeFileSync(path.join(customDir, "SKILL.md"), "# My personal vlog skill\n");

    const res = syncClaudeSkills({ rootDir: root });
    assert.deepEqual(res.preserved, ["my-vlog-style"]);
    assert.equal(fs.readFileSync(path.join(customDir, "SKILL.md"), "utf8"), "# My personal vlog skill\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("removes stale managed skill when deleted from .agents/skills/", () => {
  const root = makeFixture();
  try {
    syncClaudeSkills({ rootDir: root });
    fs.rmSync(path.join(root, ".agents", "skills", "beta-skill"), { recursive: true, force: true });

    const res = syncClaudeSkills({ rootDir: root });
    assert.deepEqual(res.removed, ["beta-skill"]);
    assert.equal(fs.existsSync(path.join(root, ".claude", "skills", "beta-skill")), false);
    assert.equal(fs.existsSync(path.join(root, ".claude", "skills", "alpha-skill")), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("does not clobber unmanaged directory with colliding name and reports it in preserved", () => {
  const root = makeFixture();
  try {
    const colliding = path.join(root, ".claude", "skills", "alpha-skill");
    fs.mkdirSync(colliding, { recursive: true });
    fs.writeFileSync(path.join(colliding, "SKILL.md"), "# User custom alpha\n");

    const res = syncClaudeSkills({ rootDir: root });
    assert.deepEqual(res.synced, ["beta-skill"]);
    assert.deepEqual(res.preserved, ["alpha-skill"]);
    assert.equal(fs.readFileSync(path.join(colliding, "SKILL.md"), "utf8"), "# User custom alpha\n");
    assert.equal(fs.existsSync(path.join(colliding, MANAGED_MARKER)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("check mode detects out-of-sync without modifying files, then passes after sync", () => {
  const root = makeFixture();
  try {
    const before = syncClaudeSkills({ rootDir: root, checkOnly: true });
    assert.equal(before.inSync, false);
    assert.equal(fs.existsSync(path.join(root, ".claude", "skills")), false);

    syncClaudeSkills({ rootDir: root });
    const after = syncClaudeSkills({ rootDir: root, checkOnly: true });
    assert.equal(after.inSync, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
