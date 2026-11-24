import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as loop from "../.omp/hooks/pre/learning-loop.ts";
import { buildLearnPrompt, needsLearnPolicy } from "../.omp/hooks/pre/learn.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("learning-loop exports core standalone functions and drops Brand/Project exports", () => {
  assert.equal(typeof loop.isCloseCommand, "function");
  assert.equal(typeof loop.isLoggable, "function");
  assert.equal(typeof loop.parseTopic, "function");
  assert.equal(typeof loop.reconstructState, "function");
  assert.equal(typeof loop.closeInstruction, "function");
  assert.equal("parseBrandConfig" in loop, false);
  assert.equal("brandIdsIn" in loop, false);
});

test("isCloseCommand and isLoggable handle slash commands and Windows/macOS video paths", () => {
  assert.equal(loop.isCloseCommand("Chốt bài học nhé"), true);
  assert.equal(loop.isCloseCommand("/chot"), true);
  assert.equal(loop.isCloseCommand("chốt video này nhé"), false);
  assert.equal(loop.isLoggable("chốt bài học"), false);
  assert.equal(loop.isLoggable("/model"), false);
  assert.equal(loop.isLoggable("C:\\Videos\\my vlog\\clip.mp4 dựng cái này"), true);
  assert.equal(loop.isLoggable("/tmp/demo-video.mp4 cắt giúp mình"), true);
});

test("parseTopic, splitExpired, reconstructState and diffSnapshots work without brandHashes", () => {
  const topic = loop.parseTopic(
    "hyperframes.md",
    "---\ntitle: HyperFrames\ndescription: Quy ước dựng video\naliases: [hyperframe, hf]\n---\n- 2026-11-24 · Dùng kho miễn phí\n"
  );
  assert.equal(topic.slug, "hyperframes");
  assert.ok(topic.keywords.includes("hf"));

  const expired = loop.splitExpired(
    "- 2026-11-01 · Quy tắc tạm · đến 2026-11-10\n- 2026-11-01 · Quy tắc lâu dài\n",
    "2026-11-24"
  );
  assert.equal(expired.expired.length, 1);
  assert.match(expired.text, /Quy tắc lâu dài/);

  const state = loop.reconstructState([{ type: "compaction" }]);
  assert.equal("brandHashes" in state, false);
  assert.deepEqual(state.topicHashes, {});

  const diff = loop.diffSnapshots(
    { "MEMORY.md": { hash: "aaa", lines: 5 } },
    { "MEMORY.md": { hash: "bbb", lines: 7 } }
  );
  assert.deepEqual(diff, ["MEMORY.md: 5 → 7 dòng"]);
});

test("closeInstruction uses neutral Vietnamese and contains zero FlyAIOS Brand/Project rules", () => {
  const text = loop.closeInstruction(["journal/sessions/2026-11-24-demo.md"], {
    topics: [],
    memoryLines: 10,
    forgotten: "",
    expired: [],
    uncommitted: [],
  });
  assert.match(text, /bạn/i);
  assert.match(text, /MEMORY\.md/);
  assert.match(text, /memory\/<slug>\.md/);
  assert.doesNotMatch(text, /Team Lead|brand\/feedback|OS Intelligence|learning-loop\.json|\banh\b/i);
});

test("learn.ts policy lifecycle and prompt use neutral Vietnamese and .agents/skills/", () => {
  const policy = { type: "custom_message", customType: "sena.learn", details: { policyVersion: "1.0.0" } };
  assert.equal(needsLearnPolicy([policy, { type: "message" }]), false);
  assert.equal(needsLearnPolicy([policy, { type: "compaction" }, { type: "message" }]), true);
  assert.equal(needsLearnPolicy([{ ...policy, details: { policyVersion: "0.9.0" } }]), true);

  const prompt = buildLearnPrompt("quy trình cắt talking head");
  assert.match(prompt, /LEARNING\.md/);
  assert.doesNotMatch(prompt, /Context Gate|Team Lead|brand\/feedback|\banh\b/i);
  assert.equal(loop.isLoggable(prompt), false);
  assert.equal(loop.isCloseCommand(buildLearnPrompt("học quy trình chốt bài học")), false);
});

test("both OMP hook source files contain zero FlyAIOS or private strings", () => {
  for (const rel of [".omp/hooks/pre/learning-loop.ts", ".omp/hooks/pre/learn.ts"]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotMatch(
      src,
      /OS Intelligence|11-factory|brand\/feedback|Team Lead|tiamo|learning-loop\.json|\/Users\/|Project Gate/i,
      `Found forbidden string in ${rel}`
    );
  }
});
