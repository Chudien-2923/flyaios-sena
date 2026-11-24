# HyperFrames — CLI reference (bản 0.9.65 qua launcher plugin)

Nguồn: docs `packages/cli`, `developers/cli`, `guides/rendering`, skill `hyperframes-cli`; `render --help` v0.9.65 chạy 2026-11-18. `$HF` = launcher plugin ([[knowledge/hyperframes/01-setup-va-chi-phi]]). `--help` là chuẩn cuối cùng; docs đổi nhanh.

## Quy ước chung

- Thư mục project = tham số vị trí đầu (mặc định cwd); ngoại lệ dùng `--dir`: `add`, `transcribe`, `feedback`, `skills`, `history`, các lệnh sửa `timeline`.
- Hầu hết có `--json`; kết quả có `_meta.updateNotice` → báo người dùng một lần, việc nâng cấp do người dùng quyết. Lỗi in `✗ …` + dòng `Fix:`, exit ≠ 0 (1 = chạy và fail, 2 = sai dòng lệnh/bị từ chối). JSON lỗi: `{ok:false,error:{code,message,hint}}`.
- Chạy không TTY không hỏi: xác nhận → exit 2 kèm gợi ý `--yes`. `init` dùng `--non-interactive`.
- `.env` của project chỉ cấp key cho CLI (`HEYGEN_API_KEY`, `ELEVENLABS_API_KEY`, `FIGMA_TOKEN`…) — không commit.
- Không chạy: `validate`, `inspect`, `layout` (alias cũ của `check`); `events` là telemetry của skill.

## Lệnh theo việc

| Việc | Lệnh | Flag hay dùng |
| --- | --- | --- |
| Tạo project | `init <dir>` | `--skip-skills` (luôn), `--skill=hyperframes`, `--resolution landscape\|portrait\|square\|landscape-4k\|portrait-4k\|landscape-1440p…`, `-v/--video <file>` (nhận footage, chuyển H.264, transcribe), `-a/--audio`, `--language`, `--model`, `--skip-transcribe`, `--keep-original`, `-e/--example <name>`, `--tailwind`, `--non-interactive` |
| Website làm nguồn | `capture <url>` | `-o`, `--json`, `--max-screenshots` (21), `--skip-vision`; đọc trường `dropped` |
| Đọc project | `info` (`--media`), `compositions`, `timeline --json`, `docs <topic>` | topic: data-attributes, gsap, compositions, rendering, audio, transcribe, motion-blur, troubleshooting, examples |
| Kiểm | `lint` (`--verbose`, `--json`), `check --json` | `check`: `--at`, `--range`, `--samples`, `--strict`, `--safe-zone`, `--timeout`, `--no-craft`, `--budget`, `--prepare-media` |
| Nhìn frame | `snapshot` | `--at 1,3,5`, `--range S,E --frames 8`, `--composition <id>`, `--review`, `--zoom`, `--angle`, `--against <video>`; output `.hyperframes/artifacts/snapshots/<run>/` + `contact-sheet.jpg` |
| Motion | `keyframes` | `--selector`, `--shot`, `--layout path\|strip`, `--from/--to` |
| So sánh | `compare <dirs…>`, `grade-compare --for frame.png --grades g.json`, `diff <orig> <yours>` (SSIM) | |
| Sửa timeline | `timeline move\|trim\|split\|set\|duplicate\|delete <#ref> … --plan --json` → chạy lại không `--plan`; nhiều sửa: `timeline apply plan.json`; `timeline undo receipt.json`; `timeline ids` | thời gian: `4.5`, `+1`, `30f`, `end`, `after:#id`; `--overwrite`; không lệnh nào đổi root `data-duration` |
| Lịch sử | `history begin\|end\|show\|undo\|restore\|peek\|pin` | `--who sena`, `--since mine`, `--label` |
| Registry | `catalog --query "…"`, `add <name>` | `--type block\|component`, `--tag`, `--json` |
| Media | `media-use resolve …`, `media-treatment`, `remove-background`, `tts`, `transcribe`, `beats`, `audio`, `normalize-audio` | xem [[knowledge/hyperframes/05-am-thanh-media-mau]] |
| Preview | `preview --background`, `--status`, `--stop`, `--list`, `--port`, `--context --json --context-fields selection`; `play` (player nhẹ); `present` (deck) | |
| Render | `render` | xem bảng dưới |
| Giao/chia sẻ | `share` (link review, cần đăng nhập), `publish` (legacy, link công khai), `cloud render`, `lambda …`, `cloudrun …` | **cần người dùng duyệt** |
| Desktop app | `open`, `catch-up` | |
| Bảo trì | `doctor` (`--json` luôn exit 0, gate bằng `.ok`), `browser ensure`, `upgrade --project . --check`, `usage --json`, `clean --dry-run`, `benchmark`, `feedback`, `telemetry` | `clean` không xóa `.hyperframes` |
| Tài khoản | `auth login\|status\|refresh\|logout` | người dùng tự login |

