# HyperFrames — Lỗi thường gặp: triệu chứng → cách sửa

Nguồn: docs `help`, `guides/performance`, `guides/rendering`, skill `hyperframes-cli` §When a command fails, lint rules; quan sát 2026-11-18. Đầu tiên luôn: `doctor` → `lint` + `check` → `snapshot --at 0,3,8`; giữ nguyên **lỗi đầu tiên chính xác**.

## Preview / browser editor

| Triệu chứng | Nguyên nhân / sửa |
| --- | --- |
| Video đen trong preview nhưng render được | Codec trình duyệt không đọc (HEVC, ProRes…) → giữ proxy (`--proxy` mặc định, `hyperframes.json media.autoProxy: true`); file lớn chờ proxy xong |
| Video đứng hình khi khung của nó animate | Đang animate width/height/top/left của `<video>` → bọc div, animate wrapper bằng transform |
| Media lệch sync | Script gọi `play()/pause()/currentTime` → bỏ, dùng attribute |
| Animation đứng yên | Timeline chưa `paused: true` / chưa đăng ký / key ≠ `data-composition-id`; đăng ký trước khi build tween xong |
| Element luôn hiện | Thiếu `class="clip"` hoặc `data-start` |
| Kết thúc sớm | `compositions` xem duration đã resolve; tăng root `data-duration` |
| Duration lấy từ biến bị bỏ qua | Root `data-duration` đọc trước script → viết thẳng |
| Sửa trên canvas thành animation | Auto-keyframe đang bật (mặc định ON) → undo, tắt trong toolbar timeline, làm lại |
| Xóa clip làm các clip sau dồn lên | Ripple edit mặc định ON trên main track |
| Preview không cập nhật | Chờ lưu xong; xem terminal; reload; restart `preview` |
| Preview giật | Ảnh quá lớn, nhiều `backdrop-filter`/blur, shadow trên element động, nhiều layer lớn chồng → thu nhỏ/giản lược scene đó (preview giật ≠ render lỗi) |
| URL preview `ERR_CONNECTION_TIMED_OUT` | Đã chạy `npm run dev` nền trong shell rồi bị kill → dùng `preview --background`, kiểm `--status` |
| Desktop app không sửa được project | Preview đang chạy → `preview --stop` |
| Lưu thất bại | Hai tool cùng sửa một file → reload, áp lại; không sửa song song |

## Render

| Triệu chứng | Sửa |
| --- | --- |
| Mỗi render tự cộng ~45 s | Composition không có GSAP timeline → `data-no-timeline` |
| Render khác preview | Font chưa bundle, media remote, effect đặc thù trình duyệt → bundle font, đưa media vào project; tái lập bằng `render --docker` |
| "No composition found" | `index.html` có root với `data-composition-id`, `data-width/height` |
| "FFmpeg not found" | Cài FFmpeg (macOS: `brew install ffmpeg`; Windows: `winget install Gyan.FFmpeg` rồi mở lại terminal; Linux: `sudo apt install -y ffmpeg`), chạy `doctor` lại |
| Chrome thiếu/không khởi động | `browser ensure` (`--force`) |
| Trang nặng chưa sẵn sàng | Tăng `--timeout` (check/snapshot), `--browser-timeout`, `--player-ready-timeout`, `--protocol-timeout` |
| Render chậm | Draft khi lặp; snapshot trước; giảm blur/filter; ảnh ≈ kích thước giao; `benchmark`; một CSS declaration đắt có thể làm 9.8 s → 25 s |
| Hết đĩa | Raw frame ~25 GB/phút ở 1080p30 khi đi đường disk → `clean --dry-run` rồi `clean`, `--frames-cache-dir` sang ổ khác; nên giữ ổ trống ≥ 10 GB |
| Muốn HDR ra SDR | Chỉ MP4 có HDR; kiểm metadata nguồn bằng ffprobe trước |
| Render fail cả mix âm | `data-fx-chain`/`automation` JSON lỗi (preview vẫn phát khô) → sửa JSON, nháy kép `&quot;` |
| Export bị hạ âm lượng (`audio_lowered`) | Thêm `truepeak` trên master bus root, ceiling ≥2 dB dưới giới hạn |
| Capture website lỗi / `BLOCKED.md` | Không dùng file dở; thử lại vào thư mục `-o` mới |
| Render 2 lần cùng lúc chậm/đợi | Render lock mỗi tài khoản (mặc định chờ) — đừng chạy song song |
| WebGPU effect (liquid glass) ra trống | Headless không có WebGPU → dùng phương án CSS |
| Slideshow render chỉ ra slide 1 | Không render deck; `present`/`snapshot` |

## Môi trường và phiên bản

| Triệu chứng | Sửa |
| --- | --- |
| Skill gọi lệnh mà CLI báo help chung | Đang chạy CLI cũ (vd 0.7.109) → dùng launcher plugin `$HF`, kiểm `--version` |
| `This project pins hyperframes@…` / `_meta.updateAvailable` | `upgrade --project . --check` (read-only); nâng cần người dùng duyệt, sau đó chạy lại `check` |
| `N HyperFrames skills out of date` | Plugin workflow: báo người dùng và nâng qua trình quản lý plugin khi được duyệt; không tự chạy `skills update` |
| Launcher báo `npm error notarget No matching version found for hyperframes@<X>` | Plugin (từ GitHub `main`) có thể ra trước npm vài giờ; launcher không tự lùi bản. Tạm dùng CLI global `hyperframes` nếu release notes không đổi lệnh/flag đang dùng và báo rõ cho người dùng |
| `auth status`: chưa đăng nhập | Báo người dùng một dòng; người dùng tự chạy `auth login`; không tự login |
| Sai chữ trong transcript | Sửa `transcript.json` rồi `transcribe transcript.json --dir <project>`; tiếng Việt luôn soát lại |

## Khi báo lỗi lên HeyGen (khi người dùng duyệt)

`info` + lỗi chính xác + repro nhỏ + version/OS; không đưa secret. `feedback --file-issue` upload project công khai → chỉ dùng bản copy tối giản, sạch.
