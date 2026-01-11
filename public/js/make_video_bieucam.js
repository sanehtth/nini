/* =========================
   XNC VIDEO BUILDER – CORE
   Single-file stable version
========================= */

/* ---------- GLOBAL STATE ---------- */
const appState = {
  characters: [],
  selectedCharacters: [],
  storyLocal: null,
  sceneManifest: {
    scenes: []
  },
  currentSceneIndex: 0
};

/* ---------- HELPERS ---------- */
const $ = id => document.getElementById(id);

function fetchJSON(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(url);
    return r.json();
  });
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- CHARACTERS ---------- */
async function loadCharacters() {
  const data = await fetchJSON('/adn/xomnganchuyen/XNC_characters.json');
  appState.characters = data.characters || data;
  renderCharacters();
}

function renderCharacters() {
  const box = $('participantsList');
  box.innerHTML = '';
  appState.characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'pitem';
    div.innerHTML = `
      <input type="checkbox" value="${c.id}">
      <div>
        <div class="pname">${c.name}</div>
        <div class="ptag">${c.gender || ''}</div>
      </div>`;
    div.querySelector('input').onchange = updateSelectedCharacters;
    box.appendChild(div);
  });
}

function updateSelectedCharacters() {
  appState.selectedCharacters = Array.from(
    document.querySelectorAll('#participantsList input:checked')
  ).map(cb => cb.value);

  const label = $('selectedCountLabel');
  if (label) label.textContent = `Đã chọn: ${appState.selectedCharacters.length}`;
}

/* ---------- STORY LOCAL ---------- */
function saveStoryLocal() {
  const story = {
    id: $('storyId')?.value || '',
    title: $('storyTitle')?.value || '',
    text: $('storyText')?.value || '',
    characters: appState.selectedCharacters,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem('xnc_story_local', JSON.stringify(story));
  appState.storyLocal = story;
  alert('Đã lưu story (local)');
}

function exportStoryJSON() {
  const raw = localStorage.getItem('xnc_story_local');
  if (!raw) return alert('Chưa lưu story');
  downloadJSON(JSON.parse(raw), 'xnc_story.json');
}

/* ---------- SPLIT SCENE ---------- */
function splitScenesFromLocal() {
  const raw = localStorage.getItem('xnc_story_local');
  if (!raw) return alert('Chưa lưu story');
  const story = JSON.parse(raw);

  const scenes = [];
  let idx = 1;

  const lines = story.text.split('\n').map(l => l.trim()).filter(Boolean);

  const scene = {
    scene_id: `S${idx.toString().padStart(2, '0')}`,
    mode: 'dialogue',
    summary: '',
    characters: story.characters.map(id =>
      appState.characters.find(c => c.id === id)
    ),
    frames: [{ frame_id: 'F01', note: '' }],
    dialogues: [],
    sfx: []
  };

  lines.forEach(line => {
    if (line.startsWith('[SFX')) {
      scene.sfx.push(line);
    } else if (line.includes(':')) {
      const [char, ...rest] = line.split(':');
      scene.dialogues.push({
        character: char.trim(),
        text: rest.join(':').trim()
      });
    } else {
      scene.summary += ' ' + line;
    }
  });

  scenes.push(scene);
  appState.sceneManifest.scenes = scenes;
  appState.currentSceneIndex = 0;
  renderCurrentScene();
}

/* ---------- SCENE EDITOR ---------- */
function renderCurrentScene() {
  const box = $('jsonPreview');
  const scene = appState.sceneManifest.scenes[appState.currentSceneIndex];
  if (!scene) return;

  box.textContent = JSON.stringify(scene, null, 2);
}

function nextScene() {
  if (appState.currentSceneIndex < appState.sceneManifest.scenes.length - 1) {
    appState.currentSceneIndex++;
    renderCurrentScene();
  }
}

function prevScene() {
  if (appState.currentSceneIndex > 0) {
    appState.currentSceneIndex--;
    renderCurrentScene();
  }
}

/* ---------- EXPORT FINAL ---------- */
function exportDialogueJSON() {
  const out = [];
  appState.sceneManifest.scenes.forEach(s =>
    s.dialogues.forEach(d => out.push({ scene: s.scene_id, ...d }))
  );
  downloadJSON(out, 'xnc_dialogue.json');
}

function exportVideoPromptJSON() {
  downloadJSON(
    {
      schema: 'xnc_video_prompt_v1',
      scenes: appState.sceneManifest.scenes
    },
    'xnc_video_prompt.json'
  );
}

/* ---------- INIT ---------- */
function bindUI() {
  $('saveStoryBtn')?.addEventListener('click', saveStoryLocal);
  $('exportStoryBtn')?.addEventListener('click', exportStoryJSON);
  $('splitBtn')?.addEventListener('click', splitScenesFromLocal);
  $('sceneNextBtn')?.addEventListener('click', nextScene);
  $('scenePrevBtn')?.addEventListener('click', prevScene);
  $('exportDialogueBtn')?.addEventListener('click', exportDialogueJSON);
  $('exportPromptBtn')?.addEventListener('click', exportVideoPromptJSON);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadCharacters();
  bindUI();
  console.log('[XNC] CORE READY');
});
