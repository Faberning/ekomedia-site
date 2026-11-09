// Dashboard shell · shared API client, formatting and the Direction 1 frame. No build step; plain browser JS.
// Every client-specific value (brand strings, nav, roles, copy, locale) comes from client.config.json
// and is exposed as DASH.config. Nothing here may name a company, a person, a job or a product.
(function () {
  "use strict";

  const state = { user: null, config: null };
  let configPromise = null;

  // ----- config -----
  function loadConfig() {
    if (!configPromise) {
      configPromise = fetch("/client.config.json", { headers: { accept: "application/json" } })
        .then((r) => { if (!r.ok) throw new Error("client.config.json " + r.status); return r.json(); })
        .then((c) => { state.config = c; window.DASH.config = c; return c; });
    }
    return configPromise;
  }
  const cfg = () => state.config || {};
  const product = () => cfg().product || {};
  const copy = () => cfg().copy || {};
  const roles = () => cfg().roles || {};
  const locale = () => product().locale || "en";

  // ----- icons -----
  function icon(name, cls) {
    const icons = window.DASH_ICONS || {};
    const aliases = window.DASH_ICON_ALIASES || {};
    const body = icons[name] || icons[aliases[name]] || "";
    return `<svg class="${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
  function mark() {
    const brand = cfg().brand || {};
    const src = brand.mark ? esc(brand.mark) : "";
    return `<span class="dash-mark" aria-hidden="true">${src ? `<img src="${src}" alt="">` : ""}</span>`;
  }

  // ----- api -----
  async function api(path, opts) {
    opts = opts || {};
    const init = { method: opts.method || "GET", headers: { accept: "application/json" } };
    if (opts.body !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, init);
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("json") ? await res.json() : await res.text();
    if (!res.ok) {
      const e = new Error((data && data.error) || res.statusText || "request failed");
      e.status = res.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  // ----- dates (browser-local; names via Intl in the config locale) -----
  const pad = (n) => String(n).padStart(2, "0");
  function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function parse(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function today() { return iso(new Date()); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function weekStart(s) { const d = parse(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return iso(d); }
  function weekDays(start) { return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
  function isoWeek(s) {
    const d = parse(s); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  const part = (d, opts) => new Intl.DateTimeFormat(locale(), opts).format(d);
  function fmtDay(s) { const d = parse(s); return `${part(d, { weekday: "short" })} ${d.getDate()}`; }
  function fmtShort(s) { const d = parse(s); return `${d.getDate()} ${part(d, { month: "short" })}`; }
  function fmtLong(s) { const d = parse(s); return part(d, { weekday: "long", day: "numeric", month: "long" }); }
  function fmtRange(from, to) {
    const a = parse(from), b = parse(to);
    if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${part(a, { month: "short" })} ${b.getFullYear()}`;
    return `${a.getDate()} ${part(a, { month: "short" })} – ${b.getDate()} ${part(b, { month: "short" })} ${b.getFullYear()}`;
  }
  function dayShort(s) { return part(parse(s), { weekday: "short" }); }

  // ----- money -----
  function money(n, opts) {
    if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
    const v = Number(n);
    const dp = opts && opts.dp !== undefined ? opts.dp : (Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2);
    return new Intl.NumberFormat(locale(), { style: "currency", currency: product().currency || "USD", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v);
  }
  function hours(n) {
    if (n === null || n === undefined || n === "") return "—";
    return Number(n).toLocaleString(locale(), { maximumFractionDigits: 2 });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // ----- toast -----
  function toast(msg, bad) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const el = document.createElement("div");
    el.className = "toast-msg" + (bad ? " bad" : "");
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), bad ? 6000 : 3000);
  }

  // ----- shell -----
  function renderShell(opts) {
    const nav = cfg().nav || [];
    const content = document.getElementById("content");
    const app = document.createElement("div");
    app.className = "dash-app";
    app.innerHTML = `
      <aside class="dash-rail" id="rail">
        <a class="dash-brand" href="/">${mark()}<div><b>${esc(product().company || "")}</b><span>${esc(product().name || "")}</span></div></a>
        <nav class="dash-nav">
          ${nav.map((n) => n.soon
            ? `<a class="soon" aria-disabled="true" title="Coming in ${esc(n.soon)}">${icon(n.icon)}${esc(n.label)}<small>${esc(n.soon)}</small></a>`
            : `<a href="${esc(n.href)}" class="${n.id === opts.active ? "on" : ""}">${icon(n.icon)}${esc(n.label)}</a>`).join("")}
        </nav>
        <div class="dash-me" id="me">${icon("user")}<div><span>Signing in…</span><small>&nbsp;</small></div></div>
      </aside>
      <div class="dash-main">
        <header class="dash-top">
          <button class="btn btn-ghost btn-icon dash-menu" id="menuBtn" aria-label="Menu">${icon("menu-2")}</button>
          <h1 id="pageTitle">${esc(opts.title || "")}</h1>
          <span class="sub" id="pageSub">${esc(opts.sub || "")}</span>
          <div class="dash-top-actions" id="topActions"></div>
        </header>
      </div>`;
    const main = app.querySelector(".dash-main");
    content.classList.add("dash-body");
    content.parentNode.insertBefore(app, content);
    main.appendChild(content);
    app.querySelector("#menuBtn").addEventListener("click", () => app.querySelector("#rail").classList.toggle("open"));
    app.querySelector("#rail").addEventListener("click", (e) => { if (e.target.closest("a[href]")) app.querySelector("#rail").classList.remove("open"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") app.querySelector("#rail").classList.remove("open"); });
  }

  function setTitle(title, sub) {
    const t = document.getElementById("pageTitle"), s = document.getElementById("pageSub");
    if (t && title !== undefined) t.textContent = title;
    if (s && sub !== undefined) s.textContent = sub;
    const suffix = product().titleSuffix || "Dashboard";
    document.title = (title ? title + " · " : "") + suffix;
  }

  function blocked(status, data) {
    const content = document.getElementById("content");
    const who = data && data.email ? `<p>Signed in as <b>${esc(data.email)}</b>.</p>` : "";
    const text = status === 403
      ? `<p>${esc(copy().blocked403 || "Not on the people list.")}</p>${who}`
      : status === 401
        ? `<p>${esc(copy().blocked401 || "Sign in required.")}</p>`
        : `<p>${esc((data && (data.detail || data.error)) || copy().unavailable || "Dashboard unavailable.")}</p>`;
    const head = status === 403 ? "Not on the people list" : status === 401 ? "Sign in required" : (copy().unavailable || "Dashboard unavailable");
    content.innerHTML = `<div class="blocked"><h1>${esc(head)}</h1>${text}</div>`;
  }

  function roleLabel(role) {
    const r = roles()[role];
    if (!r) return esc(role || "");
    return esc(r.label) + (r.hint ? ` · ${esc(r.hint)}` : "");
  }

  async function init(opts) {
    try { await loadConfig(); } catch (e) { blocked(0, { detail: "Configuration could not be loaded." }); throw e; }
    document.documentElement.lang = locale();
    renderShell(opts);
    setTitle(opts.title, opts.sub);
    try {
      state.user = await api("/api/me");
    } catch (e) {
      blocked(e.status, e.data);
      throw e;
    }
    const me = document.getElementById("me");
    me.innerHTML = `${icon("user")}<div><span>${esc(state.user.name)}</span><small>${roleLabel(state.user.role)}</small></div>`;
    return state.user;
  }

  function isAdmin() { return state.user && state.user.role === "admin"; }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function setQs(params) {
    const u = new URL(location.href);
    Object.entries(params).forEach(([k, v]) => v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v));
    history.replaceState(null, "", u);
  }

  // Tabler 1.x bundles Bootstrap under the `tabler` global (tabler.Modal), not `bootstrap`.
  const Modal = (window.bootstrap && window.bootstrap.Modal) || (window.tabler && window.tabler.Modal);

  window.DASH = { api, icon, mark, init, setTitle, isAdmin, state, toast, esc, qs, setQs, Modal, loadConfig, roleLabel, config: null,
    d: { iso, parse, today, addDays, weekStart, weekDays, isoWeek, fmtDay, fmtShort, fmtLong, fmtRange, dayShort },
    f: { money, hours } };
})();
