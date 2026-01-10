/* =========================
   XNC - Make Story + Tabs + Character Cards
   ========================= */

const STORAGE_KEY = "xnc_stories_v1";

let allCharacters = [];
const selectedCharacterIds = new Set();

/* ---------- Tabs ---------- */
function switchTab(tabId) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === tabId);
  });
  document.querySelectorAll(".panel").forEach(p => {
    p.classList.toggle("active", p.id === tabId);
  });
}

/* ---------- Utils ---------- */
function safeJsonParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function nowIso() {
  return new Date().toISOString();
}

function makeDefaultStoryId() {
  // XNC-YYYYMMDD-HHMMSS
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `XNC-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function signatureColorToHex(token) {
  // Bạn có palette chuẩn thì map đầy đủ sau.
  const map = {
    xnc_warm_yellow: "#F7D774",
    xnc_soft_blue: "#8FB7E8",
    xnc_mint_green: "#87D8C6",
    xnc_soft_orange: "#F4B184",
    xnc_yellow: "#F7D774",
    xnc_blue: "#5FA8FF",
    xnc_green: "#5AD7B3",
    xnc_orange: "#F7A35C",
    xnc_pink: "#F39BC4"
  };
  return map[token] || "#9CA3AF";
}

/* ---------- Character Cards ---------- */
function updateCharCount() {
  const el = document.getElementById("char-count");
  if (el) el.textContent = `Đã chọn: ${selectedCharacterIds.size}`;
}

function toggleCharacter(id) {
  if (selectedCharacterIds.has(id)) selectedCharacterIds.delete(id);
  else selectedCharacterIds.add(id);
  renderCharacterCards(getFilteredCharacters());
}

function getFilteredCharacters() {
  const q = (document.getElementById("char-search")?.value || "").trim().toLowerCase();
  if (!q) return allCharacters;

  return allCharacters.filter(c => {
    const name = (c.name || "").toLowerCase();
    const cid = (c.id || "").toLowerCase();
    return name.includes(q) || cid.includes(q);
  });
}

function renderCharacterCards(list) {
  const wrap = document.getElementById("story-characters-cards");
  if (!wrap) return;

  wrap.innerHTML = "";

  list.forEach(c => {
    const card = document.createElement("div");
    card.className = "char-card" + (selectedCharacterIds.has(c.id) ? " selected" : "");
    card.dataset.id = c.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selectedCharacterIds.has(c.id);
    cb.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCharacter(c.id);
    });

    const badge = document.createElement("div");
    badge.className = "char-badge";
    badge.style.background = signatureColorToHex(c.signature_colors?.[0]);

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "char-name";
    name.textContent = c.name || c.id;

    const meta = document.createElement("div");
    meta.className = "char-meta";
    const gender = c.gender ? String(c.gender) : "";
    const role = c.role ? String(c.role) : "";
    meta.textContent = [gender, role].filter(Boolean).join(" • ");

    info.appendChild(name);
    if (meta.textContent) info.appendChild(meta);

    card.appendChild(cb);
    card.appendChild(badge);
    card.appendChild(info);

    card.addEventListener("click", () => toggleCharacter(c.id));

    wrap.appendChild(card);
  });

  updateCharCount();
}

/* ---------- Story CRUD ---------- */
function loadStories() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEY) || "[]", []);
}

function saveStories(stories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories, null, 2));
}

function refreshSavedStoriesDropdown() {
  const sel = document.getElementById("saved-stories");
  if (!sel) return;

  const stories = loadStories();
  sel.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = stories.length ? `-- Chọn story (${stories.length}) --` : "-- Chưa có story nào --";
  sel.appendChild(opt0);

  stories.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.id} — ${s.title || "(no title)"}`;
    sel.appendChild(opt);
  });
}

function buildStoryObject() {
  const idEl = document.getElementById("story-id");
  const titleEl = document.getElementById("story-title");
  const contentEl = document.getElementById("story-content");

  const id = (idEl?.value || "").trim() || makeDefaultStoryId();
  const title = (titleEl?.value || "").trim();
  const content = (contentEl?.value || "").trim();

  // Snapshot full character objects (để đem đi máy khác vẫn đủ info)
  const selectedIds = Array.from(selectedCharacterIds);
  const selectedChars = allCharacters.filter(c => selectedCharacterIds.has(c.id));

  return {
    id,
    title,
    content,
    character_ids: selectedIds,
    characters_snapshot: selectedChars,
    created_at: nowIso()
  };
}

