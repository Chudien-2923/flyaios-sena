# Remotion — Skills, plugin, AI, Elements, templates, bản đồ package

Nguồn: repo `packages/skills/skills/*` (13 skill + rule files, `remotion-maps/techniques/*`), `packages/skills/scripts/prepare-embedded-skills.ts`, `packages/claude-code-plugin/{build.mts,.claude-plugin/*}`, `packages/agent-plugin/{build.mts,plugin.json}`, `packages/create-video/src/{templates.ts,help.ts,install-skills.ts}`, `packages/*/package.json`; docs `md/docs/ai/*`, `md/docs/cli/{skills,upgrade,elements/use}.md`, `md/docs/elements*.md`, `md/docs/studio/browse-elements.md`, `md/elements/**`, `md/docs/editor-starter*.md`, `md/docs/{mediabunny,webcodecs,whisper-web,cloudrun,sdk}.md` — docs/repo 4.0.545, đọc 2026-11-18. Tất cả **đọc từ docs/repo, chưa chạy thử**.

Liên quan: [[knowledge/remotion/01-setup-license-phien-ban]] · [[knowledge/remotion/03-markup-animation]] · [[knowledge/remotion/04-media-am-thanh-captions]] · [[knowledge/remotion/05-studio-cli-render]] · [[knowledge/remotion/06-data-server-cloud-app]] · [[knowledge/remotion/08-loi-thuong-gap]].

## 9 luật cứng skill ép

1. 13 skill cùng `version: 4.0.546` (bản plugin hiện cài; nội dung tra cứu trong bộ Instruction này đọc ở 4.0.545), phải khớp version project. `npx remotion upgrade` cập nhật luôn skill trong `.agents/skills` (bỏ: `--skip-skills`, 4.0.503); skill global không được cập nhật.
2. `remotion-best-practices` = router (thư mục chứa symlink tới 12 skill kia). Làm video mới → luôn `remotion-create`, dù đã có project.
3. **Chỉ render khi user nói rõ** ("Render", "Export", "Give me the MP4"); mặc định mở Studio preview.
4. Render luôn kèm composition ID: `npx remotion render <id> out/video.mp4` (thiếu → picker, fail khi non-TTY). Lấy ID: `npx remotion compositions`.
5. Cài gói bằng `npx remotion add <pkg>` cho `@remotion/*`, `mediabunny`, `@mediabunny/*`, `zod`, `@huggingface/transformers`.
6. Thấy code đổi bất ngờ → coi là user cố ý, không ghi đè.
7. Markup editable trong Studio mặc định: style inline, `interpolate()` inline giá trị hard-code, `scale/translate/rotate` thay `transform`, `defaultProps` inline, không type assertion (xem [[knowledge/remotion/03-markup-animation]]).
8. Cấm CSS `transition/animation`, class animation Tailwind — không render đúng.
9. Render bằng browser Remotion tự tải; không `--browser-executable`/`chromeMode` trừ khi user yêu cầu. `--license-key=<key>` hoặc `free-license`, không truyền rỗng; test render thêm `--is-production=false` để không bị tính.

## Bảng 13 skill

