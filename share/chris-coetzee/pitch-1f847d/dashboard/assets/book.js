// Client book (preview): every client, their cover, reviews due, new business and claims, in one place.
// Preview data is SAMPLE ONLY (made-up people). A live console reads from the adviser's own records.
(function () {
  "use strict";
  const { icon, esc, d } = DASH;
  const TODAY = "2026-11-09";
  const B = window.BOOK || { clients: [], leads: [], claims: [] };
  const ROUTES = { clients: "Clients", reviews: "Reviews due", pipeline: "New business", claims: "Claims" };

  const long = (s) => (s ? d.fmtShort(s) + " " + s.slice(0, 4) : "—");
  const days = (s) => Math.round((d.parse(s) - d.parse(TODAY)) / 86400000);
  const covers = (c) => c.covers.filter((p) => p.status !== "Lapsed");
  const fileGaps = (c) => Object.entries(c.file).filter(([, v]) => !v).map(([k]) => k);

  function reviewPill(c) {
    const n = days(c.nextReview);
    if (n < 0) return `<span class="pill bad">Overdue ${-n}d</span>`;
    if (n <= 30) return `<span class="pill warn">Due in ${n}d</span>`;
    return `<span class="pill grey">${esc(long(c.nextReview))}</span>`;
  }

  // ----- markup -----
  const root = document.createElement("div");
  root.className = "book";
  root.id = "book";
  root.innerHTML = `
    <div class="sample-note">${icon("info-circle")}<span><b>Sample clients.</b> Made-up names to show how the book works. Chris's real client records stay in his own system and would only be connected after DormFIN's privacy and compliance sign-off.</span></div>
    <section class="figs" id="bookFigs" aria-label="Book figures"></section>
    <div class="card" id="bk-clients">
      <div class="card-header bk-head"><h3>Clients</h3>
        <div class="bk-tools">
          <label class="bk-search">${icon("search")}<input type="search" id="bkQ" placeholder="Search name, suburb or insurer" aria-label="Search clients"></label>
          <select id="bkCover" class="form-select form-select-sm" aria-label="Filter by cover"><option value="">All cover</option></select>
        </div>
      </div>
      <div id="bkList"></div>
    </div>
    <div class="card" id="bk-reviews"><div class="card-header"><h3>Reviews due</h3><span class="hint">Next 60 days and overdue</span></div><div id="bkReviews"></div></div>
    <div class="card" id="bk-pipeline"><div class="card-header"><h3>New business</h3><span class="hint">From first contact to cover in force</span></div><div id="bkPipe"></div><div id="bkSources"></div></div>
    <div class="card" id="bk-claims"><div class="card-header"><h3>Claims in progress</h3><span class="hint">Where each one sits with the insurer</span></div><div id="bkClaims"></div></div>
    <p class="foot">Preview. A practice tool for Chris's own admin, not advice. The file checklist items are placeholders for DormFIN's compliance adviser to set.</p>`;
  document.getElementById("content").appendChild(root);

  // ----- figures -----
  const active = B.clients.filter((c) => c.status === "Client");
  const policies = active.reduce((n, c) => n + covers(c).length, 0);
  const due30 = active.filter((c) => days(c.nextReview) <= 30).length;
  const overdue = active.filter((c) => days(c.nextReview) < 0).length;
  const uw = B.leads.filter((l) => l.stage === "Underwriting").length;
  const gaps = active.filter((c) => fileGaps(c).length).length;
  const fig = (label, val, meta) => `<div class="fig"><small>${esc(label)}</small><b>${esc(val)}</b><span class="meta">${esc(meta)}</span></div>`;
  document.getElementById("bookFigs").innerHTML =
    fig("Clients", active.length, "Sample book") +
    fig("Policies in force", policies, "Across " + new Set(active.flatMap((c) => covers(c).map((p) => p.insurer))).size + " insurers") +
    fig("Reviews due in 30 days", due30, overdue + " overdue") +
    fig("In underwriting", uw, "Applications with insurers") +
    fig("Claims open", B.claims.filter((c) => c.stage !== "Paid").length, "Chris is supporting") +
    fig("Files missing an item", gaps, "Checklist set by compliance");

  // ----- client list -----
  const types = [...new Set(B.clients.flatMap((c) => c.covers.map((p) => p.type)))].sort();
  const sel = document.getElementById("bkCover");
  sel.innerHTML += types.map((t) => `<option>${esc(t)}</option>`).join("");

  function detail(c) {
    const fileRows = Object.entries(c.file).map(([k, v]) => `<li class="${v ? "ok" : "bad"}">${icon(v ? "check" : "alert-circle")}${esc(k)}</li>`).join("");
    return `<div class="bk-detail">
      <div><h4>Cover</h4><ul class="bk-pol">${c.covers.map((p) => `<li><b>${esc(p.type)}</b><span>${esc(p.insurer)}</span><span class="pill ${p.status === "In force" ? "ok" : p.status === "Lapsed" ? "bad" : "warn"}">${esc(p.status)}</span></li>`).join("")}</ul></div>
      <div><h4>Advice file</h4><ul class="bk-file">${fileRows}</ul></div>
      <div><h4>Notes</h4><p>${esc(c.note || "—")}</p><p class="muted small">Client since ${esc(c.since)} · last review ${esc(long(c.lastReview))} · found Chris via ${esc(c.source)}</p></div>
    </div>`;
  }

  function renderList() {
    const q = document.getElementById("bkQ").value.trim().toLowerCase();
    const t = sel.value;
    const rows = active.filter((c) => (!t || c.covers.some((p) => p.type === t)) &&
      (!q || [c.name, c.household, c.suburb, ...c.covers.map((p) => p.insurer)].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
    document.getElementById("bkList").innerHTML = rows.length ? `<div class="tbl-wrap"><table class="table bk-tbl">
      <thead><tr><th>Client</th><th>Cover</th><th>Insurers</th><th>Next review</th><th>File</th><th></th></tr></thead>
      <tbody>${rows.map((c) => `
        <tr class="rd bk-row" data-id="${esc(c.id)}" tabindex="0" aria-expanded="false">
          <td data-l="Client"><b>${esc(c.name)}</b><small class="muted bk-sub">${esc(c.household)} · ${esc(c.suburb)}</small></td>
          <td data-l="Cover">${covers(c).map((p) => `<span class="chipx">${esc(p.type)}</span>`).join("")}</td>
          <td data-l="Insurers" class="muted">${esc([...new Set(covers(c).map((p) => p.insurer))].join(", "))}</td>
          <td data-l="Review">${reviewPill(c)}</td>
          <td data-l="File">${fileGaps(c).length ? `<span class="pill warn">${fileGaps(c).length} missing</span>` : `<span class="pill ok">Complete</span>`}</td>
          <td class="rowbtns">${icon("chevron-down", "bk-chev")}</td>
        </tr>
        <tr class="note bk-more" hidden><td colspan="6">${detail(c)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="card-body"><div class="empty"><b>No clients match.</b></div></div>`;
  }
  root.addEventListener("click", (e) => { const r = e.target.closest(".bk-row"); if (r) toggle(r); });
  root.addEventListener("keydown", (e) => { const r = e.target.closest(".bk-row"); if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(r); } });
  function toggle(r) { const m = r.nextElementSibling; const open = m.hidden; m.hidden = !open; r.setAttribute("aria-expanded", String(open)); r.classList.toggle("open", open); }
  document.getElementById("bkQ").addEventListener("input", renderList);
  sel.addEventListener("change", renderList);
  renderList();

  // ----- reviews -----
  const due = active.filter((c) => days(c.nextReview) <= 60).sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  document.getElementById("bkReviews").innerHTML = due.length ? `<ul class="asklist">${due.map((c) => `
    <li><a href="#clients" data-open="${esc(c.id)}">${reviewPill(c)}<span><b style="font-weight:600">${esc(c.name)}</b>
    <small class="muted" style="display:block;font-size:12.5px;margin-top:2px">${esc(c.reviewWhy || "Annual review")} · ${esc(covers(c).map((p) => p.type).join(", "))}</small></span></a></li>`).join("")}</ul>`
    : `<div class="card-body"><div class="empty"><b>No reviews due.</b></div></div>`;
  root.addEventListener("click", (e) => {
    const a = e.target.closest("[data-open]"); if (!a) return;
    setTimeout(() => { const r = root.querySelector(`.bk-row[data-id="${a.dataset.open}"]`); if (r) { if (r.nextElementSibling.hidden) toggle(r); r.scrollIntoView({ block: "center" }); r.focus(); } }, 30);
  });

  // ----- pipeline -----
  const STAGES = ["Enquiry", "Needs analysis", "Recommendation", "Underwriting", "In force"];
  document.getElementById("bkPipe").innerHTML = `<div class="bk-stages">${STAGES.map((s) => {
    const ls = B.leads.filter((l) => l.stage === s);
    return `<div class="bk-stage"><h4>${esc(s)} <span>${ls.length}</span></h4>${ls.map((l) => `
      <div class="bk-lead"><b>${esc(l.name)}</b><small>${esc(l.need)}</small><small class="muted">${esc(l.next)}</small><span class="src">${esc(l.source)}</span></div>`).join("") || `<p class="muted small">None</p>`}</div>`;
  }).join("")}</div>`;
  const srcCount = {};
  [...B.clients, ...B.leads].forEach((l) => { srcCount[l.source] = (srcCount[l.source] || 0) + 1; });
  const max = Math.max(1, ...Object.values(srcCount));
  document.getElementById("bkSources").innerHTML = `<div class="card-body bk-srcs"><h4>Where clients and enquiries found Chris</h4>${Object.entries(srcCount).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
    `<div class="bk-bar"><span>${esc(k)}</span><i style="--w:${(v / max) * 100}%"></i><b>${v}</b></div>`).join("")}
    <p class="muted small">This is where the visibility work shows up: each enquiry records how they found him.</p></div>`;

  // ----- claims -----
  const CST = ["Lodged", "Insurer assessing", "More info requested", "Approved", "Paid"];
  document.getElementById("bkClaims").innerHTML = B.claims.length ? `<div class="tbl-wrap"><table class="table">
    <thead><tr><th>Client</th><th>Cover</th><th>Insurer</th><th>Stage</th><th>Next step</th><th>Opened</th></tr></thead>
    <tbody>${B.claims.map((c) => `<tr class="rd">
      <td data-l="Client"><b>${esc(c.client)}</b></td><td data-l="Cover">${esc(c.cover)}</td><td data-l="Insurer" class="muted">${esc(c.insurer)}</td>
      <td data-l="Stage"><span class="bk-prog" aria-label="${esc(c.stage)}">${CST.map((s, i) => `<i class="${i <= CST.indexOf(c.stage) ? "on" : ""}"></i>`).join("")}</span> <span class="pill ${c.stage === "More info requested" ? "warn" : c.stage === "Paid" || c.stage === "Approved" ? "ok" : "grey"}">${esc(c.stage)}</span></td>
      <td data-l="Next" class="muted">${esc(c.next)}</td><td data-l="Opened" class="muted">${esc(long(c.opened))}</td></tr>`).join("")}</tbody></table></div>`
    : `<div class="card-body"><div class="empty"><b>No claims open.</b></div></div>`;

  // ----- router -----
  function route() {
    const h = location.hash.replace("#", "");
    const r = ROUTES[h] ? h : "";
    document.body.dataset.route = r ? "book" : "home";
    root.dataset.tab = r || "clients";
    DASH.setTitle(r ? ROUTES[r] : "Visibility", r ? "Sample book · preview" : "");
    document.querySelectorAll(".dash-nav a[href]").forEach((a) => {
      const id = a.getAttribute("href").replace("#", "");
      a.classList.toggle("on", r ? id === r : (id === "" || id === "asks") && (h === id || (id === "" && h !== "asks")));
    });
    if (r) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  const wait = setInterval(() => { if (document.querySelector(".dash-nav")) { clearInterval(wait); route(); } }, 50);
})();
