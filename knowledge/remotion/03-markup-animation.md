# Remotion — Markup & animation

Nguồn: docs `idea`, `composition`, `still`, `folder`, `register-root`, `use-current-frame`, `use-video-config`, `absolute-fill`, `sequence`, `series`, `loop`, `freeze`, `timing`, `track`, `interactive*`, `player/premounting`, `interpolate`, `interpolate-colors`, `spring`, `measure-spring`, `easing`, `animating-properties`, `animation-math`, `random`, `using-randomness`, `flickering`, `troubleshooting/{css-animations,background-image}`, `assets`, `staticfile`, `fonts`, `google-fonts/load-font`, `layout-utils/*`, `animation-utils/*`, `transitions/*`, `shapes`, `paths`, `noise`, `motion-blur/*`, `effects*`, `html-in-canvas`, `light-leaks/*`, `starburst/*`, `rough-notation/api`, `animated-emoji`, `lottie`, `three*`, `skia`, `gif`, `animatedimage`, `canvasimage`, `img`, `solid`, `tailwind`, `delay-render`, `use-delay-render`; skill `packages/skills/skills/remotion-markup/` (SKILL.md + rule files). docs/repo 4.0.545, đọc 2026-11-18. Tất cả **đọc từ docs/repo, chưa chạy thử**.

Ý tưởng gốc: video = hàm `frame → ảnh`. Component đọc `useCurrentFrame()` (từ 0 tới `durationInFrames - 1`) rồi trả JSX; renderer chụp từng frame bằng Chrome headless, **nhiều tab song song, không theo thứ tự**.

## 12 luật cứng

1. **Mọi chuyển động tính từ `useCurrentFrame()`.** Cấm CSS `animation`/`transition`/`@keyframes`, class `animate-*` của Tailwind, `setTimeout`/rAF, `useFrame()` của R3F → render nhấp nháy, sai tiến độ.
2. **Tất định:** cấm `Math.random()`, `Date.now()`, state chứa giá trị ngẫu nhiên. Dùng `random(seed)` (number/string). `random(null)` = ngẫu nhiên thật, chỉ khi cố ý. Ngẫu nhiên thật được phép trong `calculateMetadata()`.
3. **Component thuần:** cùng frame → cùng hình, không phụ thuộc thứ tự frame, không tự chạy khi pause.
4. **Asset trong `public/`** (cạnh `package.json` có `remotion`), gọi `staticFile('x.png')`, không viết chuỗi `"/x.png"`, không tự encode (v4 đã `encodeURIComponent`), không `fs`/file ngoài project.
5. **Media dùng component Remotion** (`<Img>`, `<Video>`/`<Audio>` từ `@remotion/media`, `<AnimatedImage>`, `<Gif>`) để render chờ load. Không `<img>` thường, không CSS `background-image`/`mask-image`.
6. **Async phải chặn render:** `useDelayRender()` (4.0.342, thay global `delayRender`) + `useState(() => delayRender('nhãn'))` → `continueRender(handle)` / `cancelRender(err)`. Clear trong **30 s** không thì timeout. Không gọi ở top-level module (chặn composition khác) hay mỗi lần re-render. Fetch data ưu tiên `calculateMetadata()` → [[knowledge/remotion/06-data-server-cloud-app]].
7. **Font load xong rồi mới render/đo chữ** (`@remotion/google-fonts`, `@remotion/fonts` tự chặn render).
8. **`registerRoot(Root)` ở file riêng** (`src/index.ts`), gọi 1 lần; Root trả Fragment chứa `<Composition>`/`<Still>`/`<Folder>`.
9. **`<Composition>` cần** `id` (chữ, số, `-`), `component` *hoặc* `lazyComponent` (không cả hai), `durationInFrames`, `fps`, `width`, `height`. `defaultProps` JSON-serializable (+ `Date`, `Map`, `Set`, `staticFile()`); kiểu props dùng `type` không `interface`. `<Still>` không cần duration/fps. `<Folder name>` chỉ `a-zA-Z0-9-`, chỉ nhóm sidebar.
10. **Giây → frame bằng `fps` của `useVideoConfig()`** (`from={2 * fps}`), không hardcode.
11. **`interpolate()` mặc định KHÔNG clamp** → thêm `extrapolateLeft/Right: 'clamp'`. `inputRange` tăng dần, dài bằng `outputRange`.
12. **WebGL/WebGPU** (`<ThreeCanvas>`, effects, presentation shader): render cần `Config.setChromiumOpenGlRenderer('angle')`/`--gl=angle` (không GPU: `swangle`); SSR API phải truyền `chromiumOptions: {gl: 'angle'}` → [[knowledge/remotion/05-studio-cli-render]].

