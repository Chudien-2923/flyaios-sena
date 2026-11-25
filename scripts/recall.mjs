// recall v1.1.0 — bộ tra bài học của flyaios-sena
// Đọc `memory/<chủ đề>.md` (Markdown), xếp hạng TỪNG DÒNG bài học theo tình huống.
// Dùng chung: hook `.omp/hooks/pre/learning-loop.ts` import module này; Agent ở mọi harness gọi CLI:
//   node scripts/recall.mjs "<tình huống đang làm>"
// Đặt ở `scripts/` (không đặt trong `.omp/hooks/pre/`: OMP nạp mọi file ở đó như hook). Node ≥ 22, không dependency.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng — mọi so khớp đều trên chuỗi đã qua hàm này. */
export function normalizeVi(text) {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[đĐ]/g, "d")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

/** Khớp nguyên từ; cả hai chuỗi đã qua `normalizeVi`. */
export function hasWord(haystackNorm, needleNorm) {
	if (!needleNorm || !haystackNorm.includes(needleNorm)) return false;
	const needle = needleNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(^|[^a-z0-9])${needle}($|[^a-z0-9])`).test(haystackNorm);
}

export function contentHash(text) {
	return createHash("sha1").update(text).digest("hex").slice(0, 16);
}

export function countLines(text) {
	const trimmed = text.trim();
	return trimmed ? trimmed.split("\n").length : 0;
}

/** Chấp nhận BOM, CRLF và `---` đóng ở cuối file (file chủ đề do người viết tay). */
export function readFrontmatter(text) {
	const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n"));
	const fields = {};
	if (!match) return fields;
	for (const line of match[1].split("\n")) {
		const sep = line.indexOf(": ");
		if (sep > 0) fields[line.slice(0, sep).trim()] = line.slice(sep + 2).trim();
	}
	return fields;
}

/**
 * Không phải file chủ đề: `README.md` (hướng dẫn), `archive.md` (dòng đã chuyển ra), `forgotten.md` (ý người dùng đã bảo quên)
 * và file ẩn (`._x.md` của macOS) — không bao giờ vào mục lục hay được tra.
 */
export function isTopicFile(name) {
	return /\.md$/i.test(name) && !name.startsWith(".") && !/^(readme|archive|forgotten)\.md$/i.test(name);
}

const unquote = value => value.trim().replace(/^(["'])(.*)\1$/, "$2").trim();

/** Từ khóa chủ đề = title + aliases + slug, bỏ rỗng và trùng khi bỏ dấu. */
export function parseTopic(fileName, text) {
	const slug = fileName.replace(/\.md$/i, "");
	const fields = readFrontmatter(text);
	const title = unquote(fields.title ?? "") || slug.replace(/-/g, " ");
	const aliases = (fields.aliases ?? "").trim().replace(/^\[(.*)\]$/, "$1").split(",").map(unquote);
	const seen = new Set();
	const keywords = [title, ...aliases, slug.replace(/-/g, " ")].filter(keyword => {
		const key = normalizeVi(keyword);
		if (!key || seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	return { slug, file: fileName, title, description: unquote(fields.description ?? ""), keywords, lines: countLines(text) };
}

const UNTIL = /·\s*đến\s+(\d{4}-\d{2}-\d{2})\s*$/;

/** Dòng bài học `· đến YYYY-MM-DD` còn hiệu lực hết ngày đó; ngày sai định dạng thì giữ nguyên. */
export function splitExpired(text, today) {
	const kept = [];
	const expired = [];
	for (const line of text.split("\n")) {
		const match = /^\s*- /.test(line) ? UNTIL.exec(line.normalize("NFC")) : null;
		const until = match?.[1];
		const date = until ? new Date(`${until}T00:00:00Z`) : undefined;
		const valid = date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === until;
		if (valid && until < today) expired.push(line.trim());
		else kept.push(line);
	}
	return { text: kept.join("\n"), expired };
}

export const todayString = (now = new Date()) =>
	`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

// ---------------------------------------------------------------- từ khóa

/**
 * Âm tiết phổ biến (đã bỏ dấu): cặp có chứa một âm tiết này không dùng làm từ khóa. Không có "de" vì "đề" mang nghĩa
 * (phụ đề, chủ đề, đề xuất) mà sau khi bỏ dấu trùng với "để".
 */
const STOPWORDS = new Set(
	"anh em toi minh ban cho cua la va voi nay do thi mot cac nhung khi se da dang co khong duoc lam nhe nha ra vao len xuong roi gi nao the nhu trong ngoai tren duoi hay ma neu vi nen cung con lai nua muon can phai giup xem thu di o tai tu den theo bang ve sau truoc ok oke chi xin chao".split(
		" ",
	),
);

/** Cùng danh sách nhưng giữ dấu — cho từ có dấu khi tra bài học, để "nền" (nhạc nền) không bị loại như "nên". */
const STOPWORDS_KEEP = new Set(
	"anh em tôi mình bạn cho của là và với này đó thì một các những khi sẽ đã đang có không được làm nhé nha ra vào lên xuống rồi gì nào thế như trong ngoài trên dưới hay mà nếu vì nên cũng còn lại nữa muốn cần phải giúp xem thử đi ở tại từ đến theo bằng về sau trước ok oke chỉ xin chào để".split(
		" ",
	),
);

/** Từ cú pháp code/lệnh shell: không chứng minh được tình huống nghề nghiệp. Chỉ áp dụng cho truy vấn lấy từ tool. */
const CODE_STOPWORDS = new Set(
	"const let var function return class import export from default async await new this true false null undefined void typeof div span style css html json yaml http https www com org net src href rel alt type text value data index main body head script module require px rem vh vw auto none inherit width height top left right bottom margin padding color background font size weight display flex grid absolute relative fixed transform opacity transition npx npm pnpm yarn node bun run exec echo cat grep sed awk then else done for while case esac exit sudo cd mkdir cp mv rm ls chmod tmp usr bin users mac documents dev and with the that use get set put cut".split(
		" ",
	),
);

/** Bỏ lời điều khiển hội thoại trước khi lấy từ khóa; không ghép cặp qua dấu câu. Từ ngắn có số (3d, 4k) vẫn là từ khóa. */
export function searchTerms(prompt) {
	const terms = new Set();
	const text = prompt.replace(/\r\n/g, "\n");
	for (const raw of text.split(/[.!?;:\n]/)) {
		const segment = normalizeVi(raw).replace(/\b(?:kiem tra|giai thich|tra loi|cam on|tiep tuc|tien do|cong viec|hom nay)\b/g, " ");
		const tokens = segment.split(/[^a-z0-9]+/).filter(Boolean);
		for (let i = 0; i + 1 < tokens.length; i++) {
			if (!STOPWORDS.has(tokens[i]) && !STOPWORDS.has(tokens[i + 1])) terms.add(`${tokens[i]} ${tokens[i + 1]}`);
		}
		for (const token of tokens) {
			if ((token.length >= 3 || (/\d/.test(token) && /[a-z]/.test(token))) && !STOPWORDS.has(token)) terms.add(token);
		}
	}
	return [...terms];
}

export const MAX_TOOL_QUERY_CHARS = 2_000;
export const MAX_TOOL_QUERY_WORDS = 24;

/** Chữ thường, NFC, GIỮ dấu: tiếng Việt bỏ dấu trùng rất nhiều (dựng/dừng/dùng/đúng → "dung"). */
export function normalizeKeep(text) {
	return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Khớp nguyên từ trên chuỗi giữ dấu; ranh giới từ theo chữ/số Unicode. */
function hasWordKeep(haystack, needle) {
	if (!needle || !haystack.includes(needle)) return false;
	const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(haystack);
}

const ACCENTED = /[^\x00-\x7f]/;
const CONTROL_PAIRS = new Set(["kiem tra", "giai thich", "tra loi", "cam on", "tiep tuc", "tien do", "cong viec", "hom nay"]);

/**
 * Từ khóa để tra bài học: cặp âm tiết liền nhau + từ đơn (≥ 3 ký tự hoặc có số như 3d/4k), bỏ từ phổ biến và lời
 * điều khiển hội thoại. Từ có dấu giữ nguyên dấu (so khớp chính xác); từ gõ không dấu so trên bản bỏ dấu.
 * `tool: true` (truy vấn lấy từ lệnh/nội dung file): cắt 2.000 ký tự, bỏ anchor hashline, số thuần, từ cú pháp code;
 * chỉ giữ 24 từ khác nhau đầu tiên — đoạn code dài không được kéo cả sổ.
 */
export function lessonTerms(query, { tool = false } = {}) {
	const text = tool
		? query
				.slice(0, MAX_TOOL_QUERY_CHARS)
				.replace(/#[0-9A-Fa-f]{4}\b/g, " ")
				.replace(/[{}()[\]<>="'`$\\/|,*+&%@~^]/g, " ")
		: query;
	const terms = [];
	const seen = new Set();
	const allowed = new Set();
	const add = (term, words) => {
		if (seen.has(term)) return;
		if (tool) {
			const fresh = words.filter(word => !allowed.has(word));
			if (allowed.size + fresh.length > MAX_TOOL_QUERY_WORDS) return;
			for (const word of fresh) allowed.add(word);
		}
		seen.add(term);
		terms.push(term);
	};
	for (const raw of text.replace(/\r\n/g, "\n").split(/[.!?;:\n]/)) {
		const tokens = normalizeKeep(raw).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
		const folded = tokens.map(normalizeVi);
		const skip = tokens.map(() => false);
		for (let i = 0; i + 1 < tokens.length; i++) if (CONTROL_PAIRS.has(`${folded[i]} ${folded[i + 1]}`)) skip[i] = skip[i + 1] = true;
		const common = i => (ACCENTED.test(tokens[i]) ? STOPWORDS_KEEP.has(tokens[i]) : STOPWORDS.has(folded[i]));
		const usable = i => !skip[i] && !common(i) && !(tool && (CODE_STOPWORDS.has(folded[i]) || /^\d+$/.test(folded[i])));
		// Gõ không dấu, "nen" có thể là "nên" hoặc "nền": giữ cặp có một từ như vậy, lúc so khớp dùng dấu của bài học để phân xử.
		const ambiguous = i => !skip[i] && !ACCENTED.test(tokens[i]) && STOPWORDS.has(folded[i]) && !(tool && CODE_STOPWORDS.has(folded[i]));
		for (let i = 0; i + 1 < tokens.length; i++) {
			if ((usable(i) || ambiguous(i)) && (usable(i + 1) || ambiguous(i + 1)) && (usable(i) || usable(i + 1))) {
				add(`${tokens[i]} ${tokens[i + 1]}`, [tokens[i], tokens[i + 1]]);
			}
		}
		for (let i = 0; i < tokens.length; i++) {
			if (usable(i) && (folded[i].length >= 3 || (/\d/.test(folded[i]) && /[a-z]/.test(folded[i])))) add(tokens[i], [tokens[i]]);
		}
	}
	return terms;
}

/** Chuỗi truy vấn từ input tool: lệnh `bash`; với tool khác là các giá trị chuỗi ở tầng đầu (path, nội dung, patch). */
export function toolQuery(toolName, input) {
	if (!input || typeof input !== "object") return undefined;
	if (toolName === "bash") return typeof input.command === "string" && input.command.trim() ? input.command : undefined;
	const parts = [];
	for (const value of Object.values(input)) {
		if (typeof value === "string") parts.push(value);
		else if (Array.isArray(value)) for (const item of value) if (typeof item === "string") parts.push(item);
	}
	const text = parts.join("\n").trim();
	return text ? text.slice(0, MAX_TOOL_QUERY_CHARS) : undefined;
}

// ---------------------------------------------------------------- dòng bài học

/**
 * Một dòng bài học trong `memory/<slug>.md`:
 * `- YYYY-MM-DD · <bài học> · khi: <tình huống> · nguồn: "<lời người dùng>"[ · đến YYYY-MM-DD]`.
 * `khi:` tùy chọn với dòng cũ. Nguồn (lời trích) không dùng để so khớp. Dòng hết hạn bị bỏ.
 * `id` = file + hash nguyên dòng: sửa dòng là bài học mới, dòng cũ bị thu hồi.
 */
export function parseLessons(relPath, text, topic, today) {
	const body = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---(?:\n|$)/, "");
	const meta = normalizeVi([topic.title, ...topic.keywords].join(" "));
	const metaKeep = normalizeKeep([topic.title, ...topic.keywords].join(" "));
	const lessons = [];
	for (const raw of splitExpired(body, today).text.split("\n")) {
		if (!/^\s*- \S/.test(raw)) continue;
		const line = raw.trim().normalize("NFC");
		const main = line.replace(/^-\s+/, "").split(/\s·\s*nguồn:/)[0];
		const segments = main.split(/\s·\s/).map(part => part.trim());
		if (/^\d{4}-\d{2}-\d{2}$/.test(segments[0] ?? "")) segments.shift();
		const whenAt = segments.findIndex(part => /^khi:/i.test(part));
		const when = whenAt >= 0 ? segments.splice(whenAt, 1)[0].replace(/^khi:\s*/i, "") : "";
		const lesson = segments.filter(part => !/^đến\s+\d{4}-\d{2}-\d{2}$/.test(part)).join(" · ");
		if (!lesson && !when) continue;
		lessons.push({
			id: `${relPath}#${contentHash(line)}`,
			file: relPath,
			slug: topic.slug,
			line,
			when,
			lesson,
			whenNorm: normalizeVi(when),
			lessonNorm: normalizeVi(lesson),
			metaNorm: meta,
			whenKeep: normalizeKeep(when),
			lessonKeep: normalizeKeep(lesson),
			metaKeep: metaKeep,
			whenTokens: keepTokens(when),
			lessonTokens: keepTokens(lesson),
		});
	}
	return lessons;
}

/**
 * Đọc mọi file chủ đề trong `<root>/memory/`. File đọc lỗi (khóa, đang ghi dở) nằm trong `unreadable`, không bị coi là
 * đã xóa — hook giữ nguyên bài học đã giao của file đó tới khi đọc lại được.
 */
export function loadLessons(root, today = todayString()) {
	const dir = join(root, "memory");
	const topics = [];
	const lessons = [];
	const unreadable = [];
	if (!existsSync(dir)) return { topics, lessons, unreadable };
	for (const name of readdirSync(dir).sort()) {
		if (!isTopicFile(name)) continue;
		try {
			const text = readFileSync(join(dir, name), "utf8");
			const topic = parseTopic(name, text);
			topics.push(topic);
			lessons.push(...parseLessons(`memory/${name}`, text, topic, today));
		} catch {
			unreadable.push(`memory/${name}`);
		}
	}
	return { topics, lessons, unreadable };
}

/** Từ của một trường bài học, giữ dấu kèm bản bỏ dấu — để phân xử cặp từ gõ không dấu. */
function keepTokens(text) {
	return normalizeKeep(text)
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean)
		.map(keep => ({ keep, fold: normalizeVi(keep) }));
}

/** Cặp gõ không dấu có từ phổ biến ("nhac nen"): khớp chỉ khi ở bài học, cả hai từ là từ nội dung ("nhạc nền", không phải "cần tìm"). */
function hasAmbiguousPair(tokens, [first, second]) {
	for (let j = 0; j + 1 < tokens.length; j++) {
		if (tokens[j].fold !== first || tokens[j + 1].fold !== second) continue;
		if (!STOPWORDS_KEEP.has(tokens[j].keep) && !STOPWORDS_KEEP.has(tokens[j + 1].keep)) return true;
	}
	return false;
}

/**
 * Xếp hạng dòng bài học. Một dòng chỉ được chọn khi: khớp ≥ 2 từ khác nhau ở `khi:` hoặc nội dung (title/alias của
 * file chỉ cộng điểm); dòng có `khi:` thì phần khớp ở `khi:` phải là cặp âm tiết (từ ghép: "nhạc nền", "tư liệu") hoặc
 * từ không dấu (heygen, music, 3d) — một âm tiết tiếng Việt đứng riêng quá mơ hồ ("học" trong "bài học" ≠ "khoa học");
 * và (khi sổ ≥ 4 dòng) ≥ 1 từ phân biệt — xuất hiện ở ≤ 50% số dòng.
 * Điểm = Σ idf × trọng số (`khi:` 2, nội dung 1, title/alias 0,5), cặp âm tiết × 1,5.
 */
export function rankLessons(terms, lessons) {
	if (!terms.length || !lessons.length) return [];
	const total = lessons.length;
	const hitsByLesson = lessons.map(lesson =>
		terms
			.map(term => {
				const keep = ACCENTED.test(term);
				const words = term.split(" ");
				const ambiguous = !keep && words.length === 2 && words.some(word => STOPWORDS.has(word));
				const has = (folded, kept, tokens) =>
					keep ? hasWordKeep(kept, term) : ambiguous ? !!tokens && hasAmbiguousPair(tokens, words) : hasWord(folded, term);
				return {
					term,
					when: has(lesson.whenNorm, lesson.whenKeep, lesson.whenTokens),
					lesson: has(lesson.lessonNorm, lesson.lessonKeep, lesson.lessonTokens),
					meta: has(lesson.metaNorm, lesson.metaKeep),
				};
			})
			.filter(hit => hit.when || hit.lesson || hit.meta),
	);
	const df = new Map();
	for (const hits of hitsByLesson) for (const { term } of hits) df.set(term, (df.get(term) ?? 0) + 1);
	const ranked = [];
	for (let i = 0; i < lessons.length; i++) {
		const hits = hitsByLesson[i];
		const words = new Set(hits.filter(hit => hit.when || hit.lesson).flatMap(hit => hit.term.split(" ")));
		if (words.size < 2) continue;
		if (lessons[i].whenNorm && !hits.some(hit => hit.when && (hit.term.includes(" ") || !ACCENTED.test(hit.term)))) continue;
		if (total >= 4 && !hits.some(hit => df.get(hit.term) / total <= 0.5)) continue;
		const score = hits.reduce((sum, hit) => {
			const count = df.get(hit.term);
			const idf = Math.log(1 + (total - count + 0.5) / (count + 0.5));
			const weight = hit.when ? 2 : hit.lesson ? 1 : 0.5;
			return sum + idf * weight * (hit.term.includes(" ") ? 1.5 : 1);
		}, 0);
		ranked.push({ lesson: lessons[i], hits: hits.map(hit => hit.term), score });
	}
	return ranked.sort((a, b) => b.score - a.score);
}

/** Cắt danh sách theo số dòng và tổng ký tự (giữ thứ tự); một dòng dài hơn cả trần vẫn được giữ nếu là dòng đầu. */
export function capLessons(items, maxLines, maxChars, lineOf = item => item.line) {
	const out = [];
	let chars = 0;
	for (const item of items) {
		if (out.length >= maxLines) break;
		const length = lineOf(item).length;
		if (out.length && chars + length > maxChars) break;
		out.push(item);
		chars += length;
	}
	return out;
}

// ---------------------------------------------------------------- CLI

export const CLI_MAX_LESSONS = 3;

function main(argv) {
	const args = [...argv];
	let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const rootAt = args.indexOf("--root");
	if (rootAt >= 0) {
		root = resolve(args[rootAt + 1] ?? ".");
		args.splice(rootAt, 2);
	}
	const query = args.join(" ").trim();
	if (!query) {
		console.error('Cách dùng: node scripts/recall.mjs "<tình huống đang làm>" [--root <thư mục Sena>]');
		return 2;
	}
	const { lessons } = loadLessons(root);
	const found = capLessons(rankLessons(lessonTerms(query), lessons), CLI_MAX_LESSONS, 2_000, item => item.lesson.line);
	if (!found.length) {
		console.log("Không có bài học liên quan trong memory/ (MEMORY.md luôn được áp dụng, không tra ở đây).");
		return 0;
	}
	console.log(`Bài học liên quan (đã được duyệt, áp dụng khi đúng tình huống):`);
	for (const { lesson } of found) console.log(`- [${lesson.file}] ${lesson.line.replace(/^-\s+/, "")}`);
	return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
