# OpenMontage — Kiến trúc, hình thức tồn tại và điều kiện cài đặt

Nguồn: `OpenMontageInc/OpenMontage` (HEAD `2e003e6`, 2026-11-16), đọc trực tiếp ngày 2026-11-24. **Chưa cài và chưa chạy thử trên máy.**

## 1. Tồn tại dưới dạng gì? (Không phải MCP, không phải Skill plugin, không phải CLI đơn)

| Dạng công cụ | OpenMontage có không? | Thực tế trong repo |
| --- | --- | --- |
| **MCP Server** | **Không** | Không có server MCP để kết nối từ xa hay khai báo vào `.omp/mcp.json`. |
| **Plugin / bộ Skill cắm rời** | **Không** | Có 141 file `SKILL.md` / Markdown (`skills/` + `.agents/skills/`), nhưng tất cả viết gắn chặt vào cấu trúc thư mục, schema và module Python của chính monorepo OpenMontage; không có `.claude-plugin/marketplace.json`. |
| **CLI cài global (`npm -g` / `pip`)** | **Không** | `setup.py` chỉ để cài editable/local package bên trong repo; agent gọi trực tiếp các script Python trong `tools/` (`python -c ...`, `python -m backlot ...`, `python render_demo.py`). |
| **Standalone Agentic Workspace (Monorepo)** | **Đúng** | Là một **dự án độc lập hoàn chỉnh**: bạn `git clone`, chạy `make setup`, rồi mở AI coding assistant (Claude Code / Cursor / Codex / OMP / `agy`) **ngay bên trong thư mục đó**. Agent đọc `AGENTS.md` → `AGENT_GUIDE.md` và tự điều phối toàn bộ quy trình. |

## 2. Cấu trúc bên trong monorepo (~171 MB trước khi cài dependency)

- **Lớp hợp đồng & điều phối (agent là orchestrator, không có code orchestrator riêng):**
  - `AGENTS.md` / `CLAUDE.md` / `CURSOR.md` / `CODEX.md` / `COPILOT.md` / `.windsurfrules` → tất cả đều trỏ vào `AGENT_GUIDE.md` (49 KB) và `PROJECT_CONTEXT.md`.
  - `pipeline_defs/` — **12 pipeline YAML** (cộng 1 `framework-smoke.yaml`):
    `animated-explainer`, `animation`, `avatar-spokesperson`, `character-animation`, `cinematic`, `clip-factory`, `documentary-montage`, `hybrid`, `localization-dub`, `podcast-repurpose`, `screen-demo`, `talking-head`.
  - Luồng chuẩn của mọi pipeline: `research -> proposal -> script -> scene_plan -> assets -> edit -> compose`, có cổng duyệt người dùng bắt buộc (checkpoint JSON từ chối đánh dấu hoàn tất nếu thiếu phê duyệt), pre-compose validation (chấm điểm rủi ro "slideshow"), và post-render self-review (`ffprobe` + trích 4 frame + kiểm âm thanh + phụ đề).
  - `schemas/` (20+ JSON Schema kiểm hợp đồng dữ liệu) và `styles/` (5 style playbook YAML: `clean-professional`, `flat-motion-graphics`, `minimalist-diagram`, `premium-minimalist`, `anime-ghibli`).
- **Lớp kiến thức 3 tầng:**
  - Tầng 1 (`tools/` + `pipeline_defs/`): có công cụ & pipeline nào.
  - Tầng 2 (`skills/`): quy ước OpenMontage (`pipelines/`, `creative/`, `core/`, `meta/`).
  - Tầng 3 (`.agents/skills/` — 93 thư mục): gói kiến thức công nghệ ngoài (HyperFrames, Remotion, GSAP, Manim, ComfyUI, Kling, FLUX, ElevenLabs, Pika, MiniMax, Lyria…).
- **Lớp công cụ thực thi (`tools/` — 100+ module Python, tự đăng ký qua `tool_registry.py`):**
  - `video/` (56 file: 20+ provider tạo video AI + `hyperframes_compose`, stitch, trim), `graphics/` (42 file: 15+ provider tạo ảnh + diagram/code/Manim), `audio/` (39 file: 10+ TTS + Suno/ElevenLabs music & SFX + mixer), `analysis/` (16 file: WhisperX, scene detect, CLIP/BLIP-2, validator), `enhancement/` (9 file: Real-ESRGAN, rembg, CodeFormer/GFPGAN), `avatar/` (6 file: SadTalker/MuseTalk/Wav2Lip/Kling Avatar), `capture/`, `character/`, `subtitle/`, `publishers/`, `cost_tracker.py`, `minicut_cli.py`.
  - Bộ chọn nhà cung cấp chấm điểm 7 chiều (`provider_routing.py`): task fit (30%), chất lượng (20%), kiểm soát (15%), độ ổn định (15%), chi phí (10%), độ trễ (5%), nhất quán (5%) — ghi toàn bộ vào decision audit trail.