## Timing props (đổi lớn ở 4.0.47x–4.0.53x)

Timing props nay có trực tiếp trên `<AbsoluteFill>` (4.0.501), `Interactive.*` (4.0.475), `<Img>`, `<CanvasImage>`, `<AnimatedImage>`, `<Solid>`, `<HtmlInCanvas>`, `<Video>`/`<Audio>`, `<Gif>`, `<Lottie>`, `<ThreeCanvas>`, shapes, rough-notation và component bọc bằng `Interactive.create()` (4.0.536). Docs: *dùng `<Sequence>` trực tiếp "không còn khuyến nghị"* (vẫn chạy, phổ biến trong code cũ).

| Prop | Ý nghĩa / lưu ý |
|---|---|
| `from` | điểm bắt đầu ở cha; con thấy frame 0; lồng nhau cộng dồn |
| `trimBefore` (4.0.482) | cắt đầu; con bắt đầu ở frame `trimBefore` |
| `durationInFrames` | số frame con hiện (mặc định `Infinity`); chiếm `duration/playbackRate` frame ở cha |
| `playbackRate` (4.0.528) | tốc độ, lồng nhau nhân; phải hằng số |
| `loop` (4.0.530) | lặp tới hết cha; cần duration hữu hạn (trừ Video/Audio/Lottie/Gif/AnimatedImage); Img/Solid/shapes không có |
| `freeze` (4.0.476) | đóng băng; thay `<Freeze frame>` |
| `premountFor`/`postmountFor` | mount sớm/giữ mount (frame) cho asset kịp load; chỉ Studio/Player |

Frame con = `trimBefore + (frame - from) * playbackRate` (loop: `% durationInFrames`). Ngoài khoảng hiện → **unmount**.

- `<Sequence>` bọc `<AbsoluteFill>`; `layout="none"` bỏ div (bắt buộc trong `<ThreeCanvas>`, khi đó cấm `style`/`className`). `width`/`height` ghi đè `useVideoConfig()` cho con; `cropLeft/Right/Top/Bottom` (4.0.500, 0–1, animate được).
- `<Series>`/`<Series.Sequence durationInFrames offset>`: cảnh nối tiếp; chỉ cảnh cuối được `Infinity`; `offset` âm = chồng lên cảnh trước.
- `<Track name>` (4.0.534): một hàng timeline Studio, clip **không được chồng** (chồng → lỗi).
- `<Loop durationInFrames times>` lặp theo thời lượng cha; cần kết hợp trim/rate thì dùng prop `loop`.
- Premount mặc định: Studio 2 s (4.0.535), Player 0 (v5: 2 s). Container phải `layout="absolute-fill"` thì premount chạy.
- `useVideoConfig()` trong Sequence trả `durationInFrames`/`width`/`height` cục bộ. Cần frame tuyệt đối: đọc ở cha, truyền prop.
- Animation tính ở cha rồi truyền vào `style` của Sequence giữ đồng hồ cha (không theo `playbackRate`).

## Animation primitives

- `interpolate(input, inRange, outRange, opts)`: `extrapolate*`: `extend`|`clamp`|`wrap`|`identity`; `easing` 1 hàm hoặc mảng `n-1` (4.0.462); output là chuỗi CSS `scale`/`translate`/`rotate`/`transformOrigin` (4.0.472); `output: 'perceptual-scale'` (4.0.490); `posterize: n`; chuỗi rời rạc/boolean với `Easing.step1` (4.0.509/530).
- `spring({frame, fps, config:{damping=10, mass=1, stiffness=100, overshootClamping}, from, to, durationInFrames, delay, reverse})`: 0→1, mặc định nảy; `damping: 200` = không nảy. `measureSpring({fps, config})` → số frame ổn định (damping 200 @30fps = 23).
- `Easing`: `linear, ease, quad, cubic, poly, sin, circle, exp, back, bounce, elastic, bezier, in/out/inOut, step0/1`; `Easing.spring()` (4.0.476) làm easing cho `interpolate` (chuẩn hóa như 30 frame).
- `interpolateColors(input, inRange, colors, {easing, posterize})` → `rgba(...)`.
- Cộng/trừ animation: `scale = enter - exit` (exit = spring có `delay: durationInFrames - 20`).
- `@remotion/animation-utils`: `interpolateStyles()`, `makeTransform([translateY(..)])`.

