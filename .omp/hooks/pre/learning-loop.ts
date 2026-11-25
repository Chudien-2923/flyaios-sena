// learning-loop v1.1.0 — standalone OMP hook cho flyaios-sena
// Ghi lời người dùng (ngoài Git), hỗ trợ "chốt bài học" (/chot), tự nạp MEMORY.md, giao TỪNG DÒNG bài học chủ đề
// `memory/<slug>.md` đúng tình huống (khi người dùng nhắn và khi Sena chạy lệnh/sửa file), thu hồi dòng hết hiệu lực,
// theo dõi thay đổi memory, tìm lại đoạn liên quan trong knowledge/ và jobs/.
// Cài cùng `scripts/recall.mjs` (bộ tra dùng chung, cũng là CLI cho mọi harness). Dữ liệu là Markdown thuần trong repo Sena.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, lstatSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HOOK_DIR, "../../..");
/** Bộ tra bài học dùng chung với CLI; import qua file URL để chạy được cả trên Windows. */
const RECALL_MODULE = resolve(ROOT, "scripts/recall.mjs");
if (!existsSync(RECALL_MODULE)) throw new Error("learning-loop: thiếu scripts/recall.mjs (bộ tra bài học) — cài cùng hook.");
const {
	capLessons,
	contentHash,
	countLines,
	hasWord,
	lessonTerms,
	loadLessons,
	normalizeVi,
	rankLessons,
	readFrontmatter,
	searchTerms,
	splitExpired,
	todayString,
	toolQuery,
} = await import(pathToFileURL(RECALL_MODULE).href);
/** File bài học theo chủ đề `memory/<file>`; từ khóa = title + aliases + slug. */
export type TopicInfo = { slug: string; file: string; title: string; description: string; keywords: string[]; lines: number };
/** Một dòng bài học chủ đề (đọc bởi `recall.mjs`); `id` = file + hash nguyên dòng. */
export type Lesson = { id: string; file: string; slug: string; line: string; when: string; lesson: string };
/** `unreadable`: file chủ đề đọc lỗi lượt này — bài học đã giao của file đó giữ nguyên, không bị coi là đã xóa. */
export type LessonStore = { topics: TopicInfo[]; lessons: Lesson[]; unreadable: string[] };
/** Dòng bài học đã giao vào context: id → nguyên dòng (để báo thu hồi khi dòng rời sổ). */
export type Delivery = Record<string, string>;
export type LoopState = {
	memoryHash?: string;
	/** Dòng bài học chủ đề đang có trong context (từ compaction gần nhất). */
	lessons: Delivery;
	/** Dòng đã giao trước compaction, chờ giao lại ở lượt kế. */
	reload: Delivery;
	reminded: boolean;
	closePending: string[];
	closeNudges: number;
	/** Id các đoạn knowledge/jobs đã chèn trong phiên (mỗi đoạn chèn một lần; quên khi compaction). */
	recalled: string[];
	recallVersions: Record<string, string>;
};
// Kiểu tối thiểu của phần OMP API hook này dùng (ExtensionContext/event đầy đủ ở package OMP).
type BranchEntry = { type: string; customType?: string; details?: unknown; data?: unknown; timestamp?: string; message?: { role?: string } };
type HookContext = {
	agent?: { kind: string };
	hasUI?: boolean;
	ui: { notify(message: string, type?: string): void; editor(title: string, prefill?: string): Promise<string | undefined> };
	sessionManager: { getBranch(): BranchEntry[]; getSessionId(): string };
};
type StartEvent = { prompt?: string; reason?: string };

const MESSAGE_TYPE = "sena.learning-loop";
/** Bản ghi phiên (không gửi model) cho dòng bài học đã giao qua lệnh/file, ghi ở `turn_end` sau khi model đã nhận. */
const TOOL_ENTRY = "sena.learning-loop.tool";
const STALE_MS = 6 * 3_600_000;
const EXPIRE_MS = 7 * 24 * 3_600_000;
const MAX_CLOSE_NUDGES = 2;
const MAX_LOG_CHARS = 2_000;
const MAX_LINES = 200;
const RESULT_HEADING = "## Kết quả chốt";
export const REVIEWED_MARKER = "- ⎯⎯ đã chốt tới đây ⎯⎯";

export function isCloseCommand(text: string): boolean {
	const trimmed = text.trim();
	const command = /^\/([A-Za-z][\w:-]*)(?=\s|$)/.exec(trimmed);
	if (command) return command[1].toLowerCase() === "chot";
	return normalizeVi(trimmed).includes("chot bai hoc");
}

/** Không ghi: tin rỗng, slash command (`/model`, `/chot`, `/learn` — không phải đường dẫn file), tin chỉ là lệnh chốt. */
export function isLoggable(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed || /^\/[A-Za-z][\w:-]*(\s|$)/.test(trimmed)) return false;
	if (!isCloseCommand(trimmed)) return true;
	const rest = normalizeVi(trimmed).replace("chot bai hoc", "").replace(/[^a-z0-9]/g, "");
	return rest.length >= 12;
}

export function messageKey(turnIndex: number, text: string): string {
	return createHash("sha1").update(`${turnIndex}:${text}`).digest("hex").slice(0, 8);
}

export function newSessionLog(startedIso: string, heading: string): string {
	return [
		"---",
		"status: open",
		`started: ${startedIso}`,
		`last: ${startedIso}`,
		"---",
		`# ${heading}`,
		"",
		"## Lời người dùng (nguyên văn)",
		"",
		RESULT_HEADING,
		"<!-- Sena điền khi chốt: bài học được đồng ý (→ đích) và bài học bị bỏ. -->",
		"",
	].join("\n");
}

export function setFrontmatter(text: string, patch: Record<string, string>): string {
	text = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
	const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
	if (!match) return text;
	const fields = { ...readFrontmatter(text), ...patch };
	const body = Object.entries(fields)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
	return `---\n${body}\n---\n${text.slice(match[0].length)}`;
}

/**
 * Trả nội dung mới, hoặc null nếu tin (cùng key) đã được ghi — chống ghi trùng khi OMP chạy lại lượt.
 * Phiên đã chốt/bỏ nhận tin mới: thêm dòng mốc REVIEWED_MARKER rồi mở lại `open`.
 */
export function appendUserMessage(
	log: string,
	entry: { time: string; iso: string; text: string; key: string },
): string | null {
	const marker = `<!-- k:${entry.key} -->`;
	if (log.includes(marker)) return null;
	let text = entry.text.trim().replace(/\s*\r?\n\s*/g, " / ");
	if (text.length > MAX_LOG_CHARS) text = `${text.slice(0, MAX_LOG_CHARS)} […cắt]`;
	const status = readFrontmatter(log).status;
	const reopen = status !== "open";
	const reviewed = status === "chốt" || status === "bỏ";
	const lines = [...(reviewed ? [REVIEWED_MARKER] : []), `- ${entry.time} — ${text} ${marker}`].join("\n");
	const at = log.indexOf(`\n${RESULT_HEADING}`);
	const next = at < 0 ? `${log.trimEnd()}\n${lines}\n` : `${log.slice(0, at).trimEnd()}\n${lines}\n${log.slice(at)}`;
	return setFrontmatter(next, reopen ? { status: "open", last: entry.iso } : { last: entry.iso });
}

