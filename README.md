<a id="readme-top"></a>

<!--
README theo mẫu Best-README-Template (othneildrew):
https://github.com/othneildrew/Best-README-Template
-->

<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Stars][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Last commit][last-commit-shield]][repo-url]

<a href="https://github.com/dijnie/dreamina-account-switcher">
  <img src="icon.png" alt="Logo" width="84" height="84">
</a>

<h2 align="center">Dreamina account switcher</h2>

<p align="center">
  Chrome extension (Manifest V3) đổi nhanh tài khoản <a href="https://dreamina.capcut.com/">dreamina.capcut.com</a> — một click: đăng xuất → tự điền → đăng nhập.
  <br />
  <a href="#hướng-dẫn-sử-dụng"><strong>Xem hướng dẫn »</strong></a>
  <br /><br />
  <a href="https://github.com/dijnie/dreamina-account-switcher/releases/latest">Tải bản .zip</a>
  ·
  <a href="https://github.com/dijnie/dreamina-account-switcher/issues">Báo lỗi</a>
</p>

</div>

<!-- MỤC LỤC -->
<details>
  <summary>Mục lục</summary>
  <ol>
    <li><a href="#giới-thiệu">Giới thiệu</a></li>
    <li><a href="#công-nghệ">Công nghệ</a></li>
    <li>
      <a href="#bắt-đầu">Bắt đầu</a>
      <ul>
        <li><a href="#yêu-cầu">Yêu cầu</a></li>
        <li><a href="#cài-đặt">Cài đặt</a></li>
      </ul>
    </li>
    <li><a href="#hướng-dẫn-sử-dụng">Hướng dẫn sử dụng</a></li>
    <li><a href="#cơ-chế-hoạt-động">Cơ chế hoạt động</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#bảo-mật">Bảo mật</a></li>
    <li><a href="#giấy-phép">Giấy phép</a></li>
  </ol>
</details>

## Giới thiệu

Công cụ cá nhân để quản lý và **đổi nhanh** nhiều tài khoản Dreamina trong cùng một trình duyệt.

- 📋 Dán cả danh sách tài khoản vào 1 ô (`email|password` mỗi dòng).
- 👤 Danh sách hiển thị avatar, email, badge **ACTIVE**, lần dùng gần nhất.
- ⚡ **Switch** một click: clear cookies → mở dreamina → tự điền → đăng nhập.
- 🗂️ Tab **Quản lý**: sửa danh sách & **Export backup**.

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

### Công nghệ

- Chrome Extension **Manifest V3** (service worker)
- **`chrome.debugger`** API (trusted input — bắt buộc với modal login của dreamina)
- JavaScript thuần, `chrome.storage.local`, không dependency

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

## Bắt đầu

### Yêu cầu

- Google Chrome (hoặc trình duyệt Chromium) — bản mới hỗ trợ Manifest V3.
- Tài khoản dreamina.capcut.com đăng nhập bằng **email + password**.

### Cài đặt

1. Tải mã nguồn:
   ```sh
   git clone https://github.com/dijnie/dreamina-account-switcher.git
   ```
   hoặc tải bản đóng gói tại [Releases](https://github.com/dijnie/dreamina-account-switcher/releases/latest) và giải nén.
2. Mở `chrome://extensions`, bật **Developer mode** (góc trên phải).
3. Bấm **Load unpacked** → chọn thư mục vừa tải.
4. Ghim icon extension lên thanh công cụ.

> Chrome ≥ 137 chặn load extension qua command line — chỉ load thủ công bằng Developer mode như trên.

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

## Hướng dẫn sử dụng

1. Click icon → mở popup.
2. Tab **Quản lý** → dán danh sách (`email|password` mỗi dòng) → **Lưu**.
3. Tab **Tài khoản** → bấm **Switch** ở tài khoản muốn dùng.
4. Nếu hiện **captcha / OTP** → giải/nhập tay (cơ chế credential replay không tránh được).
5. Sửa danh sách: chỉnh text trong tab Quản lý → **Lưu** (trạng thái active/last-use của email còn tồn tại được giữ nguyên).

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

## Cơ chế hoạt động

dreamina dùng login email + **password** (không phải OTP), nhưng modal login chỉ nhận **trusted input** — synthetic click của content script không mở được. Vì vậy extension điều khiển trang qua **`chrome.debugger`**:

1. Xóa toàn bộ cookies `*.capcut.com` (= đăng xuất).
2. Mở `dreamina.capcut.com/ai-tool/home`, attach debugger.
3. Click **Sign in → Continue with email**, điền email/password, bấm **Continue**.
4. Cập nhật trạng thái active + last-use.

Khi switch sẽ xuất hiện thanh *"…started debugging this browser"* — bình thường, tự mất khi xong.

| File | Vai trò |
|------|---------|
| `manifest.json` | MV3; quyền `storage`, `cookies`, `tabs`, `debugger`; host `*.capcut.com` |
| `background.js` | Service worker: clear cookies + drive login qua `chrome.debugger` |
| `accounts.js` | Parser danh sách (dùng chung popup + background) |
| `popup.html` / `popup.css` / `popup.js` | Giao diện popup |
| `icon.png` | Icon extension |

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

## Roadmap

- [x] Đổi tài khoản 1 click qua `chrome.debugger`
- [x] Giao diện 2 tab (Tài khoản / Quản lý), avatar, badge active, last-use
- [x] Export backup
- [x] GitHub Action đóng gói `.zip` mỗi lần push
- [ ] Tùy chọn mã hóa mật khẩu bằng master password
- [ ] Tự nhận diện account đang active từ phiên đăng nhập

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

## Bảo mật

- Mật khẩu lưu **plaintext** trong `chrome.storage.local` của trình duyệt bạn — đánh đổi đơn giản hóa cho dùng cá nhân, **đừng dùng trên máy chung**.
- Login tự động liên tục có thể bị nền tảng gắn cờ — dùng chừng mực.
- Selector login phụ thuộc DOM dreamina; nếu site đổi, cập nhật hằng `SEL` trong `background.js`.

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

## Giấy phép

Dùng cho mục đích cá nhân. Chưa kèm giấy phép cụ thể.

<p align="right">(<a href="#readme-top">về đầu trang</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/dijnie/dreamina-account-switcher.svg?style=for-the-badge
[contributors-url]: https://github.com/dijnie/dreamina-account-switcher/graphs/contributors
[stars-shield]: https://img.shields.io/github/stars/dijnie/dreamina-account-switcher.svg?style=for-the-badge
[stars-url]: https://github.com/dijnie/dreamina-account-switcher/stargazers
[issues-shield]: https://img.shields.io/github/issues/dijnie/dreamina-account-switcher.svg?style=for-the-badge
[issues-url]: https://github.com/dijnie/dreamina-account-switcher/issues
[last-commit-shield]: https://img.shields.io/github/last-commit/dijnie/dreamina-account-switcher.svg?style=for-the-badge
[repo-url]: https://github.com/dijnie/dreamina-account-switcher