## Chọn API theo nhu cầu

| Nhu cầu | Dùng | Lưu ý |
|---|---|---|
| Fade/slide/scale | `interpolate()` inline trong `style` | prop `scale`/`translate`/`rotate` thay chuỗi `transform` |
| Cảnh nối tiếp | `<Series>` hoặc `<Track>` + `from` | |
| Chuyển cảnh | `<TransitionSeries>` | mục dưới |
| Flash/vệt sáng ở điểm cắt | `Overlay` + `<Solid effects={[lightLeak({progress})]}>` | không rút ngắn timeline |
| Chữ vừa khung / đo / xuống dòng | `@remotion/layout-utils`: `measureText`, `fitText`, `fitTextOnNLines`, `fillTextBox` | sau khi font load; chỉ browser |
| Highlight/khoanh/gạch chữ | `@remotion/rough-notation` (4.0.490) `<Highlight> <Circle> <Underline> <StrikeThrough> <CrossedOff> <Box> <Bracket>` | `progress` 0–1 |
| Shape | `@remotion/shapes` `<Rect> <Circle> <Star> <Pie> <Arrow> <Callout>…` / `makeX()` | nhận `effects` từ 4.0.474 |
| Vẽ đường, line chart, morph | `@remotion/paths`: `evolvePath(p, d)`, `interpolatePath`, `getLength`, `getPointAtLength` | không có package chart: SVG/HTML + `interpolate`/`spring` |
| Rung, hạt, hữu cơ | `@remotion/noise` `noise2D/3D/4D(seed, …)` → [-1,1] | |
| 3D | `@remotion/three` `<ThreeCanvas width height>` (bắt buộc) / `<ThreeWebGPUCanvas>` | cấm `useFrame()` |
| Skia | `@remotion/skia` `<SkiaCanvas>` | `enableSkia()` webpack override + `LoadSkia()` trước `registerRoot`; version không `^` |
| Lottie | `@remotion/lottie` `<Lottie animationData>` + `lottie-web` | expression có thể không tất định |
| GIF/APNG/WebP động | `<AnimatedImage>` (core; `ImageDecoder` → Chrome/Firefox) hoặc `<Gif>` | remote cần CORS |
| Emoji động | `@remotion/animated-emoji` | tự copy asset từ repo `remotion-dev/animated-emoji` vào `public/`; CC BY 4.0 |
| Motion blur | `<HtmlInCanvasMotionBlur width height shutterAngle samples>` / `motionBlur` trên Transition | `<CameraMotionBlur>`, `<Trail>` không còn khuyến nghị |
| Blur, glow, grade, halftone… | `@remotion/effects` qua `effects=[…]` | mục Effects |
| Ảnh tĩnh | `<Img>` (retry 2 lần) | có `effects` → thành `<canvas>` |
| Tailwind | `@remotion/tailwind-v4` + `enableTailwind()` | không dùng class animate |

## Transitions (`@remotion/transitions`, Remotion License)

- `<TransitionSeries.Sequence durationInFrames>` xen `<TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})}/>` hoặc `<TransitionSeries.Overlay durationInFrames offset?>` (4.0.415).
- **Transition rút ngắn tổng** (60+60−15 = 105); Overlay không. `springTiming` không duration → phụ thuộc fps, lấy bằng `timing.getDurationInFrames({fps})`.
- Luật: transition không dài hơn cảnh kề; không được kề nhau: 2 transition, 2 overlay, transition+overlay; cần ≥1 sequence trước hoặc sau. Đặt đầu/cuối = hiệu ứng vào/ra.
- Presentation DOM: `fade, slide({direction}), wipe, flip, clockWipe, iris, cube, pushCut, none`. **HTML-in-canvas** (preview cần Chrome ≥149 bật `chrome://flags/#canvas-draw-element`; render dùng Chrome Remotion build sẵn): `blurSlide, bookFlip, crossZoom, crosswarp, dissolve, dreamyZoom, filmBurn, linearBlur, ripple, swap, zoomBlur, zoomInOut`.
- `motionBlur={{shutterAngle: 180, samples: 16}}` cho mọi presentation built-in (khi đó cấm `enterStyle/exitStyle/...`).