export function classifyOpenSessions(
	files: { path: string; status: string; last: string }[],
	nowMs: number,
	currentPath: string,
): { stale: string[]; expired: string[] } {
	const stale: string[] = [];
	const expired: string[] = [];
	for (const file of files) {
		if (file.status !== "open" || file.path === currentPath) continue;
		const idle = nowMs - Date.parse(file.last);
		if (!Number.isFinite(idle)) continue;
		if (idle >= EXPIRE_MS) expired.push(file.path);
		else if (idle >= STALE_MS) stale.push(file.path);
	}
	return { stale, expired };
}

export function truncateForInjection(
	text: string,
	maxLines = MAX_LINES,
	maxBytes = 16_384,
): { text: string; truncated: boolean } | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	let lines = trimmed.split("\n");
	let truncated = lines.length > maxLines;
	if (truncated) lines = lines.slice(0, maxLines);
	let out = lines.join("\n");
	if (Buffer.byteLength(out, "utf8") > maxBytes) {
		out = Buffer.from(out, "utf8").subarray(0, maxBytes).toString("utf8").replace(/\uFFFD+$/, "");
		truncated = true;
	}
	return { text: out, truncated };
}

/** Từ khóa đầu tiên khớp nguyên từ trên chuỗi đã bỏ dấu; dùng để giải thích vì sao một file được chèn. */
export function matchedKeyword(prompt: string, keywords: string[]): string | undefined {
	const haystack = normalizeVi(prompt);
	return keywords.find(keyword => hasWord(haystack, normalizeVi(keyword)));
}

export function matchKeywords<T extends { keywords: string[] }>(prompt: string, items: T[]): T[] {
	return items.filter(item => matchedKeyword(prompt, item.keywords) !== undefined);
}

export function renderTopicIndex(topics: TopicInfo[]): string {
	return topics
		.map(topic => `- \`memory/${topic.file}\` — ${topic.title}${topic.description ? `: ${topic.description}` : ""}`)
		.join("\n");
}

export function formatInjection(label: string, relPath: string, raw: string, hiddenExpired = 0): string | undefined {
	const cut = truncateForInjection(raw);
	if (!cut && !hiddenExpired) return undefined;
	const note = cut?.truncated
		? `\n[Đã cắt bớt: file vượt ${MAX_LINES} dòng / 16 KB. Báo bạn một dòng trong câu trả lời; ở lần chốt tới đề xuất chuyển bớt dòng sang file chủ đề phù hợp hoặc \`memory/archive.md\`. Đọc phần còn lại trực tiếp khi cần.]`
		: "";
	const expiredNote = hiddenExpired
		? `\n[Đã ẩn ${hiddenExpired} dòng hết hạn (\`· đến YYYY-MM-DD\` đã qua); lần chốt tới đề xuất chuyển sang \`memory/archive.md\`.]`
		: "";
	return `${label} (\`${relPath}\`) — bản hiện hành thay thế bản đã nạp trước của file này:\n\n${cut?.text ?? "(Không còn bài học có hiệu lực.)"}${note}${expiredNote}`;
}

export function reconstructState(entries: BranchEntry[]): LoopState {
	let state: LoopState = { lessons: {}, reload: {}, reminded: false, closePending: [], closeNudges: 0, recalled: [], recallVersions: {} };
	for (const entry of entries) {
		if (entry.type === "compaction") {
			state = {
				...state,
				memoryHash: undefined,
				lessons: {},
				reload: { ...state.reload, ...state.lessons },
				recalled: [],
				recallVersions: {},
			};
		} else if (
			entry.type === "custom_message" &&
			entry.customType === MESSAGE_TYPE &&
			entry.details &&
			typeof entry.details === "object"
		) {
			// details do chính hook này ghi, cùng shape LoopState; là ảnh chụp đầy đủ, đã tính cả các bản ghi tool trước đó.
			const saved = entry.details as Partial<LoopState>;
			state = {
				memoryHash: saved.memoryHash,
				lessons: { ...(saved.lessons ?? {}) },
				reload: { ...(saved.reload ?? {}) },
				reminded: saved.reminded ?? false,
				closePending: [...(saved.closePending ?? [])],
				closeNudges: saved.closeNudges ?? 0,
				recalled: [...(saved.recalled ?? [])],
				recallVersions: { ...(saved.recallVersions ?? {}) },
			};
		} else {
			// Dòng giao qua lệnh/file: cộng vào sổ đã giao; compaction và ảnh chụp kế tiếp xử lý như dòng giao qua tin nhắn.
			const lessons = toolEntryLessons(entry);
			if (lessons) state = { ...state, lessons: { ...state.lessons, ...lessons } };
		}
	}
	return state;
}

export function summarizeInjections(entries: BranchEntry[]): string[] {
	const at = (entry: BranchEntry) => {
		const time = new Date(entry.timestamp ?? "");
		return Number.isFinite(time.getTime()) ? `${pad(time.getHours())}:${pad(time.getMinutes())}` : "--:--";
	};
	const lines: string[] = [];
	for (const entry of entries) {
		if (entry.type === "compaction") {
			lines.push(`- ${at(entry)} · — compaction: hook chèn lại MEMORY/chủ đề ở lượt sau khi cần —`);
		} else if (
			entry.type === "custom_message" &&
			entry.customType === MESSAGE_TYPE &&
			entry.details &&
			typeof entry.details === "object" &&
			"injected" in entry.details &&
			Array.isArray(entry.details.injected)
		) {
			const injected: unknown[] = entry.details.injected;
			for (const reason of injected) if (typeof reason === "string") lines.push(`- ${at(entry)} · ${reason}`);
		} else {
			const lessons = toolEntryLessons(entry);
			if (lessons) lines.push(`- ${at(entry)} · giao khi Sena chạy lệnh/sửa file: ${Object.keys(lessons).length} dòng bài học chủ đề`);
		}
	}
	return lines;
}

// ---------------------------------------------------------------- lịch sử sửa memory

export type FileStamp = { hash: string; lines: number };
export type Snapshot = Record<string, FileStamp>;
export const MEMORY_CHANGES_HEADING = "## Memory đổi trong buổi";

export function serializeSnapshot(snapshot: Snapshot): string {
	return Object.entries(snapshot)
		.map(([filePath, stamp]) => `${encodeURIComponent(filePath)}=${stamp.hash}:${stamp.lines}`)
		.join(";");
}

