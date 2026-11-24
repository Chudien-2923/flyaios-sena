# Remotion — Data, render server/cloud, nhúng vào app

Nguồn: docs `passing-props`, `parameterized-rendering`, `props-resolution`, `schemas`, `zod-types`, `default-props-inference`, `calculate-metadata`, `dynamic-metadata`, `get-input-props`, `dataset-render`, `ssr`, `ssr-node`, `compare-ssr`, `renderer`, `bun`, `bundlers`, `brownfield`, `miscellaneous/nextjs`, `lambda/*` (setup, limits, concurrency, disk-size, cost-example, data-transfer-cost, region-selection, faq, checklist, rendermediaonlambda, deploysite, webhooks), `cloudrun/*`, `vercel*`, `player/*`, `client-side-rendering/*`, `web-renderer/*`, `editor-starter/*`, `buy-a-video-editor`, `timeline`, `recorder/*`, `sdk`, `browser-bundler`, `ai/{generate,dynamic-compilation}`, `license/{pricing,faq}`; repo `packages/skills/skills/remotion-saas/*`, `packages/template-render-server/`, `packages/lambda-client/src/constants.ts`. docs/repo 4.0.545, đọc 2026-11-18. **Chỉ đọc, chưa chạy thử.**

Liên quan: license [[knowledge/remotion/01-setup-license-phien-ban]], render CLI [[knowledge/remotion/05-studio-cli-render]], media [[knowledge/remotion/04-media-am-thanh-captions]].

## Muốn làm X → dùng gì

| Muốn | Dùng | Tài khoản / tiền |
|---|---|---|
| Nội dung video theo data | `defaultProps` + input props (`--props`, `inputProps`) | — |
| Validate props, control đặc biệt | `schema` zod + `@remotion/zod-types` | — |
| Duration/size/fps theo data/media, fetch trước render | `calculateMetadata()` | — |
| N video từ JSON trên máy | `bundle()` 1 lần → loop `selectComposition()` + `renderMedia()` tuần tự | — |
| Backend tự host | `@remotion/renderer` (Node/Bun), template Render Server | server riêng |
| Cloud nhanh nhất, scale lớn | `@remotion/lambda` | ⚠️ **AWS, tốn tiền** |
| Cloud dễ nhất, đã dùng Vercel | `@remotion/vercel` (Sandbox + Blob) | ⚠️ **Vercel, theo usage** |
| GCP | `@remotion/cloudrun` — Alpha, ngừng phát triển | ⚠️ **GCP + billing** |
| Render trong browser người dùng | `@remotion/web-renderer` | không cloud; telemetry bắt buộc |
| Preview tương tác trong app React | `@remotion/player` | công ty ≥4 người: license Automators |
| Video editor có timeline | Editor Starter / Timeline / tự build | ⚠️ **sản phẩm trả tiền** |
| LLM sinh code rồi preview | `ai/generate` + `ai/dynamic-compilation` hoặc `@remotion/browser-bundler` (draft) | tiền API LLM |

## 12 luật cứng

1. Composition nhận props **bắt buộc** có `defaultProps`. Input props là **object JSON-serializable**. Resolve: `defaultProps` → merge **nông** với input (input thắng; key top-level thay cả object lồng) → `calculateMetadata()` → component.
2. SSR: truyền **cùng** `inputProps` cho cả `selectComposition()` và `renderMedia()`.
3. Schema: top-level phải `z.object()`. Từ **v4.0.544** CLI/SSR/Lambda validate props đã merge trước `calculateMetadata`: 4.x chỉ **warning rồi vẫn render**, **5.0 fail render**. `@remotion/zod-types` dùng Zod v4 từ 4.0.426 (giữ Zod 3 → `@remotion/zod-types-v3`). Cài: `npx remotion add zod`.
4. Không schema → từ **v4.0.516** Studio tự suy control từ `defaultProps` (giữ **object literal inline**). Cần schema khi: validate runtime, enum/union/optional/nullable, min/max/step, `zTextarea`/`zMatrix`.
5. `calculateMetadata()` chạy **1 lần**/render (trong `selectComposition`), phải xong trong timeout delayRender (30 s). Trả `props` (cùng shape), `durationInFrames`, `width`, `height`, `fps`, `defaultCodec`, `defaultOutName`, `defaultPixelFormat`… JSON-serializable (trừ `Date`/`Map`/`Set`/`staticFile`). Arg có `abortSignal`, `isRendering` (4.0.342). **Không chạy trong Player.**
6. `--width`/`forceWidth` đè `calculateMetadata`; `--scale` áp cuối. `defaultCodec` > config file < option truyền vào `renderMedia()`.
7. **Không** fetch bằng `useEffect`+`delayRender`+`getInputProps()` ở root (kiểu trước v4): chạy lại ở mọi worker → spam API. `getInputProps()` trả `{}` trong Player/web-renderer.
8. Batch: bundle 1 lần, render **tuần tự** (mỗi render đã dùng hết máy).
9. `remotion.config.ts` **không có tác dụng** với API `@remotion/renderer`.
10. Next.js: không chạy `@remotion/bundler` trong API route; docs khuyên Lambda/Vercel Sandbox.
11. Lambda function **gắn version Remotion** (upgrade → deploy function mới); đổi code → deploy lại site (giữ `siteName`). Function + bucket **cùng region**. Serve URL **công khai** → không nhét secret vào bundle, dùng `inputProps`/`envVariables`.
12. Render tự động của công ty: truyền `licenseKey` (`rm_sec_…` server/Lambda, `rm_pub_…` web-renderer, `"free-license"`, hoặc `null` — không chuỗi rỗng) + `isProduction: false` cho test (4.0.409).

