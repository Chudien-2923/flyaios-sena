#!/usr/bin/env node
// Cross-platform environment doctor for flyaios-sena (macOS, Windows, Linux).
// Requires Node.js >= 22; zero external dependencies.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseSemverMajor(versionText) {
  const match = /\bv?(\d+)\.\d+/.exec(String(versionText ?? ""));
  return match ? Number(match[1]) : null;
}

function parsePythonMinor(versionText) {
  const match = /\b(\d+)\.(\d+)/.exec(String(versionText ?? ""));
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

export function resolveCommandForSpawn(cmd, args, options = {}) {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  if (platform !== "win32") return { command: cmd, args };

  const pathVar = env.PATH ?? env.Path ?? "";
  const rawExts = (env.PATHEXT || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean);
  const pathExts = [...new Set(rawExts.flatMap((e) => [e.toLowerCase(), e.toUpperCase()]))];
  const hasExt = /\.[A-Za-z0-9]+$/.test(cmd);
  const dirs = pathVar.split(";").filter(Boolean);

  for (const dir of dirs) {
    const candidates = hasExt ? [cmd] : pathExts.map((ext) => `${cmd}${ext}`);
    for (const name of candidates) {
      const full = path.join(dir, name);
      if (!fs.existsSync(full)) continue;
      if (/\.(cmd|bat)$/i.test(full)) {
        const comspec = env.ComSpec || env.COMSPEC || "cmd.exe";
        return { command: comspec, args: ["/d", "/c", full, ...args] };
      }
      return { command: full, args };
    }
  }
  return { command: cmd, args };
}

function defaultExec(cmd, args) {
  const resolved = resolveCommandForSpawn(cmd, args);
  const result = spawnSync(resolved.command, resolved.args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  });
  return {
    ok: !result.error && result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? (result.error ? result.error.message : "")).trim(),
  };
}

function osHint(platform, hints) {
  if (platform === "darwin") return hints.darwin;
  if (platform === "win32") return hints.win32;
  return hints.linux;
}

const SYMLINK_SKIP_REL_PREFIXES = [
  ".omp/plugins",
  ".agents/vendor-skills",
  ".agents/omp-bridge",
  ".superpowers",
  "journal/sessions",
];

function findSymlinks(rootDir) {
  const found = [];
  const skip = new Set([".git", "node_modules", ".venv", "venv"]);
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full).replaceAll("\\", "/");
      if (SYMLINK_SKIP_REL_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
      if (entry.isSymbolicLink()) {
        found.push(rel);
        continue;
      }
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(rootDir);
  return found;
}

function isPythonVersionOk(versionText) {
  const ver = parsePythonMinor(versionText);
  return Boolean(ver && (ver.major > 3 || (ver.major === 3 && ver.minor >= 9)));
}

function probePython(platform, exec, env = process.env) {
  const hasVenv = Boolean(env?.VIRTUAL_ENV);
  const candidates =
    platform === "win32"
      ? hasVenv
        ? [
            { cmd: "python", prefix: [], label: "python" },
            { cmd: "python3", prefix: [], label: "python3" },
            { cmd: "py", prefix: ["-3"], label: "py -3" },
          ]
        : [
            { cmd: "py", prefix: ["-3"], label: "py -3" },
            { cmd: "python", prefix: [], label: "python" },
            { cmd: "python3", prefix: [], label: "python3" },
          ]
      : [
          { cmd: "python3", prefix: [], label: "python3" },
          { cmd: "python", prefix: [], label: "python" },
        ];

  let fallbackTooOld = null;
  for (const cand of candidates) {
    const res = exec(cand.cmd, [...cand.prefix, "--version"]);
    const raw = res.stdout || res.stderr;
    if (res.ok && /python/i.test(raw)) {
      const version = raw.split(/\r?\n/)[0].trim();
      if (isPythonVersionOk(version)) {
        return { ...cand, version };
      }
      if (!fallbackTooOld) fallbackTooOld = { ...cand, version };
    }
  }
  return fallbackTooOld;
}