export function parseSnapshot(value: string): Snapshot {
	const snapshot: Snapshot = {};
	for (const part of value.split(";")) {
		const eq = part.lastIndexOf("=");
		if (eq <= 0) continue;
		const [hash, lines] = part.slice(eq + 1).split(":");
		if (!hash || !/^\d+$/.test(lines ?? "")) continue;
		try {
			snapshot[decodeURIComponent(part.slice(0, eq))] = { hash, lines: Number(lines) };
		} catch {
			// Bỏ qua phần hỏng để không mất các mục hợp lệ khác.
		}
	}
	return snapshot;
}

export function diffSnapshots(previous: Snapshot, current: Snapshot): string[] {
	const changes: string[] = [];
	for (const filePath of [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort()) {
		const before = previous[filePath];
		const after = current[filePath];
		if (!before && after) changes.push(`${filePath}: mới (${after.lines} dòng)`);
		else if (before && !after) changes.push(`${filePath}: bị xóa`);
		else if (before && after && before.hash !== after.hash)
			changes.push(
				before.lines === after.lines
					? `${filePath}: sửa nội dung (${after.lines} dòng)`
					: `${filePath}: ${before.lines} → ${after.lines} dòng`,
			);
	}
	return changes;
}

export function appendMemoryChanges(log: string, time: string, changes: string[]): string {
	if (!changes.length) return log;
	const lines = changes.map(change => `- ${time} · ${change}`).join("\n");
	const base = log.trimEnd();
	return base.includes(`\n${MEMORY_CHANGES_HEADING}`)
		? `${base}\n${lines}\n`
		: `${base}\n\n${MEMORY_CHANGES_HEADING}\n\n${lines}\n`;
}

// ---------------------------------------------------------------- tìm lại trong knowledge/ và jobs/

export type Chunk = { id: string; path: string; heading: string; context: string; text: string; norm: string };
export type RankedChunk = { chunk: Chunk; hits: string[]; score: number };

/** Chia theo heading Markdown (bỏ qua `#` trong code block); đoạn chỉ có heading thì bỏ. */
export function splitChunks(filePath: string, text: string): Chunk[] {
	const chunks: Chunk[] = [];
	let heading = filePath;
	let lines: string[] = [];
	let hasBody = false;
	let fence: string | undefined;
	const headings: string[] = [];
	const flush = () => {
		if (hasBody) {
			const body = lines.join("\n").trim();
			const context = headings.slice(0, -1).filter(Boolean).join("\n");
			chunks.push({ id: `${filePath}#${contentHash(`${context}\n${heading}\n${body}`)}`, path: filePath, heading, context, text: body, norm: normalizeVi(`${context}\n${body}`) });
		}
		lines = [];
		hasBody = false;
	};
	for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
		const marker = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
		if (fence) {
			lines.push(line);
			if (line.trim()) hasBody = true;
			if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
			continue;
		}
		if (marker) {
			fence = marker[1];
			lines.push(line);
			hasBody = true;
			continue;
		}
		const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
		if (match) {
			flush();
			heading = match[2];
			headings.length = match[1].length - 1;
			headings.push(heading);
			lines = [line];
			continue;
		}
		lines.push(line);
		if (line.trim()) hasBody = true;
	}
	flush();
	return chunks;
}

export function rankChunks(terms: string[], chunks: Chunk[]): RankedChunk[] {
	if (!chunks.length) return [];
	const queryWords = new Set(terms.flatMap(term => term.split(" ")));
	const hitsByChunk = chunks.map(chunk => terms.filter(term => hasWord(chunk.norm, term)));
	const lengths = chunks.map(chunk => chunk.norm.split(/\W+/).length);
	const averageLength = lengths.reduce((sum, length) => sum + length, 0) / chunks.length;
	const df = new Map<string, number>();
	for (const hits of hitsByChunk) for (const term of hits) df.set(term, (df.get(term) ?? 0) + 1);
	const results: RankedChunk[] = [];
	for (let i = 0; i < chunks.length; i++) {
		const hits = hitsByChunk[i];
		const matchedWords = new Set(hits.flatMap(term => term.split(" ")));
		if (matchedWords.size < 2 || matchedWords.size < queryWords.size / 2) continue;
		const heading = normalizeVi(chunks[i].heading);
		const context = normalizeVi(chunks[i].context);
		if (!hits.some(term => term.includes(" ") || (term.length >= 5 && hasWord(heading, term)))) continue;
		const lengthFactor = 2.2 / (1 + 1.2 * (0.25 + 0.75 * lengths[i] / averageLength));
		const score = hits.reduce((sum, term) => {
			const count = df.get(term)!;
			const idf = Math.log(1 + (chunks.length - count + 0.5) / (count + 0.5));
			return sum + idf * (term.includes(" ") ? 1.5 : 1) *
				(lengthFactor + (hasWord(heading, term) ? 2 : 0) + (hasWord(context, term) ? 0.75 : 0));
		}, 0);
		results.push({ chunk: chunks[i], hits, score });
	}
	return results.sort((a, b) => b.score - a.score);
}

export function excerptChunk(chunk: Chunk, maxLines = 12, maxChars = 1_200, terms: string[] = []): string {
	const lines = chunk.text.split("\n").filter(line => line.trim());
	let best = 0;
	let score = 0;
	for (let i = 0; i < lines.length && terms.length; i++) {
		const norm = normalizeVi(lines[i]);
		const hits = terms.filter(term => hasWord(norm, term)).length;
		if (hits > score) { score = hits; best = i; }
	}
	const start = Math.max(0, best - 2);
	const out = lines.slice(start, start + maxLines).join("\n");
	return out.length > maxChars ? `${out.slice(0, Math.max(0, maxChars - 1))}${maxChars > 0 ? "…" : ""}` : out;
}

// ---------------------------------------------------------------- wiring OMP

// HOOK_DIR, ROOT ở đầu file (cần trước khi import bộ tra).
const SESSIONS_DIR = join(ROOT, "journal", "sessions");
const MEMORY_DIR = join(ROOT, "memory");
const pad = (n: number) => String(n).padStart(2, "0");
const toRel = (filePath: string) => relative(ROOT, filePath).replaceAll("\\", "/");

export const MAX_TOPIC_LESSONS = 8;
export const MAX_TOPIC_CHARS = 2_000;
export const MAX_SITUATION_LESSONS = 3;
export const MAX_SITUATION_CHARS = 900;
/** Trần số dòng bài học chủ đề trong context giữa hai lần compaction; vượt thì chỉ tra bằng CLI. */
export const MAX_SESSION_LESSONS = 30;

const PROMPT_HEADING =
	'Bài học chủ đề liên quan — đã được duyệt; hook chọn từng dòng theo tình huống (bổ sung, các bài đã nạp trước vẫn hiệu lực trừ khi bị thu hồi). Cần thêm thì chạy `node scripts/recall.mjs "<tình huống>"`:';
