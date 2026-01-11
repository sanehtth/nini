/* =========================================================
   XNC – Tab 1: Load truyện từ Substance Manifest + Chọn nhân vật
   FIX trọng điểm:
   - Bắt click cho cả 2 kiểu id nút: btnLoadStory / loadStoryBtn, btnReloadManifest / reloadManifestBtn
   - event.preventDefault() để không bị submit form gây "treo"
   - option.value = file path thật => chọn 005 load đúng 005
   ========================================================= */

(function () {
  "use strict";

  const PATHS = {
    manifest: "/substance/manifest.json",
    characters: "/adn/xomnganchuyen/XNC_characters.json",
  };

  const App = {
    manifestItems: [],
    charactersAll: [],
    characterMap: {},
  };

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const $any = (...ids) => ids.map((x) => $(x)).find(Boolean) || null;

  function escHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);
    return res.json();
  }

  // ---------- Characters ----------
  function normalizeCharacter(c) {
    const id = (c.id || c.char_id || c.code || "").trim();
    const label = (c.label || c.name || c.title || id).trim();
    const gender = (c.gender || "").trim();
    const role = (c.role || c.desc || "").trim();
    return { id, label, gender, role };
  }

  function renderParticipantsList(chars) {
    const container = $any("participantsList");
    if (!container) {
      console.warn("[XNC] Missing #participantsList in HTML");
      return;
    }
    container.innerHTML = "";

    chars.forEach((c) => {
      const sub = [c.gender, c.role].filter(Boolean).join(" • ");

      const row = document.createElement("label");
      row.className = "participant-row";
      row.style.display = "block";
      row.style.padding = "8px 10px";
      row.style.border = "1px solid #dfe6d9";
      row.style.borderRadius = "10px";
      row.style.margin = "8px 0";
      row.style.background = "#f6fff1";
      row.style.cursor = "pointer";

      row.innerHTML = `
        <input class="xnc-participant" type="checkbox"
               value="${escHtml(c.id)}"
               data-label="${escHtml(c.label)}"
               style="margin-right:10px; transform: translateY(1px);">
        <b>${escHtml(c.label)}</b>
        <div style="font-size:12px; opacity:0.75; margin-left:26px;">
          ${escHtml(sub || "")}${sub ? " • " : ""}${escHtml(c.id)}
        </div>
      `;

      container.appendChild(row);
    });

    container.addEventListener(
      "change",
      (e) => {
        const box = e.target?.classList?.contains("xnc-participant")
          ? e.target
          : null;
        if (!box) return;
        const row = box.closest("label");
        if (row) row.style.outline = box.checked ? "2px solid #30a46c" : "none";
        updateSelectedCount();
      },
      { passive: true }
    );

    updateSelectedCount();
  }

  function getSelectedParticipants() {
    const checked = Array.from(document.querySelectorAll(".xnc-participant:checked"));
    return checked.map((el) => ({
      id: el.value,
      label: el.dataset.label || el.value,
    }));
  }

  function updateSelectedCount() {
    const el = $any("participantsCount");
    if (!el) return;
    el.textContent = `Đã chọn: ${getSelectedParticipants().length}`;
  }

  function applyParticipantsFromStory(participants) {
    const wantIds = new Set();
    const wantLabels = new Set();

    (participants || []).forEach((p) => {
      if (!p) return;
      if (typeof p === "string") wantLabels.add(p.trim());
      else {
        if (p.id) wantIds.add(String(p.id).trim());
        if (p.label) wantLabels.add(String(p.label).trim());
        if (p.name) wantLabels.add(String(p.name).trim());
      }
    });

    const boxes = Array.from(document.querySelectorAll(".xnc-participant"));
    boxes.forEach((b) => {
      const id = b.value;
      const label = b.dataset.label || "";
      b.checked = wantIds.has(id) || wantLabels.has(label);

      const row = b.closest("label");
      if (row) row.style.outline = b.checked ? "2px solid #30a46c" : "none";
    });

    updateSelectedCount();
  }

  function bindParticipantSearch() {
    const input = $any("participantsSearch");
    if (!input) return;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      const list = $any("participantsList");
      const rows = Array.from(list?.querySelectorAll("label") || []);
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = !q || text.includes(q) ? "block" : "none";
      });
    });
  }

  // ---------- Manifest + Load story ----------
  function normalizeManifestItems(raw) {
    const arr = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.stories)
      ? raw.stories
      : [];

    return arr
      .map((it) => {
        const id = (it.id || it.storyId || it.code || "").trim();
        const title = (it.title || it.name || "").trim();
        const file = (it.file || it.path || it.url || "").trim();
        if (!id) return null;

        const resolvedFile = file
          ? file.startsWith("/")
            ? file
            : `/${file.replace(/^\.?\//, "")}`
          : `/substance/${id}.json`;

        return { id, title, file: resolvedFile };
      })
      .filter(Boolean);
  }

  function renderManifestSelect(items) {
    const sel = $any("storySelect");
    if (!sel) {
      console.warn("[XNC] Missing #storySelect in HTML");
      return;
    }
    sel.innerHTML = "";

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "-- Chọn truyện --";
    sel.appendChild(opt0);

    items.forEach((it) => {
      const opt = document.createElement("option");
      // FIX: value là path thật
      opt.value = it.file;
      opt.textContent = it.title ? `${it.id} • ${it.title}` : it.id;
      opt.dataset.id = it.id;
      opt.dataset.title = it.title || "";
      sel.appendChild(opt);
    });
  }

  async function loadManifest() {
    const statusEl = $any("manifestStatus");
    const pathEl = $any("manifestPath");

    try {
      const raw = await fetchJSON(PATHS.manifest);
      const items = normalizeManifestItems(raw);

      App.manifestItems = items;
      renderManifestSelect(items);

      if (statusEl) statusEl.textContent = `Manifest: OK (${items.length} truyện)`;
      if (pathEl) pathEl.textContent = PATHS.manifest;

      console.log("[XNC] Loaded manifest:", items.length, "from", PATHS.manifest);
    } catch (e) {
      console.error("[XNC] loadManifest error:", e);
      App.manifestItems = [];
      renderManifestSelect([]);

      if (statusEl) statusEl.textContent = "Manifest rỗng / sai format";
      if (pathEl) pathEl.textContent = PATHS.manifest;

      alert("Không load được manifest: " + e.message);
    }
  }

  async function loadSelectedStory() {
    const sel = $any("storySelect");
    if (!sel) {
      alert("Thiếu dropdown storySelect trong HTML.");
      return;
    }

    const file = (sel.value || "").trim();
    console.log("[XNC] loadSelectedStory() sel.value =", file);

    if (!file) {
      alert("Bạn chưa chọn truyện trong dropdown.");
      return;
    }

    const opt = sel.options[sel.selectedIndex];
    const idFromOpt = opt?.dataset?.id || "";
    const titleFromOpt = opt?.dataset?.title || "";

    try {
      const storyJson = await fetchJSON(file);

      const id = storyJson.id || storyJson.storyId || storyJson.story_id || idFromOpt || "";
      const title = storyJson.title || storyJson.name || storyJson.story_title || titleFromOpt || "";
      const rawText =
        storyJson.story ||
        storyJson.rawText ||
        storyJson.text ||
        storyJson.content ||
        "";

      let participants = [];
      if (Array.isArray(storyJson.characters)) participants = storyJson.characters;
      else if (Array.isArray(storyJson.participants)) participants = storyJson.participants;
      else if (Array.isArray(storyJson.character_ids)) {
        participants = storyJson.character_ids.map((cid) => ({
          id: cid,
          label: App.characterMap?.[cid]?.label || cid,
        }));
      }

      const idEl = $any("storyId");
      const titleEl = $any("storyTitle");
      const rawEl = $any("storyRawText");

      if (idEl) idEl.value = id;
      if (titleEl) titleEl.value = title;
      if (rawEl) rawEl.value = rawText;

      applyParticipantsFromStory(participants);

      console.log("[XNC] Story loaded:", { id, title, file });
    } catch (e) {
      console.error("[XNC] loadSelectedStory error:", e);
      alert("Load truyện lỗi: " + e.message);
    }
  }

  // ---------- Button bindings (FIX ID) ----------
  function bindButtons() {
    // Bắt cả 2 kiểu id
    const btnReload = $any("btnReloadManifest", "reloadManifestBtn");
    const btnLoad = $any("btnLoadStory", "loadStoryBtn");

    if (!btnReload) console.warn("[XNC] Missing reload manifest button id: btnReloadManifest/reloadManifestBtn");
    if (!btnLoad) console.warn("[XNC] Missing load story button id: btnLoadStory/loadStoryBtn");

    btnReload?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      loadManifest();
    });

    btnLoad?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      loadSelectedStory();
    });

    const btnAll = $any("btnSelectAllParticipants");
    const btnClear = $any("btnClearParticipants");

    btnAll?.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".xnc-participant").forEach((b) => {
        b.checked = true;
        const row = b.closest("label");
        if (row) row.style.outline = "2px solid #30a46c";
      });
      updateSelectedCount();
    });

    btnClear?.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".xnc-participant").forEach((b) => {
        b.checked = false;
        const row = b.closest("label");
        if (row) row.style.outline = "none";
      });
      updateSelectedCount();
    });

    // Optional: chọn dropdown xong tự load luôn (đỡ phải bấm)
    const sel = $any("storySelect");
    sel?.addEventListener("change", () => {
      // Không auto-load nếu bạn không muốn, comment dòng dưới:
      // loadSelectedStory();
    });
  }

  // ---------- Init ----------
  async function init() {
    try {
      const rawChars = await fetchJSON(PATHS.characters);
      const charsRaw = Array.isArray(rawChars)
        ? rawChars
        : rawChars?.characters || rawChars?.items || [];

      const chars = charsRaw
        .map(normalizeCharacter)
        .filter((c) => c.id);

      App.charactersAll = chars;
      App.characterMap = {};
      chars.forEach((c) => (App.characterMap[c.id] = c));

      renderParticipantsList(chars);
      bindParticipantSearch();

      console.log("[XNC] Loaded characters:", chars.length, "from", PATHS.characters);
    } catch (e) {
      console.error("[XNC] Load characters failed:", e);
      alert("Không load được danh sách nhân vật: " + e.message);
    }

    bindButtons();
    await loadManifest();

    console.log("[XNC] Init OK");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
