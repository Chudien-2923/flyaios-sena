import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  formatDoctorReport,
  parseSemverMajor,
  runDoctor,
} from "../scripts/doctor.mjs";

function makeTempRepo(suffix = "repo with spaces") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sena-doc-${suffix}-`));
  fs.mkdirSync(path.join(root, ".omp"), { recursive: true });
  fs.mkdirSync(path.join(root, ".agents", "skills"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".omp", "mcp.json"),
    JSON.stringify({ mcpServers: { editatlas: { type: "http", url: "https://edit.trysometh.ing/mcp" } } })
  );
  fs.writeFileSync(
    path.join(root, ".mcp.json"),
    JSON.stringify({ mcpServers: { editatlas: { type: "http", url: "https://edit.trysometh.ing/mcp" } } })
  );
  return root;
}

function makeAllOkExec({ pythonCmd = "python3", hasPillow = true, hasNumpy = true, hasHarnesses = true } = {}) {
  return (cmd, args) => {
    const joined = `${cmd} ${args.join(" ")}`;
    if (cmd === "ffmpeg") return { ok: true, stdout: "ffmpeg version 7.1", stderr: "" };
    if (cmd === "ffprobe") return { ok: true, stdout: "ffprobe version 7.1", stderr: "" };
    if (cmd === "yt-dlp") return { ok: true, stdout: "2026.03.17", stderr: "" };
    if (cmd === pythonCmd && args.includes("--version")) {
      return { ok: true, stdout: "Python 3.12.4", stderr: "" };
    }
    if (cmd === pythonCmd && joined.includes("import numpy")) {
      return hasNumpy ? { ok: true, stdout: "2.1.0", stderr: "" } : { ok: false, stdout: "", stderr: "ModuleNotFoundError: numpy" };
    }
    if (cmd === pythonCmd && joined.includes("import PIL")) {
      return hasPillow ? { ok: true, stdout: "11.0.0", stderr: "" } : { ok: false, stdout: "", stderr: "ModuleNotFoundError: PIL" };
    }
    if (cmd === pythonCmd && joined.includes("import faster_whisper")) {
      return { ok: false, stdout: "", stderr: "ModuleNotFoundError" };
    }
    if (cmd === "hyperframes") return { ok: true, stdout: "0.9.83", stderr: "" };
    if (hasHarnesses && ["omp", "claude", "agy"].includes(cmd)) {
      return { ok: true, stdout: `${cmd} 1.0.0`, stderr: "" };
    }
    return { ok: false, stdout: "", stderr: "not found" };
  };
}

test("parseSemverMajor parses v22/v24 and rejects garbage", () => {
  assert.equal(parseSemverMajor("v22.13.0"), 22);
  assert.equal(parseSemverMajor("24.2.1"), 24);
  assert.equal(parseSemverMajor("Python 3.12.4"), 3);
  assert.equal(parseSemverMajor("unknown"), null);
});

test("node >= 22 passes; node 20.19.0 fails with OS-specific upgrade hint", () => {
  const root = makeTempRepo();
  try {
    const passReport = runDoctor({
      rootDir: root,
      platform: "darwin",
      nodeVersion: "v22.14.0",
      exec: makeAllOkExec(),
    });
    assert.equal(passReport.ok, true);
    assert.equal(passReport.checks.find((c) => c.id === "node")?.status, "ok");

    const failMac = runDoctor({
      rootDir: root,
      platform: "darwin",
      nodeVersion: "v20.19.0",
      exec: makeAllOkExec(),
    });
    const nodeMac = failMac.checks.find((c) => c.id === "node");
    assert.equal(failMac.ok, false);
    assert.equal(nodeMac?.status, "fail");
    assert.match(nodeMac?.hint ?? "", /brew/i);

    const failWin = runDoctor({
      rootDir: root,
      platform: "win32",
      nodeVersion: "v20.19.0",
      exec: makeAllOkExec(),
    });
    const nodeWin = failWin.checks.find((c) => c.id === "node");
    assert.equal(failWin.ok, false);
    assert.equal(nodeWin?.status, "fail");
    assert.match(nodeWin?.hint ?? "", /winget/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("missing Pillow or numpy fails individually and Windows probes py -3", () => {
  const root = makeTempRepo();
  try {
    const winExec = (cmd, args) => {
      if (cmd === "py" && args[0] === "-3") {
        const rest = args.slice(1).join(" ");
        if (rest.includes("--version")) return { ok: true, stdout: "Python 3.12.2", stderr: "" };
        if (rest.includes("import numpy")) return { ok: true, stdout: "2.0.1", stderr: "" };
        if (rest.includes("import PIL")) return { ok: false, stdout: "", stderr: "No module named PIL" };
        return { ok: false, stdout: "", stderr: "No module" };
      }
      if (cmd === "python3" || cmd === "python") {
        return { ok: false, stdout: "", stderr: "not found" };
      }
      return makeAllOkExec()(cmd, args);
    };

    const report = runDoctor({
      rootDir: root,
      platform: "win32",
      nodeVersion: "v22.15.0",
      exec: winExec,
    });
    assert.equal(report.ok, false);
    assert.equal(report.checks.find((c) => c.id === "python")?.status, "ok");
    assert.equal(report.checks.find((c) => c.id === "python-numpy")?.status, "ok");
    const pil = report.checks.find((c) => c.id === "python-pillow");
    assert.equal(pil?.status, "fail");
    assert.match(pil?.hint ?? "", /Pillow/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("handles rootDir with spaces and flags symlinks inside repo as fail", () => {
  const root = makeTempRepo("my videos folder");
  try {
    fs.writeFileSync(path.join(root, "real.txt"), "ok");
    fs.symlinkSync(path.join(root, "real.txt"), path.join(root, "link.txt"));

    const report = runDoctor({
      rootDir: root,
      platform: "darwin",
      nodeVersion: "v22.15.0",
      exec: makeAllOkExec(),
    });
    assert.equal(report.ok, false);
    const sym = report.checks.find((c) => c.id === "repo-symlinks");
    assert.equal(sym?.status, "fail");
    assert.match(sym?.detail ?? "", /link\.txt/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("optional tools and harnesses warn when absent without failing overall ok", () => {
  const root = makeTempRepo();
  try {
    const report = runDoctor({
      rootDir: root,
      platform: "darwin",
      nodeVersion: "v22.15.0",
      exec: (cmd, args) => {
        if (cmd === "hyperframes") return { ok: false, stdout: "", stderr: "not found" };
        return makeAllOkExec({ hasHarnesses: false })(cmd, args);
      },
    });
    assert.equal(report.ok, true);
    assert.equal(report.checks.find((c) => c.id === "hyperframes-cli")?.status, "warn");
    assert.equal(report.checks.find((c) => c.id === "python-faster-whisper")?.status, "warn");
    assert.equal(report.checks.find((c) => c.id === "harnesses")?.status, "warn");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("validates MCP JSON syntax and reports invalid JSON as fail", () => {
  const root = makeTempRepo();
  try {
    fs.writeFileSync(path.join(root, ".mcp.json"), "{ invalid json");
    const report = runDoctor({
      rootDir: root,
      platform: "darwin",
      nodeVersion: "v22.15.0",
      exec: makeAllOkExec(),
    });
    assert.equal(report.ok, false);
    assert.equal(report.checks.find((c) => c.id === "repo-mcp-configs")?.status, "fail");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("formatDoctorReport renders readable Vietnamese summary", () => {
  const root = makeTempRepo();
  try {
    const report = runDoctor({
      rootDir: root,
      platform: "darwin",
      nodeVersion: "v22.15.0",
      exec: makeAllOkExec(),
    });
    const text = formatDoctorReport(report);
    assert.match(text, /Sena Doctor/i);
    assert.match(text, /node/i);
    assert.match(text, /OK/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