const REVOKED_HEADING = "Các bài học sau KHÔNG CÒN HIỆU LỰC (đã sửa, xóa, hết hạn, chuyển archive hoặc người dùng yêu cầu quên) — bỏ, không áp dụng nữa:";
const BASH_HEADING = "[learning-loop] Lệnh CHƯA chạy — dừng một nhịp để đọc bài học đã được duyệt liên quan tới việc sắp làm:";
const BASH_RETRY_NOTE =
	"Áp dụng nếu đúng tình huống rồi chạy lại lệnh (sửa lệnh nếu bài học yêu cầu). Lần chạy lại không bị dừng vì các bài này.";
const FILE_HEADING = "[learning-loop] Bài học đã được duyệt liên quan tới file vừa ghi/sửa — nếu thay đổi vừa rồi trái bài học thì sửa lại ngay:";
const APPLY_NOTE =
	'Khi giao bản xem trước hoặc kết quả, kèm mục "Bài học đã áp dụng": mỗi bài liên quan ghi đã áp dụng thế nào (bằng chứng) hoặc vì sao không áp dụng.';

export function renderLessonList(heading: string, lessons: { file: string; line: string }[]): string {
	return [heading, ...lessons.map(lesson => `- [${lesson.file}] ${lesson.line.replace(/^-\s+/, "")}`)].join("\n");
}

export type PromptLessonPlan = {
	/** Sổ đã giao sau lượt này (dòng còn hiệu lực + dòng mới). */
	delivered: Delivery;
	/** Dòng chờ giao lại mà file đang đọc lỗi: giữ cho lượt sau. */
	reload: Delivery;
	add: Lesson[];
	revoked: { file: string; line: string }[];
	/** Lý do từng nhóm dòng mới, cho `/nap`. */
	reasons: string[];
};

const fileOfLesson = (id: string) => id.slice(0, id.lastIndexOf("#"));

/**
 * Bài học chủ đề cho một tin nhắn của người dùng. Thứ tự: (1) thu hồi dòng đã giao nhưng không còn trong sổ hiệu lực
 * (file đọc lỗi thì giữ nguyên); (2) giao lại dòng đã giao trước compaction; (3) dòng thay thế giống nhất cùng file cho
 * dòng vừa thu hồi hoặc dòng chờ giao lại đã bị sửa; (4) chủ đề được gọi tên/alias: dòng xếp hạng cao trong chủ đề rồi
 * theo thứ tự file, trần 8 dòng/2.000 ký tự; (5) theo tình huống trên phần sổ còn lại, trần 3 dòng/900 ký tự. Chọn top-N
 * TRƯỚC khi bỏ dòng đã giao, để nhắc lại không kéo thêm dòng kém hơn. Tổng dòng trong context ≤ MAX_SESSION_LESSONS.
 */
export function planPromptLessons(prompt: string, store: LessonStore, delivered: Delivery, reload: Delivery): PromptLessonPlan {
	const active = new Map(store.lessons.map(lesson => [lesson.id, lesson]));
	const unreadable = new Set(store.unreadable);
	const kept: Delivery = {};
	const revoked: { file: string; line: string }[] = [];
	for (const [id, line] of Object.entries(delivered)) {
		if (active.has(id) || unreadable.has(fileOfLesson(id))) kept[id] = line;
		else revoked.push({ file: fileOfLesson(id), line });
	}
	const carry: Delivery = {};
	const reloadActive: Lesson[] = [];
	const changed = [...revoked];
	for (const [id, line] of Object.entries(reload)) {
		if (id in kept) continue;
		const lesson = active.get(id);
		if (lesson) reloadActive.push(lesson);
		else if (unreadable.has(fileOfLesson(id))) carry[id] = line;
		else changed.push({ file: fileOfLesson(id), line });
	}
	const add: Lesson[] = [];
	const reasons: string[] = [];
	const take = (lessons: Lesson[], reason: string) => {
		const fresh = lessons.filter(lesson => !(lesson.id in kept) && !add.some(item => item.id === lesson.id));
		const room = MAX_SESSION_LESSONS - Object.keys(kept).length - add.length;
		const chosen = fresh.slice(0, Math.max(0, room));
		if (chosen.length) {
			add.push(...chosen);
			reasons.push(`${reason}: ${chosen.length} dòng (${[...new Set(chosen.map(lesson => lesson.file))].join(", ")})`);
		}
	};
	take(reloadActive, "giao lại sau compaction");
	for (const old of changed) {
		const sameFile = store.lessons.filter(lesson => lesson.file === old.file && !(lesson.id in kept));
		take(rankLessons(lessonTerms(old.line), sameFile).slice(0, 1).map((item: { lesson: Lesson }) => item.lesson), "dòng thay thế bài vừa đổi");
	}
	const terms = lessonTerms(prompt);
	const named = store.topics.filter(topic => matchedKeyword(prompt, topic.keywords));
	for (const topic of named) {
		const own = store.lessons.filter(lesson => lesson.slug === topic.slug);
		const ranked = rankLessons(terms, own).map((item: { lesson: Lesson }) => item.lesson);
		const ordered = [...ranked, ...own.filter(lesson => !ranked.includes(lesson))];
		take(capLessons(ordered, MAX_TOPIC_LESSONS, MAX_TOPIC_CHARS), `chủ đề ${topic.slug} — khớp "${matchedKeyword(prompt, topic.keywords)}"`);
	}
	const rest = store.lessons.filter(lesson => !named.some(topic => topic.slug === lesson.slug));
	const situational = capLessons(rankLessons(terms, rest), MAX_SITUATION_LESSONS, MAX_SITUATION_CHARS, (item: { lesson: Lesson }) => item.lesson.line);
	take(situational.map((item: { lesson: Lesson }) => item.lesson), "theo tình huống trong tin nhắn");
	return { delivered: { ...kept, ...Object.fromEntries(add.map(lesson => [lesson.id, lesson.line])) }, reload: carry, add, revoked, reasons };
}

/**
 * Bài học cho một lệnh/file Sena đang làm: tối đa 3 dòng/900 ký tự chưa giao; top-N chọn trước khi bỏ dòng đã giao.
 * `pending` (dòng đã chọn trong lượt, model chưa nhận) chiếm chỗ trong trần phiên nhưng không miễn dừng cho lệnh khác.
 */
export function planToolLessons(toolName: string, input: unknown, store: LessonStore, delivered: Delivery, pending: Delivery = {}): Lesson[] {
	const query = toolQuery(toolName, input);
	if (!query) return [];
	const reserved = new Set([...Object.keys(delivered), ...Object.keys(pending)]);
	const top = capLessons(rankLessons(lessonTerms(query, { tool: true }), store.lessons), MAX_SITUATION_LESSONS, MAX_SITUATION_CHARS, (item: { lesson: Lesson }) => item.lesson.line);
	const fresh = top.map((item: { lesson: Lesson }) => item.lesson).filter((lesson: Lesson) => !(lesson.id in delivered));
	let room = MAX_SESSION_LESSONS - reserved.size;
	return fresh.filter((lesson: Lesson) => lesson.id in pending || room-- > 0);
}

