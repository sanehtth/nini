/* =====================================================
   TAB 2 – SCENE → FRAME EDITOR (FINAL, CLEAN ARCH)
   - Character: lấy từ XNC_characters.json (MASTER)
   - 1 dialogue = 1 frame
   - Xuất <STORY_ID>_B.json cho Tab 3
===================================================== */

const tab2State = {
  storyId: '',
  scenes: [],
  masters: {
    characters: [],
    faces: [],
    states: [],
    outfits: [],
    backgrounds: []
  }
};

const qs = id => document.getElementById(id);

/* ================= LOAD MASTER DATA ================= */

async function tab2_loadMasters() {
  const base = '/adn/xomnganchuyen/';

  const load = f => fetch(base + f).then(r => r.json());

  const [
    characters,
    faces,
    states,
    outfits,
    backgrounds
  ] = await Promise.all([
    load('XNC_characters.json'),
    load('XNC_faces.json'),
    load('XNC_states.json'),
    load('XNC_outfits.json'),
    load('XNC_backgrounds.json')
  ]);

  tab2State.masters.characters = characters.characters || [];
  tab2State.masters.faces = faces.faces || [];
  tab2State.masters.states = states.states || [];
  tab2State.masters.outfits = outfits.outfits || [];
  tab2State.masters.backgrounds = backgrounds.backgrounds || [];

  bindSelect('tab2_actor', tab2State.masters.characters, 'label');
  bindSelect('tab2_face', tab2State.masters.faces, 'label');
  bindSelect('tab2_state', tab2State.masters.states, 'label');
  bindSelect('tab2_outfit', tab2State.masters.outfits, 'label');
  bindSelect('tab2_background', tab2State.masters.backgrounds, 'label');

  console.log('[TAB2] Master JSON loaded');
}

function bindSelect(id, list, labelKey = 'label') {
  const el = qs(id);
  el.innerHTML = '';
  list.forEach(it => {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it[labelKey] || it.id;
    el.appendChild(opt);
  });
}

/* ================= LOAD STORY DATA ================= */

function tab2_loadFromLocal() {
  if (!window.appState?.scenes || !window.appState.storyDraft) {
    alert('Tab 1 chưa có dữ liệu');
    return;
  }

  tab2State.storyId = window.appState.storyDraft.id;
  tab2State.scenes = buildFrames(window.appState.scenes);

  initSceneUI();
}

async function tab2_loadFromRemote() {
  const id = prompt('Nhập STORY ID (vd: XNC-20260110-0005)');
  if (!id) return;

  const url = `/substance/${id}_A.json`;
  const data = await fetch(url).then(r => r.json());

  tab2State.storyId = data.storyId;
  tab2State.scenes = buildFrames(data.scenes);

  initSceneUI();
}

/* ================= BUILD FRAMES ================= */

function buildFrames(scenes) {
  return scenes.map(scene => ({
    sceneId: scene.id,
    frames: scene.dialogues.map((d, i) => ({
      frameId: `${scene.id}_F${String(i + 1).padStart(2, '0')}`,
      character: guessCharacterId(d.character),
      text: d.text,
      camera: 'Close-up',
      face: '',
      state: '',
      outfit: '',
      background: '',
      note: ''
    }))
  }));
}

// map tên thoại -> character id (best effort)
function guessCharacterId(label) {
  const found = tab2State.masters.characters.find(
    c => c.label === label
  );
  return found ? found.id : tab2State.masters.characters[0]?.id || '';
}

/* ================= UI LOGIC ================= */

function initSceneUI() {
  const sel = qs('tab2_sceneSelect');
  sel.innerHTML = '';

  tab2State.scenes.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.sceneId;
    opt.textContent = s.sceneId;
    sel.appendChild(opt);
  });

  sel.onchange = selectScene;
  selectScene();
}

function selectScene() {
  const sceneId = qs('tab2_sceneSelect').value;
  const scene = tab2State.scenes.find(s => s.sceneId === sceneId);

  const frameSel = qs('tab2_frameSelect');
  frameSel.innerHTML = '';

  scene.frames.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.frameId;
    opt.textContent = f.frameId;
    frameSel.appendChild(opt);
  });

  frameSel.onchange = selectFrame;
  selectFrame();
