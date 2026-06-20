# Dreamina account switcher

Chrome extension (Manifest V3) đổi nhanh tài khoản trên [dreamina.capcut.com](https://dreamina.capcut.com/). Dùng cho cá nhân: lưu danh sách tài khoản, một cú click để **đăng xuất → tự điền email/password → đăng nhập** tài khoản khác.

> ⚠️ Công cụ cá nhân. Mật khẩu lưu **plaintext** trong `chrome.storage.local` của trình duyệt bạn. Đừng dùng trên máy chung và đừng commit tài khoản lên git.

## Tính năng

- Dán cả danh sách tài khoản vào 1 ô (`email|password` mỗi dòng), lưu vào extension.
- Danh sách hiển thị: avatar, email, badge **ACTIVE**, thời điểm dùng gần nhất.
- **Switch** một click: clear cookies capcut → mở dreamina → tự điền → đăng nhập.
- Tab **Quản lý**: sửa danh sách, **Export backup** ra file.

## Cơ chế

dreamina dùng login email + **password** (không phải OTP), nhưng modal login chỉ nhận **trusted input** — synthetic click của content script không mở được. Vì vậy extension điều khiển trang qua **`chrome.debugger` API** (gửi được trusted mouse/keyboard events):

1. Xóa toàn bộ cookies `*.capcut.com` (= đăng xuất).
2. Mở `dreamina.capcut.com/ai-tool/home`, attach debugger.
3. Click **Sign in → Continue with email**, điền email/password, bấm **Continue**.
4. Cập nhật trạng thái active + last-use.

Khi switch sẽ xuất hiện thanh *"…started debugging this browser"* — bình thường, tự mất khi xong.

## Cài đặt

1. Tải/clone repo này về máy.
2. Mở `chrome://extensions`, bật **Developer mode** (góc trên phải).
3. **Load unpacked** → chọn thư mục repo.
4. Ghim icon extension lên thanh công cụ.

> Chrome ≥ 137 chặn load extension qua command line — chỉ load thủ công bằng Developer mode như trên.

## Sử dụng

1. Click icon → mở popup.
2. Tab **Quản lý** → dán danh sách (`email|password` mỗi dòng) → **Lưu**.
3. Tab **Tài khoản** → bấm **Switch** ở tài khoản muốn dùng.
4. Nếu hiện **captcha/OTP** → giải/nhập tay (cơ chế credential replay không tránh được).
5. Sửa danh sách: chỉnh text trong tab Quản lý → **Lưu** (trạng thái active/last-use của email còn tồn tại được giữ nguyên).

## Cấu trúc

| File | Vai trò |
|------|---------|
| `manifest.json` | MV3; quyền `storage`, `cookies`, `tabs`, `debugger`; host `*.capcut.com` |
| `background.js` | Service worker: clear cookies + drive login qua `chrome.debugger` |
| `accounts.js` | Parser danh sách (dùng chung popup + background) |
| `popup.html` / `popup.css` / `popup.js` | Giao diện popup |
| `icon.png` | Icon extension |

## Giới hạn

- Captcha / OTP / xác minh thiết bị lạ phải xử lý tay.
- Login tự động liên tục có thể bị nền tảng gắn cờ — dùng chừng mực.
- Selector login phụ thuộc DOM dreamina; nếu site đổi, cập nhật `SEL` trong `background.js`.
- Chỉ hoạt động với `dreamina.capcut.com`.

## Bảo mật

- `account.md` (file mẫu định dạng) và mọi thông tin đăng nhập **được .gitignore**, không đẩy lên git.
- Không có mã hóa: mật khẩu nằm plaintext trong storage cục bộ. Đây là đánh đổi đơn giản hóa cho dùng cá nhân.
