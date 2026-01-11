/* ============================================================================
  make_video_bieucam.js  (SYNC / STABLE PATHS)
  - Manifest:   /substance/manifest.json
  - Story file: /substance/<filename>.json
  - Characters: /adn/xomnganchuyen/XNC_characters.json
============================================================================ */

(() => {
  "use strict";

  /* =========================
   *  CONFIG: FIXED PATHS
   * ========================= */
  const PATHS = {
    manifest: "/substance/manifest.json",
    characters: "/adn/xomnganchuyen/XNC_characters.json",
    storyBase: "/substance/", // story file = storyBase + filename
  };

  /* =========================
   *  STATE
   * ========================= */
  const AppState = {
    data: {
      charactersAll: [], // [{id,label,gender,desc, ...raw}]
      manifestItems: [], // [{id,title,file,...}]
    },
    story: {
      id: "",
      title: "",
      rawText: "",
      characters: [], // selected/auto
      loadedFrom: "",
      json: null, // story json loaded
    },
    ui: {
      selectedCharIds: new Set(),
      // Keep a stable "current story file" value
      currentStoryFile: "",
    },
  };

  /* =========================
   *  DOM HELPERS (tolerant IDs)
   * ========================= */
  const byId = (id) => document.getElementById(id);

  function pickEl(...ids) {
    for (const id of ids) {
      const el = byId(id);
      if (el) return el;
    }
    return null;
  }

  // Buttons / selects (support old/new HTML id variants)
  const els = () => ({
    // manifest/story select
    storySelect: pickEl("storySelect", "story-select", "story_select"),
    reloadManifestBtn: pickEl("reloadManifestBtn", "reload-manifest-btn"),
    loadStoryBtn: pickEl("loadStoryBtn", "load-story-btn"),

    // manifest status text
    manifestStatus: pickEl("manifestStatus", "manifest-status"),
    manifestPath: pickEl("manifestPath", "manifest-path"),

    // story fields
    storyId: pickEl("storyId", "story-id"),
    storyTitle: pickEl("storyTitle", "story-title"),
    storyContent: pickEl("storyContent", "story-content", "storyText", "storyRawText", "story-content-textarea"),

    // participants UI
    participantsWrap: pickEl("participantsWrap", "participants", "participants-grid", "participantsGrid"),
    selectedCount: pickEl("selectedCount", "selected-count"),
    charSearch: pickEl("charSearch", "char-search"),
    btnSelectAll: pickEl("btnSelectAll", "btn-select-all"),
    btnClearChars: pickEl("btnClearChars", "btn-clear"),

    // actions
    splitScenesBtn: pickEl("splitScenesBtn", "split-scenes-btn"),
    jsonOutput: pickEl("storyJsonPreview", "story-json-output", "json-output", "preview-json"),
  });

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function setValue(el, value) {
    if (!el) return;
    el.value = value ?? "";
  }

  function getValue(el) {
    if (!el) return "";
    return (el.value ?? "").toString();
  }

  function safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function prettyJson(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "{}";
    }
  }

  /* =========================
   *  FETCH
   * ========================= */
  async function fetchJSON(path) {
    // IMPORTANT: do NOT try to "guess" base url; use absolute path
    console.log("[XNC] fetchJSON:", path);
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${path} -> ${res.status}`);
    }
    return await res.json();
  }

  function normalizeStoryFileToUrl(file) {
    // Accept:
    // - "XNC-....json"
    // - "/substance/XNC-....json"
    // - "substance/XNC-....json"
    // Always return: "/substance/XNC-....json"
    if (!file) return "";
    const s = String(file).trim();

    if (s.startsWith("http://") || s.startsWith("https://")) {
      // not expected in your setup, but allow
      return s;
    }

    if (s.startsWith(PATHS.storyBase)) return s; // already "/substance/..."
    if (s.startsWith("/")) {
      // "/XNC-...json" => treat as root file, but your standard is /substance/
      // If user stored absolute root path, keep it.
      return s;
    }

    if (s.startsWith("substance/")) return "/" + s; // "substance/..." => "/substance/..."
    return PATHS.storyBase + s.replace(/^\/+/, "");
  }

  /* =========================
   *  LOAD CHARACTERS
   * ========================= */
  async function loadCharacters() {
    const json = await fetchJSON(PATHS.characters);

    // Allow either array or {characters:[...]} formats
    const arr = Array.isArray(json) ? json : (Array.isArray(json.characters) ? json.characters : []);
    AppState.data.charactersAll = arr
      .map((c) => ({
        raw: c,
        id: c.id || c.char_id || c.key || c.code || "",
        label: c.label || c.name || c.title || "",
        gender: c.gender || "",
        desc: c.desc || c.description || c.role || "",
      }))
      .filter((c) => c.id || c.label);

    console.log("[XNC] Loaded characters:", AppState.data.charactersAll.length, "from", PATHS.characters);
  }

  /* =========================
   *  PARTICIPANTS UI
   * ========================= */
  function renderParticipants() {
    const { participantsWrap, selectedCount, charSearch } = els();
    if (!participantsWrap) {
      console.warn("[XNC] Participants UI missing in HTML");
      return;
    }

    const q = (getValue(charSearch) || "").trim().toLowerCase();
    const list = AppState.data.charactersAll.filter((c) => {
      if (!q) return true;
      return (
        (c.label && c.label.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.desc && c.desc.toLowerCase().includes(q))
      );
    });

    participantsWrap.innerHTML = list
      .map((c) => {
        const checked = AppState.ui.selectedCharIds.has(c.id) ? "checked" : "";
        const meta = [c.gender, c.desc, c.id].filter(Boolean).join(" • ");
        return `
          <label class="char-card ${checked ? "selected" : ""}" style="display:flex;align-items:center;gap:10px;margin:6px 0;">
            <input type="checkbox" data-char-id="${escapeHtml(c.id)}" ${checked} />
            <div class="meta" style="line-height:1.2;">
              <div class="name" style="font-weight:700;">${escapeHtml(c.label || c.id)}</div>
              <div class="desc" style="font-size:12px;opacity:.75;">${escapeHtml(meta)}</div>
            </div>
          </label>
        `;
      })
      .join("");

    participantsWrap.querySelectorAll('input[type="checkbox"][data-char-id]').forEach((cb) => {
      cb.addEventListener("change", () => {
        const id = cb.getAttribute("data-char-id") || "";
        if (!id) return;
        if (cb.checked) AppState.ui.selectedCharIds.add(id);
        else AppState.ui.selectedCharIds.delete(id);

        updateSelectedCount();
        // re-render to update card highlight
        renderParticipants();
      });
    });

    updateSelectedCount();
  }

  function updateSelectedCount() {
    const { selectedCount } = els();
    if (selectedCount) selectedCount.textContent = String(AppState.ui.selectedCharIds.size);
  }

  function selectAllCharacters() {
    AppState.data.charactersAll.forEach((c) => {
      if (c.id) AppState.ui.selectedCharIds.add(c.id);
    });
    updateSelectedCount();
    renderParticipants();
  }

  function clearAllCharacters() {
    AppState.ui.selectedCharIds.clear();
    updateSelectedCount();
    renderParticipants();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =========================
   *  LOAD MANIFEST
   * ========================= */
  function normalizeManifestItems(json) {
    // Support:
    // - {items:[{id,title,file}...]}
    // - [{id,title,file}...]
    const rawItems = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : []);
    const items = rawItems
      .map((it) => ({
        id: it.id || it.storyId || it.key || "",
        title: it.title || it.name || "",
        file: it.file || it.filename || it.path || "", // IMPORTANT
        raw: it,
      }))
      .filter((it) => it.file || it.id);

    return items;
  }

  function renderManifestSelect() {
    const { storySelect } = els();
    if (!storySelect) return;

    const items = AppState.data.manifestItems;
    storySelect.innerHTML =
      `<option value="">-- Chọn truyện --</option>` +
      items
        .map((it) => {
          // Store filename/path in value (NOT id)
          // If manifest file is empty but id exists => try default "<id>.json"
          const file = it.file || (it.id ? `${it.id}.json` : "");
          const label = `${it.id || "(no-id)"}${it.title ? " • " + it.title : ""}`;
          return `<option value="${escapeHtml(file)}">${escapeHtml(label)}</option>`;
        })
        .join("");

    // Keep current selection if still exists
    if (AppState.ui.currentStoryFile) {
      const exists = [...storySelect.options].some((o) => o.value === AppState.ui.currentStoryFile);
      if (exists) storySelect.value = AppState.ui.currentStoryFile;
    }
  }

  async function loadManifest() {
    const { manifestStatus, manifestPath } = els();
    try {
      const json = await fetchJSON(PATHS.manifest);
      AppState.data.manifestItems = normalizeManifestItems(json);

      setText(manifestPath, PATHS.manifest);
      setText(
        manifestStatus,
        AppState.data.manifestItems.length
          ? `Manifest: OK (${AppState.data.manifestItems.length} truyện)`
          : "Manifest rỗng / sai format"
      );

      renderManifestSelect();
      console.log("[XNC] Loaded manifest items:", AppState.data.manifestItems.length, "from", PATHS.manifest);
    } catch (err) {
      setText(manifestPath, PATHS.manifest);
      setText(manifestStatus, `Manifest lỗi: ${String(err.message || err)}`);
      console.error("[XNC] loadManifest error:", err);
      alert(`Load manifest lỗi: ${String(err.message || err)}`);
    }
  }

  /* =========================
   *  LOAD STORY FROM SELECT
   * ========================= */
  function setStoryToUI({ id, title, rawText }) {
    const { storyId, storyTitle, storyContent } = els();
    if (storyId) storyId.value = id || "";
    if (storyTitle) storyTitle.value = title || "";
    if (storyContent) storyContent.value = rawText || "";

    AppState.story.id = id || "";
    AppState.story.title = title || "";
    AppState.story.rawText = rawText || "";
  }

  function updateStoryPreview(extra = {}) {
    const { jsonOutput } = els();
    if (!jsonOutput) return;

    const payload = {
      loadedFrom: AppState.story.loadedFrom || "",
      storyId: AppState.story.id || "",
      title: AppState.story.title || "",
      textLen: (AppState.story.rawText || "").length,
      selectedCharacters: [...AppState.ui.selectedCharIds],
      ...extra,
    };
    jsonOutput.textContent = prettyJson(payload);
  }

  function autoSelectCharactersFromStory(storyJson) {
    // storyJson.characters may be: ["bolo", "Ba-La", ...] or [{id,label}, ...]
    const chars = storyJson?.characters;
    if (!chars) return;

    const all = AppState.data.charactersAll;
    const matchById = new Map(all.map((c) => [c.id, c]));
    const matchByLabel = new Map(all.map((c) => [String(c.label || "").toLowerCase(), c]));

    const picked = [];
    if (Array.isArray(chars)) {
      for (const x of chars) {
        if (typeof x === "string") {
          const key = x.trim();
          const c1 = matchById.get(key);
          const c2 = matchByLabel.get(key.toLowerCase());
          const found = c1 || c2;
          if (found?.id) picked.push(found.id);
        } else if (x && typeof x === "object") {
          const keyId = (x.id || x.char_id || "").trim();
          const keyLabel = (x.label || x.name || "").trim();
          const found =
            (keyId && matchById.get(keyId)) ||
            (keyLabel && matchByLabel.get(keyLabel.toLowerCase())) ||
            null;
          if (found?.id) picked.push(found.id);
        }
      }
    }

    // Only auto-select if it finds anything meaningful; do not wipe user's existing selection.
    if (picked.length) {
      picked.forEach((id) => AppState.ui.selectedCharIds.add(id));
      updateSelectedCount();
      renderParticipants();
    }

    console.log("[XNC] Auto-selected characters:", picked.length, picked);
  }

  async function loadSelectedStory() {
    const { storySelect } = els();
    if (!storySelect) {
      alert("Không tìm thấy dropdown chọn truyện (storySelect).");
      return;
    }

    const fileValue = (storySelect.value || "").trim();
    if (!fileValue) {
      alert("Bạn chưa chọn truyện trong dropdown.");
      return;
    }

    // IMPORTANT: remember currently selected file
    AppState.ui.currentStoryFile = fileValue;

    const url = normalizeStoryFileToUrl(fileValue);
    try {
      console.log("[XNC] Loading story from:", url);
      const storyJson = await fetchJSON(url);

      // Accept many story json schemas:
      // {id,title,story|rawText|content|text, characters}
      const id = storyJson.id || storyJson.storyId || "";
      const title = storyJson.title || storyJson.name || "";
      const rawText =
        storyJson.story ||
        storyJson.rawText ||
        storyJson.content ||
        storyJson.text ||
        storyJson.story_text ||
        "";

      AppState.story.loadedFrom = url;
      AppState.story.json = storyJson;

      setStoryToUI({ id, title, rawText });
      autoSelectCharactersFromStory(storyJson);

      updateStoryPreview({ loadedFrom: url, storyId: id, title });

      console.log("[XNC] Story loaded OK:", { id, title, textLen: rawText.length });
    } catch (err) {
      console.error("[XNC] loadSelectedStory error:", err);
      alert(`Load truyện lỗi: ${String(err.message || err)}`);
    }
  }

  /* =========================
   *  SPLIT SCENES (placeholder hook)
   *  - This is where your existing split logic should run.
   *  - Critical fix: always read from the correct textarea (multi-id tolerant)
   * ========================= */
  function getStoryTextForSplit() {
    const { storyContent } = els();
    const text = (storyContent && storyContent.value) ? storyContent.value : "";
    return (text || "").trim();
  }

  function splitScenesFromStory() {
    const text = getStoryTextForSplit();
    if (!text) {
      alert("Bạn chưa có nội dung truyện.");
      return;
    }

    if (AppState.ui.selectedCharIds.size < 1) {
      alert("Bạn cần chọn ít nhất 1 nhân vật tham gia.");
      return;
    }

    // IMPORTANT: keep state consistent
    AppState.story.rawText = text;

    // >>> TODO: Plug your real splitter here <<<
    // For now, just preview that it passed validations.
    updateStoryPreview({
      ok: true,
      action: "splitScenesFromStory",
      storyTextLen: text.length,
      selectedCount: AppState.ui.selectedCharIds.size,
    });

    console.log("[XNC] splitScenesFromStory OK. textLen:", text.length);
  }

  /* =========================
   *  EVENTS
   * ========================= */
  function bindEvents() {
    const {
      reloadManifestBtn,
      loadStoryBtn,
      btnSelectAll,
      btnClearChars,
      charSearch,
      splitScenesBtn,
      storySelect,
      storyId,
      storyTitle,
      storyContent,
    } = els();

    if (reloadManifestBtn) reloadManifestBtn.addEventListener("click", loadManifest);
    if (loadStoryBtn) loadStoryBtn.addEventListener("click", loadSelectedStory);

    if (btnSelectAll) btnSelectAll.addEventListener("click", selectAllCharacters);
    if (btnClearChars) btnClearChars.addEventListener("click", clearAllCharacters);

    if (charSearch) charSearch.addEventListener("input", renderParticipants);

    if (splitScenesBtn) splitScenesBtn.addEventListener("click", splitScenesFromStory);

    // Keep preview live when user edits inputs manually
    if (storySelect) {
      storySelect.addEventListener("change", () => {
        AppState.ui.currentStoryFile = (storySelect.value || "").trim();
      });
    }
    if (storyId) storyId.addEventListener("input", () => updateStoryPreview({}));
    if (storyTitle) storyTitle.addEventListener("input", () => updateStoryPreview({}));
    if (storyContent) storyContent.addEventListener("input", () => {
      AppState.story.rawText = storyContent.value || "";
      updateStoryPreview({});
    });
  }

  /* =========================
   *  INIT
   * ========================= */
  async function init() {
    try {
      await loadCharacters();
      renderParticipants();
      await loadManifest();
      bindEvents();

      updateStoryPreview({ init: "OK" });
      console.log("[XNC] Init OK");
    } catch (err) {
      console.error("[XNC] init error:", err);
      alert(`Init lỗi: ${String(err.message || err)}`);
    }
  }

  // Start after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