renderPreview();
   
}

function selectFrame() {
  const scene = getCurrentScene();
  const frame = getCurrentFrame();

  qs('tab2_actor').value = frame.character;
  qs('tab2_text').value = frame.text;
  qs('tab2_camera').value = frame.camera;
  qs('tab2_face').value = frame.face;
  qs('tab2_state').value = frame.state;
  qs('tab2_outfit').value = frame.outfit;
  qs('tab2_background').value = frame.background;
  qs('tab2_note').value = frame.note;
}

function getCurrentScene() {
  const id = qs('tab2_sceneSelect').value;
  return tab2State.scenes.find(s => s.sceneId === id);
}

function getCurrentFrame() {
  const scene = getCurrentScene();
  const id = qs('tab2_frameSelect').value;
  return scene.frames.find(f => f.frameId === id);
}

/* ================= SAVE / MERGE ================= */

function saveFrame() {
  const f = getCurrentFrame();

  f.character = qs('tab2_actor').value;
  f.text = qs('tab2_text').value;
  f.camera = qs('tab2_camera').value;
  f.face = qs('tab2_face').value;
  f.state = qs('tab2_state').value;
  f.outfit = qs('tab2_outfit').value;
  f.background = qs('tab2_background').value;
  f.note = qs('tab2_note').value;

  alert('Đã lưu frame');
}

function mergeFrames() {
  const scene = getCurrentScene();
  if (scene.frames.length < 2) return;

  const base = scene.frames.shift();
  scene.frames.forEach(f => {
    base.text += '\n' + f.text;
  });

  scene.frames = [base];
  selectScene();
}

/* ================= EXPORT JSON B ================= */

function exportTab3() {
  const out = {
    type: 'VIDEO_PROMPT_V2',
    storyId: tab2State.storyId,
    scenes: tab2State.scenes.map(scene => ({
      sceneId: scene.sceneId,
      frames: scene.frames.map(f => {
        const char = tab2State.masters.characters.find(c => c.id === f.character);
        const face = tab2State.masters.faces.find(x => x.id === f.face);
        const state = tab2State.masters.states.find(x => x.id === f.state);
        const outfit = tab2State.masters.outfits.find(x => x.id === f.outfit);
        const bg = tab2State.masters.backgrounds.find(x => x.id === f.background);

        return {
          frameId: f.frameId,
          prompt: `
Close-up of ${char?.label || ''},
${char?.desc_en || ''},
${face?.desc_en || ''},
${state?.desc_en || ''},
wearing ${outfit?.desc_en || ''},
background: ${bg?.desc_en || ''}
Dialogue: ${f.text}
`.trim()
        };
      })
    }))
  };

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${tab2State.storyId}_B.json`;
  a.click();
}

/* ================= INIT ================= */

function initTab2() {
  qs('tab2_load_local').onclick = tab2_loadFromLocal;
  qs('tab2_load_remote').onclick = tab2_loadFromRemote;
  qs('tab2_saveFrame').onclick = saveFrame;
  qs('tab2_mergeFrames').onclick = mergeFrames;
  qs('tab2_export').onclick = exportTab3;

  tab2_loadMasters();
  console.log('[TAB2] READY');
}
function renderPreview() {
  const f = getCurrentFrame();
  if (!f) return;

  const char = tab2State.masters.characters.find(c => c.id === f.character);
  const face = tab2State.masters.faces.find(x => x.id === f.face);
  const state = tab2State.masters.states.find(x => x.id === f.state);
  const outfit = tab2State.masters.outfits.find(x => x.id === f.outfit);
  const bg = tab2State.masters.backgrounds.find(x => x.id === f.background);

  const preview = `
FRAME: ${f.frameId}

CHARACTER: ${char?.label || ''}
CAMERA: ${f.camera}

FACE: ${face?.label || ''}
STATE: ${state?.label || ''}
OUTFIT: ${outfit?.label || ''}
BACKGROUND: ${bg?.label || ''}

DIALOGUE:
"${f.text}"

NOTE:
${f.note || ''}
`.trim();

  qs('tab2_preview').textContent = preview;
}

