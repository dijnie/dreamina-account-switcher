// popup.js — UI: edit list in one textarea, render accounts, trigger switch.
// parseAccounts() comes from accounts.js (loaded first in popup.html).

const $ = (sel) => document.querySelector(sel);
let metaCache = {};

function relTime(ts) {
  if (!ts) return "chưa dùng";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return m + " phút trước";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " giờ trước";
  return Math.floor(h / 24) + " ngày trước";
}

let flashTimer;
function flash(text, isError) {
  const el = $("#status");
  el.textContent = text;
  el.classList.toggle("error", !!isError);
  el.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (el.hidden = true), isError ? 6000 : 3500);
}

const CLOCK_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v4l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const SWAP_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M4 8h12l-3-3M20 16H8l3 3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Stable color per email so each account is easy to recognize.
function avatarHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function renderList(text, meta) {
  const accounts = parseAccounts(text);
  $("#count").textContent = String(accounts.length);
  const ul = $("#accountList");
  ul.replaceChildren();

  if (!accounts.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.innerHTML = "<b>Chưa có account</b>Mở “Quản lý danh sách”, paste vào rồi bấm Lưu.";
    ul.appendChild(li);
    return;
  }

  for (const acct of accounts) {
    const m = meta[acct.email] || {};
    const li = document.createElement("li");
    li.className = "acct" + (m.active ? " active" : "");

    const hue = avatarHue(acct.email);
    const avatar = document.createElement("div");
    avatar.className = "acct__avatar";
    avatar.style.background = `linear-gradient(140deg, hsl(${hue} 62% 52%), hsl(${(hue + 40) % 360} 60% 42%))`;
    avatar.textContent = (acct.email[0] || "?").toUpperCase();

    const body = document.createElement("div");
    body.className = "acct__body";

    const emailRow = document.createElement("div");
    emailRow.className = "acct__email";
    const emailSpan = document.createElement("span");
    emailSpan.textContent = acct.email;
    emailSpan.title = acct.email;
    emailRow.appendChild(emailSpan);
    if (m.active) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = "ACTIVE";
      emailRow.appendChild(chip);
    }

    const metaLine = document.createElement("div");
    metaLine.className = "acct__meta";
    metaLine.innerHTML = CLOCK_SVG + "<span></span>";
    metaLine.querySelector("span").textContent = relTime(m.lastUse);

    body.append(emailRow, metaLine);

    const btn = document.createElement("button");
    btn.className = "switch";
    btn.innerHTML = SWAP_SVG + '<span class="switch__label">Switch</span>';
    btn.addEventListener("click", () => onSwitch(acct.email, btn));

    li.append(avatar, body, btn);
    ul.appendChild(li);
  }
}

async function onSwitch(email, btn) {
  const label = btn.querySelector(".switch__label");
  btn.disabled = true;
  btn.classList.add("is-busy");
  if (label) label.textContent = "Đang đổi…";
  try {
    const res = await chrome.runtime.sendMessage({ type: "SWITCH_ACCOUNT", email });
    if (res && res.ok) {
      const detail = res.loggedIn
        ? " ✓ đã đăng nhập."
        : " — đã submit; nếu hiện captcha/OTP hãy hoàn tất thủ công.";
      flash("Đã chuyển sang " + email + detail);
      const { meta = {} } = await chrome.storage.local.get("meta");
      metaCache = meta;
      renderList($("#accounts").value, meta);
    } else {
      flash("Lỗi: " + ((res && res.error) || "không rõ"), true);
    }
  } catch (e) {
    flash("Lỗi: " + String(e), true);
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-busy");
    if (label) label.textContent = "Switch";
  }
}

async function save() {
  const text = $("#accounts").value;
  const emails = new Set(parseAccounts(text).map((a) => a.email));
  const meta = {};
  for (const [email, m] of Object.entries(metaCache)) {
    if (emails.has(email)) meta[email] = m; // prune metadata of removed accounts
  }
  await chrome.storage.local.set({ accountsText: text, meta });
  metaCache = meta;
  renderList(text, meta);
  flash("Đã lưu " + emails.size + " account.");
}

function exportFile() {
  const blob = new Blob([$("#accounts").value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "account.md";
  a.click();
  URL.revokeObjectURL(url);
}

async function init() {
  const { accountsText = "", meta = {} } = await chrome.storage.local.get([
    "accountsText",
    "meta",
  ]);
  metaCache = meta;
  $("#accounts").value = accountsText;
  renderList(accountsText, meta);

  $("#save").addEventListener("click", save);
  $("#exportBtn").addEventListener("click", exportFile);

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      document
        .querySelectorAll(".panel")
        .forEach((p) => p.classList.toggle("is-active", p.id === "panel-" + tab.dataset.panel));
    })
  );
}

init();
