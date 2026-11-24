# Remotion — Media, âm thanh & captions

Nguồn: docs `video-and-audio`, `videos/*`, `video-tags`, `media/*`, `audio/*`, `timing`, `transparent-videos`, `offthreadvideo`, `html5-*`, `loop`, `hls`, `cors-issues`, `non-seekable-media`, `media-playback-error`, `media-utils` + trang API từng hàm, `sfx`, `captions/*`, `install-whisper-cpp/*`, `whisper-webgpu/*`, `whisper-web`, `openai-whisper/*`, `elevenlabs/*`, `video-matting`, `mediabunny/*`, `media-parser`, `webcodecs`; repo `docs/captions/caption.mdx`, `docs/preload/*.mdx`; skill `remotion-captions/*`, `remotion-multimedia/*`, `remotion-markup/{audio,embedding-videos,audio-visualization,sfx,video-matting,silence-detection,video-editing}`. Docs/repo 4.0.545, đọc 2026-11-18. **Chỉ đọc, chưa chạy thử.**

## 10 luật cứng

1. Code mới dùng `<Video>`/`<Audio>` **từ `@remotion/media`** (`npx remotion add @remotion/media`). `<Video>`/`<Audio>` cũ của `remotion` đã đổi tên thành `<Html5Video>`/`<Html5Audio>`, nên kiểm tra import.
2. File trong `public/` → `staticFile('x.mp4')`; URL remote truyền thẳng (bọc `staticFile()` sẽ lỗi). Path trần `"/x.mp4"` → 404.
3. Remote URL dùng với `@remotion/media`, Mediabunny, `getAudioData`/`useWindowedAudioData` **phải có CORS**. Thiếu CORS → render SSR thì fallback sang `<OffthreadVideo>`/`<Html5Audio>`, client-side render thì **fail**.
4. Timing (`from`, `trimBefore`, `durationInFrames`) tính bằng **frame**: viết `2 * fps`, lấy `fps` từ `useVideoConfig()`.
5. `trimAfter` **deprecated** → dùng `durationInFrames` (số frame nguồn tính từ `trimBefore`). `startFrom`/`endAt` deprecated từ 4.0.319, không dùng chung với prop mới.
6. Clip chiếm `durationInFrames / playbackRate` frame trên timeline cha. Thứ tự áp dụng: `from` → `trimBefore` → `durationInFrames` → `playbackRate` → `loop`.
7. `volume` động: viết `interpolate()` **inline** trong prop, kèm clamp hai đầu (có vậy Studio mới vẽ và sửa được volume curve). Callback `(f)=>number` vẫn chạy nhưng không còn được khuyến nghị.
8. `playbackRate`, `toneFrequency`, `preservePitch` phải **hằng số** cho mỗi asset; không phát ngược được. Muốn tốc độ khác nhau theo đoạn thì tách đoạn (`videos/different-segments-at-different-speeds`).
9. Caption luôn là JSON `Caption[]`; `text` nhạy khoảng trắng: **đặt dấu cách ở đầu mỗi từ**, container hiển thị dùng `white-space: pre`.
10. Video, caption và overlay của cùng một shot → đặt chung một `<Sequence>`/`TransitionSeries.Sequence`, rồi đặt `trimBefore`/`durationInFrames`/`playbackRate` trên **parent đó**. Caption anh em không thừa hưởng prop đặt trên `<Video>`.

## Chọn component media

| | `<Video>`/`<Audio>` (`@remotion/media`) | `<OffthreadVideo>` | `<Html5Video>`/`<Html5Audio>` |
|---|---|---|---|
| Nền | Mediabunny + WebCodecs → `<canvas>` | Rust + FFmpeg → `<Img>` | thẻ HTML5 |
| Frame-perfect / tốc độ render | ✅ / nhanh nhất | ✅ / nhanh | ❌ / trung bình |
| Cần CORS | **có** | không | không |
| `loop` | ✅ | ❌ | ✅ |
| Pitch khi đổi `playbackRate` | **đổi theo tốc độ**; `preservePitch` (4.0.538) | giữ | giữ |
| `toneFrequency` | preview (4.0.520), SSR, CSR (4.0.523) | chỉ SSR | chỉ SSR |
| Codec | AAC, FLAC, H.264, MP3, Opus, VP8, VP9, Vorbis | thêm AC3, AV1, H.265, PCM | như cột 1 |
| Container thêm | m3u8, mov | avi, caf, flv | — |
| ProRes / HLS | `@mediabunny/prores` 4.0.487 / ✅ 4.0.454 | chỉ render / chỉ preview | ❌ / chỉ preview |
| Client-side render | ✅ | ❌ | ❌ |

