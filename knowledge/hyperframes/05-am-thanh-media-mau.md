# HyperFrames — Media, âm thanh, captions, cutout và màu

Nguồn: skill `media-use` (SKILL.md), docs `guides/media`, `video-components`, `voice-and-audio`, `remove-background`, `media-effects`, `prompting/media-and-audio`, `prompting/color-grading`, `studio/audio-effects`, `reference/audio-effects`, `reference/color-grading`; `doctor` 2026-11-18. Flag có thể đổi theo version: `--help` trước khi dùng.

## Luật media chung

- Mọi file cần cho bản cuối **nằm trong project** (`assets/...`, không `/` đầu, kể cả trong sub-composition). Không URL hết hạn/cần login; render không fetch mạng.
- Đặt tên mô tả (`pricing-page-scroll.mp4`); phân biệt file gốc và file đã xử lý. **Không ghi đè/xóa media gốc.**
- Mỗi media một việc: capture sản phẩm = chứng minh; footage = người/nơi/hành động/cảm xúc; ảnh = giữ một ý; voice = giải thích; nhạc = nhịp/tông; SFX = nhấn một hành động. Hai asset cùng việc → giữ cái rõ hơn.
- Lấy/làm media qua một lệnh: `$HF media-use resolve --type <bgm|sfx|image|logo|voice|video|cutout…> --intent "<cần gì>" --project <dir>` → in `resolved <id> → <path>`. Xem `--candidates` để tái dùng trước. Logo bên thứ ba lấy từ nguồn (theSVG, favicon…), **không vẽ lại**; logo của mình phải có đường dẫn.
- media-use lưu lựa chọn đã xác nhận ở `.media/preferences.json`; thêm `.media/*.lock` vào `.gitignore`.

## Footage và ảnh (HTML)

```html
<img class="clip" id="logo" src="assets/logo.svg" data-start="0" data-duration="3" />
<div id="tour-wrap"> <!-- animate wrapper, không animate <video> -->
  <video class="clip" id="tour" src="assets/product-tour.mp4" muted playsinline
         data-start="3" data-duration="6" data-media-start="4"></video>
</div>
```

- `data-media-start` = điểm vào trong source (trim đầu). Giữ tiếng clip: `data-has-audio="true"` (bỏ `muted`) + `data-volume`. B-roll im: `muted`.
- Không `play()/pause()/currentTime`, không animate width/height/top/left của `<video>` (video sẽ đứng hình) — animate wrapper bằng transform. Time chính `<video>`, không time wrapper.
- HEVC/H.265, ProRes, MPEG-2, DNxHD… tự có **proxy H.264** cho preview (`.transcode-cache/`); render luôn decode file gốc. Preview đen mà render được = vấn đề codec → giữ `--proxy` (mặc định).
- UI/screen recording/màu nhạy: `render --video-frame-format png`.
- Footage dọc trong khung 16:9: block `yt-vertical-fill`. Screen recording auto-zoom: `cursor-zoom-follow`.

## Voiceover

| Nguồn | Cách | Ghi chú |
| --- | --- | --- |
| Kokoro local (miễn phí) | `$HF tts "<text>|file" -v <voice> -s <speed> -l <lang> -o vo.wav` (`--list` xem giọng) | **Tùy chọn, không cài mặc định** (`pip install kokoro-onnx soundfile`, cần người dùng duyệt). Giọng: `af_heart` (mặc định), `af_nova`, `af_sky`, `am_adam`, `am_michael`, `bf_emma`, `bf_isabella`, `bm_george`, `ef_dora`, `ff_siwis`, `jf_alpha`, `zf_xiaobei`. **Không có tiếng Việt** trong danh sách ngôn ngữ docs (en/es/fr/hi/it/pt-br/ja/zh) |
| HeyGen voices / Voice Turbo | qua `media-use` sau `auth login` | Free plan 3 phút/tháng; clone giọng trả phí |
| ElevenLabs / Gemini TTS | chỉ khi người dùng có key và yêu cầu | Thứ tự tự động: HeyGen → ElevenLabs → Kokoro; Gemini chỉ khi gọi tên |
| Bản thu của người dùng | báo agent "đây là narration" | Transcribe để có word timing |

- Tách script và chỉ dẫn diễn đạt; nghe lại xem chỉ dẫn có bị đọc ra không. Mỗi take mới cần timing mới. Kiểm tên riêng/số/ngắt nghỉ trước final.
- **VO là đồng hồ**: element của scene chạm đúng chữ được nói; narration không bao giờ chờ hình.

## Nhạc và SFX

- Nhạc: mood + mức âm ("subtle electronic BGM, kept under −18 dB"). Không bao giờ chỉ "add background music" (full volume, đánh nhau với VO). Loop trong slot: `<audio id="music" src="assets/music.wav" data-start="0" data-duration="30" loop>`. Mọi `<audio>` phải có `id`, không `crossorigin`.
- Nguồn nhạc: kho HeyGen miễn phí (đăng nhập), MusicGen local (nếu có deps), hoặc track người dùng đưa. Nhạc phải có quyền sử dụng rõ ràng.
- SFX: gắn vào khoảnh khắc ("whoosh on each of the three scene transitions", "soft click on the button press at 0:04"); không rắc đều. Openverse CC BY → ghi credit.
- Phim nhạc: `$HF beats` ghi `beats/<audio>.json`; cut trên beat grid; tả "verse into the hook"/"best 20 seconds", không đưa timestamp.
- `$HF audio <file> --json` (0.9.x): onset/peak/beat/BPM/section, độ lớn — Sena không nghe được, phải nói rõ là đo.

## Mix (mô tả triệu chứng, không mô tả filter)