function setStoryPreview(obj) {
  const pre = document.getElementById("story-preview");
  if (pre) pre.textContent = JSON.stringify(obj, null, 2);
}

function createStory() {
  const story = buildStoryObject();
  const stories = loadStories();

  // upsert by id
  const idx = stories.findIndex(s => s.id === story.id);
  if (idx >= 0) stories[idx] = story;
  else stories.push(story);

  saveStories(stories);
  refreshSavedStoriesDropdown();
  setStoryPreview(story);

  // write back ID if it was auto-generated
  const idEl = document.getElementById("story-id");
  if (idEl && !idEl.value.trim()) idEl.value = story.id;
}

function exportStoriesJson() {
  const stories = loadStories();
  setStoryPreview(stories);
}

function downloadStoriesJson() {
  const stories = loadStories();
  const blob = new Blob([JSON.stringify(stories, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "xnc_stories.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function clearPreview() {
  setStoryPreview({});
}

function loadSelectedStoryToForm() {
  const sel = document.getElementById("saved-stories");
  const chosenId = sel?.value;
  if (!chosenId) return;

  const stories = loadStories();
  const story = stories.find(s => s.id === chosenId);
  if (!story) return;

  // Fill form
  const idEl = document.getElementById("story-id");
  const titleEl = document.getElementById("story-title");
  const contentEl = document.getElementById("story-content");

  if (idEl) idEl.value = story.id || "";
  if (titleEl) titleEl.value = story.title || "";
  if (contentEl) contentEl.value = story.content || "";

  // Restore selected characters
  selectedCharacterIds.clear();
  (story.character_ids || []).forEach(id => selectedCharacterIds.add(id));

  renderCharacterCards(getFilteredCharacters());
  setStoryPreview(story);
}

function deleteSelectedStory() {
  const sel = document.getElementById("saved-stories");
  const chosenId = sel?.value;
  if (!chosenId) return;

  const stories = loadStories().filter(s => s.id !== chosenId);
  saveStories(stories);
  refreshSavedStoriesDropdown();
  clearPreview();
}

/* ---------- Data Load ---------- */
async function loadCharacters() {
  // IMPORTANT: đổi path cho đúng nơi bạn host JSON
  // Ví dụ nếu JSON nằm /data/XNC_characters.json thì sửa ở đây.
  const res = await fetch("XNC_characters.json", { cache: "no-store" });
  const data = await res.json();

  // Schema của bạn: { characters: [...] }
  allCharacters = Array.isArray(data.characters) ? data.characters : [];
  renderCharacterCards(allCharacters);
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // Tabs click handler
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Default story id if empty
  const idEl = document.getElementById("story-id");
  if (idEl && !idEl.value.trim()) idEl.placeholder = makeDefaultStoryId();

  // Button handlers
  document.getElementById("btn-create-story")?.addEventListener("click", createStory);
  document.getElementById("btn-export-json")?.addEventListener("click", exportStoriesJson);
  document.getElementById("btn-download-json")?.addEventListener("click", downloadStoriesJson);
  document.getElementById("btn-clear-preview")?.addEventListener("click", clearPreview);

  document.getElementById("btn-load-story")?.addEventListener("click", loadSelectedStoryToForm);
  document.getElementById("btn-delete-story")?.addEventListener("click", deleteSelectedStory);

  document.getElementById("btn-select-all")?.addEventListener("click", () => {
    allCharacters.forEach(c => selectedCharacterIds.add(c.id));
    renderCharacterCards(getFilteredCharacters());
  });
  document.getElementById("btn-clear-all")?.addEventListener("click", () => {
    selectedCharacterIds.clear();
    renderCharacterCards(getFilteredCharacters());
  });

  document.getElementById("char-search")?.addEventListener("input", () => {
    renderCharacterCards(getFilteredCharacters());
  });

  // Load saved stories
  refreshSavedStoriesDropdown();

  // Load characters (render cards)
  try {
    await loadCharacters();
  } catch (e) {
    // Nếu JSON path sai, bạn sẽ thấy lỗi ở console.
    console.error("Failed to load XNC_characters.json:", e);
  }
});
