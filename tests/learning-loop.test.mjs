// Hook learning-loop: giao bài học chủ đề theo dòng, đúng lúc (tin nhắn, lệnh bash, ghi/sửa file).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { MAX_SESSION_LESSONS, closeInstruction, planPromptLessons, planToolLessons, reconstructState } from "../.omp/hooks/pre/learning-loop.ts";
import { parseLessons, parseTopic } from "../scripts/recall.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TEXT = `---
title: HyperFrames
aliases: [hyperframes, heygen]
---
- 2026-11-18 · HeyGen chỉ dùng kho miễn phí credits 0 · khi: cần nhạc nền, hiệu ứng âm thanh; gọi HeyGen (heygen, music, sfx) · nguồn: "a"
- 2026-11-18 · Không dùng Kokoro TTS vì chưa hỗ trợ tiếng Việt · khi: cần giọng đọc, lồng tiếng (tts, voiceover, kokoro) · nguồn: "b"
`;
const store = (text = TEXT) => {
  const topic = parseTopic("hyperframes.md", text);
  return { topics: [topic], lessons: parseLessons("memory/hyperframes.md", text, topic, "2026-11-25"), unreadable: [] };
};
const texts = (lessons) => lessons.map((lesson) => lesson.lesson);

test("tin nhắn gọi tên chủ đề giao các dòng của chủ đề; nhắc lại không giao thêm", () => {
  const first = planPromptLessons("làm tiếp video hyperframes", store(), {}, {});
  assert.deepEqual(texts(first.add), ["HeyGen chỉ dùng kho miễn phí credits 0", "Không dùng Kokoro TTS vì chưa hỗ trợ tiếng Việt"]);
  assert.match(first.reasons[0], /chủ đề hyperframes/);
  const again = planPromptLessons("hyperframes tiếp", store(), first.delivered, {});
  assert.deepEqual(again.add, []);
  assert.deepEqual(again.delivered, first.delivered);
});

test("tin nhắn không gọi tên chủ đề vẫn nhận đúng dòng theo tình huống", () => {
  assert.deepEqual(texts(planPromptLessons("tìm nhạc nền và hiệu ứng âm thanh cho video SaaS", store(), {}, {}).add), [
    "HeyGen chỉ dùng kho miễn phí credits 0",
  ]);
});

test("dòng đã giao bị sửa: thu hồi bản cũ, giao bản mới; bị hết hạn: chỉ thu hồi", () => {
  const first = planPromptLessons("hyperframes", store(), {}, {});
  const edited = planPromptLessons("tiếp tục", store(TEXT.replace("credits 0", "credits 0, không mua gói")), first.delivered, {});
  assert.deepEqual(edited.revoked.map((item) => item.line), [TEXT.split("\n")[4]]);
  assert.deepEqual(texts(edited.add), ["HeyGen chỉ dùng kho miễn phí credits 0, không mua gói"]);
  const expired = planPromptLessons("tiếp tục", store(TEXT.replace('nguồn: "b"', 'nguồn: "b" · đến 2026-11-01')), first.delivered, {});
  assert.equal(expired.revoked.length, 1);
  assert.match(expired.revoked[0].line, /Kokoro/);
  assert.deepEqual(expired.add, []);
});

test("sau compaction: dòng đã giao chuyển sang chờ giao lại và được giao dù tin nhắn không khớp", () => {
  const first = planPromptLessons("hyperframes", store(), {}, {});
  const state = reconstructState([
    { type: "custom_message", customType: "sena.learning-loop", details: { lessons: first.delivered, reload: {}, reminded: false, closePending: [], closeNudges: 0, recalled: [] } },
    { type: "compaction" },
  ]);
  assert.deepEqual(state.lessons, {});
  assert.deepEqual(state.reload, first.delivered);
  const plan = planPromptLessons("tiếp tục", store(), state.lessons, state.reload);
  assert.equal(plan.add.length, 2);
  assert.match(plan.reasons[0], /giao lại sau compaction/);
});

test("lệnh bash: đúng dòng liên quan, không lặp dòng đã giao; trần phiên tính cả dòng đang chờ", () => {
  const picked = planToolLessons("bash", { command: "npx hyperframes heygen music search corporate" }, store(), {});
  assert.deepEqual(texts(picked), ["HeyGen chỉ dùng kho miễn phí credits 0"]);
  assert.deepEqual(planToolLessons("bash", { command: "npx hyperframes heygen music" }, store(), { [picked[0].id]: picked[0].line }), []);
  assert.deepEqual(planToolLessons("bash", { command: "ls -la && git status" }, store(), {}), []);
  const delivered = Object.fromEntries(Array.from({ length: MAX_SESSION_LESSONS - 1 }, (_, i) => [`memory/x.md#${i}`, `- x${i}`]));
  const pending = { [picked[0].id]: picked[0].line };
  assert.deepEqual(planToolLessons("bash", { command: "cài kokoro tts voiceover" }, store(), delivered, pending), []);
  assert.deepEqual(planToolLessons("bash", { command: "heygen music generate" }, store(), delivered, pending).map((lesson) => lesson.id), [picked[0].id]);
});

