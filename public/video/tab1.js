/* ============================
   TAB 1 – STORY PARSER (JSON A)
   ============================ */

console.log('[TAB1] init');

/* -------- STATE -------- */
window.appState = window.appState || {};
appState.storyA = {
  id: '',
  title: '',
  rawText: '',
  scenes: []
};

/* -------- DOM -------- */
const elManifestSelect = document.getElementById('manifestSelect');
const elLoadStoryBtn   = document.getElementById('loadStoryBtn');
const elReloadManifest = document.getElementById('reloadManifestBtn');

const elStoryId    = document.getElementById('storyId');
const elStoryTitle = document.getElementById('storyTitle');
const elStoryText  = document.getElementById('storyText');

const elParseBtn   = document.getElementById('parseStoryBtn');
const elExportBtn  = document.getElementById('exportStoryStructBtn');

/* -------- FETCH HELPERS -------- */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed: ' + url);
  return await res.json();
}

/* -------- LOAD MANIFEST -------- */
async function loadManifest() {
  console.log('[TAB1] load manifest');
  const manifest = await fetchJSON('/substance/manifest.json');

  elManifestSelect.innerHTML = '';
  manifest.items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.file;
    opt.textContent = `${item.id} – ${item.title}`;
    elManifestSelect.appendChild(opt);
  });

  console.log('[TAB1] Manifest loaded', manifest.items.length);
}

/* -------- LOAD STORY -------- */
async function loadStory() {
  const file = elManifestSelect.value;
  if (!file) return;

  const data = await fetchJSON(file);

  elStoryId.value    = data.id || '';
  elStoryTitle.value = data.title || '';
  elStoryText.value  = data.story || '';

  appState.storyA.id       = data.id || '';
  appState.storyA.title    = data.title || '';
  appState.storyA.rawText  = data.story || '';

  console.log('[TAB1] Story loaded OK:', data.id);
}

/* -------- CORE PARSER -------- */
function parseStory() {
  console.log('[TAB1] Parse start');

  const raw = elStoryText.value;
  if (!raw) {
    alert('Story text trống');
    return;
  }

  appState.storyA.scenes = [];

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  let sceneIndex = 1;
  let currentScene = createScene(sceneIndex);

  lines.forEach(line => {
    const clean = line.replace(/\*\*/g, '').trim();

    /* --- SCENE SPLIT --- */
    if (/^\[END SCENE\]/i.test(clean)) {
      appState.storyA.scenes.push(currentScene);
      sceneIndex++;
      currentScene = createScene(sceneIndex);
      return;
    }

    /* --- SFX --- */
    if (clean.startsWith('[SFX:')) {
      currentScene.sfx.push(
        clean.replace('[SFX:', '').replace(']', '').trim()
      );
      return;
    }

    /* --- DIALOGUE (Character: text) --- */
    const m = clean.match(/^(.+?):\s*(.+)$/);
    if (m) {
      currentScene.dialogues.push({
        character: m[1].trim(),
        text: m[2].trim()
      });
      return;
    }

    /* --- NARRATION --- */
    currentScene.narration.push(clean);
  });

  /* push last scene */
  if (
    currentScene.dialogues.length ||
    currentScene.narration.length ||
    currentScene.sfx.length
  ) {
    appState.storyA.scenes.push(currentScene);
  }

  console.log('[TAB1] Parse DONE:', appState.storyA.scenes);
  alert('Tách story xong ✅');
}

/* -------- SCENE FACTORY -------- */
function createScene(index) {
  return {
    id: `S${index}`,
    dialogues: [],
    narration: [],
    sfx: []
  };
}

/* -------- EXPORT -------- */
function exportStoryStruct() {
  const data = {
    id: elStoryId.value,
    title: elStoryTitle.value,
    type: 'STORY_A',
    scenes: appState.storyA.scenes
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${data.id}_A.json`;
  a.click();
}

/* -------- BIND EVENTS -------- */
elReloadManifest.onclick = loadManifest;
elLoadStoryBtn.onclick   = loadStory;
elParseBtn.onclick       = parseStory;
elExportBtn.onclick      = exportStoryStruct;

/* -------- INIT -------- */
loadManifest();
