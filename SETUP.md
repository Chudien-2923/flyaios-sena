# Hướng dẫn cài đặt và cập nhật `flyaios-sena` (`SETUP.md`)

> **Tài liệu này dành cho AI Agent** (**Oh My Pi (`omp`)**, **Claude Code (`claude`)**, **Antigravity CLI (`agy`)**, Cursor, Codex…).
> Nguyên tắc bắt buộc: **không tự ý cài phần mềm, cài plugin hay thay đổi cấu hình ngoài repo khi chưa liệt kê rõ và nhận sự đồng ý của người dùng.** Mọi đường dẫn trong lệnh phải bọc trong dấu nháy kép `"..."` để an toàn với thư mục có dấu cách (đặc biệt trên Windows).

---

## Cài mới (6 bước)

### Bước 1: Kiểm tra hệ điều hành, Agent Harness và môi trường nền

1. Xác định hệ điều hành (`macOS` / `Windows` / `Linux`) và Agent Harness đang chạy (`omp`, `claude`, `agy`, hay công cụ khác).
2. Chạy script kiểm tra đa nền tảng (Node.js thuần, không cần cài thư viện ngoài):
   ```bash
   node "scripts/doctor.mjs" --json
   ```
3. Đọc kết quả JSON và tóm tắt ngắn gọn cho người dùng: hạng mục nào đã **ĐẠT (`ok`)**, hạng mục bắt buộc nào còn **THIẾU (`fail`)**, và hạng mục tùy chọn nào chưa có (`warn`).

---

### Bước 2: Cài phần mềm hệ thống còn thiếu *(bắt buộc hỏi duyệt trước khi chạy)*

Các công cụ bắt buộc cho bộ stack mặc định của Sena:
- **Node.js ≥ 22** (yêu cầu của HyperFrames và script Sena)
- **FFmpeg & FFprobe** (xử lý, kiểm tra và render video)
- **yt-dlp** (tải video tham chiếu về phân tích cấu trúc & nhịp dựng)
- **Python ≥ 3.9** kèm đúng **2 gói nhẹ `numpy` và `Pillow`** (đủ cho 4 skill EditAtlas mặc định: `video-breakdown`, `video-check`, `sound-design`, `media-picker`)

Nếu có hạng mục bắt buộc đang `fail`, trình đúng lệnh cài theo hệ điều hành để người dùng đồng ý rồi mới chạy:

#### macOS (Homebrew)
```bash
brew install node ffmpeg yt-dlp python
python3 -m pip install --user numpy Pillow
```
*(Nếu hệ thống Python báo lỗi PEP 668 `externally-managed-environment`, gợi ý tạo venv riêng hoặc cài bằng `uv`/`pipx`, không tự thêm `--break-system-packages` khi người dùng chưa đồng ý.)*

#### Windows 10/11 (`winget` — có sẵn trên Windows)
```powershell
winget install OpenJS.NodeJS.LTS Gyan.FFmpeg yt-dlp.yt-dlp Python.Python.3.12
```
> **Lưu ý bắt buộc trên Windows:** sau khi `winget` cài xong, **đóng và mở lại cửa sổ terminal / AI agent** để Windows nạp biến môi trường `PATH` mới, sau đó cài 2 gói Python nhẹ:
```powershell
py -3 -m pip install --user numpy Pillow
```

#### Linux (Ubuntu / Debian)
```bash
sudo apt update && sudo apt install -y ffmpeg python3 python3-pip
# Cài Node.js 22+ (qua NodeSource/nvm/fnm) và yt-dlp
python3 -m pip install --user yt-dlp numpy Pillow
```

> **Các gói nặng TÙY CHỌN — KHÔNG cài ở bước này:**
> - `faster-whisper` (~300 MB + model 0,5–1,6 GB): chỉ đề xuất cài khi người dùng thực sự cần cắt talking-head hoặc phiên âm lời nói (`transcribe`, `talking-head-cut`).
> - `playwright` + `cryptography`: chỉ đề xuất cài khi người dùng cần `editable-export/scripts/render.py` hoặc `share.py`.
> - `hyperframes` CLI global (`npm install -g hyperframes`): tùy chọn dự phòng (plugin HyperFrames đã đi kèm launcher `plugin-cli.mjs`).

---

### Bước 3: Cài 5 bộ plugin ngoài theo đúng Agent Harness *(bắt buộc hỏi duyệt trước khi chạy)*