## `render` — flag chính (v0.9.65)

| Flag | Mặc định | Ghi chú |
| --- | --- | --- |
| `-o/--output` | `renders/<project>_<date>_<time>.<ext>` | luôn đặt tên có version |
| `-c/--composition` | `index.html` | render riêng một composition |
| `--format` | `mp4` | `webm` (VP9 alpha), `mov` (ProRes 4444 alpha), `gif` (~15 fps), `png-sequence` (RGBA cho AE/Nuke), `hls` |
| `-q/--quality` | `looks` (CRF 16) | `draft` khi lặp, `delivery`/`high` cho master giao |
| `-f/--fps` | root `data-fps` hoặc 30 | 24/25/30/50/60…, `30000/1001`, `24000/1001` |
| `--resolution` | kích thước composition | supersample DPR: `4k`, `1440p`…; cùng aspect, bội số nguyên; không kèm `--hdr` |
| `--start` / `--end` | toàn phim | render đoạn (MP4, fps nguyên 24/25/30/60, SDR) |
| `--crf` / `--video-bitrate` | | loại trừ nhau; không cho MOV |
| `--max-bitrate`, `--buffer-size`, `--keyframe-interval` | | ràng buộc nền tảng giao |
| `--prores-profile` | `4444` | `hq\|422\|lt\|proxy` (mất alpha) |
| `--chroma-subsampling` | `420` | `444` cho chữ/UI màu mảnh (master, chậm, nhiều player không đọc) |
| `--video-frame-format` | `auto` | `png` cho screen recording/UI/màu nhạy |
| `--variables`, `--variables-file`, `--strict-variables`, `--batch`, `--batch-concurrency` | | template |
| `--docker` | off | tái lập pixel-exact giữa các máy |
| `--strict` / `--strict-all` | off | fail khi lint error / cả warning |
| `--no-best-effort` | | fail khi media thiếu/chưa sẵn |
| `-w/--workers` | auto | mỗi worker ~256 MB RAM |
| `--low-memory-mode`, `--frames-cache-dir`, `--browser-timeout`, `--player-ready-timeout`, `--protocol-timeout` | | máy yếu/phim nặng |
| `--hdr` / `--sdr` | auto | HDR10 chỉ MP4, libx265 (không `--gpu`) |
| `--wait` | on | một render/tài khoản tại một thời điểm |

- Render >timeout tool: chạy `HYPERFRAMES_RENDER_DETACHED=1`, ghi log ra `render.log` rồi theo dõi file log tới khi có `Render complete` hoặc `Render failed` (macOS/Linux: `until grep -qE 'Render (complete|failed)' render.log; do sleep 5; done`; Windows PowerShell: `while (-not (Select-String -Quiet -Path render.log -Pattern 'Render (complete|failed)')) { Start-Sleep -Seconds 5 }`; không dùng `pgrep -f`).
- Mốc smoke tham khảo: 6 s 1080p30 draft render ~11,7 s (fast capture + GPU phần cứng trên Apple Silicon), ~656 KB; tốc độ thực tế thay đổi theo máy.
- Metadata `hyperframes_renderer/version` nằm trong container (không phải watermark); gỡ: `ffmpeg -i out.mp4 -map_metadata -1 -c copy clean.mp4`.

## Chọn đường render

| Cần | Lệnh |
| --- | --- |
| Mặc định | `render --quality looks -o renders/x-v1.mp4` |
| Tái lập chính xác | `render --docker --strict` |
| Hàng loạt từ biến | `render --batch rows.json -o "renders/{name}.mp4"` |
| Không Chrome/FFmpeg local | `cloud render` (credit; 4K ×1.5; archive ≤200 MB; luôn `--idempotency-key`) — cần người dùng duyệt |
| Phim dài/4K/batch lớn trên hạ tầng riêng | `lambda`, `cloudrun` (tài khoản cloud riêng) — cần người dùng duyệt |

## Bản cũ 0.7.109 (lịch sử)

CLI global là 0.7.109 tới khi nâng ngày 2026-11-18. Nếu gặp máy/agent khác còn bản này: không có `timeline`, `history`, `usage`, `share`, `open`, `catch-up`, `audio`, `normalize-audio`, `media-use`, `models`, `measure`, `diff`, `reverse`, `clean`, `update`, `billing`, `templates`; render thiếu `looks/delivery`, `--start/--end`, `--prores-profile`, `--chroma-subsampling`, `hls`; `check/snapshot` thiếu `--range`, `--review`, `--composition`, `--safe-zone`. Triệu chứng: lệnh in ra help chung.