Chỉ tự chọn tag cũ khi cần đúng hành vi của nó (host không có CORS, H.265 khi render); muốn đổi tag giữa preview và render thì kiểm tra `useRemotionEnvironment().isRendering`. Cả ba tag đều thuộc Remotion License ([[knowledge/remotion/01-setup-license-phien-ban]]).

**Fallback tự động**: xảy ra khi lỗi CORS, container/codec không decode được (vd **H.265 khi render**: Chrome Headless Shell không có HEVC), hoặc video alpha mà headless không có WebGL (mặc định tắt). `<Video>` fallback sang `<Html5Video>` lúc preview và `<OffthreadVideo>` lúc render; `<Audio>` sang `<Html5Audio>`. Log: `Cannot decode …, falling back to <OffthreadVideo>`. Chặn bằng `disallowFallbackToOffthreadVideo`/`disallowFallbackToHtml5Audio`, khi đó render bị cancel. `onError` (4.0.404) trả về `'fallback'|'fail'`. Prop cho tag fallback: `fallbackOffthreadVideoProps`/`fallbackHtml5AudioProps`. Dùng `loop` mà rơi vào fallback khi render thì phải đọc được duration, không thì fail.

## Prop đáng nhớ của `<Video>`/`<Audio>`

- Đặt `from`/`durationInFrames` (4.0.446) thẳng trên tag; vẫn có thể bọc thêm `<Sequence>` (timing cascade).
- `premountFor`/`postmountFor` (4.0.495): mount sớm cho kịp buffer. Studio tự premount video 2 s; Player cần `defaultPremountInSeconds`.
- `objectFit` (4.0.442). CSS `object-fit` **vô tác dụng** vì đây là canvas. `cropLeft/Right/Top/Bottom` (4.0.500), `effects` (4.0.464).
- `muted` (đổi được theo frame); không `loop` thì hết video giữ frame cuối; `audioStreamIndex`; `requestInit` (thay `credentials` đã deprecated); `headless`.
- `.mkv/.webm`: muốn lấy audio ở giữa file phải decode từ đầu → render phân tán (Lambda) nên dùng `.mp4/.mov/.m4a`.

## Âm thanh

- Nhiều `<Audio>` thì tự mix chồng lên nhau. `<Video>` có sẵn tiếng của nó; muốn chỉ nghe nhạc nền thì thêm `muted` cho `<Video>`.
- Volume 0–1 (mặc định 1). Fade in: `interpolate(frame,[0,fps],[0,1],clamp)`, fade out dùng `[1,0]`. Tắt một đoạn: `muted={frame>=2*fps && frame<4*fps}`.
- Volume >1: chỉ `OffthreadVideo`/`Html5*` qua `useWebAudioApi` (cần CORS). Docs `@remotion/media` không đề cập, nên giữ ≤1.
- Với `@remotion/media`, `playbackRate={2}` **làm pitch lên gấp đôi** nếu không có `preservePitch`. Nếu đã bù pitch bằng `toneFrequency` thì bỏ phần bù khi bật `preservePitch`.
- Xuất chỉ audio: `npx remotion render … out/a.mp3` hoặc `--codec=mp3|aac|wav`; trên Lambda/Vercel thêm `imageFormat:'none'`. Bỏ audio: `--muted`.
- Đặt duration composition theo file media: `calculateMetadata` + Mediabunny `computeDuration()` → `Math.ceil(sec*fps)` (nhớ trừ phần overlap của transition).

## Asset, CORS, preload, alpha

