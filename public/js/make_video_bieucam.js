/* =========================================================
   XNC – Make Video Biểu Cảm
   CLEAN VERSION – Manifest-driven (NO GUESSING PATH)
   ========================================================= */

/* -------------------- GLOBAL STATE -------------------- */
const AppState = {
  manifestItems: [],
  charactersAll: [],
  story: null,
};

/* -------------------- PATH CONFIG -------------------- */
const PATHS = {
  manifest: "/substance/manifest.json",
  characters: "/adn/xomnganchuyen/XNC_characters.json",
};

/* -------------------- HELPERS -------------------- */
const $ = (id) => document.getElementById(id);

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url} → ${res.status}`);
  return await res.json();
}

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    await loadCharacters();
    await loadManifest();
    bindEvents();
    console.log("[XNC] Init OK");
  } catch (e) {
    console.error("[XNC] Init error:", e);
    alert(e.message);
  }
}

/* =====================================================
   LOAD CHARACTERS
   ===================================================== */
async function loadCharacters() {
  const json = await fetchJSON(PATHS.characters);

  AppState.charactersAll = (json.characters || []).map((c) => ({
    id: c.id,
    label: c.label || c.name,
    gender: c.gender || "",
    desc: c.desc || "",
  }));

  renderCharacterChecklist();
  console.log("[XNC] Loaded characters:", AppState.charactersAll.length);
}

function renderCharacterChecklist() {
  const box = $("charactersBox");
  if (!box) return;

  box.innerHTML = AppState.charactersAll
    .map(
      (c) => `
      <label class="char-item">
        <input type="checkbox" value="${c.id}">
        <b>${c.label}</b>
        <small>${c.gender ? " • " + c.gender : ""}${c.desc ? " • " + c.desc : ""}</small>
      </label>
    `
    )
    .join("");
}

/* =====================================================
   LOAD MANIFEST
   ===================================================== */
async function loadManifest() {
  const json = await fetchJSON(PATHS.manifest);
  const items = Array.isArray(json.items) ? json.items : [];

  AppState.manifestItems = items;

  renderManifestSelect(items);

  $("manifestStatus").textContent =
    items.length > 0
      ? `Manifest: OK (${items.length} truyện)`
      : "Manifest rỗng / sai format";

  console.log("[XNC] Loaded manifest items:", items.length);
}

function renderManifestSelect(items) {
  const sel = $("storySelect");
  if (!sel) return;

  sel.innerHTML =
    `<option value="">-- Chọn truyện --</option>` +
    items
      .map(
        (it, idx) =>
          `<option value="${idx}">
            ${it.id} • ${it.title || ""}
          </option>`
      )
      .join("");
}

/* =====================================================
   EVENTS
   ===================================================== */
function bindEvents() {
  $("btnReloadManifest")?.addEventListener("click", loadManifest);
  $("btnLoadStory")?.addEventListener("click", loadStoryFromSelected);
}

/* =====================================================
   LOAD STORY (THE IMPORTANT PART)
   ===================================================== */
async function loadStoryFromSelected() {
  const sel = $("storySelect");

  if (!sel.value) {
    alert("Bạn chưa chọn truyện.");
    return;
  }

  const idx = Number(sel.value);
  const item = AppState.manifestItems[idx];

  if (!item || !item.file) {
    alert("Manifest item thiếu field file.");
    return;
  }

  try {
    const story = await fetchJSON(item.file);
    AppState.story = story;

    fillStoryUI(story, item);

    console.log("[XNC] Story loaded from:", item.file);
    alert(`Load truyện OK: ${item.id}`);
  } catch (e) {
    console.error(e);
    alert(`Load truyện lỗi:\n${e.message}`);
  }
}

/* =====================================================
   FILL UI
   ===================================================== */
function fillStoryUI(story, manifestItem) {
  $("storyId").value = story.id || manifestItem.id || "";
  $("storyTitle").value =
    story.title || story.name || manifestItem.title || "";
  $("rawText").value =
    story.story || story.text || story.content || "";

  applyParticipantsFromStory(story);
}

function applyParticipantsFromStory(story) {
  if (!Array.isArray(story.characters)) return;

  const ids = new Set(
    story.characters.map((c) =>
      typeof c === "string" ? c : c.id
    )
  );

  document
    .querySelectorAll("#charactersBox input[type=checkbox]")
    .forEach((cb) => {
      cb.checked = ids.has(cb.value);
    });
}

/* =====================================================
   UTILS
   ===================================================== */
function getSelectedCharacters() {
  return Array.from(
    document.querySelectorAll(
      "#charactersBox input[type=checkbox]:checked"
    )
  ).map((cb) => cb.value);
}