- **3 sub-app / runtime đặc biệt đi kèm:**
  1. **`remotion-composer/`:** project Remotion 4.0.484 + React 18 cài sẵn component `Explainer`, `TalkingHead`, `TerminalScene`, chart, word-by-word captions.
  2. **`backlot/` (FastAPI + uvicorn + watchfiles):** web dashboard chạy cục bộ (`127.0.0.1:4750`), tự theo dõi `projects/<id>/` để hiển thị trực quan các chặng pipeline, kịch bản, filmstrip storyboard kèm ảnh/take/chi phí từng cảnh và nút replay toàn bộ quá trình chạy.
  3. **`ink-theater/` (`ink-theater.js` + `ink-puppet.js` + `mocap/`):** engine hoạt hình nét mực vẽ tay trên nền trắng chạy thuần trên **HyperFrames** (HTML/SVG + GSAP seek-safe), có 2D FABRIK IK, hiệu ứng rung nét vẽ (`feTurbulence` boil) và **12 động tác người que dùng dữ liệu CMU motion-capture thật** (`walk`, `run`, `dance_spin`, `kick`, `wave`…), hoàn toàn miễn phí không cần AI video.

## 3. Yêu cầu hệ thống

| Yêu cầu OpenMontage | Mức tối thiểu | Lưu ý thực tế |
| --- | --- | --- |
| Python | 3.10+ (`.python-version` = 3.11) | Nên dùng `uv` để tạo môi trường riêng (`uv venv --python 3.11`). |
| Node.js | 22+ | Dùng cho `remotion-composer/` và HyperFrames. |
| FFmpeg | Có trong `PATH` | Bắt buộc cho các bước ghép và render. |
| Ổ đĩa trống | ≥ 5 GB trống trước khi cài | Clone (~171 MB) + `.venv` + `remotion-composer/node_modules` (~1 GB) + `piper-tts` tốn ngay ~1,5–2 GB, chưa tính file dự án. |
| GPU / RAM (nếu chạy model tạo video local) | > 16 GB VRAM | Máy 16 GB unified memory / GPU nhỏ không chạy vừa hầu hết model video gen local; chỉ phù hợp dùng **API cloud** hoặc dựng bằng **HyperFrames/Remotion/stock**. |

## 4. Bản quyền (`AGPL-3.0`)

- OpenMontage phát hành dưới giấy phép **GNU AGPLv3** (copyleft mạnh).
- **Dùng nội bộ để dựng và xuất video (kể cả video thương mại cho khách hàng):** sản phẩm video xuất ra không bị AGPL ràng buộc (lưu ý vẫn phải tuân bản quyền riêng của từng provider API / stock / font / nhạc).
- **Nhúng mã nguồn OpenMontage vào app/dịch vụ web đóng mã nguồn chạy cho người dùng bên ngoài:** AGPLv3 yêu cầu công khai mã nguồn dịch vụ tương ứng → không sao chép code từ OpenMontage sang sản phẩm đóng mã nguồn.

## 5. Cách cài đặt đúng (chỉ thực hiện khi bạn muốn dùng riêng)

1. **Không cài bên trong repo Sena.** Chọn một thư mục độc lập ngoài repo khi ổ đĩa dư ít nhất ~5 GB.
2. Clone và chạy setup:
   ```bash
   git clone https://github.com/OpenMontageInc/OpenMontage.git <thu-muc-rieng>
   cd <thu-muc-rieng>
   make setup
   ```
3. Kiểm tra `config.yaml`: đổi `budget.mode` từ `warn` sang `cap`, đặt trần `total_usd` và `single_action_approval_usd` theo ngân sách bạn cho phép.
4. Chỉ nạp API key vào `.env` cho đúng provider bạn chọn (không bao giờ commit `.env`); muốn xem storyboard chạy `python -m backlot open <project-id>`.
5. Chạy thử kiểm tra khả năng hiện có: `make preflight` (in `provider_menu()`).