export function runDoctor(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? DEFAULT_ROOT);
  const platform = options.platform ?? process.platform;
  const exec = options.exec ?? defaultExec;
  const nodeVersion = options.nodeVersion ?? process.version;
  const env = options.env ?? process.env;
  const checks = [];

  // 1. Node.js >= 22 (HyperFrames engines.node >= 22)
  const nodeMajor = parseSemverMajor(nodeVersion);
  if (nodeMajor !== null && nodeMajor >= 22) {
    checks.push({
      id: "node",
      category: "required",
      status: "ok",
      version: nodeVersion,
      detail: `Node.js ${nodeVersion} đạt yêu cầu (>= 22)`,
    });
  } else {
    checks.push({
      id: "node",
      category: "required",
      status: "fail",
      version: nodeVersion,
      detail: `Node.js ${nodeVersion} thấp hơn mức tối thiểu >= 22 (HyperFrames yêu cầu Node >= 22)`,
      hint: osHint(platform, {
        darwin: "brew install node (hoặc dùng nvm/fnm cài Node 22+)",
        win32: "winget install OpenJS.NodeJS.LTS (sau đó mở lại terminal để cập nhật PATH)",
        linux: "Cài Node.js 22+ từ NodeSource hoặc fnm/nvm",
      }),
    });
  }

  // 2. FFmpeg & FFprobe
  for (const bin of ["ffmpeg", "ffprobe"]) {
    const res = exec(bin, ["-version"]);
    const line = (res.stdout || res.stderr).split(/\r?\n/)[0]?.trim() ?? "";
    if (res.ok) {
      checks.push({
        id: bin,
        category: "required",
        status: "ok",
        version: line,
        detail: `${bin} sẵn sàng`,
      });
    } else {
      checks.push({
        id: bin,
        category: "required",
        status: "fail",
        detail: `Thiếu ${bin} trong PATH`,
        hint: osHint(platform, {
          darwin: "brew install ffmpeg",
          win32: "winget install Gyan.FFmpeg (sau đó mở lại terminal để cập nhật PATH)",
          linux: "sudo apt install -y ffmpeg",
        }),
      });
    }
  }

  // 3. yt-dlp
  const ytdlp = exec("yt-dlp", ["--version"]);
  if (ytdlp.ok) {
    checks.push({
      id: "yt-dlp",
      category: "required",
      status: "ok",
      version: ytdlp.stdout.split(/\r?\n/)[0]?.trim(),
      detail: "yt-dlp sẵn sàng (tải video mẫu để phân tích)",
    });
  } else {
    checks.push({
      id: "yt-dlp",
      category: "required",
      status: "fail",
      detail: "Thiếu yt-dlp trong PATH",
      hint: osHint(platform, {
        darwin: "brew install yt-dlp",
        win32: "winget install yt-dlp.yt-dlp (sau đó mở lại terminal để cập nhật PATH)",
        linux: "pip install --user yt-dlp (hoặc sudo apt install -y yt-dlp)",
      }),
    });
  }

  // 4. Python >= 3.9 + numpy + Pillow (required for 4 default EditAtlas skills)
  const py = probePython(platform, exec, env);
  const pyOk = Boolean(py && isPythonVersionOk(py.version));
  if (pyOk) {
    checks.push({
      id: "python",
      category: "required",
      status: "ok",
      version: py.version,
      detail: `${py.label} (${py.version}) đạt yêu cầu (>= 3.9)`,
    });
  } else {
    checks.push({
      id: "python",
      category: "required",
      status: "fail",
      version: py?.version,
      detail: py ? `Python quá cũ (${py.version}), cần >= 3.9` : "Thiếu Python 3 (>= 3.9) trong PATH",
      hint: osHint(platform, {
        darwin: "brew install python",
        win32: "winget install Python.Python.3.12 (sau đó mở lại terminal để cập nhật PATH)",
        linux: "sudo apt install -y python3 python3-pip",
      }),
    });
  }

  const pyPackages = [
    { id: "python-numpy", mod: "numpy", pkg: "numpy", category: "required", label: "NumPy (EditAtlas)" },
    { id: "python-pillow", mod: "PIL", pkg: "Pillow", category: "required", label: "Pillow (EditAtlas)" },
    {
      id: "python-faster-whisper",
      mod: "faster_whisper",
      pkg: "faster-whisper",
      category: "optional",
      label: "faster-whisper (tùy chọn cho transcribe/talking-head)",
    },
  ];
  for (const item of pyPackages) {
    if (!pyOk) {
      checks.push({
        id: item.id,
        category: item.category,
        status: item.category === "required" ? "fail" : "warn",
        detail: `Chưa kiểm được ${item.pkg} vì chưa có Python >= 3.9`,
        hint: `Cài Python >= 3.9 trước, rồi chạy pip install ${item.pkg}`,
      });
      continue;
    }
    const res = exec(py.cmd, [...py.prefix, "-c", `import ${item.mod}; print(getattr(${item.mod}, '__version__', 'ok'))`]);
    if (res.ok) {
      checks.push({
        id: item.id,
        category: item.category,
        status: "ok",
        version: res.stdout.split(/\r?\n/)[0]?.trim(),
        detail: `${item.label} sẵn sàng`,
      });
    } else {
      checks.push({
        id: item.id,
        category: item.category,
        status: item.category === "required" ? "fail" : "warn",
        detail: `Chưa cài gói Python ${item.pkg}`,
        hint: `${py.label} -m pip install --user ${item.pkg} (hoặc cài trong venv nếu hệ thống báo PEP 668)`,
      });
    }
  }

  // 5. Optional HyperFrames global CLI
  const hf = exec("hyperframes", ["--version"]);
  checks.push(
    hf.ok
      ? {
          id: "hyperframes-cli",
          category: "optional",
          status: "ok",
          version: hf.stdout.split(/\r?\n/)[0]?.trim(),
          detail: "HyperFrames CLI global sẵn sàng",
        }
      : {
          id: "hyperframes-cli",
          category: "optional",
          status: "warn",
          detail: "Chưa cài HyperFrames CLI global (vẫn chạy được qua plugin launcher hoặc npx)",
          hint: "npm install -g hyperframes (tùy chọn; plugin HyperFrames đã có launcher riêng)",
        }
  );

  // 6. Agent harnesses (omp, claude, agy)
  const detectedHarnesses = [];
  for (const h of ["omp", "claude", "agy"]) {
    const res = exec(h, ["--version"]);
    if (res.ok) {
      detectedHarnesses.push(`${h} (${(res.stdout || res.stderr).split(/\r?\n/)[0]?.trim() || "ok"})`);
    }
  }
  checks.push(
    detectedHarnesses.length > 0
      ? {
          id: "harnesses",
          category: "harness",
          status: "ok",
          detail: `Đã phát hiện Agent Harness: ${detectedHarnesses.join(", ")}`,
        }
      : {
          id: "harnesses",
          category: "harness",
          status: "warn",
          detail: "Chưa phát hiện omp / claude / agy trong PATH (có thể đang chạy trong IDE như Cursor)",
          hint: "Xem SETUP.md để chọn đúng nhánh cài cho công cụ AI bạn đang dùng",
        }
  );

  // 7. Repo integrity: zero symlinks, skills dir, MCP JSON files
  const symlinks = findSymlinks(rootDir);
  checks.push(
    symlinks.length === 0
      ? {
          id: "repo-symlinks",
          category: "repo",
          status: "ok",
          detail: "0 symlink trong repo (an toàn cho Windows)",
        }
      : {
          id: "repo-symlinks",
          category: "repo",
          status: "fail",
          detail: `Phát hiện ${symlinks.length} symlink trong repo: ${symlinks.slice(0, 5).join(", ")}`,
          hint: "Thay symlink bằng file/thư mục thật để tránh lỗi trên Windows",
        }
  );

  const skillsDirExists = fs.existsSync(path.join(rootDir, ".agents", "skills"));
  checks.push(
    skillsDirExists
      ? {
          id: "repo-skills-dir",
          category: "repo",
          status: "ok",
          detail: "Thư mục .agents/skills/ hợp lệ",
        }
      : {
          id: "repo-skills-dir",
          category: "repo",
          status: "fail",
          detail: "Thiếu thư mục .agents/skills/ tại gốc repo",
        }
  );

  const requiredMcps = [".omp/mcp.json", ".mcp.json"];
  const optionalMcps = [".agents/mcp_config.json"];
  const mcpErrors = [];
  for (const rel of [...requiredMcps, ...optionalMcps]) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) {
      if (requiredMcps.includes(rel)) mcpErrors.push(`thiếu ${rel}`);
      continue;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(full, "utf8"));
      if (!parsed || typeof parsed !== "object" || !parsed.mcpServers) {
        mcpErrors.push(`${rel} thiếu khóa mcpServers`);
      }
    } catch (err) {
      mcpErrors.push(`${rel} không phải JSON hợp lệ (${err.message})`);
    }
  }
  checks.push(
    mcpErrors.length === 0
      ? {
          id: "repo-mcp-configs",
          category: "repo",
          status: "ok",
          detail: "Các file cấu hình MCP EditAtlas đều hợp lệ",
        }
      : {
          id: "repo-mcp-configs",
          category: "repo",
          status: "fail",
          detail: `Lỗi cấu hình MCP: ${mcpErrors.join("; ")}`,
        }
  );

  const ok = checks.every(
    (c) => c.status !== "fail" || (c.category !== "required" && c.category !== "repo")
  );
  return { ok, platform, rootDir, checks };
}

export function formatDoctorReport(report) {
  const icon = { ok: "[OK]  ", warn: "[WARN]", fail: "[FAIL]" };
  const lines = [
    `=== Sena Doctor (${report.platform}) ===`,
    `Repo: ${report.rootDir}`,
    "",
  ];
  for (const c of report.checks) {
    lines.push(`${icon[c.status]} ${c.id.padEnd(22)} ${c.detail}`);
    if (c.hint && c.status !== "ok") {
      lines.push(`       -> Gợi ý: ${c.hint}`);
    }
  }
  lines.push("");
  lines.push(
    report.ok
      ? "Kết luận: Môi trường nền ĐẠT. Tiếp tục cài plugin theo SETUP.md."
      : "Kết luận: Còn hạng mục bắt buộc chưa đạt ([FAIL]). Xem gợi ý ở trên hoặc mở SETUP.md."
  );
  return lines.join("\n");
}

function isMain() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMain()) {
  const asJson = process.argv.includes("--json");
  const report = runDoctor();
  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatDoctorReport(report)}\n`);
  }
  process.exit(report.ok ? 0 : 1);
}