## Effects (`@remotion/effects`, 4.0.464, Remotion License)

- Chỉ nhận `effects`: `<Img>`, `<CanvasImage>`, `<AnimatedImage>`, `<Solid>`, `<HtmlInCanvas>`, `<Video>`, `<Gif>`, `<RemotionRiveCanvas>`, shapes. Div/`AbsoluteFill`/`Sequence` không → bọc `<HtmlInCanvas>`.
- Import `@remotion/effects/<slug>`; áp theo thứ tự mảng; đa số WebGL2 (`cylinder/sphere/pageTurn` WebGPU). Effect **không tự animate** → tham số từ `interpolate(frame…)`. Tự viết: `createEffect()`.
- **Deprecated, bỏ ở v5:** `<LightLeak>` (`@remotion/light-leaks`) → `lightLeak()`; `<Starburst>` → `starburst()`.

## Fonts

- Google: `loadFont('normal', {weights: ['400'], subsets: ['latin']})` từ `@remotion/google-fonts/<Font>`, gọi top-level, trả `{fontFamily, waitUntilDone}`. Không tham số = tải hết (dễ timeout); **v5 throw**.
- Local: `@remotion/fonts` `loadFont({family, url: staticFile('x.woff2'), weight})`; URL từ props → `useEffect` + `useDelayRender`.
- Đo chữ: chờ `waitUntilDone()`, khớp mọi thuộc tính font giữa đo và render; `fitText` trừ border (`box-sizing: border-box`).

## Best practice của skill `remotion-markup`

- `useCurrentFrame()` ở **component nhỏ nhất** cần nó.
- `interpolate()` **inline trong `style`**, keyframe hardcode, `scale/translate/rotate` thay `transform` → Studio sửa được keyframe. Scale thêm `output: 'perceptual-scale'`; easing gợi ý `Easing.bezier(0.16, 1, 0.3, 1)` / `Easing.spring({damping: 200})`.
- `defaultProps` object literal inline trên `<Composition>`, mỗi composition một node JSX.
- Đa cảnh: mỗi cảnh một component; cảnh độc lập → `Track`; cảnh liền nhau → `TransitionSeries`.
- Có effect built-in khớp → dùng thay CSS; blur chuyển cảnh → `motionBlur` trên Transition (rẻ hơn).
- Cài bằng `npx remotion add <pkg>` cho khớp version. Không ghi đè sửa đổi bất ngờ của user.

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Sửa |
|---|---|---|
| Studio đẹp, render nhấp nháy | CSS animation, timer, `Math.random` | `useCurrentFrame()` + `random(seed)`; tạm `--concurrency=1` (chậm, chặn Lambda) |
| Frame trống ảnh | `<img>`/`background-image` | `<Img>` |
| Giá trị vượt đích | quên `clamp` | `extrapolate*: 'clamp'` |
| `delayRender() … not cleared after 28000ms` | quên `continueRender`; `<Img onError>` không unmount | `useState(() => delayRender())`, `cancelRender`, label |
| Tổng thời lượng lệch | quên trừ transition | cộng cảnh − `getDurationInFrames` |
| Lỗi div trong `<ThreeCanvas>` | Sequence tạo div | `layout="none"` |
| Three/effect đen khi SSR | thiếu `gl: 'angle'` | `chromiumOptions` |
| Motion blur không ăn | `useCurrentFrame()` ngoài `<CameraMotionBlur>`/`<Trail>` | tách component con |

## Mâu thuẫn / chưa chắc

- Skill: "Add images using `<CanvasImage>`"; docs: dùng `<Img>` cho ảnh thường, CanvasImage chỉ khi cần effect và **đòi CORS** → mặc định `<Img>`.
- Skill `google-fonts.md` có ví dụ `loadFont()` không tham số — trái cảnh báo docs (v5 throw).
- Skill `lottie.md` dùng global `delayRender`; docs khuyên `useDelayRender()`.
- Chrome flag cho presentation HTML-in-canvas/effect preview chưa kiểm trên máy Sena.
