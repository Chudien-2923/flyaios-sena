---
title: Remotion — bộ Instruction tra cứu của Sena
description: Cách Sena dùng Remotion (React → video) để dựng video: setup/license, quy trình, markup/animation, media/âm thanh/captions, Studio/CLI/render, data/server/cloud/app, 13 skill + plugin + Elements + package, lỗi thường gặp.
aliases: [remotion, remotion.dev, react video, dựng video react, remotion studio, remotion lambda]
---

# Remotion — bộ Instruction tra cứu

**HyperFrames là công cụ dựng mặc định; Remotion dùng khi người dùng yêu cầu hoặc bài toán cần React/dữ liệu động.** Bộ tài liệu này tổng hợp từ tài liệu chính thức `remotion.dev/docs/`, repo `remotion-dev/remotion`, bộ 13 skill chính thức và kiểm thử smoke cơ bản.

Trạng thái: **bộ tra cứu thực chiến có nguồn + kiểm thử smoke (scaffold → versions → lint/tsc → compositions → still → render H.264 / PNG / ProRes 4444 alpha → Google Font tiếng Việt → Studio `--no-open`)**. Skill vận hành: [[.agents/skills/remotion-sena/SKILL]].

## Đọc gì khi nào

| Tình huống | Mở |
| --- | --- |
| Bắt đầu bất kỳ job Remotion; chọn Remotion hay HyperFrames | [[knowledge/remotion/02-quy-trinh-lam-viec]] |
| Cài/tạo project, version, license/chi phí, telemetry | [[knowledge/remotion/01-setup-license-phien-ban]] |
| Viết composition, timing, interpolate/spring, transitions, effects, font, shape, 3D, Lottie | [[knowledge/remotion/03-markup-animation]] |
| Footage, audio, volume, trim/speed, SFX, captions/phụ đề, whisper, metadata, matting | [[knowledge/remotion/04-media-am-thanh-captions]] |
| Studio, lệnh CLI, `remotion.config.ts`, codec/CRF/alpha/GIF, preset xuất, hiệu năng | [[knowledge/remotion/05-studio-cli-render]] |
| Props/schema, `calculateMetadata`, render hàng loạt, SSR, Lambda/Vercel, Player, web-renderer, editor | [[knowledge/remotion/06-data-server-cloud-app]] |
| Skill nào làm gì, plugin, WebMCP/AI, Remotion Elements, template, package nào tồn tại | [[knowledge/remotion/07-skills-plugin-ai-elements]] |
| Có gì đó hỏng (timeout, flicker, font, CORS, desync, Chrome) | [[knowledge/remotion/08-loi-thuong-gap]] |

## 10 điều không được quên

1. **Đọc skill gốc trước khi làm:** `remotion-best-practices` (router) rồi skill con đúng việc (`remotion-create`, `remotion-markup`, `remotion-interactivity`, `remotion-captions`, `remotion-render`…). Tra API mới nhất bằng `remotion-docs` hoặc thêm `.md` vào URL docs.
2. **Câu hỏi / ý tưởng lỏng → trả lời, đề xuất; không sửa file.** Phim > ~15 giây kể chuyện → 2–3 storyline bằng chữ để người dùng chọn, rồi mới viết code. Build đúng yêu cầu.
3. **Project video nằm ngoài repo Sena.** Tạo bằng `npx create-video@latest --yes --blank --no-tailwind`; thêm package bằng `npx remotion add`; mọi `@remotion/*` phải cùng một version (`npx remotion versions`).
4. **License:** Free License cho cá nhân hoặc tổ chức ≤ 3 người (`--license-key=free-license`). Công ty > 3 người hoặc dự án doanh nghiệp tự chạy cần kiểm tra Company License tại `remotion.dev/license`.
5. **Mọi chuyển động là hàm của frame** (`useCurrentFrame` + `interpolate`/`spring`); cấm CSS transition/animation, `Math.random`, `Date.now`; giây → frame qua `fps`; asset qua `staticFile()`; font tiếng Việt khai `subsets: ["vietnamese"]`.
6. **Media mới dùng `<Video>`/`<Audio>` của `@remotion/media`** (tag cũ của `remotion` đã đổi tên `Html5*`); `trimAfter` deprecated → `durationInFrames`; `playbackRate` đổi pitch trừ khi `preservePitch`.
7. **Studio luôn `--no-open`** (tránh tự mở trình duyệt cá nhân); gửi URL cho người dùng tự mở. Sena tự kiểm bằng `still`/`render --frames` và **mở ảnh ra nhìn** — lint/tsc sạch không chứng minh layout đúng.
8. **Preview & Render theo [[USER]]:** mặc định dừng ở URL Studio + ảnh stills để người dùng duyệt; khi người dùng yêu cầu hoặc bật tự render, luôn truyền composition ID và `--is-production=false` cho bản thử khi có license key.
9. **Kiểm file xuất:** `ffprobe` khớp duration/W×H/fps/codec/pix_fmt/audio stream; xem frame giải mã; đo âm; nói rõ phần chỉ đo chưa nghe.
10. **Không tự làm khi chưa duyệt:** deploy Lambda/Vercel/Cloud Run, dùng API key trả phí (OpenAI, ElevenLabs, Mapbox, Google Tiles), nâng version project/plugin, cài Element từ URL lạ, `npx remotion skills add` (trùng plugin), publish.

## Bề mặt làm việc

```mermaid
flowchart TB
  P[Plugin Remotion · 13 skill<br/>cài qua SETUP.md] --> A[Agent đọc skill]
  A --> PR[Project video riêng ngoài repo Sena<br/>package.json pin remotion + @remotion/* cùng version]
  PR --> ST[npx remotion studio --no-open<br/>preview, props, interactivity]
  PR --> R[npx remotion render/still<br/>Chrome Headless Shell + FFmpeg bundled]
  R --> O[out/*.mp4 · .mov · png]
  PR -.-> SSR[@remotion/renderer · Lambda · Vercel<br/>cần duyệt: tài khoản/chi phí]
  PR -.-> PL[@remotion/player · web-renderer<br/>kiểm tra Company License nếu công ty > 3 người]
```

## Giới hạn và điểm cần lưu ý

- Remotion phát hành rất nhanh; luôn kiểm `npx remotion versions` và thẻ `AvailableFrom` trên docs.
- Một số điểm lệch giữa skill và docs gốc (chi tiết trong từng node): `<CanvasImage>` vs `<Img>`, `loadFont()` không tham số, `delayRender` global vs `useDelayRender`, codec WebM alpha vp8 vs vp9, pitch preview. Khi mâu thuẫn: theo docs hiện hành và kiểm chứng thực tế.
- Remotion 5.0 dự kiến đổi: schema validation làm fail render, bắt buộc `licenseKey` cho Automators, `loadFont` bắt buộc weights/subsets.
- Chất lượng transcribe tiếng Việt (whisper) và license riêng của Elements cần kiểm riêng theo dự án.
