// background.js — service worker. Switches dreamina accounts via credential
// replay. dreamina's login modal requires TRUSTED input events (synthetic DOM
// clicks from a content script do not open it), so we drive the page with the
// chrome.debugger API (CDP Input.* events are trusted).
//
// Flow: clear cookies (logout) -> open login tab -> attach debugger ->
//   "Sign in" -> "Continue with email" -> type email/password ->
//   click "Continue" -> detach -> update active/last-use metadata.

importScripts("accounts.js");

const LOGIN_URL = "https://dreamina.capcut.com/ai-tool/home?need_login=true";
const COOKIE_DOMAIN = "capcut.com";
const DEBUGGER_PROTOCOL = "1.3";
const TAB_LOAD_TIMEOUT_MS = 20000;

const SEL = {
  email: 'input[type="email"],input[name="username"]',
  password: 'input[type="password"],input[name="password"]',
  submit: 'button[class*="sign-in-button" i],button[class*="signin" i],button[type="submit"]',
};
const SIGN_IN_SELECTOR = "#SiderMenuLogin"; // stable id for the sidebar Sign in
const SIGN_IN_TEXTS = ["sign in", "log in", "đăng nhập"];
const EMAIL_OPTION_TEXTS = ["continue with email", "sign in with email", "use email"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- cookies (logout) ----
async function clearCapcutCookies() {
  const cookies = await chrome.cookies.getAll({ domain: COOKIE_DOMAIN });
  await Promise.all(
    cookies.map((ck) => {
      const host = ck.domain.replace(/^\./, "");
      const url = `${ck.secure ? "https" : "http"}://${host}${ck.path}`;
      return chrome.cookies.remove({ url, name: ck.name, storeId: ck.storeId }).catch(() => {});
    })
  );
}

// ---- tab handling ----
async function openLoginTab() {
  const tabs = await chrome.tabs.query({ url: "*://*.capcut.com/*" });
  if (tabs.length) {
    await chrome.tabs.update(tabs[0].id, { url: LOGIN_URL, active: true });
    return tabs[0].id;
  }
  const tab = await chrome.tabs.create({ url: LOGIN_URL, active: true });
  return tab.id;
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(finish, TAB_LOAD_TIMEOUT_MS);
  });
}

// ---- chrome.debugger helpers ----
const dbgAttach = (tabId) =>
  new Promise((res, rej) =>
    chrome.debugger.attach({ tabId }, DEBUGGER_PROTOCOL, () =>
      chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res()
    )
  );
const dbgDetach = (tabId) =>
  new Promise((res) =>
    chrome.debugger.detach({ tabId }, () => {
      void chrome.runtime.lastError; // swallow "not attached" warning
      res();
    })
  );

// Track our attachment so a navigation-triggered auto-detach doesn't make us
// call detach (or commands) on an unattached tab.
let attachedTabId = null;
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === attachedTabId) attachedTabId = null;
});
const dbgSend = (tabId, method, params = {}) =>
  new Promise((res, rej) =>
    chrome.debugger.sendCommand({ tabId }, method, params, (r) =>
      chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r)
    )
  );

// Clicking through the login flow can swap the renderer process, which
// auto-detaches chrome.debugger. send() transparently re-attaches and retries
// once so the flow survives those navigations.
async function send(tabId, method, params = {}) {
  try {
    if (attachedTabId !== tabId) throw new Error("detached");
    return await dbgSend(tabId, method, params);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (!/detached|not attached|Cannot access|target/i.test(msg)) throw e;
    console.log("[sd-swap] re-attaching after:", msg);
    try { await dbgAttach(tabId); } catch (_) {}
    attachedTabId = tabId;
    await dbgSend(tabId, "Runtime.enable").catch(() => {});
    return await dbgSend(tabId, method, params);
  }
}

