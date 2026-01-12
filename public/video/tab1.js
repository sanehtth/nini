// ==============================
// TAB 1 – STORY / PARSER
// JSON A
// ==============================

console.log("[TAB1] init");

window.storyA = null;

// ---------- CONFIG ----------
const MANIFEST_URL = "/substance/manifest.json";

// ---------- DOM ----------
const elManifestSelect = document.getElementById("manifestSelect");
const elReloadManifest = document.getElementById("reloadManifestBtn");
const elLoadStory = document.getElementById("loadStoryBtn");

const elStoryId = document.getElementById("storyId");
const elStoryTitle = document.getElementById("storyTitle");
const elStoryText = document.getElementById("storyText");

const elParseBtn = document.getElementById("parseStoryBtn");
const elExportBtn = document.getElementById("exportStoryStructBtn");
const elSaveLocalBtn = document.getElementById("saveStoryLocalBtn");

const elPreview = document.getElementById("previewStoryA");

// ---------- UTIL ----------
function downloadJSON(data, filename) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ---------- LOAD MANIFEST ----------
async function loadManifest() {
  const res = await fetch(MANIFEST_URL);
  const manifest = await res.json();

  elManifestSelect.innerHTML = "";
  manifest.items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.file;
    opt.textContent = `${item.id} – ${item.title}`;
    elManifestSelect.appendChild(opt);
  });

  console.log("[TAB1] Manifest loaded", manifest.items.length);
}

// ---------- LOAD STORY ----------
async function loadStoryFromManifest() {
  const file = elManifestSelect.value;
  if (!file) return;

  const res = await fetch(file);
  const data = await res.json();

  elStoryId.value = data.id || "";
  elStoryTitle.value = data.title || "";
  elStoryText.value = data.story || "";

  console.log("[TAB1] Story loaded", data.id);
}

// ---------- PARSER CORE ----------
function parseStory() {
  const raw = elStoryText.value;
  if (!raw.trim()) {
    alert("Story text trống");
    return;
  }

  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  let sceneIndex = 1;
  let currentScene = `S${sceneIndex}`;

  const scenes = [
    { id: currentScene, frames: [] }
  ];

  const dialogues = [];
  const sfx = [];

  lines.forEach(line => {
    // Scene marker
    if (line.startsWith("**[Scene")) {
      sceneIndex++;
      currentScene = `S${sceneIndex}`;
      scenes.push({ id: currentScene, frames: [] });
      return;
    }

    // SFX
    if (line.startsWith("**[SFX")) {
      sfx.push({
        scene_id: currentScene,
        text: line.replace(/\*\*/g, "")
      });
      return;
    }

    // Dialogue
    const m = line.match(/^\*\*(.+?):\*\*(.*)$/);
    if (m) {
      dialogues.push({
        scene_id: currentScene,
        character: m[1].trim(),
        text: m[2].trim()
      });
    }
  });

  window.storyA = {
    id: elStoryId.value.trim(),
    title: elStoryTitle.value.trim(),
    scenes,
    dialogues,
    sfx
  };

  if (elPreview) {
    elPreview.textContent = JSON.stringify(window.storyA, null, 2);
  }

  console.log("[TAB1] Parse OK", window.storyA);
}

// ---------- SAVE LOCAL ----------
function saveStoryALocal() {
  if (!window.storyA) {
    alert("Chưa có Story A để lưu. Hãy bấm Tách Story trước.");
    return;
  }

  const key = `storyA_${window.storyA.id}`;
  localStorage.setItem(key, JSON.stringify(window.storyA));

  alert(`Đã lưu local: ${key}`);
  console.log("[TAB1] Saved local", key);
}


// ---------- EVENTS ----------
elReloadManifest.onclick = loadManifest;
elLoadStory.onclick = loadStoryFromManifest;
elParseBtn.onclick = parseStory;

elExportBtn.onclick = () => {
  if (!window.storyA) {
    alert("Chưa có Story A");
    return;
  }
  downloadJSON(window.storyA, `${window.storyA.id}_A.json`);
};

elSaveLocalBtn.onclick = saveStoryALocal;

// ---------- INIT ----------
loadManifest();