## SSR Node/Bun (`@remotion/renderer`)

- `bundle()` → `selectComposition()`/`getCompositions()` → `renderMedia()` | `renderStill()` | `renderFrames()`+`stitchFramesToVideo()` (ưu tiên `renderMedia`). Phụ: `openBrowser()` (chia sẻ browser), `makeCancelSignal()`, `getVideoMetadata()`, `extractAudio()`, `ensureFfmpeg()`.
- Linux cần lib cho Chrome Headless Shell. `SIGTERM/SIGHUP`: từ 4.0.544 Remotion tự exit trừ khi bạn có listener riêng.
- Bun: CLI dùng `remotionb`; `lazyComponent` bị tắt, script có thể không tự thoát.
- Rspack: experimental từ 4.0.426, bật `Config.setRspack(true)`/`--rspack`/`bundle({rspack:true})` (Node ≥20.19/≥22.12); sẽ thay Webpack ở major sau.
- **Render Server** (`npx create-video@latest --render-server`): Express `POST /renders`, `GET/DELETE /renders/:id`, có Dockerfile. Code: job trong `Map` in-memory + queue tuần tự → restart mất trạng thái.
- Tự host phải tự lo queue, spike, progress, logging, provision; compute rẻ nhất nhưng trả cả lúc idle. GitHub Actions/Azure/Cloudflare Containers (PoC): chỉ khi được hỏi.

## Lambda — ⚠️ AWS account + tiền AWS

- Tự host trong AWS của bạn (Remotion không bán render hosted). Render chia chunk song song nhiều Lambda → ghép → S3.
- Setup: `npx remotion add @remotion/lambda` → policy tên **đúng** `remotion-lambda-policy` (`npx remotion lambda policies role`) → role **đúng** `remotion-lambda-role` → IAM user + access key vào `.env` (`REMOTION_AWS_ACCESS_KEY_ID`, `REMOTION_AWS_SECRET_ACCESS_KEY`; **không dán secret vào chat**) → inline policy (`policies user`) → `policies validate` → `functions deploy` → `sites create` → `quotas`.
- Region mặc định `us-east-1`; CLI: `REMOTION_AWS_REGION`/`--region`; **Node API phải truyền `region`**.
- Giới hạn: timeout ≤15 phút (mặc định **120 s**), RAM ≤10 GB (mặc định 2048), disk mặc định 2048 MB (<5.0) / 10240 (≥5.0) → ≈32 phút vs 2h40 video 1080p; nên đặt 10240 (+<1% giá). Concurrency AWS 1000/region (account mới thấp hơn → xin tăng). ≤**200** function/render, `framesPerLambda` ≥5 (lỗi "Too many functions" → `null`). Không AV1, không GPU.
- `renderMediaOnLambda()` (import `@remotion/lambda/client`): `privacy` mặc định **`public`** (`private` + `presignUrl()`), `webhook` (có secret mới verify được chữ ký HMAC-SHA512), `deleteAfter` (`1-day`…`30-days`, cần lifecycle), `concurrency`, `envVariables`, `downloadBehavior`. Progress: `getRenderProgress()` (`costs` ước tính, không gồm S3). `deploySite()` **deprecated** → `bundle()`+`deploySiteFromBundle()`.
- **Chi phí** (đo 4.0.381, us-east-1): HelloWorld ≈$0.001; 1 phút có video ≈$0.02; 10 phút HD ≈$0.10. Cộng thêm: **S3 egress** (asset qua HTTP tính egress kể cả cùng region → R2 + cache hoặc `@remotion/media`), S3 storage, CloudWatch (giữ 14 ngày), region đắt (`af-south-1`, `ap-east-1`), + Company License nếu team ≥4.
- Production: hạ RAM (−25% RAM = −25% tiền), chặn video quá dài, quyền tối thiểu, **rate limit** (user có thể đốt bill), dọn render.

## Vercel, Cloud Run

