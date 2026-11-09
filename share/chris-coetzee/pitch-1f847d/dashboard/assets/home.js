// Home: headline figures (each dated, with its source), the latest visibility check per engine, open asks.
// Empty states over placeholders: nothing is shown that is not in the store.
(async function () {
  "use strict";
  const { api, icon, esc, d } = DASH;

  let user;
  try { user = await DASH.init({ active: "home", title: "Overview", sub: "" }); }
  catch { return; }
  const admin = user.role === "admin";
  const cfg = DASH.config;
  document.getElementById("foot").textContent = (cfg.copy && cfg.copy.footer) || "";

  const long = (s) => (s ? d.fmtShort(s) + " " + s.slice(0, 4) : "");
  const pillFor = (r) => r === "Named" ? "ok" : (r === "Not named" || r === "Wrong details") ? "bad" : "grey";

  if (admin) {
    document.getElementById("topActions").innerHTML =
      `<button class="btn btn-ghost btn-sm" id="addFig">${icon("plus")}Figure</button>` +
      `<button class="btn btn-ghost btn-sm" id="addRd">${icon("plus")}Check</button>`;
  }

  async function load() {
    let data;
    try { data = await api("/api/home"); }
    catch (e) { document.getElementById("loading").textContent = "Could not load: " + e.message; return; }
    document.getElementById("loading").hidden = true;
    document.getElementById("home").hidden = false;
    render(data);
  }

  function render(data) {
    const figs = document.getElementById("figs");
    figs.innerHTML = data.metrics.length
      ? data.metrics.map((m) => `
        <div class="fig">
          <small>${esc(m.label)}</small>
          <b>${esc(m.value)}</b>
          ${m.prev ? `<span class="was">was ${esc(m.prev)}</span>` : ""}
          <span class="meta">${esc(m.period ? m.period : "Checked " + long(m.asOf))} · ${esc(m.source)}</span>
          ${admin ? `<button class="x" data-del-fig="${esc(m.id)}" aria-label="Remove figure">${icon("x")}</button>` : ""}
        </div>`).join("")
      : `<div class="empty"><b>No figures yet.</b> They appear here once the first check is logged.</div>`;

    const rd = document.getElementById("readings");
    rd.innerHTML = data.latestReadings.length
      ? `<div class="tbl-wrap"><table class="table">
          <thead><tr><th>Engine</th><th>Search</th><th>Result</th><th>Where</th><th>Checked</th>${admin ? "<th></th>" : ""}</tr></thead>
          <tbody>${data.latestReadings.map((r) => `
            <tr class="rd">
              <td data-l="Engine">${esc(r.engine)}</td>
              <td class="q" data-l="Search">${esc(r.query)}</td>
              <td data-l="Result"><span class="pill ${pillFor(r.result)}">${esc(r.result)}</span></td>
              <td class="muted" data-l="Where">${esc(r.position || "")}</td>
              <td class="muted" data-l="Checked">${esc(long(r.date))}</td>
              ${admin ? `<td class="rowbtns"><button class="btn btn-ghost" data-del-rd="${esc(r.id)}" aria-label="Remove check">${icon("trash")}</button></td>` : ""}
            </tr>
            ${r.note ? `<tr class="note"><td colspan="${admin ? 6 : 5}">${esc(r.note)}</td></tr>` : ""}`).join("")}
          </tbody></table></div>`
      : `<div class="card-body"><div class="empty"><b>No checks logged yet.</b></div></div>`;

    const asks = document.getElementById("asksList");
    asks.innerHTML = data.asks.length
      ? data.asks.map((a) => `<li><a href="#asks" title="${esc(a.detail||"")}">
          <span class="pill ${a.status === "open" ? "warn" : "ok"}">${a.status === "open" ? "Open" : "Answered"}</span>
          <span><b style="font-weight:600">${esc(a.title)}</b><small class="muted" style="display:block;font-size:12.5px;margin-top:2px">${esc(a.detail||"")}</small></span></a></li>`).join("")
      : `<li class="none muted">Nothing needed right now.</li>`;
  }

  // ----- admin forms -----
  const figForm = document.getElementById("figForm");
  const rdForm = document.getElementById("rdForm");
  figForm.innerHTML = `
    <div class="card-header"><h3>Add a figure</h3></div>
    <div class="card-body fgrid">
      <label><span class="form-label">Label</span><input class="form-control" name="label" required maxlength="80"></label>
      <label><span class="form-label">Value</span><input class="form-control" name="value" required maxlength="40"></label>
      <label><span class="form-label">Previous value</span><input class="form-control" name="prev" maxlength="40"></label>
      <label><span class="form-label">Checked on</span><input class="form-control" type="date" name="asOf" required value="${d.today()}"></label>
      <label class="w2"><span class="form-label">Period (optional)</span><input class="form-control" name="period" maxlength="120" placeholder="e.g. 3 months to 21 Sep 2026"></label>
      <label class="w2"><span class="form-label">Source</span><input class="form-control" name="source" required maxlength="120" placeholder="e.g. Google Search Console"></label>
      <div class="w2 acts"><button class="btn btn-primary" type="submit">Save</button><button class="btn btn-ghost" type="button" data-cancel>Cancel</button></div>
    </div>`;
  rdForm.innerHTML = `
    <div class="card-header"><h3>Log a visibility check</h3></div>
    <div class="card-body fgrid">
      <label><span class="form-label">Engine</span><input class="form-control" name="engine" required maxlength="60" list="engines"></label>
      <datalist id="engines"><option>ChatGPT</option><option>Google AI Mode</option><option>Google AI Overview</option><option>Perplexity</option><option>Gemini</option><option>Copilot</option><option>Google local 3-pack</option><option>Google organic</option></datalist>
      <label><span class="form-label">Checked on</span><input class="form-control" type="date" name="date" required value="${d.today()}"></label>
      <label class="w2"><span class="form-label">Search</span><input class="form-control" name="query" required maxlength="200"></label>
      <label><span class="form-label">Result</span><select class="form-select" name="result"><option>Named</option><option>Not named</option><option>Not shown</option></select></label>
      <label><span class="form-label">Where (optional)</span><input class="form-control" name="position" maxlength="80" placeholder="e.g. 2nd of 3"></label>
      <label class="w2"><span class="form-label">Note (optional)</span><input class="form-control" name="note" maxlength="1000"></label>
      <div class="w2 acts"><button class="btn btn-primary" type="submit">Save</button><button class="btn btn-ghost" type="button" data-cancel>Cancel</button></div>
    </div>`;

  function wire(form, url) {
    form.addEventListener("click", (e) => { if (e.target.closest("[data-cancel]")) form.hidden = true; });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      try { await api(url, { method: "POST", body }); form.reset(); form.hidden = true; DASH.toast("Saved"); load(); }
      catch (err) { DASH.toast(err.message, true); }
    });
  }
  wire(figForm, "/api/metrics");
  wire(rdForm, "/api/readings");

  document.addEventListener("click", async (e) => {
    if (e.target.closest("#addFig")) { figForm.hidden = false; rdForm.hidden = true; figForm.scrollIntoView({ block: "nearest" }); return; }
    if (e.target.closest("#addRd")) { rdForm.hidden = false; figForm.hidden = true; rdForm.scrollIntoView({ block: "nearest" }); return; }
    const del = e.target.closest("[data-del-fig],[data-del-rd]");
    if (!del) return;
    if (del.dataset.armed !== "1") { del.dataset.armed = "1"; del.classList.add("armed"); del.title = "Click again to remove"; setTimeout(() => { del.dataset.armed = ""; del.classList.remove("armed"); }, 3000); return; }
    const url = del.dataset.delFig ? `/api/metrics?id=${encodeURIComponent(del.dataset.delFig)}` : `/api/readings?id=${encodeURIComponent(del.dataset.delRd)}`;
    try { await api(url, { method: "DELETE" }); DASH.toast("Removed"); load(); } catch (err) { DASH.toast(err.message, true); }
  });

  load();
})();
