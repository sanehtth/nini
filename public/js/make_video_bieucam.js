/* =========================================================
 * make_video_bieucam.js  (SAFE PATH VERSION)
 * Web root = /public in repo, so URLs MUST NOT include /public
 * ========================================================= */

"use strict";

/** -----------------------------
 *  Fixed paths (NO "/public")
 *  ----------------------------- */
const PATHS = {
  manifest: "/substance/manifest.json",
  characters: "/adn/xomnganchuyen/XNC_characters.json",
};

/** -----------------------------
 *  DOM helpers
 *  ----------------------------- */
const $ = (id) => document.getElementById(id);

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text ?? "";
}

function setValue(id, val) {
  const el = $(id);
  if (el) el.value = val ?? "";
}

/** -----------------------------
 *  Fetch helper (logs the exact path)
 *  ----------------------------- */
async function fetchJSON(path) {
  console.log("[XNC] fetchJSON:", path);
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

/** -----------------------------
 *  App state
 *  ----------------------------- */
const AppState = {
  manifestItems: [],
  charactersAll: [],     // [{id,label,gender,desc}]
  selectedParticipants: new Set(), // store character ids
  loadedStoryFile: "",   // currently loaded file path from manifest
  loadedStoryJson: null,
};

/** -----------------------------
 *  Manifest
 *  Expected format:
 *  {
 *    "version": 1,
 *    "items": [{ "id": "...", "title":"...", "file":"/substance/XXX.json" }]
 *  }
 *  ----------------------------- */
async function loadManifest() {
  try {
    const json = await fetchJSON(PATHS.manifest);
    const items = Array.isArray(json?.items) ? json.items : [];

    // Normalize items but DO NOT "fix" path by string concat.
    AppState.manifestItems = items
      .map((it) => ({
        id: (it.id || "").trim(),
        title: (it.title || "").trim(),
        file: (it.file || "").trim(), // must be absolute like "/substance/....json"
      }))
      .filter((it) => it.file && it.file.startsWith("/"));

    renderManifestSelect(AppState.manifestItems);
    setText(
      "manifestStatus",
      AppState.manifestItems.length
        ? `Manifest: OK (${AppState.manifestItems.length} truyện) • ${PATHS.manifest}`
        : "Manifest rỗng / sai format"
    );
    console.log("[XNC] Loaded manifest items:", AppState.manifestItems.length);
  } catch (e) {
    console.error("[XNC] loadManifest error:", e);
    AppState.manifestItems = [];
    renderManifestSelect([]);
    setText("manifestStatus", `Manifest lỗi: ${String(e.message || e)}`);
  }
}

function renderManifestSelect(items) {
  const sel = $("storySelect");
  if (!sel) return;

  // IMPORTANT: option.value = item.file (full path).
  sel.innerHTML =
    `<option value="">-- Chọn truyện --</option>` +
    items
      .map((it) => {
        const label = `${it.id}${it.title ? " • " + it.title : ""}`;
        // data-id/title useful for filling UI, but value MUST be "file"
        return `<option value="${escapeHtmlAttr(it.file)}"
                  data-id="${escapeHtmlAttr(it.id)}"
                  data-title="${escapeHtmlAttr(it.title)}">${escapeHtmlText(label)}</option>`;
      })
      .join("");
}

/** -----------------------------
 *  Characters (participants list)
 *  You said file is: public/adn/xomnganchuyen/XNC_characters.json
 *  Web URL MUST be: /adn/xomnganchuyen/XNC_characters.json
 *  ----------------------------- */
async function loadCharacters() {
  try {
    const json = await fetchJSON(PATHS.characters);

    // Allow flexible formats:
    // - array: [{id,label,gender,desc}]
    // - object: {characters:[...]}
    const arr = Array.isArray(json)
      ? json
      : Array.isArray(json?.characters)
      ? json.characters
      : [];

    AppState.charactersAll = arr
      .map((c) => ({
        id: (c.id || c.char_id || c.key || "").trim(),
        label: (c.label || c.name || c.title || c.id || "").trim(),
        gender: (c.gender || "").trim(),
        desc: (c.desc || c.bio || "").trim(),
      }))
      .filter((c) => c.id && c.label);

    renderParticipantsList();
    console.log("[XNC] Loaded characters:", AppState.charactersAll.length, "from", PATHS.characters);
  } catch (e) {
    console.error("[XNC] loadCharacters error:", e);
    AppState.charactersAll = [];
    renderParticipantsList();
  }
}

function renderParticipantsList() {
  const wrap = $("participantsList");
  if (!wrap) return;

  const q = ($("participantSearch")?.value || "").trim().toLowerCase();

  const list = AppState.charactersAll.filter((c) => {
    if (!q) return true;
    return (
      c.label.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.desc || "").toLowerCase().includes(q)
    );
  });

  wrap.innerHTML = list
    .map((c) => {
      const checked = AppState.selectedParticipants.has(c.id) ? "checked" : "";
      const sub = [c.gender, c.desc, c.id].filter(Boolean).join(" • ");
      return `
        <label class="xnc-char-row">
          <input type="checkbox" class="xnc-char-check" data-char-id="${escapeHtmlAttr(c.id)}" ${checked}/>
          <div class="xnc-char-meta">
            <div class="xnc-char-name">${escapeHtmlText(c.label)}</div>
            <div class="xnc-char-sub">${escapeHtmlText(sub)}</div>
          </div>
        </label>
      `;
    })
    .join("");

  // bind checkbox events
  wrap.querySelectorAll(".xnc-char-check").forEach((cb) => {
    cb.addEventListener("change", (ev) => {
      const id = ev.target.getAttribute("data-char-id");
      if (!id) return;
      if (ev.target.checked) AppState.selectedParticipants.add(id);
      else AppState.selectedParticipants.delete(id);
      updateSelectedCount();
    });
  });

  updateSelectedCount();
}