| Skill | Khi dùng | File nên mở | Tự động / rủi ro |
|---|---|---|---|
| `remotion-best-practices` | Không rõ skill nào; follow-up | `SKILL.md` | Mở Studio (system browser; `--no-open` nếu có in-app browser) |
| `remotion-create` | Project/composition mới | `SKILL.md`, `video-layout.md` (safe area ≥80px ngang, ≥100px dọc ở khổ rộng 1080), `tailwind.md` | `npx create-video@latest --yes --blank --no-tailwind .` (hoặc `my-video`) → **cài dependency, mạng**; mở Studio ngay |
| `remotion-markup` | Mọi markup: composition, timing, media, effects, font | `SKILL.md` (bảng component nhận `effects`, list effect), `compositions.md`, `sequencing.md`, `timing-props.md`, `transitions.md`, `effects.md`, `video-editing.md`, `multi-scene-video.md`, `audio.md`, `calculate-metadata.md`, `parameters.md`, `google-fonts.md`, `ffmpeg.md`, `silence-detection.md`, `video-matting.md`… (33 file) | `remotion add`; matting tải model (GPU); `sfx.md` dùng `https://remotion.media/*.wav` |
| `remotion-interactivity` | Markup chọn/sửa được trong Studio | `SKILL.md` (schema field, `Interactive.*`), `timeline-structure.md`, `inline-effects.md` | Cài `@remotion/paths` khi morph path |
| `remotion-studio` | Mở preview | `SKILL.md` (`--log`, `--port`, `--force-new`) | Process chạy lâu, mở browser |
| `remotion-render` | Video/still/frames, alpha, OTIO | `SKILL.md`, `transparent-videos.md`, `opentimeline.md` | Tải browser; OTIO render fallback ProRes 4444/WAV, có thể `pip install OpenTimelineIO` |
| `remotion-captions` | Phiên âm, hiển thị, import SRT | `transcribe-captions.md`, `display-captions.md`, `import-srt-captions.md` | `@remotion/whisper-webgpu` **tải model**, cần GPU, không Linux arm64; fetch source Element Basic Captions. Từ 4.0.546 có CLI `npx remotion whisper` (`transcribe`/`install`/`ls`/`rm`/`rmall`) dùng chính gói này, xem [[knowledge/remotion/05-studio-cli-render]] |
| `remotion-maps` | Map tĩnh, route, Mapbox/MapLibre/MapTiler, flyover 3D | `SKILL.md` → chọn **1** `techniques/<x>/TECHNIQUE.md` (+ `references/render-stability.md`) | Mapbox, MapTiler cần key; MapLibre free; Cesium `city` cần **Google Map Tiles key có billing** |
| `remotion-multimedia` | Duration/kích thước file (Mediabunny) | `get-*-duration.md`, `get-video-dimensions.md` | — |
| `remotion-saas` | App: Player, SSR, Lambda, Vercel, Vue/Angular/Svelte | `framework.md`, `player.md`, `rendering.md` (9 bước Lambda) | **Cloud tốn tiền**; secret vào `.env`, không xin dán vào chat |
| `remotion-docs` | Tra API hiện hành | `SKILL.md` | **Mạng**: POST Algolia (index `remotion`, key công khai) → GET `https://www.remotion.dev/docs/<path>.md` |
| `remotion-license` | License/giá (4.0.540) | `SKILL.md` = 4 link docs | Mạng |
| `remotion-upgrade` | Nâng Remotion + gói phụ + skill | `SKILL.md` | **Sửa manifest/lockfile**: `npx remotion upgrade`; không có CLI → nâng tay mọi `@remotion/*` cùng version, căn `zod`/`mediabunny` theo `npm view @remotion/studio@<v> dependencies`, `npx skills update … --yes`; kiểm `npx remotion versions` |

Ghi chú:
- `remotion-create` không hỏi user; kiểm Node/Git, kiểm thư mục kể cả file ẩn (chỉ xoá `.DS_Store`; `.env`, `.git` là nội dung thật), mở Studio **trước** khi viết composition.
- `remotion-maps`: mỗi technique tự đủ; cesium có `assets/CesiumFlythrough.tsx`, `scripts/prep-cesium-path.mjs`; render still giữa clip trước khi render cả video.
- OTIO: chỉ khi user xin timeline cho DaVinci/Premiere ≥25.6. `<Video>/<Audio>/<Img>` → clip native; text/animation/effects/canvas → fallback render; không để fallback và media gốc cùng active; không bịa path.
- `npx remotion ffmpeg`/`ffprobe` có sẵn, không cần cài ffmpeg.

Cài skill: trong project `npx remotion skills add|update` (4.0.411, vào `.agents/skills`, symlink `.claude/skills`); ngoài project `npx skills add remotion-dev/skills` hoặc `gh skill install remotion-dev/skills`; khi scaffold `--skills` (chạy `npx -y skills@1.7.0 add remotion-dev/skills --agent universal --skill '*' --yes`).

## Plugin cho coding agent

Plugin = 13 skill build lại theo client; repo phát hành sinh tự động, sửa ở monorepo; package build `private`.

| Client | Cài | Gọi |
|---|---|---|
| Claude Code | `claude plugin marketplace add remotion-dev/claude-code-plugin` → `claude plugin install remotion@remotion`, restart | `/remotion:remotion-create <prompt>` |
| Codex (ChatGPT desktop) | Tab Plugins → "Remotion" | `$remotion` |
| Cursor | Marketplace hoặc clone `remotion-dev/cursor-plugin` vào `~/.cursor/plugins/local/remotion` | `/remotion-create` |
| Copilot CLI | `copilot plugin install remotion@awesome-copilot` | prompt thường |
| Kimi Code | `/plugins install https://github.com/remotion-dev/kimi-code-plugin` | `/skill:remotion-create` |

