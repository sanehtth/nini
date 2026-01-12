// ================================
// TAB 1 – STORY / PARSER
// KHỚP make_videoformstory.html
// ================================

console.log("[TAB1] init");

// ---------- DOM ----------
const elStorySelect = document.getElementById("storySelect");
const elStoryId = document.getElementById("storyId");
const elStoryTitle = document.getElementById("storyTitle");
const elStoryText = document.getElementById("storyText");
const elPreview = document.getElementById("previewJsonA");

const btnReloadManifest = document.getElementById("reloadManifestBtn");
const btnLoadStory = document.getElementById("loadStoryBtn");
const btnParseStory = document.getElementById("parseStoryBtn");
const btnExportStory = document.getElementById("exportStoryBtn");
const btnSaveLocal = document.getElementById("saveStoryABtn");

// ---------- GLOBAL ----------
window.storyA = null;
let manifestData = null;

// ================================
// LOAD MANIFEST
// ================================
async function loadManifest() {
  elStorySelect.innerHTML = "";
  try {
    const res = await fetch("/substance/manifest.json");
    manifestData = await res.json();

    manifestData.items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.file;
      opt.textContent = `${item.id} – ${item.title}`;
      elStorySelect.appendChild(opt);
    });

    console.log("[TAB1] Manifest loaded:", manifestData.items.length);
  } catch (e) {
    alert("Không load được manifest.json");
    console.error(e);
  }
}

// ================================
// LOAD STORY GỐC
// ================================
async function loadStory() {
  if (!elStorySelect.value) return;

  try {
    const res = await fetch(elStorySelect.value);
    const data = await res.json();

    elStoryId.value = data.id || "";
    elStoryTitle.value = data.title || "";
    elStoryText.value = data.story || "";

    window.storyA = null;
    elPreview.value = "";

    console.log("[TAB1] Story loaded:", data.id);
  } catch (e) {
    alert("Không load được story");
    console.error(e);
  }
}

// ================================
// PARSE STORY → STORY A
// ================================
function parseStory() {
  const text = elStoryText.value;
  if (!text.trim()) {
    alert("Chưa có nội dung story");
    return;
  }

  const lines = text.split("\n");

  let currentScene = "S1";
  const scenes = [
    { id: "S1", title: elStoryTitle.value || "Scene 1", frames: [] }
  ];
  const dialogues = [];
  const sfx = [];

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    // SCENE
    if (line.startsWith("**Scene")) {
      currentScene = "S1";
      return;
    }

    // SFX
    if (line.includes("[SFX") || line.includes("**[SFX")) {
      sfx.push({
        scene_id: currentScene,
        text: line.replace(/\*/g, "").replace("[SFX:", "").replace("]", "").trim()
      });
      return;
    }

    // DIALOGUE: **Tên:** nội dung
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

  elPreview.value = JSON.stringify(window.storyA, null, 2);

  console.log("[TAB1] Parse OK", window.storyA);
}

// ================================
// EXPORT JSON A
// ================================
function exportStoryA() {
  if (!window.storyA) {
    alert("Chưa có Story A, hãy Tách Story trước");
    return;
  }

  const blob = new Blob(
    [JSON.stringify(window.storyA, null, 2)],
    { type: "application/json" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${window.storyA.id}_A.json`;
  a.click();
}

// ================================
// SAVE LOCAL
// ================================
function saveStoryALocal() {
  if (!window.storyA) {
    alert("Chưa có Story A để lưu");
    return;
  }
  const key = `storyA_${window.storyA.id}`;
  localStorage.setItem(key, JSON.stringify(window.storyA));
  alert("Đã lưu Story A vào localStorage");
}

// ================================
// EVENTS
// ================================
btnReloadManifest.onclick = loadManifest;
btnLoadStory.onclick = loadStory;
btnParseStory.onclick = parseStory;
btnExportStory.onclick = exportStoryA;
btnSaveLocal.onclick = saveStoryALocal;

// AUTO LOAD
loadManifest();
