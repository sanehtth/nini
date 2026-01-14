/* ===============================
   TAB 2 – SCENE → FRAME EDITOR
   FINAL STABLE VERSION
================================ */

const tab2State = {
  scenes: [],
  currentScene: null,
  currentFrame: null,
  masters: {
    characters: [],
    faces: [],
    states: [],
    outfits: [],
    backgrounds: []
  }
};

/* ===============================
   HELPERS
================================ */

const qs = id => document.getElementById(id);

function safe(v) {
  return v === undefined || v === null ? '' : v;
}

/* ===============================
   LOAD MASTER JSON
================================ */

async function loadMasterJSON() {
  const base = '/adn/xomnganchuyen/';

  const load = async (file) => {
    const res = await fetch(base + file);
    return res.json();
  };

  tab2State.masters.characters  = (await load('XNC_characters.json')).characters || [];
  tab2State.masters.faces       = (await load('XNC_faces.json')).faces || [];
  tab2State.masters.states      = (await load('XNC_states.json')).states || [];
  tab2State.masters.outfits     = (await load('XNC_outfits.json')).outfits || [];
  tab2State.masters.backgrounds = (await load('XNC_backgrounds.json')).backgrounds || [];

  fillSelect('tab2_character', tab2State.masters.characters);
  fillSelect('tab2_face', tab2State.masters.faces);
  fillSelect('tab2_state', tab2State.masters.states);
  fillSelect('tab2_outfit', tab2State.masters.outfits);
  fillSelect('tab2_background', tab2State.masters.backgrounds);

  console.log('[TAB2] Master JSON loaded');
}

function fillSelect(id, list) {
  const el = qs(id);
  if (!el) return;

  el.innerHTML = '';
  list.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;          // ✅ VALUE = ID
    opt.textContent = item.label; // UI = LABEL
    el.appendChild(opt);
  });
}

/* ===============================
   LOAD FROM TAB 1 (LOCAL)
================================ */

function tab2_loadFromLocal() {
  if (!window.appState || !appState.scenes) {
    alert('Chưa có dữ liệu từ Tab 1');
    return;
  }

  tab2State.scenes = appState.scenes.map(sc => ({
    sceneId: sc.id,
    frames: sc.dialogues.map((d, i) => ({
      frameId: `${sc.id}_F${i + 1}`,
      character: '',
      text: d.text || '',
      camera: 'Close-up',
      face: '',
      state: '',
      outfit: '',
      background: '',
      note: ''
    }))
  }));

  buildSceneList();
  console.log('[TAB2] Loaded from Tab1');
}

/* ===============================
   LOAD FROM JSON A (GITHUB)
================================ */

async function tab2_loadFromJSONA() {
  const storyId = appState.storyId;
  if (!storyId) {
    alert('Chưa có storyId');
    return;
  }

  const url = `/substance/${storyId}_A.json`;
  const res = await fetch(url);
  const json = await res.json();

  tab2State.scenes = json.scenes.map(sc => ({
    sceneId: sc.id,
    frames: sc.dialogues.map((d, i) => ({
      frameId: `${sc.id}_F${i + 1}`,
      character: '',
      text: d.text || '',
      camera: 'Close-up',
      face: '',
      state: '',
      outfit: '',
      background: '',
      note: ''
    }))
  }));

  buildSceneList();
  console.log('[TAB2] Loaded from JSON A');
}

/* ===============================
   BUILD UI LISTS
================================ */

function buildSceneList() {
  const sel = qs('tab2_scene');
  sel.innerHTML = '';

  tab2State.scenes.forEach(sc => {
    const opt = document.createElement('option');
    opt.value = sc.sceneId;
    opt.textContent = sc.sceneId;
    sel.appendChild(opt);
  });

  selectScene();
}

function selectScene() {
  const id = qs('tab2_scene').value;
  tab2State.currentScene = tab2State.scenes.find(s => s.sceneId === id);
  buildFrameList();
}

function buildFrameList() {
  const sel = qs('tab2_frame');
  sel.innerHTML = '';

  tab2State.currentScene.frames.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.frameId;
    opt.textContent = f.frameId;
    sel.appendChild(opt);
  });

  selectFrame();
}

function selectFrame() {
  const id = qs('tab2_frame').value;
  tab2State.currentFrame =
    tab2State.currentScene.frames.find(f => f.frameId === id);

  const f = tab2State.currentFrame;
  if (!f) return;

  qs('tab2_character').value  = safe(f.character);
  qs('tab2_text').value       = safe(f.text);
  qs('tab2_camera').value     = safe(f.camera);
  qs('tab2_face').value       = safe(f.face);
  qs('tab2_state').value      = safe(f.state);
  qs('tab2_outfit').value     = safe(f.outfit);
  qs('tab2_background').value = safe(f.background);
  qs('tab2_note').value       = safe(f.note);

  renderPreview();
}

/* ===============================
   SAVE FRAME
================================ */

function saveFrame() {
  const f = tab2State.currentFrame;
  if (!f) return;

  f.character  = qs('tab2_character').value || '';
  f.text       = qs('tab2_text').value || '';
  f.camera     = qs('tab2_camera').value || '';
  f.face       = qs('tab2_face').value || '';
  f.state      = qs('tab2_state').value || '';
  f.outfit     = qs('tab2_outfit').value || '';
  f.background = qs('tab2_background').value || '';
  f.note       = qs('tab2_note').value || '';

  renderPreview();
  console.log('[TAB2] Frame saved', f.frameId);
}

/* ===============================
   PREVIEW
================================ */

function renderPreview() {
  const f = tab2State.currentFrame;
  if (!f) return;

  const char = tab2State.masters.characters.find(c => c.id === f.character);
  const face = tab2State.masters.faces.find(x => x.id === f.face);
  const state = tab2State.masters.states.find(x => x.id === f.state);
  const outfit = tab2State.masters.outfits.find(x => x.id === f.outfit);
  const bg = tab2State.masters.backgrounds.find(x => x.id === f.background);

  qs('tab2_preview').textContent = `
FRAME: ${f.frameId}

CHARACTER: ${char?.label || ''}
${char?.desc_en || ''}

CAMERA: ${f.camera}
FACE: ${face?.label || ''}
STATE: ${state?.label || ''}
OUTFIT: ${outfit?.label || ''}
BACKGROUND: ${bg?.label || ''}

TEXT:
"${f.text}"

NOTE:
${f.note || ''}
`.trim();
}

/* ===============================
   EXPORT JSON B
================================ */

function tab2_exportJSONB() {
  if (!appState.storyId) {
    alert('Thiếu storyId');
    return;
  }

  const out = {
    type: 'VIDEO_PROMPT_V2',
    storyId: appState.storyId,
    scenes: tab2State.scenes
  };

  const blob = new Blob(
    [JSON.stringify(out, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${appState.storyId}_B.json`;
  a.click();
}

/* ===============================
   INIT
================================ */

function initTab2() {
  qs('tab2_loadLocal').onclick = tab2_loadFromLocal;
  qs('tab2_loadJsonA').onclick = tab2_loadFromJSONA;
  qs('tab2_scene').onchange = selectScene;
  qs('tab2_frame').onchange = selectFrame;
  qs('tab2_saveFrame').onclick = saveFrame;
  qs('tab2_exportB').onclick = tab2_exportJSONB;

  loadMasterJSON();
  console.log('[TAB2] READY');
}

document.addEventListener('DOMContentLoaded', initTab2);
