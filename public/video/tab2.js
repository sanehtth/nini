// ================= TAB 2 – FRAME ENGINE (FULL, STABLE) =================

// ---------- STATE ----------
let tab2Data = {
  scenes: [],
  currentSceneIndex: 0,
  currentFrameIndex: 0
};

// ---------- MASTER DATA ----------
const TAB2_MASTER = {
  faces: [],
  states: [],
  outfits: [],
  actions: [],
  backgrounds: []
};

// ---------- UTILS ----------
const byId = (list, id) => list.find(x => x.id === id);

// ---------- LOAD MASTER JSON ----------
async function tab2_loadMasters() {
  const base = '/adn/xomnganchuyen/';

  const [faces, states, outfits, actions, backgrounds] =
    await Promise.all([
      fetch(base + 'XNC_faces.json').then(r => r.json()),
      fetch(base + 'XNC_states.json').then(r => r.json()),
      fetch(base + 'XNC_outfits.json').then(r => r.json()),
      fetch(base + 'XNC_actions.json').then(r => r.json()),
      fetch(base + 'XNC_backgrounds.json').then(r => r.json())
    ]);

  TAB2_MASTER.faces = faces.faces || [];
  TAB2_MASTER.states = states.states || [];
  TAB2_MASTER.outfits = outfits.outfits || [];
  TAB2_MASTER.actions = actions.actions || [];
  TAB2_MASTER.backgrounds = backgrounds.backgrounds || [];

  bindSelect('tab2_face', TAB2_MASTER.faces);
  bindSelect('tab2_state', TAB2_MASTER.states);
  bindSelect('tab2_outfit', TAB2_MASTER.outfits);
  bindSelect('tab2_background', TAB2_MASTER.backgrounds);

  bindSelect('tab2_camera', [
    { id: 'closeup', label: 'Close-up' },
    { id: 'medium', label: 'Medium shot' },
    { id: 'wide', label: 'Wide shot' }
  ]);

  console.log('[TAB2] Master JSON loaded');
}

function bindSelect(id, list) {
  const el = qs(id);
  el.innerHTML = '<option value="">-- chọn --</option>';
  list.forEach(it => {
    const o = document.createElement('option');
    o.value = it.id;
    o.textContent = it.label || it.id;
    el.appendChild(o);
  });
}

// ---------- LOAD DATA ----------
function tab2_loadFromLocal() {
  if (!appState.scenes || !appState.scenes.length) {
    alert('Tab 1 chưa có scene');
    return;
  }
  tab2_initFromScenes(appState.scenes);
}

async function tab2_loadFromRemote() {
  const url = prompt(
    'Nhập path JSON A:',
    '/substance/XNC-20260110-0005_A.json'
  );
  if (!url) return;
  const json = await fetch(url).then(r => r.json());
  tab2_initFromScenes(json.scenes || []);
}

// ---------- SCENE → FRAME ----------
function tab2_initFromScenes(scenes) {
  tab2Data.scenes = scenes.map(scene => ({
    sceneId: scene.id,
    narration: scene.narration,
    frames: scene.dialogues.map((d, i) => ({
      frameId: `${scene.id}_F${String(i + 1).padStart(2, '0')}`,
      actor: d.character,
      text: d.text,
      camera: 'closeup',
      face: '',
      state: '',
      outfit: '',
      background: '',
      note: ''
    }))
  }));

  const sel = qs('tab2_sceneSelect');
  sel.innerHTML = '';
  tab2Data.scenes.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = s.sceneId;
    sel.appendChild(o);
  });

  sel.onchange = () => tab2_selectScene(sel.value);
  tab2_selectScene(0);
}

// ---------- SELECT SCENE / FRAME ----------
function tab2_selectScene(index) {
  tab2Data.currentSceneIndex = Number(index);
  const scene = tab2Data.scenes[tab2Data.currentSceneIndex];

  const sel = qs('tab2_frameSelect');
  sel.innerHTML = '';
  scene.frames.forEach((f, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = f.frameId;
    sel.appendChild(o);
  });

  sel.onchange = () => tab2_selectFrame(sel.value);
  tab2_selectFrame(0);
}

function tab2_selectFrame(index) {
  tab2Data.currentFrameIndex = Number(index);
  const f = tab2Data.scenes[tab2Data.currentSceneIndex]
    .frames[tab2Data.currentFrameIndex];

  qs('tab2_actor').value = f.actor;
  qs('tab2_text').value = f.text;
  qs('tab2_camera').value = f.camera;
  qs('tab2_face').value = f.face;
  qs('tab2_state').value = f.state;
  qs('tab2_outfit').value = f.outfit;
  qs('tab2_background').value = f.background;
  qs('tab2_note').value = f.note;
}

// ---------- SAVE FRAME ----------
function tab2_saveFrame() {
  const f = tab2Data.scenes[tab2Data.currentSceneIndex]
    .frames[tab2Data.currentFrameIndex];

  f.text = qs('tab2_text').value;
  f.camera = qs('tab2_camera').value;
  f.face = qs('tab2_face').value;
  f.state = qs('tab2_state').value;
  f.outfit = qs('tab2_outfit').value;
  f.background = qs('tab2_background').value;
  f.note = qs('tab2_note').value;

  qs('tab2_debug').textContent =
    JSON.stringify(tab2Data, null, 2);
}

// ---------- MERGE FRAME ----------
function tab2_mergeFrames() {
  const scene = tab2Data.scenes[tab2Data.currentSceneIndex];
  if (scene.frames.length < 2) return;

  const f1 = scene.frames.shift();
  const f2 = scene.frames.shift();

  scene.frames.unshift({
    frameId: `${f1.frameId}_${f2.frameId}`,
    actor: `${f1.actor}, ${f2.actor}`,
    text: `${f1.text} ${f2.text}`,
    camera: 'medium',
    face: '',
    state: '',
    outfit: '',
    background: '',
    note: 'Merged frame'
  });

  tab2_selectScene(tab2Data.currentSceneIndex);
}

// ---------- EXPORT TAB 3 ----------
function tab2_export() {
  const payload = {
    type: 'VIDEO_PROMPT_V2',
    scenes: tab2Data.scenes.map(s => ({
      sceneId: s.sceneId,
      frames: s.frames.map(f => {
        const face = byId(TAB2_MASTER.faces, f.face);
        const state = byId(TAB2_MASTER.states, f.state);
        const outfit = byId(TAB2_MASTER.outfits, f.outfit);
        const bg = byId(TAB2_MASTER.backgrounds, f.background);

        return {
          frameId: f.frameId,
          prompt: `
Close-up of ${f.actor},
${face?.desc_en || ''},
${state?.desc_en || ''},
wearing ${outfit?.desc_en || ''},
background: ${bg?.desc_en || ''}
`.trim()
        };
      })
    }))
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'video_prompt_v2.json';
  a.click();
}

// ---------- INIT ----------
function initTab2() {
  tab2_loadMasters();

  qs('tab2_load_local').onclick = tab2_loadFromLocal;
  qs('tab2_load_remote').onclick = tab2_loadFromRemote;
  qs('tab2_saveFrame').onclick = tab2_saveFrame;
  qs('tab2_mergeFrames').onclick = tab2_mergeFrames;
  qs('tab2_export').onclick = tab2_export;

  console.log('[TAB2] READY');
}
