// accounts.js — shared parse/format helpers for popup + service worker.
// Loaded via <script> in popup.html and importScripts() in background.js.
// Source-of-truth format (same as account.md): one `email|password` per line.

/**
 * Parse raw accounts text into [{ email, password }].
 * Tolerates blank lines, `#` comments, and an optional leading "N\t" numbering
 * (so the numbered view of account.md still imports cleanly).
 */
function parseAccounts(text) {
  return (text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\t\s*/, "").trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("|");
      if (idx === -1) return null;
      const email = line.slice(0, idx).trim();
      const password = line.slice(idx + 1).trim();
      if (!email || !password) return null;
      return { email, password };
    })
    .filter(Boolean);
}

// Export for service worker (importScripts attaches to globalThis automatically;
// this guard keeps it safe under Node for syntax/unit checks).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseAccounts };
}