**Sena dùng bản Claude Code plugin qua OMP** (đã chạy 2026-11-18): `omp plugin marketplace add remotion-dev/claude-code-plugin` → `omp plugin install remotion@remotion --scope project`. Phiên OMP mới ở root Sena thấy 13 skill dạng `skill://remotion-<tên>` (không namespace). Bản này đã chuyển `.ts/.tsx` thành `.md` (asset Cesium đọc dạng code fence rồi chép vào project). Không chạy `npx remotion skills add` hay `create-video --skills` (tạo bản skill thứ hai trong project) — nếu template tự đề nghị, chọn không.

Build:
- **Claude**: copy dereference symlink, bỏ icon + `agents/openai.yaml`; `.ts/.tsx/.mjs` → `<file>.md` (code fence + "Copy the code below into …"), `.geojson` → `.json`; chỉ text, >256 KiB → lỗi.
- **Agent plugin** (`--client=codex|cursor`): **bỏ hẳn `.tsx`** → bản Codex/Cursor thiếu asset cesium. Codex: `--no-open` + in-app browser, gặp `EMFILE` → `--webpack-poll 1000`, lỗi sandbox Chromium do Codex/macOS. Cursor: `npx remotion studio` mở browser.
- `prepareEmbeddedSkills()`: skill lồng trong router đổi `SKILL.md` → `REFERENCE.md`; link chéo skill thành chữ "(`file` in the `skill` skill)".

## AI khác

| Mục | Ý chính | Cần |
|---|---|---|
| Coding agents | `npx create-video --yes --blank my-video` → `npx remotion skills add` → `npm run dev` → chạy agent ở terminal khác | Subscription agent |
| WebMCP (4.0.518) | Studio expose tool: sequences, compositions, render jobs, `get_current_error`, `get_canvas_html`, playback, guides, `install_package`, `transcribe_asset`, `remove_video_background`, `restart_studio`… | Docs: chỉ Codex hỗ trợ; shape **chưa ổn định** |
| Chatbot | Ask AI trên docs, remotion.ai, ⌘/Ctrl+I trong Studio | — |
| Code generation | Vercel AI SDK + `Output.object` (zod); system prompt `/system-prompt.txt` | API key LLM |
| JIT compilation | `@babel/standalone` → `new Function(...)` → Player | Chạy trong global scope: production dùng iframe sandbox + CSP |
| Prompt to Motion Graphics | `npx create-video@latest --prompt-to-motion-graphics`, `OPENAI_API_KEY`, export qua Lambda | OpenAI, AWS |
| SDK | Đang phát triển (waitlist), compiler in-browser cho app | — |

## Remotion Elements

Element = component React tái dùng; cài = **copy source vào project** + cài dependency, sửa tự do. Catalog `https://www.remotion.dev/elements`, mỗi trang `.md` có lệnh cài + source.

| Nhóm | Element |
|---|---|
| Text | Circle Marker, Crossed Off, Cylinder Text (WebGPU), Spinning Text Wheel, Strike Through, Text Marker |
| Backgrounds | Notebook Paper, Paper Texture, Rotating Starburst, Moving Waves, Moving Zigzags, Liquid Contours |
| Data | Horizontal/Vertical Bar Chart, Line Chart, Number Counter, Pie Chart |
| Effects (`commerce/`) | Wiggling Callout, Peel, Shine, Tear apart |
| Captions | Basic, Rounded, Moving Pill, Popping Word, Word Highlight |
| YouTube | Comment Highlight, End Card, Subscribe Nudge |
| Storytelling | News Article Highlight, Speed Lines, On-Screen Messages, Polaroid Pictures |
| Overlays | Location/Name Lower Third, Social Safe Zones |
| Maps | A-to-B Map Flyover, Spinning Globe, Watercolor Map |
| Audio | Oscilloscope, Voice Note, Mirrored Spectrum |
| Layouts | Rotating Cards, Picture in Picture Transition, Slide to Split Screen |

Bên thứ ba: Remocn, Lexington Themes, snapcn.