Các bộ plugin mang lại năng lực thực thi cốt lõi cho Sena:
1. **Superpowers** (`obra/superpowers`) — brainstorming, lập kế hoạch, debug, kiểm chứng
2. **Impeccable** (`pbakaus/impeccable`) — chuẩn thiết kế UI, layout, typography
3. **HyperFrames** (`heygen-com/hyperframes`) — 9 skill dựng video HTML/CSS/GSAP + launcher CLI
4. **Remotion** (`remotion-dev/claude-code-plugin`) — 13 skill `remotion-*` (dùng khi cần React)
5. **EditAtlas Skills** (`EditAtlas/skills`, Apache-2.0) — 7 skill phân tích video mẫu, QA, SFX, B-roll, talking-head

Liệt kê rõ phạm vi cài đặt bên dưới, **chờ người dùng xác nhận**, rồi chạy đúng nhánh harness đang dùng:

#### Nhánh A — Oh My Pi (`omp`) *(phạm vi project — chỉ áp dụng cho repo này)*
```bash
omp plugin marketplace add pbakaus/impeccable
omp plugin marketplace add obra/superpowers
omp plugin marketplace add heygen-com/hyperframes
omp plugin marketplace add remotion-dev/claude-code-plugin
omp plugin marketplace add EditAtlas/skills

omp plugin install impeccable@impeccable --scope project
omp plugin install superpowers@superpowers-marketplace --scope project
omp plugin install hyperframes@hyperframes --scope project
omp plugin install remotion@remotion --scope project
omp plugin install editable-export@editatlas-skills --scope project
omp plugin install media-picker@editatlas-skills --scope project
omp plugin install sound-design@editatlas-skills --scope project
omp plugin install talking-head-cut@editatlas-skills --scope project
omp plugin install transcribe@editatlas-skills --scope project
omp plugin install video-breakdown@editatlas-skills --scope project
omp plugin install video-check@editatlas-skills --scope project
```

#### Nhánh B — Claude Code (`claude`) *(phạm vi project + đồng bộ skill không dùng symlink)*
```bash
claude plugin marketplace add pbakaus/impeccable
claude plugin marketplace add obra/superpowers
claude plugin marketplace add heygen-com/hyperframes
claude plugin marketplace add remotion-dev/claude-code-plugin
claude plugin marketplace add EditAtlas/skills

claude plugin install impeccable@impeccable --scope project
claude plugin install superpowers@superpowers-marketplace --scope project
claude plugin install hyperframes@hyperframes --scope project
claude plugin install remotion@remotion --scope project
claude plugin install editable-export@editatlas-skills --scope project
claude plugin install media-picker@editatlas-skills --scope project
claude plugin install sound-design@editatlas-skills --scope project
claude plugin install talking-head-cut@editatlas-skills --scope project
claude plugin install transcribe@editatlas-skills --scope project
claude plugin install video-breakdown@editatlas-skills --scope project
claude plugin install video-check@editatlas-skills --scope project
```
Sau đó đồng bộ 5 skill riêng trong `.agents/skills/` sang `.claude/skills/` (thư mục ngoài Git, không dùng symlink, an toàn trên Windows):
```bash
node "scripts/sync-claude-skills.mjs"
```

#### Nhánh C — Antigravity CLI (`agy`)
> **Lưu ý phạm vi:** lệnh `agy plugin install` cài 4 plugin đầu vào phạm vi **user global (`~/.gemini/config/plugins/`)** — cần nêu rõ để người dùng đồng ý trước khi chạy. Riêng `EditAtlas/skills` là kho multi-plugin không có `plugin.json` riêng nên cài cô lập theo workspace vào `.agents/vendor-skills/` (đã nằm trong `.gitignore`, không làm bẩn `.agents/skills/`).

1. Cài 4 plugin đơn:
   ```bash
   agy plugin install https://github.com/pbakaus/impeccable
   agy plugin install https://github.com/obra/superpowers
   agy plugin install https://github.com/heygen-com/hyperframes
   agy plugin install https://github.com/remotion-dev/claude-code-plugin
   ```
