# Remotion — Setup, license và phiên bản

Nguồn: tài liệu chính thức `remotion.dev/docs/` (`ai/skills`, `ai/plugins`, `ai/claude-code-plugin`, `cli/create-video`, `cli/skills`, `cli/upgrade`, `cli/versions`, `license/pricing`, `license/faq`, `telemetry`, `miscellaneous/chrome-headless-shell`) và repo `remotion-dev/remotion`.

## 1. Bề mặt cài đặt — cái gì nằm ở đâu

| Lớp | Nằm ở | Ghi chú |
| --- | --- | --- |
| Skill cho agent (13 skill `remotion-*`) | Plugin `remotion-dev/claude-code-plugin` cài qua [[SETUP]] theo harness | Không copy bản thứ hai vào `.agents/skills/` của repo Sena để tránh lệch phiên bản. |
| Thư viện Remotion (`remotion`, `@remotion/cli`, `@remotion/*`) | `package.json` + `node_modules` **của từng project video** (ngoài repo Sena) | Không cài vào root repo Sena. Mọi package `@remotion/*` và `remotion` phải **cùng một version chính xác** (không `^`). |
| Browser render | `node_modules/.remotion/chrome-headless-shell/` của project | Tự tải lần render đầu (~140 MB nén, ~470 MB giải nén). Không trỏ vào Chrome cá nhân trừ khi người dùng yêu cầu. |
| FFmpeg / FFprobe | Remotion bundle sẵn trong `@remotion/compositor-*` | `npx remotion ffmpeg` / `npx remotion ffprobe` gọi bản đi kèm; hỗ trợ macOS, Windows và Linux. |

**Vì sao dùng plugin thay vì `npx remotion skills add` trong từng project:** lệnh đó chép skill vào từng thư mục project khiến dễ trùng 2 bản skill và trôi version giữa các dự án.

## 2. Yêu cầu môi trường

- **Node.js ≥ 22** (Remotion yêu cầu `^20.19.0 || ^22.13.0 || >=24`, Sena thống nhất `>= 22` để khớp HyperFrames).
- Hỗ trợ native trên **macOS (Apple Silicon / Intel)**, **Windows (x64)** và **Linux**.
- Mỗi project blank có `node_modules` + Chrome Headless Shell khoảng **~1 GB** → dọn các thư mục thử nghiệm sau khi xong.

## 3. Tạo project sạch

```bash
# Đặt trong thư mục dự án ngoài repo Sena
npx create-video@latest --yes --blank --no-tailwind my-video
cd my-video && npx remotion versions   # kiểm tra mọi package khớp version
```

- Scaffold blank tạo: `src/index.ts` (`registerRoot`), `src/Root.tsx`, `src/Composition.tsx`, `public/`, `remotion.config.ts` (`setRspack(true)`, `setVideoImageFormat("jpeg")`, `setOverwriteOutput(true)`, `setDefaultPremountInSeconds(2)`), cùng các script `dev` (`remotion studio`), `build`, `upgrade`, `lint` (`eslint src && tsc`).
- Không truyền `--skills` khi đã cài plugin Remotion. Các template khác xem [[knowledge/remotion/07-skills-plugin-ai-elements]].
- Thêm gói Remotion đúng version bằng `npx remotion add @remotion/<pkg>` (không `npm i @remotion/x` trần vì dễ lệch version).
- **Không tạo project video bên trong repo Sena.**

## 4. License — kiểm tra trước khi dùng thương mại

| Trường hợp | License | Chi phí |
| --- | --- | --- |
| Cá nhân (kể cả thương mại); tổ chức ≤ 3 người (tính **tổng nhân sự**, không phải số người mở Remotion); phi lợi nhuận; đang đánh giá chưa thương mại | **Free License**, đủ tính năng | 0; không cần tài khoản |
| Công ty > 3 người, dựng video thủ công / Studio / agent cục bộ | Company — **Remotion for Creators** | Tính theo seat/tháng (kiểm giá mới nhất tại `remotion.dev/license`) |
| Công ty > 3 người có tự động hóa render (`renderMedia`, Lambda, Vercel, web-renderer, nhúng `<Player>`) | Company — **Remotion for Automators** | Tính theo lượt render (kiểm giá mới nhất tại `remotion.dev/license`) |
| Hỗ trợ / điều khoản riêng | Enterprise | Liên hệ Remotion |

- 1 render = một lần xuất thành công video/audio/GIF/still/image sequence; preview trong Studio/Player không tính.
- Telemetry: render server-side chỉ gửi khi có `licenseKey`; `@remotion/web-renderer` luôn gửi. Có thể truyền `--is-production=false` cho bản render thử.
- Nếu đủ điều kiện Free License, có thể truyền `--license-key=free-license` (không bao giờ truyền chuỗi rỗng).
- **Ràng buộc Sena:** luôn hỏi xác nhận tình trạng team (≤ 3 người hay > 3 người / khách hàng doanh nghiệp) khi cần; không tự mua license hay lưu license key trả phí vào Git (chỉ lưu trong `.env` ngoài Git).

## 5. Phiên bản và nâng cấp

- Remotion phát hành rất thường xuyên; các trang docs có thẻ `<AvailableFrom v="4.0.xxx">` → luôn kiểm `npx remotion versions` trước khi dùng API mới.
- Nâng package trong một project cụ thể: `npx remotion upgrade` — chỉ chạy khi người dùng duyệt.
- Nâng plugin: cập nhật qua trình quản lý plugin của harness bạn đang dùng (chỉ chạy khi người dùng đồng ý).
- Remotion 5.0 dự kiến siết chặt schema validation và yêu cầu `licenseKey` cho Automators — kiểm release notes trước khi nâng major version.

## 6. Mức kiểm chứng smoke cơ bản

Đã kiểm thử smoke trên macOS với scaffold blank (`4.0.545`): `create-video --yes --blank --no-tailwind`, `versions`, `npm run lint`, `compositions`, `still`, `render` H.264 / PNG frames / ProRes 4444 alpha, Google Font `Be Vietnam Pro` hiển thị đúng dấu tiếng Việt, và `studio --no-open`. Chưa chạy thử đầy đủ trong smoke: captions/whisper, Lambda/Vercel/Cloud Run, Player, web-renderer, Elements, maps, OpenTimelineIO.