async function evalIn(tabId, expression) {
  const r = await send(tabId, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return r && r.result ? r.result.value : undefined;
}

async function clickAt(tabId, x, y) {
  await send(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await send(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

// Trusted click on the first visible element whose exact text matches.
async function clickByText(tabId, texts) {
  const coords = await evalIn(
    tabId,
    `(() => {
      const vis = (e) => !!(e && (e.offsetParent !== null || e.getClientRects().length));
      const els = [...document.querySelectorAll('button,a,[role="button"],div,span')];
      for (const t of ${JSON.stringify(texts)}) {
        const e = els.find((x) => vis(x) && x.textContent.trim().toLowerCase() === t);
        if (e) { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
      }
      return null;
    })()`
  );
  if (!coords) return false;
  await clickAt(tabId, coords.x, coords.y);
  return true;
}

async function clickSelector(tabId, selector) {
  const coords = await evalIn(
    tabId,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el || el.disabled) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    })()`
  );
  if (!coords) return false;
  await clickAt(tabId, coords.x, coords.y);
  return true;
}

// Fill a field robustly: trusted click + focus to commit via Input.insertText,
// then verify; if the value didn't land, fall back to the native setter (which
// also fires the input event the lv- form needs to enable submit).
async function typeInto(tabId, selector, text) {
  const sel = JSON.stringify(selector);
  const coords = await evalIn(
    tabId,
    `(() => { const el = document.querySelector(${sel}); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`
  );
  if (!coords) return false;
  await clickAt(tabId, coords.x, coords.y);
  await sleep(120);
  await evalIn(tabId, `(() => { const el = document.querySelector(${sel}); if (el) el.focus(); })()`);
  await dbgSend(tabId, "Input.insertText", { text }).catch(() => {});

  const val = await evalIn(tabId, `(() => { const el = document.querySelector(${sel}); return el ? el.value : null; })()`);
  if (val !== text) {
    await evalIn(
      tabId,
      `(() => { const el = document.querySelector(${sel}); if (!el) return;
        const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
        d && d.set ? d.set.call(el, ${JSON.stringify(text)}) : (el.value = ${JSON.stringify(text)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true })); })()`
    );
  }
  return true;
}

const HAS_PW = `!!document.querySelector('input[type="password"],input[name="password"]')`;
const HAS_EMAIL_OPT = `[...document.querySelectorAll('div,span,button')].some(e=>(e.offsetParent!==null||e.getClientRects().length)&&e.textContent.trim().toLowerCase()==='continue with email')`;

// Poll an expression until truthy or timeout (re-attaches transparently via send).
async function waitFor(tabId, expr, timeout, interval = 250) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evalIn(tabId, expr).catch(() => false)) return true;
    await sleep(interval);
  }
  return false;
}

async function driveLogin(tabId, acct) {
  await dbgSend(tabId, "Runtime.enable");
  const log = (...a) => console.log("[sd-swap]", ...a);

  // 1. Reveal the email/password form: Sign in -> Continue with email,
  //    waiting only as long as each step actually needs.
  let formReady = await evalIn(tabId, HAS_PW);
  if (!formReady) {
    if (!(await evalIn(tabId, HAS_EMAIL_OPT))) {
      if (!(await clickSelector(tabId, SIGN_IN_SELECTOR))) await clickByText(tabId, SIGN_IN_TEXTS);
      await waitFor(tabId, HAS_EMAIL_OPT, 5000);
    }
    await clickByText(tabId, EMAIL_OPTION_TEXTS);
    formReady = await waitFor(tabId, HAS_PW, 6000);
  }
  log("formReady:", formReady);
  if (!formReady) {
    const diag = await evalIn(tabId, `(()=>{const vis=e=>!!(e&&(e.offsetParent!==null||e.getClientRects().length));return {url:location.href, hasSignInId:!!document.querySelector('#SiderMenuLogin'), hasEmailOpt:[...document.querySelectorAll('div,span,button')].some(e=>vis(e)&&e.textContent.trim().toLowerCase()==='continue with email'), hasSignInText:[...document.querySelectorAll('div,span,button,a')].some(e=>vis(e)&&e.textContent.trim().toLowerCase()==='sign in')};})()`).catch((e) => "diag-failed:" + e);
    log("reveal DIAG:", JSON.stringify(diag));
    return { ok: false, error: "Không mở được form email login. DIAG=" + JSON.stringify(diag) };
  }

  // 2. Fill credentials (trusted typing so the form validates and enables submit).
  const e1 = await typeInto(tabId, SEL.email, acct.email);
  const e2 = await typeInto(tabId, SEL.password, acct.password);
  log("typed email:", e1, "password:", e2);

  // 3. Submit: click "Continue" as soon as it's enabled.
  let submitted = false;
  for (let i = 0; i < 30; i++) {
    if (await clickSelector(tabId, SEL.submit)) { submitted = true; break; }
    await sleep(150);
  }
  log("submitted:", submitted);
  if (!submitted) return { ok: false, error: "Không bấm được nút Continue (có thể còn disabled)." };

  // Login redirects on success (often auto-detaches the debugger). Quick,
  // best-effort confirmation — don't block long or treat failure as an error.
  let loggedIn;
  try {
    loggedIn = await waitFor(tabId, `!(${HAS_PW})`, 2500, 300);
  } catch (_) {
    loggedIn = undefined;
  }
  return { ok: true, submitted: true, loggedIn };
}

async function switchAccount(email) {
  const { accountsText = "", meta = {} } = await chrome.storage.local.get(["accountsText", "meta"]);
  const accounts = parseAccounts(accountsText);
  const acct = accounts.find((a) => a.email === email);
  if (!acct) throw new Error("Không tìm thấy account: " + email);

  await clearCapcutCookies();
  const tabId = await openLoginTab();
  await waitForTabComplete(tabId);
  console.log("[sd-swap] switch", email, "tabId", tabId);

  let result;
  try {
    await dbgAttach(tabId);
  } catch (e) {
    console.log("[sd-swap] attach FAILED:", e && e.message);
    throw new Error("Không attach được debugger: " + (e && e.message ? e.message : e) + " (đóng DevTools/tab dreamina cũ rồi thử lại).");
  }
  attachedTabId = tabId;
  try {
    result = await driveLogin(tabId, acct);
  } finally {
    if (attachedTabId === tabId) {
      await dbgDetach(tabId);
      attachedTabId = null;
    }
  }

  // Mark target active + stamp last-use; clear active on the rest.
  const newMeta = {};
  for (const a of accounts) newMeta[a.email] = { ...(meta[a.email] || {}), active: a.email === email };
  newMeta[email] = { ...newMeta[email], lastUse: Date.now(), active: true };
  await chrome.storage.local.set({ meta: newMeta });

  return result;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "SWITCH_ACCOUNT") {
    switchAccount(msg.email)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: String(e && e.message ? e.message : e) }));
    return true; // async
  }
  return false;
});
