# Three.js — Cầu nối bắt buộc sang HyperFrames và Remotion

Toàn bộ 13 skill trong `CloudAI-X/threejs-skills` được viết cho **trình duyệt web chạy realtime 60 fps**. Khi áp dụng vào dựng video bằng **HyperFrames** hoặc **Remotion**, bắt buộc phải chuyển đổi sang **render từng frame tất định theo thời gian tuyệt đối `t`**.

## 1. Bảng chuyển đổi từ code trong skill sang Video Render

| Mẫu code trong `threejs-skills` (Web realtime) | Chuyển sang **HyperFrames** | Chuyển sang **Remotion (`@remotion/three`)** |
| --- | --- | --- |
| `renderer.setAnimationLoop(animate)` / `requestAnimationFrame` | **Xóa bỏ.** Vẽ frame bên trong `window.addEventListener("hf-seek", (e) => renderAt(e.detail.time))` + gọi `renderAt(0)` ban đầu | **Xóa bỏ.** Dùng `<ThreeCanvas width={width} height={height}>` |
| `timer.getDelta()` / `mesh.rotation.y += delta` | **Cấm tích lũy `delta`.** Tính thẳng từ `t`: `mesh.rotation.y = t * speed` | Tính thẳng từ `frame / fps` (`useCurrentFrame()` + `useVideoConfig()`) |
| `useFrame((_, delta) => ...)` (trong `threejs-react-three-fiber`) | Không dùng R3F trên HyperFrames | **CẤM `useFrame()` trong Remotion.** Truyền prop động tính từ `useCurrentFrame()` / `interpolate()` / `spring()` |
| `mixer.update(delta)` (trong `threejs-animation`) | Dùng **`mixer.setTime(t)`** để seek tới đúng giây `t` dù frame render đảo thứ tự | Dùng **`mixer.setTime(frame / fps)`** trong `useEffect`/`useLayoutEffect` theo `frame` |
| `Math.random()` cho hạt / vị trí | Dùng PRNG có seed cố định (`mulberry32` / hash theo index) | Dùng `random(seed)` của Remotion |
| Tải `.glb` / HDRI / compile shader bất đồng bộ | Đăng ký promise vào **`window.__hf.buildReady["scene3d"]`**; trong `hf-seek` nếu có việc async gọi `e.detail.waitUntil(promise)` | Dùng **`useDelayRender()`** (`delayRender`/`continueRender`) chờ asset xong trước khi chụp frame |
| `<Canvas>` của `@react-three/fiber` | Dùng `<canvas>` + `new THREE.WebGLRenderer({ canvas, antialias: true })` | Dùng **`<ThreeCanvas width height>`** của `@remotion/three`; mọi `<Sequence>` bên trong bắt buộc có **`layout="none"`** |
| `window.addEventListener("resize", ...)` | Khóa kích thước cố định theo composition (vd `1920×1080` hoặc `1080×1920`), không dựa vào `window.innerWidth` | Khóa theo `width`, `height` từ `useVideoConfig()` |

## 2. Mẫu khung chuẩn cho HyperFrames (gắn với Three.js r186)

```html
<canvas id="scene3d" width="1920" height="1080"></canvas>
<script type="module">
  import * as THREE from "three"; // hoặc đường dẫn cục bộ / importmap

  const canvas = document.getElementById("scene3d");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 100);
  // ... dựng lights, materials, meshes, tải GLB/HDRI ...

  // Đăng ký sẵn sàng nếu có tải asset hoặc compileAsync:
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady.scene3d = renderer.compileAsync(scene, camera);

  function renderAt(t) {
    // Mọi chuyển động là hàm thuần của t (giây), không cộng dồn delta
    // vd: if (mixer) mixer.setTime(t);
    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(0);
</script>
```

*Lưu ý mạng & tốc độ:* với project render ổn định (đặc biệt khi offline hoặc render hàng trăm frame), nên tải `three.module.js` và addon cần thiết về thư mục `lib/` trong project video thay vì phụ thuộc CDN mỗi lần mở.

## 3. Lưu ý hiệu năng & chất lượng hình 3D khi xuất video

- **Tách công việc nặng khỏi từng frame:** mô phỏng vật lý/hạt (nếu có) nên tính trước 1 lần lúc load thành mảng trạng thái rồi tra theo `t` trong `renderAt(t)` (`types/3d.md`).
- **Tránh lỗi render đen / chậm trên Chrome Headless:**
  - Remotion desktop: đặt `Config.setChromiumOpenGlRenderer('angle')` hoặc `--gl=angle` (máy không GPU dùng `swangle`).
  - HyperFrames: kiểm tra bằng `snapshot` ở khung cao trào (lúc camera bay sâu nhất) và đo thời gian 1 frame trước khi render full.
- **Không lạm dụng 3D:** theo `hyperframes` `types/3d.md`, chỉ dùng 3D khi video thực sự cần (sản phẩm 3D, cutaway/exploded view, mô phỏng giải thích); **không nghiêng UI 2D vào không gian 3D**.

## 4. Cách cài chọn lọc khi có job 3D (chờ người dùng duyệt)

Vì repo chứa 13 thư mục `skills/threejs-*/` (không có `.claude-plugin/marketplace.json`), cài chọn lọc vào `.agents/skills/` của repo Sena:
1. Clone tạm `https://github.com/CloudAI-X/threejs-skills.git` vào thư mục tạm của hệ điều hành.
2. Chỉ copy đúng các thư mục skill cần thiết vào `.agents/skills/` của repo Sena (kèm file `LICENSE` MIT và cập nhật `.agents/skills/README.md`), **bỏ `threejs-interaction`**:
   - **Gói gọn cho HyperFrames 3D (6–8 skill):** `threejs-fundamentals`, `threejs-lighting`, `threejs-materials`, `threejs-geometry`, `threejs-loaders`, `threejs-animation` *(+ `threejs-textures`, `threejs-postprocessing` nếu cần)*.
   - **Thêm cho Remotion 3D:** `threejs-react-three-fiber`.
   - **Thêm khi xử lý model nặng / shader:** `threejs-asset-pipeline`, `threejs-performance`, `threejs-shaders`.
3. Xóa thư mục tạm; nếu dùng Claude Code thì chạy `node scripts/sync-claude-skills.mjs`; mở phiên mới để harness nạp skill.