- Lỗi CORS: đọc kỹ **nửa sau** thông báo lỗi của Chrome; thường cần `Access-Control-Allow-Origin: *`, với preflight phải trả header cả cho `OPTIONS`.
- Non-seekable: server thiếu `Content-Range`/`Content-Length`, mp4 không faststart, hoặc header chặn (`X-Frame-Options`, `Cross-Origin-Resource-Policy`). Xử lý: dùng `@remotion/media`, đổi host hỗ trợ Range, hoặc tải về `public/`.
- `@remotion/preload` **chỉ tác động thẻ HTML5** (không tác động `@remotion/media`) và docs không khuyến nghị dùng → dùng premount.
- Nhúng video alpha: `<Video>` hỗ trợ sẵn (cần WebGL, thiếu thì fallback sang `OffthreadVideo transparent`). Video nền đen: `mixBlendMode:'screen'`. ProRes `.mov` alpha: gọi `registerProresDecoder()` trước `registerRoot`.
- Render ra video trong suốt: `--image-format=png --pixel-format=yuva420p --codec=vp8` hoặc ProRes 4444 `yuva444p10le` → [[knowledge/remotion/05-studio-cli-render]].

## Metadata & convert

- `@remotion/media-parser` và `@remotion/webcodecs` **deprecated** (webcodecs ngừng publish ở 5.0) → dùng **Mediabunny** (`npm i --save-exact mediabunny`, version khớp Remotion; `npx remotion upgrade` nâng cả hai; license MPL 2.0).
- `getVideoMetadata()` và `getAudioDurationInSeconds()` (`@remotion/media-utils`) **deprecated**: lỗi với H.265 trên Linux, duration có thể ra `Infinity`. Thay bằng:
```ts
import {Input, ALL_FORMATS, UrlSource} from 'mediabunny';
const input = new Input({formats: ALL_FORMATS, source: new UrlSource(src)});
const sec = await input.computeDuration();
const v = await input.getPrimaryVideoTrack(); // null nếu là audio
const w = v && (await v.getDisplayWidth()), h = v && (await v.getDisplayHeight());
```
- Node/Bun: `FilePathSource(path)` + `input.dispose()`; `File`: `BlobSource`. fps: `computeFrameRateMetrics().bestGuessFrameRate`.
- Cắt khoảng lặng: `npx remotion ffmpeg` với `loudnorm` lấy `input_thresh`, rồi `silencedetect=noise=<thresh>dB:d=0.5`.

## Visualization (`@remotion/media-utils`, MIT)

- `useAudioData` tải cả file vào RAM. File dài thì dùng `useWindowedAudioData({src, frame, fps, windowInSeconds})` (đọc bằng Range request; không đổi được `windowInSeconds` sau lần render đầu) và truyền `dataOffsetInSeconds` vào `visualizeAudio`.
- `visualizeAudio`: `numberOfSamples` phải là **lũy thừa của 2**, trả về giá trị 0–1 (đầu trái là bass); `optimizeFor:'speed'` cho Lambda. Waveform giọng nói: `visualizeAudioWaveform` + `createSmoothSvgPath`.
- `frame` là vị trí **trong track audio**: audio bị dời/trim thì trừ offset. Truyền `frame` từ parent xuống con.
- `getAudioData` cache theo `src`+`sampleRate` (mặc định 48000) tới khi reload; file không có audio thì throw.

## SFX (`@remotion/sfx`, 4.0.429)

Dạng `https://remotion.media/<tên>.wav` (whoosh, whip, page-turn, mouse-click, ding, vine-boom…), peak −3 dB, không cần attribution. Gom sticker và âm đi kèm vào một group; đừng cắt đuôi âm cho vừa, đuôi chồng clip sau thì tách track.

## Captions: audio → `Caption[]` → hiển thị

`Caption = {text, startMs, endMs, timestampMs: number|null, confidence: number|null, pageBreakAfter?}` (`@remotion/captions` 4.0.216, MIT; `pageBreakAfter` từ 4.0.517).

**1. Transcribe**

| Package | Chạy ở | Chi phí | Hàm convert |
|---|---|---|---|
| `@remotion/whisper-webgpu` (4.0.518; Node 4.0.528) | browser/Node, cần GPU | free, offline | `toCaptions({whisperWebGpuOutput})` |
| `@remotion/install-whisper-cpp` | Node | free, offline | `toCaptions({whisperCppOutput})` |
| `@remotion/openai-whisper` | API OpenAI | **trả tiền**, API key | `openAiWhisperApiToCaptions({transcription})` |
| `@remotion/elevenlabs` (4.0.443) | API ElevenLabs | **trả tiền**, API key | `elevenLabsTranscriptToCaptions({transcript})` |
| ~~`@remotion/whisper-web`~~ | WASM + COOP/COEP | — | deprecated, ngừng ở 5.0 |