- **Vercel Sandbox** (`@remotion/vercel`): `createSandbox()` → `addBundleToSandbox()` → `renderMediaOnVercel()` → `uploadToVercelBlob()`; `detached: true` + `getRenderProgress()` cho render >800 s. Template `--template vercel`, cần Vercel account + Blob. 1 VM/render, không phân tán, cold start vài giây. Sandbox 45 phút/10 đồng thời (Hobby), 5 giờ/2000 (Pro). ⚠️ Template **không rate limit**; bật Spend Management; snapshot/video trong Blob **lưu vĩnh viễn** đến khi xóa.
- Deploy Studio: build `bunx remotion bundle`, output `build`; URL dùng làm serve URL.
- **Cloud Run**: Alpha, **không phát triển tích cực**, thiếu webhooks/distributed/ước giá. Không dùng cho dự án mới.
- compare-ssr: Lambda cho đa số; Vercel nếu đã ở Vercel; server riêng khi volume rất lớn.

## Player (`@remotion/player`)

- `<Player component durationInFrames fps compositionWidth compositionHeight inputProps controls/>` — **không** bọc `<Composition>`; `lazyComponent` bọc `useCallback`; `schema` chỉ suy type, không validate. Metadata động: tự gọi lại `calculateMetadata`.
- **Memo `inputProps`**; state cập nhật liên tục để ở component anh em, điều khiển qua `ref` (`play(e)`, `pause()`, `seekTo()`, `addEventListener('timeupdate'|'frameupdate'|'ended'|'waiting'|'resume'|'error'…)`).
- Autoplay: có tiếng thì tránh `autoPlay`; `play()` từ user gesture, **truyền event** (Safari: `onClickCapture`). Nhiều `<Html5Audio>` → `numberOfSharedAudioTags` (mặc định 5).
- Buffer (4.0.111): `@remotion/media` bật sẵn; tag cũ dùng `pauseWhenBuffering`, `<Img pauseWhenLoading>`; tự làm `useBufferState().delayPlayback()` + `unblock()` trong cleanup `useEffect`.
- Preview không tính render, nhưng license FAQ xếp tổ chức nhúng Player vào **Remotion for Automators** ($0.01/render, tối thiểu $100/tháng) nếu không Free License.

## Client-side rendering (`@remotion/web-renderer`)

- **Stable từ v4.0.491**. `renderMediaOnWeb()`, `renderStillOnWeb()`, `canRenderMediaOnWeb()`; không cần bundle; WebCodecs, mặc định `mp4`. Chrome 94+, Firefox 130+, Safari 26+. Một hàng đợi, không đa luồng; tab nền chậm.
- Style **giả lập lên canvas**: CSS không liệt kê = không hỗ trợ (`backdrop-filter`, `perspective`, `writing-mode`; filter không chạy Safari; z-index một phần). Không `<OffthreadVideo>/<Html5Video>/<Html5Audio>` → `<Video>/<Audio>` của `@remotion/media`. Font qua `FontFace` API không hỗ trợ.

## Editor, Timeline, Recorder, SDK, AI

- **Editor Starter**: ⚠️ **$600** một lần (Enterprise đã gồm); React 19 + TS + Tailwind v4, render Lambda/client-side; vẫn cần Company License nếu ≥4 người.
- **Timeline**: component ⚠️ **trả phí** (giá ở Store, docs không ghi); có `CanvasComposition` cho Player.
- **Recorder** (`--recorder`): quay facecam + màn hình cho creator; cùng license, Company License đã gồm.
- **SDK**: đang phát triển, API chưa sẵn, waitlist.
- **browser-bundler** (4.0.527): **Draft API**, chỉ test Chrome; cần COOP `same-origin` + COEP `require-corp`, WASM lớn, cùng version Remotion/React với host.
- **ai/generate**: Vercel AI SDK + structured output + `remotion.dev/system-prompt.txt`; phải sanitize code fence. **dynamic-compilation**: `@babel/standalone` → `new Function(...)`, mọi API phải inject tường minh. [INFERENCE] đây là chạy code tùy ý — docs không cảnh báo bảo mật.
- **Brownfield**: `npm i --save-exact remotion@<version> @remotion/cli@<version>` (version đang dùng của project; plugin hiện 4.0.546), thư mục `remotion/` có `Root.tsx` + `index.ts` (`registerRoot`); coi chừng alias `paths` trỏ nhầm `remotion`.

## Lỗi hay gặp

| Triệu chứng | Sửa |
|---|---|
| Duration/size sai khi SSR | Truyền `inputProps` cho `selectComposition()` |
| Object lồng mất field | Merge nông → truyền đủ object con |
| API bị gọi lặp khi render | Chuyển fetch sang `calculateMetadata` |
| Lambda render bản cũ | Deploy lại site / function lệch version |
| `TooManyRequestsException` | Hết concurrency AWS → xin quota |
| Video Lambda ai cũng xem | `privacy` mặc định `public` |
| Bill AWS cao | S3 egress, thiếu rate limit, không `deleteAfter` |
| Render browser khác server | CSS/tag không hỗ trợ trong web-renderer |

## Mâu thuẫn / chưa chắc

- Task gọi web-renderer "experimental": docs ghi **stable từ 4.0.491**; draft thật là browser-bundler, SDK.
- Disk Lambda mặc định 2048 MB (<5.0) nhưng cost-example dùng 10240 đặt tay; giá đo ở 4.0.381.
- Giá Timeline không có trong docs local; license Player suy từ FAQ.