2. Nạp 7 skill của `EditAtlas/skills` vào `.agents/vendor-skills/` (ngoài Git) và đăng ký bằng `.agents/skills.json` (ngoài Git):
   - **macOS / Linux (Bash/Zsh):**
     ```bash
     git clone --depth 1 https://github.com/EditAtlas/skills.git ".tmp-editatlas-skills"
     mkdir -p ".agents/vendor-skills"
     cp -R ".tmp-editatlas-skills/skills/." ".agents/vendor-skills/"
     cp ".tmp-editatlas-skills/LICENSE" ".agents/vendor-skills/LICENSE"
     rm -rf ".tmp-editatlas-skills"
     ```
   - **Windows (PowerShell):**
     ```powershell
     git clone --depth 1 https://github.com/EditAtlas/skills.git ".tmp-editatlas-skills"
     New-Item -ItemType Directory -Force -Path ".agents\vendor-skills" | Out-Null
     Copy-Item -Recurse -Force ".tmp-editatlas-skills\skills\*" ".agents\vendor-skills\"
     Copy-Item -Force ".tmp-editatlas-skills\LICENSE" ".agents\vendor-skills\LICENSE"
     Remove-Item -Recurse -Force ".tmp-editatlas-skills"
     ```
   - Tạo `.agents/skills.json` với nội dung:
     ```json
     {
       "entries": [
         { "path": ".agents/vendor-skills" }
       ]
     }
     ```
   *(Nếu máy người dùng đã cài sẵn các plugin trên ở Claude Code, có thể dùng đường tắt `agy plugin import claude` khi người dùng đồng ý.)*

#### Nhánh D — Dự phòng cho Cursor, Codex hoặc harness khác
> **Lưu ý phạm vi:** cờ `-g` cài skill vào thư mục global `~/.agents/skills/` để giữ `.agents/skills/` trong repo Sena sạch sẽ — cần hỏi người dùng đồng ý trước khi chạy.

```bash
npx skills add -g pbakaus/impeccable
npx skills add -g obra/superpowers
npx skills add -g heygen-com/hyperframes
npx skills add -g remotion-dev/claude-code-plugin
npx skills add -g EditAtlas/skills
```

---

### Bước 4: Xác nhận kết nối MCP EditAtlas

MCP server của EditAtlas chạy qua **Streamable HTTP** tại `https://edit.trysometh.ing/mcp` (**không cần API key**, không upload footage lên mạng):
- **Oh My Pi (`omp`):** đã cấu hình sẵn tại `.omp/mcp.json`.
- **Claude Code (`claude`):** đã cấu hình sẵn tại `.mcp.json` (chấp nhận trust server khi Claude Code hỏi lần đầu).
- **Antigravity CLI (`agy`):** nếu chưa có `.agents/mcp_config.json`, tạo file `.agents/mcp_config.json` tại gốc repo (hoặc chạy `agy mcp add editatlas --url https://edit.trysometh.ing/mcp`) với nội dung:
  ```json
  {
    "mcpServers": {
      "editatlas": {
        "url": "https://edit.trysometh.ing/mcp"
      }
    }
  }
  ```
- **Cursor / harness khác:** dán cấu hình `mcpServers.editatlas` trỏ `https://edit.trysometh.ing/mcp` vào file cấu hình MCP của công cụ đó.
- **Gợi ý riêng tư:** khi chạy các script Python của EditAtlas, luôn đặt biến môi trường `EDITATLAS_TELEMETRY=0` để tắt gửi thống kê chạy script.

---

### Bước 5: Chạy kiểm tra xác nhận

Chạy lại kiểm tra môi trường:
```bash
node "scripts/doctor.mjs"
```
Xác nhận toàn bộ mục bắt buộc (`node`, `ffmpeg`, `ffprobe`, `yt-dlp`, `python`, `python-numpy`, `python-pillow`, `repo-*`) đều báo `[OK]`. Nếu đang dùng Claude Code, kiểm thêm:
```bash
node "scripts/sync-claude-skills.mjs" --check
```

---

### Bước 6: Khởi động hồ sơ gu dựng (`USER.md`) và mở phiên mới

1. Đề nghị hỏi nhanh **3 câu tùy chọn** (người dùng có thể bỏ qua để bắt đầu dựng video ngay) rồi điền vào `USER.md`:
   - Bạn muốn xưng hô thế nào và chủ yếu làm loại video nào (SaaS demo, vlog, talking head, short-form)?
   - Nền tảng phát hành chính (16:9 YouTube, 9:16 TikTok/Reels…) và thư mục lưu project video trên máy?
   - Sau khi dựng xong, bạn muốn Sena **dừng ở bản xem trước (Preview / Studio)** để duyệt trước hay **tự render MP4 luôn**?