- Skill mặc định dùng **whisper-webgpu**: script Node → Mediabunny decode ra mono 16 kHz → `canUseWhisperWebGpu()` → `downloadWhisperModel` → `loadWhisperModel` → `transcribe({channelWaveform, model, language})` → `toCaptions` → ghi `captions.json`. ONNX Runtime **không chạy trên Linux arm64**. Trong browser: `resampleTo16Khz({file})`.
- whisper.cpp: `installWhisperCpp({to, version:'1.5.5'})` (≥1.7.3 cần `cmake`), input phải là **WAV 16-bit 16 kHz**, bật `tokenLevelTimestamps: true`.
- OpenAI: `verbose_json` + `timestamp_granularities:['word']`. ElevenLabs: `timestamps_granularity:'word'`. Không gọi API từ browser vì lộ key.

**Tiếng Việt**: model `*.en` chỉ nhận tiếng Anh, phải dùng model multilingual (`small`, `medium`, `large-v3-turbo`). whisper-webgpu **không tự nhận ngôn ngữ**, nên phải truyền `language` (docs ghi "name or code"; `'vi'` chưa thử). Danh sách ngôn ngữ của whisper.cpp có `vi`. `translate` chỉ dịch **sang tiếng Anh**. Docs không nói gì về chất lượng tiếng Việt, cần soát lại.

**2. Đã có sẵn phụ đề**: `parseSrt({input})`, `parseVtt({input})` (4.0.537); fetch file bằng `useDelayRender()`.

**3. Hiển thị**
- Theo skill: dùng element **Basic Captions** (`basic-captions.element.tsx`) và viết mảng caption **inline** vào `captions={[...]}`; Caption editor của Studio ghi ngược vào literal đó.
- Mỗi file nguồn transcribe riêng; timestamp tính **từ đầu file nguồn**, không cộng offset composition.
- Tự dựng: `createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds:1200})` → `pages[{text,startMs,durationMs,tokens[{text,fromMs,toMs}]}]`; mỗi page một `<Sequence from={startMs/1000*fps}>`, highlight token đang nói.
- `.srt`: `serializeSrt({lines: Caption[][]})` + `<Artifact filename="subtitles.srt">` chỉ khi `frame===0`.

## Video matting (`@remotion/video-matting`, 4.0.523)

Tách base + foreground WebM alpha **một lần** (cần GPU), không chạy model lúc render. Model `modnet` cho người, `ben2-base` experimental. Lệnh **Remove background** trong Studio thay source, nên duplicate layer trước. Thứ tự layer: base → chữ → foreground; giữ trim/rate khớp nhau; mute foreground.

## Pitfall âm thanh / sync

- Caption lệch sau khi đổi speed/trim → luật 10; giọng "chipmunk" → `preservePitch`; không thấy volume curve → luật 7.
- Bọc thêm `<Sequence>` làm gốc của `useCurrentFrame()` đổi → fade/visualizer lệch theo.
- H.265, `.avi`, `.flv` khi render → rơi vào fallback hoặc chậm → transcode sang H.264 MP4.
- Cutaway che video đang nói: đừng xóa video gốc, sẽ mất luôn giọng nói.
- Xem thêm: [[knowledge/remotion/03-markup-animation]] (timing), [[knowledge/remotion/06-data-server-cloud-app]] (calculateMetadata), [[knowledge/remotion/08-loi-thuong-gap]].

## Mâu thuẫn trong nguồn

- Skill ghi pitch "chỉ khi render" ↔ docs `audio/pitch`: `@remotion/media` có pitch cả khi preview từ 4.0.520.
- `audio/visualization` ghi `useWindowedAudioData` "chỉ .wav" ↔ trang API: mọi format từ 4.0.383.
- `captions/transcribing` ghi whisper-webgpu "chỉ browser" ↔ trang package: chạy cả Node.
- `mediabunny/metadata` gợi ý `getVideoMetadata()` (đã deprecated) khi gặp lỗi CORS.
