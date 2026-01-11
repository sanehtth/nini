/* =====================================================
   XNC – MAKE VIDEO BIỂU CẢM (FINAL – STABLE)
   Khớp HTML: make_video_bieucam.html
===================================================== */

/* =========================
   GLOBAL STATE
========================= */
const appState = {
  characters: [],
  selectedCharacters: [],
  storyDraft: null,
  scenes: [],
  dialogues: [],
  sfx: [],
  currentSceneIndex: 0,
  mode: 'dialogue' // dialogue | scene | hybrid
};

/* =========================
   HELPERS
========================= */
async function fetchJSON(url) {
  console.log('[XNC] fetchJSON:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

function qs(id) {
  return document.getElementById(id);
}
/* =========================
   MANIFEST
========================= */
async function loadManifest() {
  try {
    const data = await fetchJSON('/substance/manifest.json');

    if (!data || !Array.isArray(data.items)) {
      alert('Manifest sai format');
      console.error('Manifest invalid', data);
      return;
    }

    appState.manifest = data.items;
    renderStorySelect();

    console.log('[XNC] Loaded manifest:', data.items.length);
  } catch (e) {
    console.error('[XNC] loadManifest ERROR', e);
    alert('Không load được manifest');
  }
}
function renderStorySelect() {
  const sel = qs('storySelect');
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Chọn truyện --</option>';

  appState.manifest.forEach(st => {
    const opt = document.createElement('option');
    opt.value = st.file;
    opt.textContent = `${st.id} – ${st.title}`;
    sel.appendChild(opt);
  });
}
async function loadStory(file) {
  try {
    console.log('[XNC] loadStory:', file);

    const data = await fetchJSON(file);

    qs('storyId').value = data.id || '';
    qs('storyTitle').value = data.title || '';
    qs('storyText').value = data.story || data.idea || '';

    appState.storyDraft = {
      id: data.id,
      title: data.title,
      story: data.story || data.idea || '',
      characters: data.characters || []
    };

    console.log('[XNC] Story loaded OK:', data.id);
  } catch (e) {
    console.error('[XNC] loadStory ERROR', e);
    alert('Không load được file truyện');
  }
}

/* =========================
   CHARACTERS
========================= */
async function loadCharacters() {
  const data = await fetchJSON('/adn/xomnganchuyen/XNC_characters.json');
  appState.characters = data.characters || [];
  renderCharacters();
  console.log('[XNC] Loaded characters:', appState.characters.length);
}

function renderCharacters() {
  const box = qs('participantsList');
  if (!box) return;

  box.innerHTML = '';
  appState.characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'pitem';
    div.innerHTML = `
      <input type="checkbox" value="${c.id}">
      <div>
        <div class="pname">${c.name}</div>
        <div class="ptag">${c.gender || ''}</div>
      </div>
    `;
    box.appendChild(div);
  });

  bindCharacterEvents();
}

function bindCharacterEvents() {
  const countBox = qs('participantsSelectedCount');

  document.querySelectorAll('#participantsList input[type=checkbox]')
    .forEach(cb => {
      cb.onchange = () => {
        appState.selectedCharacters =
          Array.from(document.querySelectorAll('#participantsList input:checked'))
            .map(i => i.value);

        if (countBox) countBox.textContent = appState.selectedCharacters.length;
      };
    });

  qs('participantsSelectAll')?.addEventListener('click', () => {
    document.querySelectorAll('#participantsList input').forEach(i => i.checked = true);
    bindCharacterEvents();
  });

  qs('participantsClear')?.addEventListener('click', () => {
    document.querySelectorAll('#participantsList input').forEach(i => i.checked = false);
    bindCharacterEvents();
  });
}

/* =========================
   STORY SAVE / EXPORT
========================= */
function saveStoryLocal() {
  const story = {
    id: qs('storyId')?.value || '',
    title: qs('storyTitle')?.value || '',
    story: qs('storyText')?.value || '',
    characters: appState.selectedCharacters
  };

  localStorage.setItem('xnc_story_draft', JSON.stringify(story, null, 2));
  appState.storyDraft = story;

  console.log('[XNC] Story saved local', story);
  alert('Đã lưu story (local)');
}

function exportStoryJSON() {
  if (!appState.storyDraft) {
    alert('Chưa có story để xuất');
    return;
  }
  downloadJSON(appState.storyDraft, 'story.json');
}