Cài:
- `npx remotion elements use <url> --composition <id> --yes` (4.0.542): fetch payload → cài package, asset vào `public/`, ghi `<slug>.element.tsx` cạnh component, chèn ở **frame 0**. Non-TTY thiếu `--yes` → fail; nhiều composition thiếu `--composition` → fail (chỉ nhận `id` string literal). `--overwrite`, `--element <slug>`, `--dry-run` + `--package-manager` (4.0.543). Code từ web chạy trong project → chỉ site tin cậy.
- Studio: Inspector → Browse Elements; thêm thư viện qua Explore hoặc `Config.addElementLibrary()`.
- Thủ công: lưu source thành `<slug>.element.tsx`.
- Captions trong Studio: Generate captions (chọn style 4.0.535); Import (4.0.521) nhận `Caption[]`, SRT, ElevenLabs, Whisper verbose JSON.
- Tự làm: `installationMode` `'wrapped'` (mặc định) hoặc `'component-owned-sequence'`; thư viện: template `element-library` + `@remotion/studio-protocol`.
- License: không trang Element nào ghi license riêng; [INFERENCE] theo Remotion License.

## Templates `create-video`

`npx create-video@latest --yes --<flag> <dir>` (`--yes` cần flag + thư mục; Tailwind mặc định tắt).

| Flag | Dùng cho | Cần thêm |
|---|---|---|
| `blank` | Canvas trống, khuyên dùng khi code bằng AI | — |
| `hello-world` | Playground TS/ESLint | — |
| `tiktok` | Caption word-by-word | **Tự cài Whisper.cpp** |
| `audiogram` / `music-visualization` | Podcast / nhạc → video social | — |
| `prompt-to-video` | Prompt → script, ảnh, voiceover | **OpenAI + ElevenLabs** |
| `still` | Ảnh động + HTTP server | — |
| `three` / `skia` | R3F / React Native Skia | — |
| `overlay` | Overlay cho NLE | — |
| `code-hike` | Animate code | — |
| `stargazer` | Mừng star GitHub | — |
| `recorder` | Quay webcam/màn hình, caption, nhạc | — |
| `next` / `react-router` | SaaS + Player + Lambda | AWS |
| `vercel` | Render qua Vercel Sandbox + Blob | Vercel |
| `render-server` | Express start/track/cancel render | — |
| `electron` | Render từ Electron | — |
| `prompt-to-motion-graphics` | SaaS AI motion graphics | OpenAI (+AWS) |
| `element-library` | Website thư viện Element | — |
| `editor-starter` | Boilerplate video editor | **$600 một lần** (`PAID_TEMPLATES`); công ty lớn cần Company License |

## Bản đồ package

Mọi `@remotion/*` phải cùng version `remotion`.

| Nhóm | Package |
|---|---|
| Core | `remotion`, `@remotion/{transitions,paths,shapes,noise,layout-utils,animation-utils,motion-blur,preload,zod-types}` |
| Render/CLI | `@remotion/{cli,renderer,bundler,studio,studio-server,web-renderer,browser-bundler}`, `create-video`, `@remotion/compositor-<platform>` (tự kéo); tooling `@remotion/{eslint-plugin,eslint-config-flat,tailwind-v4,tailwind,enable-scss,codemods}` |
| Media | `@remotion/{media,media-utils,gif,fonts,google-fonts,sfx,video-matting}`; **deprecated** `media-parser`, `webcodecs` (→ Mediabunny, ngừng ở Remotion 5) |
| Visual | `@remotion/{effects,light-leaks,starburst,three,skia,lottie,rive,gsap,rough-notation,rounded-text-box,svg-3d-engine,animated-emoji,mac-cursors,maptiler}` |
| Captions/AI | `@remotion/{captions,whisper-webgpu,install-whisper-cpp,openai-whisper,elevenlabs}`; **deprecated** `whisper-web` |
| Cloud | `@remotion/{lambda,lambda-client,vercel,licensing}`; `cloudrun` **Alpha, không còn phát triển** |
| App | `@remotion/{player,studio-protocol,streaming}`; `@remotion/sdk` experimental |
| Internal | private: `skills`, `*-plugin`, `docs`, `template-*`, `example*`, `compositor`, `convert`, `lambda-{go,php,python,ruby}`…; publish nhưng nội bộ: `studio-shared`, `timeline-utils`, `design`, `promo-pages` |

## Mâu thuẫn / chưa chắc

- Plugin manifest ghi `"license": "MIT"`, `package.json` cùng package ghi "Remotion License".
- README plugin ví dụ `/remotion-create`, docs Claude ghi `/remotion:remotion-create`.
- Router nói Studio hỗ trợ WebMCP; docs WebMCP: trong harness lớn chỉ Codex dùng được.
- `templates.ts`: `music-visualization` có `description` chép y audiogram ("…for podcasts").
- `packages/template-vibe-code` có trong repo nhưng không có trong `templates.ts`.
- Chưa xác minh: license riêng của Element, Recorder có thu phí không.