type ToolEvent = { toolName: string; toolCallId?: string; input: unknown };

/**
 * Dòng đã đưa vào thông báo dừng/context trong lượt hiện tại nhưng model chưa nhận: CHƯA tính là đã giao, nên mọi lệnh
 * liên quan khác trong cùng lượt (OMP chuẩn bị cả đợt tool trước khi chạy) cũng bị dừng. `turn_end` ghi chúng vào
 * phiên (`TOOL_ENTRY`) — từ đó compaction, thu hồi và resume dùng chung một nguồn với dòng giao qua tin nhắn.
 */
const pendingTool = new Map<string, Delivery>();

function pickToolLessons(event: ToolEvent, ctx: HookContext): Lesson[] {
	const session = ctx.sessionManager.getSessionId();
	const pending = pendingTool.get(session) ?? {};
	const picked = planToolLessons(event.toolName, event.input, loadLessons(ROOT, todayString()), reconstructState(ctx.sessionManager.getBranch()).lessons, pending);
	if (picked.length) pendingTool.set(session, { ...pending, ...Object.fromEntries(picked.map(lesson => [lesson.id, lesson.line])) });
	return picked;
}

/** Dòng bài học trong bản ghi `TOOL_ENTRY` do chính hook ghi; shape khác thì bỏ qua. */
function toolEntryLessons(entry: BranchEntry): Delivery | undefined {
	if (entry.type !== "custom" || entry.customType !== TOOL_ENTRY) return undefined;
	if (!entry.data || typeof entry.data !== "object" || !("lessons" in entry.data)) return undefined;
	const lessons = entry.data.lessons;
	if (!lessons || typeof lessons !== "object") return undefined;
	return Object.fromEntries(Object.entries(lessons).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
}

function listSessionFiles(): { path: string; status: string; last: string }[] {
	if (!existsSync(SESSIONS_DIR)) return [];
	const files: { path: string; status: string; last: string }[] = [];
	for (const name of readdirSync(SESSIONS_DIR)) {
		if (!name.endsWith(".md")) continue;
		const filePath = join(SESSIONS_DIR, name);
		try {
			const fm = readFrontmatter(readFileSync(filePath, "utf8"));
			files.push({ path: filePath, status: fm.status ?? "", last: fm.last ?? "" });
		} catch {}
	}
	return files;
}

function ensureSessionsDir(): void {
	mkdirSync(SESSIONS_DIR, { recursive: true });
	const guard = join(SESSIONS_DIR, ".gitignore");
	if (!existsSync(guard)) writeFileSync(guard, "*\n!.gitignore\n");
}

function logMessage(filePath: string, text: string, turnIndex: number, now: Date): void {
	const iso = now.toISOString();
	const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	ensureSessionsDir();
	const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : newSessionLog(iso, `Buổi ${date} ${time}`);
	const next = appendUserMessage(current, { time, iso, text, key: messageKey(turnIndex, text) });
	if (next !== null) writeFileSync(filePath, next);
}

export type CloseContext = {
	topics: TopicInfo[];
	memoryLines: number;
	forgotten: string;
	/** "`<file>`: <dòng>" — dòng bài học đã quá hạn `· đến`. */
	expired: string[];
	/** File bài học đang có thay đổi chưa commit. */
	uncommitted: string[];
};

export function closeInstruction(
	files: string[],
	{ topics, memoryLines, forgotten, expired, uncommitted }: CloseContext,
): string {
	const forgottenLines = forgotten.split("\n").filter(line => line.startsWith("- "));
	const list = files.map(file => `- \`${file.includes(ROOT) ? toRel(file) : file.replaceAll("\\", "/")}\``).join("\n");
	const topicTargets = topics.length
		? topics
				.map(topic => `    - \`memory/${topic.file}\` — từ khóa: ${topic.keywords.join(", ")} · ${topic.lines}/${MAX_LINES} dòng`)
				.join("\n")
		: "    - (chưa có chủ đề)";
	return [
		"Đọc phần \"Lời người dùng (nguyên văn)\" trong các file phiên sau — chỉ phần SAU dòng mốc \"đã chốt tới đây\" cuối cùng nếu có (mở job liên quan nếu cần bối cảnh):",
		list,
		"",
		"Trả bạn MỘT danh sách đánh số, mỗi dòng: bài học viết dạng sự thật/điều kiện (không mệnh lệnh) · phạm vi · đích · trích ngắn lời bạn làm nguồn. Không ghi tên/mã file phiên vào bài học.",
		"Phạm vi và đích (mỗi bài học ghi một dòng `- YYYY-MM-DD · bài học · nguồn: \"…\"`; bài học chỉ đúng tới một mốc thì thêm `· đến YYYY-MM-DD` ở cuối):",
		`  - \`chung\` (đúng ở mọi buổi, không phụ thuộc loại video/kênh) → \`MEMORY.md\` (hiện ${memoryLines}/${MAX_LINES} dòng)`,
		"  - `chủ đề <slug>` (chỉ đúng cho một loại video, công cụ hoặc một kênh/khách hàng riêng) → `memory/<slug>.md`, dạng `- YYYY-MM-DD · bài học · khi: <tình huống áp dụng> · nguồn: \"…\"`. `khi:` là điều kiện hook dùng để giao bài học đúng lúc: ghi tình huống/bước cụ thể kèm các từ Sena sẽ gõ khi làm (tên công cụ, lệnh, thuật ngữ quốc tế như music, tts, render); không đưa từ chung của nghề (video, dựng, làm) vào `khi:` vì sẽ kéo bài học vào mọi việc. Chủ đề đang có:",
		topicTargets,
		"    Chủ đề mới: đề xuất slug (không dấu, nối gạch ngang), title, description, aliases (các từ khóa hay dùng, cách nhau dấu phẩy) ngay trong dòng; bạn đồng ý mới tạo file, đầu file có frontmatter `title`/`description`/`aliases`.",
		"  - quy trình nhiều bước lặp lại → ghi đề xuất tạo Skill mới tại `.agents/skills/<ten-skill>/SKILL.md` vào \"Kết quả chốt\" (dùng `/learn` + `skill-creator`), không sửa Skill lúc này",
		"  - không lưu (chỉ đúng cho một video cụ thể)",
		`Nếu ghi các dòng đề xuất xong mà \`MEMORY.md\` hoặc một file chủ đề vượt ${MAX_LINES} dòng hoặc 16 KB: thêm vào cùng danh sách các dòng đề xuất CHUYỂN (trích dòng · đích) — ưu tiên sang file chủ đề phù hợp, không có thì sang \`memory/archive.md\` (giữ nguyên văn, thêm \` · chuyển YYYY-MM-DD từ <file>\`). Chỉ chuyển dòng bạn đồng ý.`,
		...(forgottenLines.length
			? [
					"Bạn đã yêu cầu QUÊN các ý sau (`memory/forgotten.md`) — không đề xuất lại. Nếu bạn nhắc lại đúng một ý trong đây: nêu rõ \"bạn đã yêu cầu quên ngày …\" và chỉ đề xuất khi bạn xác nhận; nếu xác nhận thì ghi bài học và xóa dòng tương ứng trong `memory/forgotten.md`.",
					...forgottenLines.slice(-MAX_LINES),
				]
			: []),
		...(expired.length
			? [
					"Các dòng đã hết hạn (hook không còn chèn) — đề xuất chuyển sang `memory/archive.md` trong cùng danh sách, bạn đồng ý mới chuyển:",
					...expired.map(line => `  - ${line}`),
				]
			: []),
		...(uncommitted.length
			? [`File bài học đang có thay đổi chưa commit: ${uncommitted.map(filePath => `\`${filePath}\``).join(", ")} — đề xuất commit cùng kết quả chốt.`]
			: []),
		"Không có gì đáng học → nói \"không có bài học mới\", ghi đúng câu đó vào \"Kết quả chốt\" và đặt `status: chốt` ngay cho mọi file phiên trên.",
		"Có bài học → chờ bạn trả lời (vd \"đồng ý 1, 3; bỏ 2\"); chỉ ghi đúng các dòng bạn đồng ý, điền \"Kết quả chốt\" và đặt `status: chốt` trong frontmatter mỗi file phiên trên. Bạn nói bỏ thì đặt `status: bỏ`.",
		"Ghi xong thì đề xuất bạn commit các file bài học vừa đổi theo quy tắc Git trong AGENTS.md.",
	].join("\n");
}

function injectFile(
	label: string,
	file: string,
	previousHash: string | undefined,
	extra = "",
): { text?: string; hash: string } {
	const exists = existsSync(file);
	const raw = exists ? readFileSync(file, "utf8") : "";
	if (!exists && !extra) {
		return previousHash && previousHash !== "missing"
			? { text: `${label} (\`${toRel(file)}\`) — file đã bị xóa; bản đã nạp trước không còn hiệu lực.`, hash: "missing" }
			: { hash: "missing" };
	}
	const { text, expired } = splitExpired(raw, todayString());
	const hash = contentHash(extra ? `${text}\n${extra}` : text);
	if (hash === previousHash) return { hash };
	const lesson =
		formatInjection(label, toRel(file), text, expired.length) ??
		(previousHash && !text.trim() ? formatInjection(label, toRel(file), "(Không còn bài học có hiệu lực.)") : undefined);
	const parts = [lesson, extra].filter(Boolean);
	return parts.length ? { text: parts.join("\n\n"), hash } : { hash };
}

/** File bài học: `MEMORY.md` và `memory/*.md` (trừ README). */
function lessonFiles(): string[] {
	const files = [join(ROOT, "MEMORY.md")];
	if (existsSync(MEMORY_DIR)) {
		for (const name of readdirSync(MEMORY_DIR).sort()) {
			if (/\.md$/i.test(name) && !name.startsWith(".") && !/^readme\.md$/i.test(name)) files.push(join(MEMORY_DIR, name));
		}
	}
	return files;
}

const SNAPSHOT_FIELD = "memory-files";

function trackMemoryChanges(logPath: string, now: Date): void {
	if (!existsSync(logPath)) return;
	const log = readFileSync(logPath, "utf8");
	const fields = readFrontmatter(log);
	const current: Snapshot = {};
	for (const file of lessonFiles()) {
		if (!existsSync(file)) continue;
		const raw = readFileSync(file, "utf8");
		current[toRel(file)] = { hash: contentHash(raw), lines: countLines(raw) };
	}
	const serialized = serializeSnapshot(current);
	if (fields[SNAPSHOT_FIELD] === serialized) return;
	const changes = SNAPSHOT_FIELD in fields ? diffSnapshots(parseSnapshot(fields[SNAPSHOT_FIELD]), current) : [];
	const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	writeFileSync(logPath, setFrontmatter(appendMemoryChanges(log, time, changes), { [SNAPSHOT_FIELD]: serialized }));
}

function gitStatus(dir: string, paths: string[]): string[] {
	const result = spawnSync(
		"git",
		["-c", "core.quotePath=false", "-C", dir, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...paths],
		{ encoding: "utf8", timeout: 3_000, windowsHide: true },
	);
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`git status: ${result.stderr.trim()}`);
	const entries = result.stdout.split("\0");
	const pathsOut: string[] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry) continue;
		pathsOut.push(entry.slice(3));
		if (/[RC]/.test(entry.slice(0, 2)) && entries[i + 1]) pathsOut.push(entries[++i]);
	}
	return pathsOut;
}

