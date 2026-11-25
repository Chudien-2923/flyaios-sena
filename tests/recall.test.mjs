import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { capLessons, lessonTerms, loadLessons, parseLessons, parseTopic, rankLessons, toolQuery } from "../scripts/recall.mjs";

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts/recall.mjs");

const HYPERFRAMES = `---
title: HyperFrames
description: Quy ước tài nguyên miễn phí và giới hạn TTS khi dựng bằng HyperFrames
aliases: [hyperframes, hyperframe, heygen, kokoro]
---

# HyperFrames

- 2026-11-18 · Khi dựng video bằng HyperFrames, tài khoản HeyGen chỉ dùng cho kho tài nguyên miễn phí (nhạc nền, hiệu ứng âm thanh, ảnh, icon với \`credits: 0\`), không dùng các tính năng tốn credit · khi: cần nhạc nền, hiệu ứng âm thanh, ảnh hoặc icon; gọi HeyGen (heygen, music, sfx, bgm, asset) · nguồn: "chỉ muốn tận dụng kho miễn phí"
- 2026-11-18 · Không cần cài hoặc dùng Kokoro TTS cho HyperFrames vì chưa hỗ trợ tiếng Việt · khi: cần giọng đọc, lồng tiếng hoặc cài TTS (tts, voiceover, kokoro) · nguồn: "không cần"
`;
const FOOTAGE = `---
title: Nguồn footage thật
aliases: [footage, b-roll, broll, stock]
---
- 2026-11-24 · Gợi ý gọi API công khai miễn phí của Archive.org, NASA và Wikimedia Commons để tìm footage quay thật · khi: cần footage thật, B-roll, tư liệu (archive, nasa, wikimedia, pexels) · nguồn: "nhớ cái này"
`;
const THREE_D = `---
title: Video có chất liệu 3D
aliases: [3d, threejs, glb, webgl]
---
- 2026-11-24 · Đề xuất duyệt cài chọn lọc skill threejs phù hợp khi dựng scene 3D · khi: scene có model 3D, camera 3D, shader hoặc WebGL (glb, gltf, threejs, three) · nguồn: "tự biết để đề xuất"
`;
const TODAY = "2026-11-25";

function corpus() {
  return [
    ["hyperframes.md", HYPERFRAMES],
    ["footage.md", FOOTAGE],
    ["3d-video.md", THREE_D],
  ].flatMap(([name, text]) => parseLessons(`memory/${name}`, text, parseTopic(name, text), TODAY));
}

const top = (query, tool = false) =>
  rankLessons(lessonTerms(query, { tool }), corpus()).map((item) => `${item.lesson.slug}:${item.lesson.lesson.slice(0, 20)}`);

