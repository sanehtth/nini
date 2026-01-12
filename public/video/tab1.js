// ===============================
// TAB 1 – Story Parser (JSON A)
// ===============================

console.log("[TAB1] init");

// STATE DUY NHẤT – KHÔNG KHAI LẠI Ở FILE KHÁC
window.appState = {
  manifest: null,
  storyA: null
};

// -------------------------------
// Utils
// -------------------------------
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed: " + url);
  return res.json();
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// -------------------------------
// DOM
// -------------------------------
const elStorySelect = document.getElementById("storySelect");
const elStoryId     = document.getElementById("storyId");
const elStoryTitle  = document.getElementById("storyTitle");
const elStoryText   = document.getElementById("storyText");

const btnReloadManifest = document.getElementById("reloadManifestBtn");
const btnLoadStory      = document.getElementById("loadStoryBtn");
const btnParseStory     = document.getElementById("parseStoryBtn");
const btnExportStory    = document.getElementById("exportStoryBtn");

// -------------------------------
// Manifest
// -------------------------------
async function loadManifest() {
  const manifest = await fetchJSON("/substance/manifest.json");
  appState.manifest = manifest;

  elStorySelect.innerHTML = "";
  manifest.items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.file;
    opt.textContent = `${item.id} – ${item.title}`;
    elStorySelect.appendChild(opt);
  });

  console.log("[TAB1] Manifest loaded:", manifest.items.length);
}

// -------------------------------
// Load story JSON gốc
// -------------------------------
async function loadStory() {
  const file = elStorySelect.value;
  if (!file) return;

  const data = await fetchJSON(file);

  elStoryId.value    = data.id || "";
  elStoryTitle.value = data.title || "";
  elStoryText.value  = data.story || "";

  console.log("[TAB1] Story loaded:", data.id);
}

// -------------------------------
// PARSER: Text → JSON A
// -------------------------------
function parseStory() {
  const text = elStoryText.value;
  if (!text.trim()) return;

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const scenes = [];
  const dialogues = [];
  const sfx = [];

  let currentSceneId = "S1";

  scenes.push({
    id: currentSceneId,
    title: elStoryTitle.value || "",
    frames: []
  });

  lines.forEach(line => {
    if (line.startsWith("**SFX")) {
      sfx.push({ scene_id: currentSceneId, text: line });
    } else if (line.startsWith("**") && line.includes(":")) {
      const idx = line.indexOf(":");
      const character = line.slice(2, idx).trim();
      const content = line.slice(idx + 1).replace(/\*\*/g, "").trim();

      dialogues.push({
        scene_id: currentSceneId,
        character,
        text: content
      });
    }
  });

  appState.storyA = {
    id: elStoryId.value,
    title: elStoryTitle.value,
    scenes,
    dialogues,
    sfx
  };

  console.log("[TAB1] Parse OK", appState.storyA);
}

// -------------------------------
// Events
// -------------------------------
btnReloadManifest.onclick = loadManifest;
btnLoadStory.onclick = loadStory;
btnParseStory.onclick = parseStory;
btnExportStory.onclick = () => {
  if (!appState.storyA) return;
  downloadJSON(appState.storyA, `${appState.storyA.id}_A.json`);
};

// -------------------------------
// Init
// -------------------------------
loadManifest();