test("chỉ dẫn chốt đề xuất dòng chủ đề có `khi:`", () => {
  const text = closeInstruction([], { topics: [], memoryLines: 1, forgotten: "", expired: [], uncommitted: [] });
  assert.match(text, /· khi: <tình huống áp dụng>/);
});

// ---------------------------------------------------------------- vòng đời hook trên repo tạm

const HEYGEN = '---\ntitle: HyperFrames\naliases: heygen\n---\n- 2026-11-18 · HeyGen chỉ dùng kho miễn phí · khi: cần nhạc nền; gọi HeyGen (heygen, music) · nguồn: "a"\n';

/** Cài hook + bộ tra vào một repo Sena tạm và nối các handler OMP giả. */
async function installHook() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sena-loop-"));
  for (const dir of [".omp/hooks/pre", "memory", "scripts"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const hookPath = path.join(root, ".omp/hooks/pre/learning-loop.ts");
  fs.copyFileSync(path.join(REPO, ".omp/hooks/pre/learning-loop.ts"), hookPath);
  fs.copyFileSync(path.join(REPO, "scripts/recall.mjs"), path.join(root, "scripts/recall.mjs"));
  fs.writeFileSync(path.join(root, "MEMORY.md"), "# Memory\n- current-general\n");
  fs.writeFileSync(path.join(root, "memory/hyperframes.md"), HEYGEN);
  const { default: setup } = await import(pathToFileURL(hookPath).href);
  const handlers = {};
  let active = [];
  setup({
    on: (name, fn) => (handlers[name] = fn),
    registerCommand() {},
    appendEntry: (customType, data) => active.push({ type: "custom", customType, data }),
  });
  const session = (id) => {
    const branch = [];
    const ctx = { agent: { kind: "main" }, hasUI: false, ui: { notify() {} }, sessionManager: { getBranch: () => branch, getSessionId: () => id } };
    return {
      branch,
      ctx,
      async turn(prompt) {
        active = branch;
        branch.push({ type: "message", message: { role: "user" } });
        const result = await handlers.before_agent_start({ prompt }, ctx);
        if (result) branch.push({ type: "custom_message", ...result.message });
        return result?.message;
      },
      bash: (command) => handlers.tool_call({ toolName: "bash", input: { command } }, ctx),
      async endTurn() {
        active = branch;
        await handlers.turn_end({}, ctx);
      },
    };
  };
  return { root, handlers, session, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test("lệnh bash liên quan bị dừng một lần; hết lượt mới tính đã giao; tin nhắn kế không giao lại", async () => {
  const hook = await installHook();
  try {
    const current = hook.session("session-11111111");
    await current.turn("dựng video SaaS");
    const first = await current.bash("npx hyperframes heygen music search");
    assert.equal(first?.block, true);
    assert.match(first.reason, /HeyGen chỉ dùng kho miễn phí/);
    assert.equal((await current.bash("heygen music generate --credits 10"))?.block, true);
    await current.endTurn();
    assert.equal(await current.bash("npx hyperframes heygen music search"), undefined);
    assert.doesNotMatch((await current.turn("tìm nhạc nền heygen music khác"))?.content ?? "", /HeyGen chỉ dùng kho miễn phí/);
    // Compaction: dòng giao qua lệnh được giao lại ở tin nhắn kế.
    current.branch.push({ type: "compaction" });
    assert.match((await current.turn("tiếp tục")).content, /HeyGen chỉ dùng kho miễn phí/);
    // Xóa dòng: thu hồi đúng một lần.
    fs.writeFileSync(path.join(hook.root, "memory/hyperframes.md"), "---\ntitle: HyperFrames\n---\n");
    assert.match((await current.turn("tiếp tục")).content, /KHÔNG CÒN HIỆU LỰC/);
    assert.doesNotMatch((await current.turn("tiếp tục"))?.content ?? "", /KHÔNG CÒN HIỆU LỰC/);
  } finally {
    hook.cleanup();
  }
});

test("ghi/sửa file thành công mới đưa bài học vào lượt kế; tool lỗi hoặc lỗi đọc phiên không chặn", async () => {
  const hook = await installHook();
  try {
    const current = hook.session("session-22222222");
    const write = { toolName: "write", input: { path: "scene.html", content: '<audio data-src="heygen music bed">' } };
    assert.equal(await hook.handlers.tool_call(write, current.ctx), undefined);
    assert.equal(await hook.handlers.tool_result({ ...write, isError: true }, current.ctx), undefined);
    assert.match((await hook.handlers.tool_result(write, current.ctx))?.additionalContext ?? "", /HeyGen chỉ dùng kho miễn phí/);
    await current.endTurn();
    assert.equal(await hook.handlers.tool_result(write, current.ctx), undefined);
    const broken = { ...current.ctx, sessionManager: { getBranch: () => { throw new Error("hỏng"); }, getSessionId: () => "x" } };
    assert.equal(await hook.handlers.tool_call({ toolName: "bash", input: { command: "heygen music" } }, broken), undefined);
  } finally {
    hook.cleanup();
  }
});
