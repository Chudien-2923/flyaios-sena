---
title: Three.js Skills (CloudAI-X) — bộ Instruction đánh giá và cầu nối 3D cho HyperFrames & Remotion
description: Đánh giá bộ 13 Agent Skills CloudAI-X/threejs-skills (Three.js r186, R3F 9.8, gltf-transform 4.5, MIT): hình thức tồn tại, bản đồ 13 skill, khuyến nghị cài đặt chọn lọc, và cầu nối bắt buộc từ Three.js web realtime sang render video tất định trên HyperFrames (hf-seek) và Remotion (@remotion/three).
aliases: [threejs, three.js, threejs-skills, cloudai-x, 3d video, react three fiber, webgl, webgpu, gltf, glb]
---

# Three.js Skills (`CloudAI-X/threejs-skills`) — bộ Instruction tra cứu

Nguồn: repo `CloudAI-X/threejs-skills` (HEAD `0e18186`, license **MIT**, ~580 KB, 13 skill / 6.190 dòng Markdown cho `three@0.186.1`, R3F 9.8, drei 10.7, gltf-transform 4.5), đối chiếu với tài liệu 3D của HyperFrames (`types/3d.md`, `runtimes.md`) và [[knowledge/remotion/03-markup-animation]].

Trạng thái: **chưa cài mặc định vào `.agents/skills/`** (đề xuất cài chọn lọc khi có job 3D thật); mới tổng hợp từ mã nguồn/tài liệu, chưa chạy kiểm trên cảnh 3D sản xuất. **HyperFrames** là công cụ dựng mặc định; **Remotion** dùng khi yêu cầu.

## Kết luận nhanh

1. **Tồn tại dưới dạng gì?** **Thuần bộ 13 Agent Skills (`skills/threejs-*/SKILL.md`, tổng ~580 KB, giấy phép MIT)** — không có MCP, không có CLI, không có dependency chạy kèm.
2. **Giá trị cho HyperFrames & Remotion:** rất hữu ích khi dựng **video có chất liệu 3D thật** (xoay/bung sản phẩm `.glb`/`.gltf`, cảnh bay camera 3D, trực quan hóa dữ liệu 3D, shader/post-processing). Tài liệu 3D sẵn có của HyperFrames và Remotion chủ yếu dạy giao thức nối khung hình, còn bộ này cung cấp đúng API **Three.js r186** hiện hành (ánh sáng PBR, HDRI, vật liệu, shadow, loader GLB/Draco, shader, tối ưu GPU).
3. **Khi nào nên cài?** Chưa cần cài sẵn cả 13 skill nếu chủ yếu làm video 2D/talking head/SaaS để giữ danh mục skill gọn nhẹ; khi có job 3D thật, cài chọn lọc đúng nhóm skill cần dùng (bỏ `threejs-interaction`).

## Đọc gì khi nào

| Tình huống | Mở |
| --- | --- |
| Bản đồ đầy đủ 13 skill (nhóm cần cho Video 3D vs nhóm chỉ cho web), và các thay đổi API lớn tới r186 | [[knowledge/threejs/01-ban-do-13-skills]] |
| **Cầu nối bắt buộc sang HyperFrames (`hf-seek`) & Remotion (`@remotion/three`)**, cạm bẫy render video và cách cài chọn lọc | [[knowledge/threejs/02-cau-noi-hyperframes-va-remotion]] |

## 8 điều không được quên khi đưa Three.js vào Video

1. **Cấm vòng lặp thời gian thực (`requestAnimationFrame`, `renderer.setAnimationLoop`, `THREE.Timer`/`delta`) trong HyperFrames:** mọi khung hình phải là hàm thuần của thời gian `e.detail.time` trong listener **`hf-seek`**.
2. **Cấm `useFrame()` trong Remotion (`@remotion/three`):** luôn lấy thời gian từ `useCurrentFrame()` + `fps`; dùng `<ThreeCanvas width height>` và `<Sequence layout="none">`.
3. **Chơi animation GLB/keyframe bằng `mixer.setTime(t)` tuyệt đối**, không cộng dồn `mixer.update(delta)` (vì video render seek khung hình không theo thứ tự tuyến tính).
4. **Setup nặng phải báo sẵn sàng trước khi chụp frame:** trên HyperFrames đăng ký `window.__hf.buildReady["<key>"]` (đợi tải GLB, HDRI, `renderer.compileAsync(...)`); trên Remotion dùng `useDelayRender()`.
5. **WebGL trên Remotion cần flag GPU:** render desktop dùng `--gl=angle` (`Config.setChromiumOpenGlRenderer('angle')`), máy không GPU dùng `swangle`; `angle` có thể rò rỉ bộ nhớ nếu render quá dài.
6. **Không cài `threejs-interaction` cho video render:** skill này chỉ phục vụ chuột, kéo thả, raycasting và gizmo tương tác trên web.
7. **Ánh sáng & bloom cho video (theo `hyperframes` `types/3d.md`):** kim loại bóng dễ vệt trắng nếu `roughness < 0.45`; 1 pixel `NaN` đi qua bloom sẽ làm đen cả khung hình (luôn clamp mẫu số tránh chia 0); xoay môi trường HDRI thay vì xoay vật thể để vệt sáng quét mượt.
8. **Giữ đúng giấy phép MIT và nguồn `CloudAI-X/threejs-skills`**, không sửa file vendor nếu cài vào `.agents/skills/`.