- Thứ tự chain: cắt (rumble/mud) → level (compress) → quan hệ (**carve**) → character/space → limiter/truepeak **cuối** (chừa 2 dB dưới giới hạn cứng).
- Nhạc dưới narration: **carve trên track nhạc** (khoét đúng dải giọng, bám theo lời), không hạ cả track, không EQ thủ công. **Sửa chênh loudness trước** (TTS thường nhỏ hơn nhiều so với nhạc master). Nhạc bị "rỗng/khía" → giảm strength. Gom mọi clip narration thành một **group** rồi carve theo group.
- Preset giọng: `voice-clean` (mặc định sửa VO), `voice-broadcast`, `voice-warm`; `rumble-cut`, `room-gate`, `room-tight`/`room-natural`. Không chồng preset cùng việc.
- Automation: fade nhạc 3 s cuối, dip, swell. Compressor/limiter/gate/bitcrush/pitch **không automate được** → đặt `gain` phía trước.
- Track bị mute **không vào render**. Master bus: `data-fx-chain` trên root + `truepeak`.
- Không có lời giải trung thực cho: de-ess thật, khử noise dưới lời nói, match giọng → cần nguồn tốt hơn; nói rõ với người dùng.
- Kết thúc: render một pass audio-only kiểm từ đầu đến cuối (giọng rõ ở đoạn nhạc to nhất, SFX đúng hành động, nhạc kết có chủ đích). Studio normalize clip về −16 LUFS.

## Captions và transcript

- `$HF transcribe <video|audio> [--language vi] [--model …]` → word-level timestamps (whisper-cpp đã có; Parakeet tùy chọn). Import transcript đã sửa: `$HF transcribe transcript.json --dir <project>` (cũng nhận `.srt/.vtt`); xuất `--to srt|vtt`. `captions` không phải lệnh — transcribe rồi theo skill `references/captions.md`.
- Talking head: **cắt pause trước, caption sau** (ngược lại caption trôi). **Rail** = dòng caption mang lời (mặc định); **embed** = một chữ lớn sau lưng người nói ở cao trào (hiếm: ~1/beat, không bao giờ hai cái cùng lúc). Matte sau lưng chỉ khi một người trong khung.
- Báo agent tên riêng/thuật ngữ transcript dễ sai + vị trí mặt/chữ trên footage. Cảnh sáng (luma >~180) → chữ tối đục. Caption tránh mặt/nút; 2 dòng tối đa, ngắt theo nghĩa, nhấn 2–3 từ khóa. Xem cả có tiếng và tắt tiếng.
- Tiếng Việt: whisper hỗ trợ `--language vi` nhưng độ chính xác dấu/thuật ngữ **chưa kiểm**; luôn soát lại transcript trước khi style.
- Caption components theo tone: [[knowledge/hyperframes/07-catalog-registry]].

## Tách nền (cutout)

- `$HF remove-background subject.mp4 -o subject.webm` (miễn phí, local; `.mov` ProRes 4444 cho NLE, `.png` cho ảnh). Chữ sau lưng người: thêm `--background-output plate.webm` → xếp plate / chữ / cutout. Flag: `--device auto|cpu|coreml|cuda`, `--quality fast|balanced|best` (`best` khi cutout đè lên chính footage gốc).
- Model chỉ cho **người** (`u2net_human_seg`); vật cầm tay tối có thể mất, tóc trên nền rối/chuyển động nhanh dễ lỗi. Đồ vật/động vật → cutout HeyGen (`--type cutout`, trả phí) hoặc Studio app "Cut out object here" (Mac).
- Base video và cutout cùng `data-start` (PiP mount trễ lệch frame). Art phẳng generate → key bằng `ffmpeg colorkey`, không dùng remove-background.

## Màu, grade, effect

- Grade/grain/blur/vignette trên footage **chỉ qua** `$HF media-treatment`, không CSS filter/SVG/`.cube` tự chế. Không đổi file gốc.
  - `media-treatment --capabilities --json`; `--selector '#interview' --analyze --json`; `--selector '#product' --grading '{"preset":"two-ink-print"}' --apply --json`; `--dry-run`, `--clear`.
  - `grade-compare --for frame.png --grades grades.json` (≤16 look, bản gốc đầu tiên) để chọn look.
- `data-color-grading` phải chia section `adjust` / `details` (grain, vignette) / `effects`; object phẳng `{"exposure":0.15}` **không render gì**. Ví dụ: `{"preset":"skin-soft","intensity":0.7,"adjust":{"exposure":0.15},"effects":{"bloom":0.4}}`.
- Thứ tự cố định: `adjust → wheels → curves → hueCurves → secondaries → lut → details → effects`. Sửa (exposure, WB, contrast, sat) trước, style sau. Giữ một màu → `hueCurves`, không desat rồi key lại.
- Giới hạn: cả layer (không mask/tracking — tách layer riêng), chỉ media (không text/HTML), **SDR**, LUT `.cube` Rec.709 (footage LOG phải convert trước). Blur/Bloom/Kuwahara chậm. Bloom đánh lừa đo clipping — xem 1:1.
- Effect có sẵn: Blur, Pixelate, Bloom; Tape Damage, Film Artifacts, Scanlines, CRT, Channel Separation, Glitch; Halftone, Two-Ink Print (đưa mảng hex), Dither; ASCII, Engraving, Crosshatch, Kuwahara. Analogue là 3 lỗi khác nhau: tape (transport), CRT (ống), camcorder (contrast nghiền + màu nhạt, grain, interlace).
- Che mặt: pixelate ~nửa, cố định, vùng rộng; chỉ giữ được nếu người ít di chuyển — chuyển động thật cần matte tracking ngoài.
- Feedback "tối/flat/nhạt/retro/che mặt/reveal ngầu hơn" = media intent → đọc `media-use/references/media-treatments.md` trước khi sửa.