/* =========================
   SPLIT STORY → SCENES + DIALOGUES
========================= */
function splitScenesFromStory() {
  if (!appState.storyDraft) {
    alert('Chưa lưu story');
    return;
  }

  console.log('[XNC] splitScenesFromStory START');

  const text = appState.storyDraft.story;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let sceneId = 1;
  let currentScene = {
    id: `S${sceneId}`,
    prompt: '',
    characters: [...appState.selectedCharacters],
    frames: []
  };

  appState.scenes = [];
  appState.dialogues = [];
  appState.sfx = [];

  lines.forEach(line => {

  // ====== GẶP MỐC SCENE MỚI ======
  if (
    line.startsWith('**Scene') ||
    line.startsWith('**Setting') ||
    line.startsWith('**Title')
  ) {
    // Đóng scene cũ
    if (currentScene) {
      appState.scenes.push(currentScene);
    }

    sceneId++;

    currentScene = {
      id: `S${sceneId}`,
      prompt: line + '\n',
      characters: [...appState.selectedCharacters],
      frames: []
    };

    return;
  }

  // ====== SFX ======
  if (line.includes('[SFX]')) {
    appState.sfx.push({
      scene_id: currentScene.id,
      text: line
    });
    return;
  }

  // ====== DIALOGUE ======
  if (line.includes(':')) {
    const [char, ...rest] = line.split(':');
    appState.dialogues.push({
      scene_id: currentScene.id,
      character: char.replace(/\*/g, '').trim(),
      text: rest.join(':').trim()
    });
    return;
  }

  // ====== PROMPT THƯỜNG ======
  currentScene.prompt += line + '\n';
});


  appState.scenes.push(currentScene);
  appState.currentSceneIndex = 0;

 renderSceneManifest();
 renderAfterSplit();


  console.log('[XNC] splitScenesFromStory DONE', {
    scenes: appState.scenes.length,
    dialogues: appState.dialogues.length,
    sfx: appState.sfx.length
  });
}

/* =========================
   SCENE UI
========================= */
function renderSceneManifest() {
  const sel = qs('sceneSelect');
  if (!sel) return;

  sel.innerHTML = '<option value="">--</option>';
  appState.scenes.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${s.id}`;
    sel.appendChild(opt);
  });

  sel.onchange = () => {
    appState.currentSceneIndex = Number(sel.value);
    renderSceneDetail();
  };

  renderSceneDetail();
}

function renderSceneDetail() {
  const scene = appState.scenes[appState.currentSceneIndex];
  if (!scene) return;

  qs('sceneNote') && (qs('sceneNote').value = scene.prompt || '');
}

/* =========================
   DIALOGUE EXPORT
========================= */
function exportDialogueJSON() {
  downloadJSON({
    dialogues: appState.dialogues,
    sfx: appState.sfx
  }, 'dialogue.json');
}

function copyDialogueJSON() {
  const txt = JSON.stringify({
    dialogues: appState.dialogues,
    sfx: appState.sfx
  }, null, 2);
  navigator.clipboard.writeText(txt);
  alert('Đã copy JSON thoại');
}

/* =========================
   UTILS
========================= */
function clearPreview() {
  appState.scenes = [];
  appState.dialogues = [];
  appState.sfx = [];
  qs('sceneSelect') && (qs('sceneSelect').innerHTML = '');
  console.log('[XNC] Preview cleared');
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
//-------------------------
function renderPreviewJSON() {
  const box = document.getElementById('previewBox');
  if (!box) return;

  box.textContent = JSON.stringify({
    scenes: appState.scenes,
    dialogues: appState.dialogues,
    sfx: appState.sfx
  }, null, 2);
}

//--------------------------
function renderSceneSelect() {
  const sel = document.getElementById('sceneSelect');
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Chọn Scene --</option>';

  appState.scenes.forEach((sc, i) => {
    const opt = document.createElement('option');
    opt.value = sc.id;
    opt.textContent = `${sc.id} (${sc.frames.length} frame)`;
    sel.appendChild(opt);
  });
}

function renderFrameSelect(sceneId) {
  const frameSel = document.getElementById('frameSelect');
  if (!frameSel || !appState.sceneManifest) return;

  frameSel.innerHTML = '<option value="">-- Chọn Frame --</option>';

  const scene = appState.sceneManifest.scenes.find(s => s.id === sceneId);
  if (!scene || !scene.frames) return;

  scene.frames.forEach((fr, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `Frame ${idx+1}`;
    frameSel.appendChild(opt);
  });
}
//--------------------------
function renderAfterSplit() {
  renderPreviewJSON();
  renderSceneSelect();
}

/* =========================
   BIND UI
========================= */
qs('reloadManifestBtn')?.addEventListener('click', loadManifest);

qs('loadStoryBtn')?.addEventListener('click', () => {
  const sel = qs('storySelect');
  if (!sel || !sel.value) {
    alert('Chưa chọn truyện');
    return;
  }
  loadStory(sel.value);
});

function bindUI() {
  qs('saveLocalBtn')?.addEventListener('click', saveStoryLocal);
  qs('exportStoryBtn')?.addEventListener('click', exportStoryJSON);
  qs('splitBtn')?.addEventListener('click', splitScenesFromStory);
  qs('exportDialogueBtn')?.addEventListener('click', exportDialogueJSON);
  qs('copyDialogueBtn')?.addEventListener('click', copyDialogueJSON);
  qs('clearPreviewBtn')?.addEventListener('click', clearPreview);
}

/* =========================
   INIT
========================= */
async function init() {
  try {
    await loadCharacters();
    await loadManifest();   // 👈 THIẾU CÁI NÀY
    bindUI();
    console.log('[XNC] CORE READY');
  } catch (e) {
    console.error('[XNC] INIT ERROR', e);
  }
}


document.addEventListener('DOMContentLoaded', init);