export function uncommittedLessons(dir = ROOT): string[] {
	if (!existsSync(join(dir, ".git"))) return [];
	return gitStatus(dir, ["MEMORY.md", "memory"]).filter(filePath => !/(^|\/)readme\.md$/i.test(filePath));
}

function expiredLessons(topics: TopicInfo[]): string[] {
	const today = todayString();
	const files = [join(ROOT, "MEMORY.md"), ...topics.map(topic => join(MEMORY_DIR, topic.file))];
	return files.flatMap(file =>
		existsSync(file) ? splitExpired(readFileSync(file, "utf8"), today).expired.map((line: string) => `\`${toRel(file)}\`: ${line}`) : [],
	);
}

const RECALL_DIRS = ["knowledge", "jobs"];
const MAX_RECALL_CHUNKS = 2;
const MAX_RECALL_FILE_BYTES = 512 * 1024;
type IndexedFile = { path: string; mtimeMs: number; size: number; version: string; chunks: Chunk[]; norm: string };
const recallCache = new Map<string, IndexedFile>();

function recallCorpus(): IndexedFile[] {
	const files: IndexedFile[] = [];
	const seen = new Set<string>();
	for (const dir of RECALL_DIRS) {
		const base = join(ROOT, dir);
		if (!existsSync(base) || !lstatSync(base).isDirectory()) continue;
		const boundary = realpathSync(base) + sep;
		for (const entry of readdirSync(base, { recursive: true, encoding: "utf8" })) {
			if (!/\.md$/i.test(entry) || /^readme\.md$/i.test(basename(entry)) || entry.split(/[\\/]/).some(part => part.startsWith("."))) continue;
			const filePath = join(base, entry);
			try {
				const stat = lstatSync(filePath);
				if (!stat.isFile() || stat.size > MAX_RECALL_FILE_BYTES || !realpathSync(filePath).startsWith(boundary)) continue;
				seen.add(filePath);
				let cached = recallCache.get(filePath);
				if (!cached || cached.mtimeMs !== stat.mtimeMs || cached.size !== stat.size) {
					const text = readFileSync(filePath, "utf8");
					const relPath = toRel(filePath);
					cached = { path: relPath, mtimeMs: stat.mtimeMs, size: stat.size, version: contentHash(text), chunks: splitChunks(relPath, text), norm: normalizeVi(text) };
					recallCache.set(filePath, cached);
				}
				files.push(cached);
			} catch {
				// Bỏ qua file lỗi lẻ để không mất cả kho.
			}
		}
	}
	for (const key of recallCache.keys()) if (!seen.has(key)) recallCache.delete(key);
	return files;
}