function withRoot(files, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sena-recall-"));
  try {
    fs.mkdirSync(path.join(root, "memory"));
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(root, "memory", name), text);
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("parseLessons tách nội dung và `khi:`, bỏ ngày, nguồn, frontmatter", () => {
  const [heygen] = corpus();
  assert.ok(heygen.lesson.startsWith("Khi dựng video bằng HyperFrames"));
  assert.doesNotMatch(heygen.lesson, /nguồn/);
  assert.match(heygen.when, /cần nhạc nền/);
  assert.equal(heygen.file, "memory/hyperframes.md");
  assert.equal(corpus().length, 4);
});

test("dòng cũ thiếu `khi:` vẫn là bài học; dòng hết hạn bị bỏ; hạn còn hiệu lực trong ngày", () => {
  const text = '- 2026-11-01 · Bài cũ không có khi · nguồn: "x"\n- 2026-11-01 · Bài hết hạn · nguồn: "y" · đến 2026-11-24\n- 2026-11-01 · Bài còn hạn · nguồn: "z" · đến 2026-11-25\n';
  const lessons = parseLessons("memory/a.md", text, parseTopic("a.md", text), TODAY);
  assert.deepEqual(lessons.map((lesson) => lesson.lesson), ["Bài cũ không có khi", "Bài còn hạn"]);
  assert.equal(lessons[0].when, "");
});

test("sửa một chữ trong dòng thì id đổi; dòng khác giữ id", () => {
  const before = corpus();
  const edited = HYPERFRAMES.replace("chưa hỗ trợ tiếng Việt", "chưa hỗ trợ tốt tiếng Việt");
  const after = parseLessons("memory/hyperframes.md", edited, parseTopic("hyperframes.md", edited), TODAY);
  assert.equal(after[0].id, before[0].id);
  assert.notEqual(after[1].id, before[1].id);
});

test("loadLessons đọc cả memory/ (kể cả CRLF), bỏ README/archive/forgotten", () => {
  withRoot(
    {
      "hyperframes.md": HYPERFRAMES.replace(/\n/g, "\r\n"),
      "README.md": "- 2026-11-01 · heygen music cũ\n",
      "archive.md": "- 2026-11-01 · heygen music cũ\n",
      "forgotten.md": "- 2026-11-01 · heygen music cũ\n",
    },
    (root) => {
      const { topics, lessons } = loadLessons(root, TODAY);
      assert.deepEqual(topics.map((topic) => topic.slug), ["hyperframes"]);
      assert.equal(lessons.length, 2);
      assert.doesNotMatch(lessons[0].line, /\r/);
    },
  );
});

test("lệnh chọn nhạc nền HeyGen ra đúng bài HeyGen, không kéo Kokoro", () => {
  assert.deepEqual(top("npx hyperframes heygen music search corporate --duration 30", true), ["hyperframes:Khi dựng video bằng "]);
});

test("tin nhắn không nhắc tên công cụ vẫn tìm ra bài theo `khi:`; gõ không dấu vẫn tìm được", () => {
  assert.equal(top("Tìm nhạc nền và hiệu ứng âm thanh cho video SaaS nhé")[0], "hyperframes:Khi dựng video bằng ");
  assert.equal(top("chon nhac nen cho video saas")[0], "hyperframes:Khi dựng video bằng ");
  assert.equal(top("thêm một scene điện thoại 3D xoay có camera 3D")[0], "3d-video:Đề xuất duyệt cài ch");
});

test("từ chung của nghề, cú pháp code hay âm tiết lẻ không kéo bài học", () => {
  assert.deepEqual(top("Dựng video SaaS cho khách, khung 16:9, dưới 1 phút"), []);
  assert.deepEqual(top("can tim nha hang cho buoi toi"), []);
  const code = '<div class="scene" style="width:1920px"><script>const t = gsap.timeline(); export default function main() { return null; }</script></div>'.repeat(30);
  assert.deepEqual(top(code, true), []);
  const text = '- 2026-11-01 · Dựng cảnh mở đầu chậm · khi: dựng cảnh mở đầu (intro, opening) · nguồn: "x"\n';
  const lessons = parseLessons("memory/a.md", text, parseTopic("a.md", text), TODAY);
  assert.deepEqual(rankLessons(lessonTerms("dừng lại rồi làm đúng cách, dùng cảnh khác"), lessons), []);
  assert.equal(rankLessons(lessonTerms("dựng cảnh mở đầu"), lessons).length, 1);
});

test("capLessons giữ trần số dòng và ký tự, luôn cho ít nhất một dòng", () => {
  const items = [{ line: "a".repeat(500) }, { line: "b".repeat(500) }, { line: "c".repeat(10) }];
  assert.equal(capLessons(items, 3, 900).length, 1);
  assert.equal(capLessons(items, 1, 5_000).length, 1);
  assert.equal(capLessons([{ line: "x".repeat(2_000) }], 3, 900).length, 1);
});

test("toolQuery: bash lấy lệnh; tool khác lấy path, paths và nội dung chuỗi", () => {
  assert.equal(toolQuery("bash", { command: "npx hyperframes render", cwd: "/x" }), "npx hyperframes render");
  assert.equal(toolQuery("bash", { command: "  " }), undefined);
  assert.equal(toolQuery("write", { path: "a.html", content: "heygen music" }), "a.html\nheygen music");
  assert.equal(toolQuery("edit", { paths: ["a.html", "b.html"], input: "+ heygen" }), "a.html\nb.html\n+ heygen");
  assert.equal(toolQuery("edit", null), undefined);
});

test("CLI in bài học liên quan, báo không có, thiếu câu hỏi thì báo cách dùng", () => {
  withRoot({ "hyperframes.md": HYPERFRAMES }, (root) => {
    const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
    const found = run("chọn nhạc nền cho video SaaS", "--root", root);
    assert.equal(found.status, 0);
    assert.match(found.stdout, /\[memory\/hyperframes\.md\]/);
    assert.match(found.stdout, /HeyGen/);
    assert.match(run("--root", root, "xuất file pdf hóa đơn").stdout, /Không có bài học liên quan/);
    assert.equal(run("--root", root).status, 2);
  });
});
