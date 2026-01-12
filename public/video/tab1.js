/* =========================
   TAB 1 – STORY / PARSER
========================= */

const Tab1State = {
  manifest: null,
  currentStory: null,
  storyA: null
};

/* ===== Helpers ===== */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed: ' + url);
  return res.json();
}

/* ===== Load manifest ===== */
async function loadManifest() {
  const data = await fetchJSON('/substance/manifest.json');

  if (!data || !Array.isArray(data.items)) {
    alert('Manifest sai format');
    return;
  }

  Tab1State.manifest = data.items;
  renderStorySelect();
  console.log('[TAB1] Manifest loaded', data.items.length);
}

function renderStorySelect() {
  const sel = document.getElementById('storySelect');
  sel.innerHTML = '<option value="">-- Chọn truyện --</option>';

  Tab1State.manifest.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.file;
    opt.textContent = `${item.id} – ${item.title}`;
    sel.appendChild(opt);
  });
}

/* ===== Load story ===== */
async function loadStoryFromFile(file) {
  const data = await fetchJSON(file);
  Tab1State.currentStory = data;

  document.getElementById('storyId').value = data.id || '';
  document.getElementById('storyTitle').value = data.title || '';
  document.getElementById('storyText').value =
    data.story || data.idea || '';

  console.log('[TAB1] Story loaded', data.id);
}

/* ===== Parse story → JSON A ===== */
function splitStoryToA() {
  const id = document.getElementById('storyId').value.trim();
  const title = document.getElementById('storyTitle').value.trim();
  const text = document.getElementById('storyText').value.trim();

  if (!id || !text) {
    alert('Thiếu ID hoặc nội dung');
    return;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let sceneIndex = 1;
  const scenes = [];
  const dialogues = [];
  const sfx = [];

  let currentScene = {
    id: `S${sceneIndex}`,
    prompt: '',
    characters: Tab1State.currentStory?.characters || [],
    frames: []
  };

  lines.forEach(line => {
    if (line.startsWith('**Title') || line.startsWith('**Setting')) {
      currentScene.prompt += line + '\n';
    }
    else if (line.startsWith('**Scene')) {
      scenes.push(currentScene);
      sceneIndex++;
      currentScene = {
        id: `S${sceneIndex}`,
        prompt: line + '\n',
        characters: currentScene.characters,
        frames: []
      };
    }
    else if (line.startsWith('**[SFX')) {
      sfx.push({
        scene_id: currentScene.id,
        text: line
      });
    }
    else if (line.includes(':')) {
      const [char, ...rest] = line.split(':');
      dialogues.push({
        scene_id: currentScene.id,
        character: char.replace(/\*\*/g, '').trim(),
        text: rest.join(':').trim()
      });
    }
  });

  scenes.push(currentScene);

  Tab1State.storyA = {
    id,
    title,
    source: 'TAB1',
    scenes,
    dialogues,
    sfx
  };

  renderPreviewA();
  console.log('[TAB1] Story A ready', scenes.length);
}

/* ===== Preview & Export ===== */
function renderPreviewA() {
  document.getElementById('previewA').textContent =
    JSON.stringify(Tab1State.storyA, null, 2);
}

function exportStoryA() {
  if (!Tab1State.storyA) return alert('Chưa có JSON A');

  const blob = new Blob(
    [JSON.stringify(Tab1State.storyA, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${Tab1State.storyA.id}_A.json`;
  a.click();
}

/* ===== Bind UI ===== */
function initTab1() {
  document.getElementById('reloadManifestBtn')
    .onclick = loadManifest;

  document.getElementById('loadStoryBtn')
    .onclick = () => {
      const sel = document.getElementById('storySelect');
      if (!sel.value) return alert('Chưa chọn truyện');
      loadStoryFromFile(sel.value);
    };

  document.getElementById('splitStoryBtn')
    .onclick = splitStoryToA;

  document.getElementById('exportStoryABtn')
    .onclick = exportStoryA;

  loadManifest();
}

document.addEventListener('DOMContentLoaded', initTab1);