type RecallResult = { matches: RankedChunk[]; recalled: string[]; versions: Record<string, string> };
function recallChunks(prompt: string, state: LoopState): RecallResult {
	const terms = searchTerms(prompt);
	if (terms.length < 2) return { matches: [], recalled: state.recalled, versions: state.recallVersions };
	const corpus = recallCorpus();
	const versions = Object.fromEntries(corpus.map(file => [file.path, file.version]));
	const recalled = state.recalled.filter(id => {
		const filePath = id.slice(0, id.lastIndexOf("#"));
		return versions[filePath] !== undefined && state.recallVersions[filePath] === versions[filePath];
	});
	const done = new Set(recalled);
	const matches = rankChunks(terms, corpus.flatMap(file => file.chunks)).slice(0, MAX_RECALL_CHUNKS).filter(item => !done.has(item.chunk.id));
	return { matches, recalled: [...recalled, ...matches.map(item => item.chunk.id)], versions };
}

function sessionLogFor(ctx: HookContext): string | undefined {
	const sessionKey = encodeURIComponent(ctx.sessionManager.getSessionId());
	return listSessionFiles().find(file => file.path.endsWith(`-${sessionKey}.md`))?.path;
}

const quoteHits = (hits: string[]) => hits.slice(0, 4).map(hit => `"${hit}"`).join(", ");
const relList = (paths: string[]) => paths.map(filePath => `\`${toRel(filePath)}\``).join(", ");