2. **Nhắc người dùng đóng và mở một cuộc trò chuyện mới** trong cùng thư mục repo để Agent Harness nạp đầy đủ các plugin và MCP server vừa cài.

---

## Cập nhật Sena lên phiên bản mới

Khi có tag phát hành mới (ví dụ `v1.1.0`), người dùng chỉ cần nói *"Cập nhật Sena theo SETUP.md"*. AI Agent thực hiện đúng 5 bước sau:

1. **Tạo nhánh sao lưu trước mọi thao tác** để bảo toàn 100% thay đổi của người dùng:
   - **macOS / Linux (Bash/Zsh):**
     ```bash
     git checkout -b "backup/$(date +%Y-%m-%d)"
     git add -A && git commit -m "backup: before updating flyaios-sena" || true
     git checkout main
     ```
   - **Windows (PowerShell):**
     ```powershell
     $d = Get-Date -Format "yyyy-MM-dd"
     git checkout -b "backup/$d"
     git add -A
     git commit -m "backup: before updating flyaios-sena"
     git checkout main
     ```
     *(Nếu không có file nào thay đổi, `git commit` báo nothing to commit — cứ tiếp tục `git checkout main` bình thường.)*
2. Kiểm tra bản mới từ `origin`: `git fetch --tags origin` và cho người dùng xem `CHANGELOG.md` của bản mới, chờ xác nhận trước khi ghép (merge).
3. Chỉ cập nhật các file thuộc **Nhóm 1 (File của hệ thống)**; **tuyệt đối giữ nguyên Nhóm 2 (File của người dùng)** theo bảng bên dưới. Nếu người dùng từng chỉnh tay một file ở Nhóm 1, báo rõ phần chênh lệch và hỏi giữ hay ghép.
4. Nếu người dùng đang dùng Claude Code, chạy lại `node "scripts/sync-claude-skills.mjs"` (không ảnh hưởng skill tự tạo trong `.claude/skills/`).
5. Chạy `node "scripts/doctor.mjs"` và `node "scripts/verify-repo.mjs"` để xác nhận kho sạch.

---

## Bảng chủ sở hữu file

| Nhóm | Danh sách file / thư mục | Quy tắc khi cập nhật |
| :--- | :--- | :--- |
| **Nhóm 1 — Của hệ thống** | `AGENTS.md`, `CLAUDE.md`, `ROLE.md`, `LEARNING.md`, `SETUP.md`, `README.md`, `VERSION`, `CHANGELOG.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `skills-lock.json`, `knowledge/`, `scripts/`, `tests/`, `.github/`, `.omp/config.yml`, `.omp/mcp.json`, `.omp/hooks/`, `.mcp.json`, `.agents/mcp_config.json`, `.agents/skills/{hyperframes-sena,remotion-sena,sena-memory,motion-design,skill-creator}` | Cập nhật theo bản phát hành mới; nếu người dùng từng sửa tay thì báo rõ để quyết giữ/ghép. |
| **Nhóm 2 — Của người dùng** | `USER.md`, `MEMORY.md`, các file `memory/*.md` mới hoặc dòng bài học bạn đã thêm, `WORK.md`, `jobs/`, `journal/`, mọi skill do bạn tự tạo trong `.agents/skills/<ten-skill-cua-ban>/` | **Tuyệt đối không ghi đè.** Tài sản training của bạn luôn được giữ nguyên. |
| **Ngoài Git (`.gitignore`)** | `.claude/skills/`, `.claude/settings.local.json`, `.omp/plugins/`, `.agents/vendor-skills/`, `.agents/skills.json`, `.superpowers/`, `journal/sessions/`, media nặng (`*.mp4`, `*.mov`, `*.mkv`, `*.wav`), `.env` | Sinh cục bộ trên từng máy, không commit vào Git. |

---

## Khi gặp lỗi

- Dừng ngay tại bước bị lỗi, hiển thị chính xác thông báo lỗi đầu tiên và đề xuất cách khắc phục cho người dùng.
- Không tự xóa file của người dùng, không dùng `git reset --hard` hay `git clean -fdx` khi chưa có sự đồng ý rõ ràng.
- Nếu cần quay về trạng thái trước cập nhật, hỏi ý kiến người dùng rồi khôi phục từ nhánh `backup/<YYYY-MM-DD>`.