function updateSelectedCount() {
  setText("selectedCount", `Đã chọn: ${AppState.selectedParticipants.size}`);
}

/** -----------------------------
 *  Load story from manifest selection
 *  Key rule: fetch EXACTLY sel.value (which is item.file)
 *  ----------------------------- */
async function loadSelectedStory() {
  const sel = $("storySelect");
  const file = (sel?.value || "").trim();

  if (!file) {
    alert("Bạn chưa chọn truyện trong dropdown.");
    return;
  }

  try {
    const storyJson = await fetchJSON(file);
    // 1) ID + Title
$("storyId").value = storyJson.storyId || storyJson.id || "";
$("storyTitle").value = storyJson.title || storyJson.name || "";

// 2) Nội dung truyện (raw story text)
const raw =
  storyJson.rawText ||
  storyJson.raw_text ||
  storyJson.story ||
  storyJson.content ||
  storyJson.text ||
  "";

$("storyRawText").value = raw;

// 3) Nếu file truyện có sẵn danh sách nhân vật => auto tick luôn
if (Array.isArray(storyJson.characters) && storyJson.characters.length) {
  // characters có thể là ["bolo","bala"] hoặc [{id,label}]
  const ids = new Set(
    storyJson.characters.map((c) => (typeof c === "string" ? c : (c.id || c.char_id || ""))).filter(Boolean)
  );

  // tick checkbox theo ids
  document.querySelectorAll('input[type="checkbox"][data-char-id]').forEach((cb) => {
    cb.checked = ids.has(cb.getAttribute("data-char-id"));
  });

  updateSelectedCount(); // hàm update “Đã chọn: …”
}

  } catch (e) {
    console.error("[XNC] loadSelectedStory error:", e);
    alert(`Load truyện lỗi: Fetch failed: ${file} -> ${String(e.message || e)}`);
  }
}

function applyParticipantsFromStory(charactersField) {
  // charactersField can be:
  // - ["Bô-Lô","Ba-La"...] (labels)
  // - [{id,label}...] or [{char_id,name}...]
  const ids = new Set();

  if (typeof charactersField[0] === "string") {
    const wantedLabels = new Set(charactersField.map((s) => String(s).trim()));
    // map labels -> ids from charactersAll
    AppState.charactersAll.forEach((c) => {
      if (wantedLabels.has(c.label)) ids.add(c.id);
    });
  } else {
    charactersField.forEach((x) => {
      const id = (x.id || x.char_id || "").trim();
      if (id) ids.add(id);
      else {
        const label = (x.label || x.name || "").trim();
        if (label) {
          const found = AppState.charactersAll.find((c) => c.label === label);
          if (found) ids.add(found.id);
        }
      }
    });
  }

  AppState.selectedParticipants = ids;
  renderParticipantsList();
}

/** -----------------------------
 *  Buttons
 *  ----------------------------- */
function bindEvents() {
  $("reloadManifestBtn")?.addEventListener("click", loadManifest);
  $("loadStoryBtn")?.addEventListener("click", loadSelectedStory);

  $("participantSearch")?.addEventListener("input", renderParticipantsList);

  $("btnSelectAll")?.addEventListener("click", () => {
    AppState.charactersAll.forEach((c) => AppState.selectedParticipants.add(c.id));
    renderParticipantsList();
  });

  $("btnClearAll")?.addEventListener("click", () => {
    AppState.selectedParticipants.clear();
    renderParticipantsList();
  });

  // Your existing buttons (if present)
  $("splitBtn")?.addEventListener("click", () => {
    splitScenesFromStory();
  });

  $("clearPreviewBtn")?.addEventListener("click", () => {
    setPreviewJSON({});
  });
}

/** -----------------------------
 *  Split scenes stub (hook)
 *  Replace this with your current splitting logic.
 *  IMPORTANT: participants check uses AppState.selectedParticipants.size
 *  ----------------------------- */
function splitScenesFromStory() {
  const raw = ($("storyRaw")?.value || "").trim();
  if (!raw) {
    alert("Bạn chưa có nội dung truyện.");
    return;
  }
  if (AppState.selectedParticipants.size < 1) {
    alert("Bạn cần chọn ít nhất 1 nhân vật tham gia.");
    return;
  }

  // TODO: plug your scene splitting engine here.
  // For now just show a small structure so UI doesn't feel broken.
  const result = {
    storyId: $("storyId")?.value || "",
    title: $("storyTitle")?.value || "",
    loadedFrom: AppState.loadedStoryFile || "(manual)",
    participants: Array.from(AppState.selectedParticipants),
    note: "TODO: gắn logic tách scene hiện tại vào splitScenesFromStory()",
    rawPreview: raw.slice(0, 250),
  };

  setPreviewJSON(result);
  console.log("[XNC] splitScenesFromStory result:", result);
}

function setPreviewJSON(obj) {
  const pre = $("previewBox");
  if (!pre) return;
  try {
    pre.textContent = JSON.stringify(obj ?? {}, null, 2);
  } catch {
    pre.textContent = "{}";
  }
}

/** -----------------------------
 *  HTML escaping helpers
 *  ----------------------------- */
function escapeHtmlText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeHtmlAttr(s) {
  return escapeHtmlText(s).replaceAll('"', "&quot;");
}

/** -----------------------------
 *  Init
 *  ----------------------------- */
async function init() {
  bindEvents();
  await loadCharacters();
  await loadManifest();
  console.log("[XNC] Init OK");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
