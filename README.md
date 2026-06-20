<div align="center">

<img src="icon.png" width="88" height="88" alt="Dreamina account switcher" />

<h1>Dreamina account switcher</h1>

<p>
  <b>Chrome extension (Manifest&nbsp;V3)</b> đổi nhanh tài khoản
  <a href="https://dreamina.capcut.com/">dreamina.capcut.com</a><br/>
  một click: <b>đăng xuất → tự điền → đăng nhập</b>.
</p>

<p>
  <a href="https://github.com/dijnie/dreamina-account-switcher/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/dijnie/dreamina-account-switcher?include_prereleases&label=release&color=ff9f1c&style=for-the-badge" /></a>
  <a href="https://github.com/dijnie/dreamina-account-switcher/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/dijnie/dreamina-account-switcher?color=ffb454&style=for-the-badge" /></a>
  <a href="https://github.com/dijnie/dreamina-account-switcher/issues"><img alt="Issues" src="https://img.shields.io/github/issues/dijnie/dreamina-account-switcher?style=for-the-badge" /></a>
</p>

<p>
  <a href="https://github.com/dijnie/dreamina-account-switcher/releases/latest"><b>⬇️ Tải .zip</b></a>
  &nbsp;·&nbsp;
  <a href="#hướng-dẫn-sử-dụng"><b>📖 Hướng dẫn</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/dijnie/dreamina-account-switcher/issues"><b>🐞 Báo lỗi</b></a>
</p>

</div>

---

## Tính năng

- 📋 Dán cả danh sách tài khoản vào một ô (`email|password` mỗi dòng).
- 👤 Mỗi tài khoản: avatar màu, email, badge **ACTIVE**, lần dùng gần nhất.
- ⚡ **Switch** một click: clear cookies → mở dreamina → tự điền → đăng nhập.
- 🗂️ Hai tab gọn: **Tài khoản** (đổi nhanh) & **Quản lý** (sửa list + Export backup).
- 🌙 Giao diện tối, không phụ thuộc thư viện ngoài.

## Cài đặt

1. Tải mã nguồn:
   ```sh
   git clone https://github.com/dijnie/dreamina-account-switcher.git
   ```
   hoặc tải bản đóng gói ở **[Releases](https://github.com/dijnie/dreamina-account-switcher/releases/latest)** rồi giải nén.
2. Mở `chrome://extensions`, bật **Developer mode** (góc trên phải).
3. Bấm **Load unpacked** → chọn thư mục vừa tải.
4. Ghim icon extension lên thanh công cụ.

## Hướng dẫn sử dụng

| Bước | Thao tác |
|:---:|---|
| 1 | Click icon → mở popup. |
| 2 | Tab **Quản lý** → dán danh sách (`email\|password` mỗi dòng) → **Lưu**. |
| 3 | Tab **Tài khoản** → bấm **Switch** ở tài khoản muốn dùng. |
| 4 | Nếu hiện **captcha / OTP** → giải/nhập tay (credential replay không tránh được). |
| 5 | Sửa list: chỉnh trong tab Quản lý → **Lưu** (active/last-use của email còn tồn tại được giữ). |

## Cơ chế hoạt động

dreamina login bằng email + **password** (không phải OTP), nhưng modal login chỉ nhận **trusted input**. Vì vậy extension điều khiển trang qua **`chrome.debugger`** (gửi trusted mouse/keyboard events):

```text
clear cookies *.capcut.com   →   mở /ai-tool/home + attach debugger
        →   Sign in → Continue with email
        →   điền email/password → bấm Continue
        →   cập nhật active + last-use
```

> Khi switch sẽ hiện thanh *"…started debugging this browser"* — bình thường, tự mất khi xong.

## Cấu trúc dự án

| File | Vai trò |
|---|---|
| `manifest.json` | MV3; quyền `storage`, `cookies`, `tabs`, `debugger`; host `*.capcut.com` |
| `background.js` | Service worker: clear cookies + drive login qua `chrome.debugger` |
| `accounts.js` | Parser danh sách (dùng chung popup + background) |
| `popup.html` · `popup.css` · `popup.js` | Giao diện popup |
| `icon.png` | Icon extension |
| `.github/workflows/build-zip.yml` | CI đóng gói `.zip` + publish release mỗi lần push |

## Bảo mật

- Mật khẩu lưu **plaintext** trong `chrome.storage.local` của trình duyệt bạn — đánh đổi đơn giản cho dùng cá nhân, **đừng dùng trên máy chung**.
- Login tự động liên tục có thể bị nền tảng gắn cờ — dùng chừng mực.
- Selector login phụ thuộc DOM dreamina; site đổi thì cập nhật hằng `SEL` trong `background.js`.

## Roadmap

- [x] Đổi tài khoản 1 click qua `chrome.debugger`
- [x] Giao diện 2 tab, avatar, badge active, last-use
- [x] Export backup + CI đóng gói `.zip`
- [ ] Tùy chọn mã hóa mật khẩu bằng master password
- [ ] Tự nhận diện account đang active từ phiên đăng nhập