export default function learningLoop(pi: ExtensionAPI): void {
	pi.on("before_agent_start", async (event: StartEvent, ctx: HookContext) => {
		if (ctx.agent && ctx.agent.kind !== "main") return;
		if (event.reason === "revive") return;
		const failures: string[] = [];
		const guard = <T>(name: string, fallback: T, run: () => T): T => {
			try {
				return run();
			} catch (error) {
				failures.push(`${name}: ${(error as Error).message}`);
				return fallback;
			}
		};

		const prompt = String(event.prompt ?? "");
		const branch = guard("branch", [] as BranchEntry[], () => ctx.sessionManager.getBranch());
		const state = reconstructState(branch);
		const now = new Date();
		const suffix = encodeURIComponent(ctx.sessionManager.getSessionId());
		const sessions = guard("sessions", [], listSessionFiles);
		const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		const logPath = sessions.find(file => file.path.endsWith(`-${suffix}.md`))?.path ?? join(SESSIONS_DIR, `${date}-${suffix}.md`);
		const closing = isCloseCommand(prompt);

		if (isLoggable(prompt)) {
			guard("log", undefined, () => {
				const userTurns = branch.filter(entry => entry.type === "message" && entry.message?.role === "user").length;
				logMessage(logPath, prompt, userTurns, now);
			});
		}

		guard("memory history", undefined, () => trackMemoryChanges(logPath, now));

		const { stale, expired } = classifyOpenSessions(sessions, now.getTime(), logPath);
		guard("expire", undefined, () => {
			for (const filePath of expired) writeFileSync(filePath, setFrontmatter(readFileSync(filePath, "utf8"), { status: "hết hạn" }));
		});

		const store = guard("lessons", null as LessonStore | null, () => loadLessons(ROOT, todayString()));
		const topics = store?.topics ?? [];
		const memoryFile = join(ROOT, "MEMORY.md");
		const memoryLines = guard("memory lines", 0, () => (existsSync(memoryFile) ? countLines(readFileSync(memoryFile, "utf8")) : 0));
		const forgottenFile = join(MEMORY_DIR, "forgotten.md");
		const forgotten = guard("forgotten", "", () => (existsSync(forgottenFile) ? readFileSync(forgottenFile, "utf8") : ""));
		let closeCached: CloseContext | undefined;
		const closeContext = (): CloseContext =>
			(closeCached ??= {
				topics,
				memoryLines,
				forgotten,
				expired: guard("expired", [] as string[], () => expiredLessons(topics)),
				uncommitted: guard("git status", [] as string[], () => uncommittedLessons()),
			});
		const parts: string[] = [];
		const injected: string[] = [];
		const next: LoopState = {
			...state,
			lessons: { ...state.lessons },
			reload: { ...state.reload },
			recalled: [...state.recalled],
			recallVersions: { ...state.recallVersions },
		};

		if (closing) {
			const files = [logPath, ...stale].filter(filePath => existsSync(filePath));
			parts.push(`Người dùng yêu cầu CHỐT BÀI HỌC. ${closeInstruction(files, closeContext())}`);
			injected.push("chỉ dẫn chốt bài học (người dùng yêu cầu)");
			next.closePending = files;
			next.closeNudges = 0;
		} else if (state.closePending.length) {
			const open = guard("pending", [] as string[], () =>
				state.closePending.filter(
					filePath => existsSync(filePath) && readFrontmatter(readFileSync(filePath, "utf8")).status === "open",
				),
			);
			if (open.length && state.closeNudges < MAX_CLOSE_NUDGES) {
				parts.push(
					`Lượt chốt bài học trước chưa hoàn tất: ${relList(open)} vẫn \`status: open\`. Nếu người dùng đã trả lời danh sách, ghi đúng các dòng được đồng ý, điền "Kết quả chốt" và đặt \`status: chốt\`.`,
				);
				next.closeNudges = state.closeNudges + 1;
				injected.push("nhắc hoàn tất lượt chốt trước");
			} else {
				next.closePending = [];
			}
		}

		if (!state.reminded && stale.length && !closing) {
			parts.push(
				[
					`Có ${stale.length} buổi làm việc trước chưa chốt bài học: ${relList(stale)}.`,
					"Trước tiên tự xem phần lời người dùng sau dòng mốc \"đã chốt tới đây\" cuối cùng (nếu có): nếu chỉ là chào hỏi/xác nhận, không có lời sửa hay yêu cầu, tự đặt `status: chốt` cho file đó và không hỏi lại.",
					"Còn lại thì trước khi làm việc hỏi đúng một câu: chốt luôn, để sau, hay bỏ. Người dùng nói bỏ → đặt `status: bỏ`. Người dùng nói chốt luôn → làm như sau.",
					closeInstruction(stale, closeContext()),
				].join("\n"),
			);
			next.reminded = true;
			injected.push(`nhắc ${stale.length} buổi chưa chốt bài học`);
		}

		const index = renderTopicIndex(topics);
		const memory = guard("memory", { hash: state.memoryHash ?? "error" } as { text?: string; hash: string }, () =>
			injectFile(
				"Bài học chung đã được duyệt — MEMORY.md của Sena, áp dụng khi liên quan",
				memoryFile,
				state.memoryHash,
				index
					? `Mục lục bài học theo chủ đề (\`memory/\`) — hook tự chèn từng dòng liên quan khi tin nhắn của người dùng hoặc lệnh/file Sena đang làm khớp tình huống; cần tra thêm thì chạy \`node scripts/recall.mjs "<tình huống>"\`:\n${index}`
					: "",
			),
		);
		next.memoryHash = memory.hash;
		if (memory.text) {
			parts.push(memory.text);
			injected.push(
				`MEMORY.md ${memoryLines}/${MAX_LINES} dòng${index ? ` + mục lục ${topics.length} chủ đề` : ""} (${state.memoryHash ? "nội dung đổi" : "đầu phiên hoặc sau compaction"})`,
			);
		}

		// Đọc sổ lỗi toàn bộ thì không giao/thu hồi gì lượt này: thiếu dữ liệu không phải bằng chứng bài học đã bị xóa.
		if (store) {
			guard("lessons delivery", undefined, () => {
				const plan = planPromptLessons(prompt, store, state.lessons, state.reload);
				next.lessons = plan.delivered;
				next.reload = plan.reload;
				if (plan.revoked.length) {
					parts.push(renderLessonList(REVOKED_HEADING, plan.revoked));
					injected.push(`thu hồi ${plan.revoked.length} dòng bài học không còn hiệu lực`);
				}
				if (plan.add.length) {
					parts.push(`${renderLessonList(PROMPT_HEADING, plan.add)}\n${APPLY_NOTE}`);
					injected.push(...plan.reasons);
				}
			});
		}

		if (!closing) {
			const result = guard("recall", { matches: [], recalled: state.recalled, versions: state.recallVersions } as RecallResult, () =>
				recallChunks(prompt, state),
			);
			const recalled = result.matches;
			next.recalled = result.recalled;
			next.recallVersions = result.versions;
			if (recalled.length) {
				parts.push(
					[
						"Có thể liên quan — hook tìm theo từ khóa trong `knowledge/` và `jobs/` (tham khảo, KHÔNG phải bài học đã duyệt; đọc file đầy đủ nếu cần):",
						...recalled.map(({ chunk, hits }) => `\n### \`${chunk.path}\` § ${chunk.heading} (khớp ${quoteHits(hits)})\n${excerptChunk(chunk, 12, 1_200, hits)}`),
					].join("\n"),
				);
				for (const { chunk, hits } of recalled) {
					injected.push(`tìm lại: ${chunk.path} § ${chunk.heading} — khớp ${quoteHits(hits)}`);
				}
			}
		}

		if (failures.length && ctx.hasUI) ctx.ui.notify(`learning-loop: ${failures.join("; ")}`, "warning");
		if (!parts.length) return;
		return {
			message: {
				customType: MESSAGE_TYPE,
				content: `[learning-loop — hook tự chèn]\n\n${parts.join("\n\n---\n\n")}`,
				display: false,
				details: { ...next, injected },
				attribution: "agent",
			},
		};
	});

	pi.on("agent_end", async (_event: unknown, ctx: HookContext) => {
		if (ctx.agent && ctx.agent.kind !== "main") return;
		try {
			const logPath = sessionLogFor(ctx);
			if (logPath) trackMemoryChanges(logPath, new Date());
		} catch (error) {
			if (ctx.hasUI) ctx.ui.notify(`learning-loop: memory history: ${(error as Error).message}`, "warning");
		}
	});

	/** Lệnh bash có bài học liên quan chưa giao: dừng một nhịp, trả bài học cho Sena đọc TRƯỚC khi lệnh chạy. */
	pi.on("tool_call", async (event: ToolEvent, ctx: HookContext) => {
		if (ctx.agent && ctx.agent.kind !== "main") return;
		if (event.toolName !== "bash") return;
		let picked: Lesson[];
		try {
			picked = pickToolLessons(event, ctx);
		} catch {
			return; // Lỗi tra cứu không bao giờ được chặn công việc.
		}
		if (!picked.length) return;
		return { block: true, reason: `${renderLessonList(BASH_HEADING, picked)}\n${BASH_RETRY_NOTE}\n${APPLY_NOTE}` };
	});

	/** File vừa ghi/sửa thành công có bài học liên quan chưa giao: đưa vào lượt kế (không chặn — chặn buộc gửi lại cả file). */
	pi.on("tool_result", async (event: ToolEvent & { isError?: boolean }, ctx: HookContext) => {
		if (ctx.agent && ctx.agent.kind !== "main") return;
		if ((event.toolName !== "write" && event.toolName !== "edit") || event.isError) return;
		try {
			const picked = pickToolLessons(event, ctx);
			if (picked.length) return { additionalContext: `${renderLessonList(FILE_HEADING, picked)}\n${APPLY_NOTE}` };
		} catch {
			// Như trên: không làm hỏng kết quả tool.
		}
	});

	/** Hết lượt: model đã nhận thông báo dừng/context của các lệnh trong lượt → ghi dòng đã giao vào phiên. */
	pi.on("turn_end", async (_event: unknown, ctx: HookContext) => {
		const session = ctx.sessionManager.getSessionId();
		const lessons = pendingTool.get(session);
		if (!lessons) return;
		pendingTool.delete(session);
		try {
			pi.appendEntry(TOOL_ENTRY, { lessons });
		} catch (error) {
			if (ctx.hasUI) ctx.ui.notify(`learning-loop: không ghi được sổ bài học đã giao: ${(error as Error).message}`, "warning");
		}
	});

	pi.registerCommand("chot", {
		description: "Chốt bài học của buổi làm việc",
		handler: async () => {
			pi.sendUserMessage("chốt bài học");
		},
	});

	pi.registerCommand("nap", {
		description: "Xem hook learning-loop đã nạp gì vào phiên này và vì sao (toàn bộ context: /context)",
		handler: async (_args: string, ctx: HookContext) => {
			if (!ctx.hasUI) return;
			const lines = summarizeInjections(ctx.sessionManager.getBranch());
			let status: string;
			try {
				const memoryFile = join(ROOT, "MEMORY.md");
				const memoryLines = existsSync(memoryFile) ? countLines(readFileSync(memoryFile, "utf8")) : 0;
				const topics = loadLessons(ROOT, todayString()).topics.map((topic: TopicInfo) => `${topic.slug} ${topic.lines}/${MAX_LINES}`);
				status = `Hiện có: MEMORY.md ${memoryLines}/${MAX_LINES} dòng; chủ đề: ${topics.join(", ") || "chưa có"}.`;
			} catch (error) {
				status = `Không đọc được trạng thái memory: ${(error as Error).message}`;
			}
			const text = [
				lines.length ? "Hook learning-loop đã chèn vào phiên này (cũ → mới):" : "Hook learning-loop chưa chèn gì vào phiên này.",
				...lines,
				"",
				status,
				"Xem toàn bộ context (system prompt, tool, mọi message): /context",
			].join("\n");
			await ctx.ui.editor("learning-loop · /nap (Esc để đóng)", text);
		},
	});
}
