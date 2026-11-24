# Three.js Skills — Bản đồ 13 skill (r186) và phân loại cho Video

Nguồn: `CloudAI-X/threejs-skills` HEAD `0e18186` (2026-10-19, MIT). Kiểm chứng bởi tác giả trên `three@0.186.1`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, `@gltf-transform/cli@4.5.1`.

## 1. Phân loại 13 skill theo mức độ hữu ích cho Sena (dựng Video)

### Nhóm A — Cốt lõi cho mọi video 3D (HyperFrames & Remotion đều cần)
| Skill | Dòng | Nội dung chính | Khi nào dùng |
| --- | --- | --- | --- |
| `threejs-fundamentals` | 495 | Scene, fog, camera, `WebGLRenderer`, tone mapping, hệ tọa độ, transform, cleanup | Mọi cảnh 3D đầu tiên |
| `threejs-lighting` | 483 | Đèn vật lý, shadow map, sửa shadow acne, HDR environment (IBL), light probe | Chỉnh ánh sáng cho vật thể/sản phẩm 3D trông thật |
| `threejs-materials` | 500 | PBR (`MeshStandardMaterial`, `MeshPhysicalMaterial`), toon, blending, node materials | Tạo bề mặt vải, kim loại, kính, nhựa, đồ họa phẳng |
| `threejs-geometry` | 500 | Hình khối, chữ 3D, `BufferGeometry`, `InstancedMesh`, `BatchedMesh`, điểm/đường | Dựng khối/hạt/chữ 3D hoặc hiệu ứng số lượng lớn |
| `threejs-loaders` | 500 | Tải `.glb`/`.gltf` (Draco, meshopt, KTX2), HDR/EXR, `LoadingManager`, dispose | Khi bạn có file 3D sản phẩm hoặc model sẵn |
| `threejs-animation` | 500 | `AnimationClip`, `AnimationMixer`, xương (skeletal), morph target, trộn clip | Diễn hoạt model `.glb` có sẵn animation *(nhớ đổi sang `mixer.setTime(t)`)* |

### Nhóm B — Nâng cao (chỉ dùng khi cảnh 3D đòi hỏi)
| Skill | Dòng | Nội dung chính | Khi nào dùng |
| --- | --- | --- | --- |
| `threejs-textures` | 500 | Color space (sRGB vs Linear), UV, texture map, render target, bộ nhớ | Chỉnh chất liệu, map họa tiết/logo lên vật thể 3D |
| `threejs-postprocessing` | 497 | `EffectComposer`, bloom, DOF, tone mapping, WebGPU `RenderPipeline` | Làm hiệu ứng hậu kỳ điện ảnh (bloom, glow, vignette) |
| `threejs-shaders` | 497 | `ShaderMaterial`, `RawShaderMaterial`, shader chunks, TSL node | Viết hiệu ứng nền/chất liệu tùy biến không có sẵn |
| `threejs-performance` | 391 | Giảm draw call, instancing, LOD, bộ nhớ GPU, tránh đơ khi biên dịch shader | Khi cảnh 3D render từng frame quá chậm |
| `threejs-asset-pipeline` | 239 | Nén file `.glb` bằng `gltf-transform` (Draco, meshopt, KTX2, WebP) + `gltfjsx` | Khi file `.glb` gốc quá nặng (>50–100 MB) gây treo Chrome lúc render |

### Nhóm C — Đặc thù Remotion / Không dùng cho Video
| Skill | Dòng | Đánh giá cho Sena |
| --- | --- | --- |
| `threejs-react-three-fiber` | 488 | **Chỉ cần khi dựng 3D bằng Remotion** (`@remotion/three` chạy trên React Three Fiber 9 + drei). **Không dùng cho HyperFrames** (HyperFrames dùng Three.js vanilla JS/HTML). *Lưu ý: phải bỏ toàn bộ mẫu `useFrame()`!* |
| `threejs-interaction` | 500 | **KHÔNG CẦN cho video render** (chỉ phục vụ raycasting, click chuột, `OrbitControls`, `TransformControls`, kéo thả trên app web tương tác). |

## 2. Những đổi mới API lớn trong Three.js r186 mà bộ skill này giúp tránh nhầm

LLM thường trộn code Three.js r150–r165 với bản mới; bộ skill này khóa chuẩn `three@0.186`:
- `RGBELoader` → đổi sang **`HDRLoader`**.
- `THREE.Clock` → nhường chỗ cho **`THREE.Timer`** *(nhưng trong video render ta không dùng cả hai mà truyền thời gian tuyệt đối từ timeline)*.
- `PostProcessing` (WebGPU) → đổi sang **`RenderPipeline`**.
- **WebGL 1 đã bị bỏ**; mọi shader/material mới song hành cả nhánh `WebGLRenderer` lẫn nhánh `WebGPURenderer` + **TSL** (Three Shading Language).
- Import ES module không cần bundler (dùng tốt cho HyperFrames): `three@0.186.0/build/three.module.js` và `three/addons/` (`examples/jsm/`).
