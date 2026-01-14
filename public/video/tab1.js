/* =========================
   HELPERS
========================= */
async function fetchJSON(url) {
  console.log('[XNC] fetchJSON:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* =========================
   LOAD CHARACTERS
========================= */
async function loadCharacters() {
  const data = await fetchJSON('/adn/xomnganchuyen/XNC_characters.json');
  appState.characters = data.characters || data;
  renderParticipants();
  console.log('[XNC] Loaded characters:', appState.characters.length);
}

function renderParticipants() {
  const box = qs('participantsList');
  if (!box) return;

  box.innerHTML = '';
  appState.characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'pitem';
    div.innerHTML = `
      <label>
        <input type="checkbox" value="${c.id}">
        <b>${c.name}</b> <span class="muted">${c.gender || ''}</span>
      </label>
    `;
    box.appendChild(div);
  });

  bindCharacterEvents();
}

function bindCharacterEvents() {
  qs('participantsList').querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.onchange = () => {
      appState.selectedCharacters = [...qs('participantsList')
        .querySelectorAll('input:checked')]
        .map(i => i.value);

      qs('participantsSelectedCount').textContent =
        appState.selectedCharacters.length;
    };
  });

  qs('participantsSelectAll').onclick = () => {
    qs('participantsList').querySelectorAll('input').forEach(i => i.checked = true);
    bindCharacterEvents();
  };

  qs('participantsClear').onclick = () => {
    qs('participantsList').querySelectorAll('input').forEach(i => i.checked = false);
    appState.selectedCharacters = [];
    qs('participantsSelectedCount').textContent = 0;
  };
}

/* =========================
   MANIFEST + STORY
========================= */
async function loadManifest() {
  const data = await fetchJSON('/substance/manifest.json');
  appState.manifest = data.items || [];
  renderStorySelect();
  console.log('[XNC] Loaded manifest:', appState.manifest.length);
}

function renderStorySelect() {
  const sel = qs('storySelect');
  sel.innerHTML = '<option value="">-- Chọn truyện --</option>';
  appState.manifest.forEach(st => {
    const opt = document.createElement('option');
    opt.value = st.file;
    opt.textContent = `${st.id} – ${st.title}`;
    sel.appendChild(opt);
  });
}

async function loadStory(file) {
  const data = await fetchJSON(file);
  appState.currentStory = data;

  qs('storyId').value = data.id || '';
  qs('storyTitle').value = data.title || '';
  qs('storyText').value = data.story || data.idea || '';

  console.log('[XNC] Story loaded OK:', data.id);
}

/* =========================
   SAVE / EXPORT
========================= */
function saveStoryLocal() {
  appState.storyDraft = {
    id: qs('storyId').value,
    title: qs('storyTitle').value,
    story: qs('storyText').value,
    characters: [...appState.selectedCharacters]
  };
  console.log('[XNC] Story saved local', appState.storyDraft);
}

function exportStoryJSON() {
  downloadJSON(appState.storyDraft, `${appState.storyDraft.id}_story.json`);
}

function exportDialogueJSON() {
  downloadJSON(appState.dialogues, `${appState.storyDraft.id}_dialogue.json`);
}

function copyDialogueJSON() {
  navigator.clipboard.writeText(JSON.stringify(appState.dialogues, null, 2));
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* =========================
   SPLIT SCENES (CORE)
========================= */
function splitScenesFromStory() {
  if (!appState.storyDraft) {
    alert('Chưa lưu story');
    return;
  }

  console.log('[XNC] splitScenesFromStory START');

  const lines = appState.storyDraft.story
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  appState.scenes = [];
  appState.dialogues = [];
  appState.sfx = [];

  let sceneIndex = 0;
  let currentScene = null;

  lines.forEach(line => {

    // ❌ TITLE = metadata → bỏ
    if (line.startsWith('**Title')) return;

    // 🟢 START SCENE
    if (line.startsWith('**Setting') || line.startsWith('**Scene')) {
      if (currentScene) appState.scenes.push(currentScene);

      sceneIndex++;
      currentScene = {
        id: `S${sceneIndex}`,
        prompt: line + '\n',
        characters: [...appState.storyDraft.characters],
        frames: []
      };
      return;
    }

    // 🔴 END SCENE
    if (line.includes('[END SCENE]')) {
      if (currentScene) {
        currentScene.prompt += line + '\n';
        appState.scenes.push(currentScene);
        currentScene = null;
      }
      return;
    }

    // 🔊 SFX
    if (line.includes('[SFX]')) {
      if (!currentScene) return;
      appState.sfx.push({
        scene_id: currentScene.id,
        text: line
      });
      return;
    }

    // 💬 DIALOGUE
    if (line.includes(':')) {
      if (!currentScene) return;
      const [char, ...rest] = line.split(':');
      appState.dialogues.push({
        scene_id: currentScene.id,
        character: char.replace(/\*/g, '').trim(),
        text: rest.join(':').trim()
      });
      return;
    }

    // 📌 SCENE PROMPT
    if (currentScene) {
      currentScene.prompt += line + '\n';
    }
  });

  if (currentScene) appState.scenes.push(currentScene);

  renderPreviewJSON();
  renderSceneSelect();

  console.log('[XNC] splitScenesFromStory DONE', {
    scenes: appState.scenes.length,
    dialogues: appState.dialogues.length,
    sfx: appState.sfx.length
  });
}

/* =========================
   SCENE UI
========================= */
function renderPreviewJSON() {
  qs('previewBox').textContent = JSON.stringify({
    scenes: appState.scenes,
    dialogues: appState.dialogues,
    sfx: appState.sfx
  }, null, 2);
}

function renderSceneSelect() {
  const sel = qs('sceneSelect');
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Chọn Scene --</option>';
  appState.scenes.forEach(sc => {
    const opt = document.createElement('option');
    opt.value = sc.id;
    opt.textContent = sc.id;
    sel.appendChild(opt);
  });
}

/* =========================
   BIND UI
========================= */
function bindUI() {
  qs('reloadManifestBtn').onclick = loadManifest;
  qs('loadStoryBtn').onclick = () => {
    const sel = qs('storySelect');
    if (sel.value) loadStory(sel.value);
  };

  qs('saveLocalBtn').onclick = saveStoryLocal;
  qs('exportStoryBtn').onclick = exportStoryJSON;
  qs('splitBtn').onclick = splitScenesFromStory;
  qs('exportDialogueBtn').onclick = exportDialogueJSON;
  qs('copyDialogueBtn').onclick = copyDialogueJSON;
}

/* =========================
   INIT
========================= */
async function init() {
  await loadCharacters();
  await loadManifest();
  bindUI();
  console.log('[XNC] CORE READY');
}

document.addEventListener('DOMContentLoaded', init);
