// ================== TAB 2 – FRAME ENGINE ==================
// ========= LOAD MASTER DATA =========
const TAB2_MASTER = {
  faces: [],
  states: [],
  outfits: [],
  actions: [],
  backgrounds: []
};

async function tab2_loadMasters() {
  const base = '/adn/xomnganchuyen/';

  const [faces, states, outfits, actions, backgrounds] =
    await Promise.all([
      fetch(base + 'XNC_faces.json').then(r => r.json()),
      fetch(base + 'XNC_states.json').then(r => r.json()),
      fetch(base + 'XNC_outfits.json').then(r => r.json()),
      fetch(base + 'XNC_actions.json').then(r => r.json()),
      fetch(base + 'XNC_background.json').then(r => r.json())
    ]);

  TAB2_MASTER.faces = faces.faces;
  TAB2_MASTER.states = states.states;
  TAB2_MASTER.outfits = outfits.outfits;
  TAB2_MASTER.actions = actions.actions;
  TAB2_MASTER.backgrounds = backgrounds.backgrounds;

  tab2_bindSelect('tab2_face', TAB2_MASTER.faces);
  tab2_bindSelect('tab2_state', TAB2_MASTER.states);
  tab2_bindSelect('tab2_outfit', TAB2_MASTER.outfits);
  tab2_bindSelect('tab2_background', TAB2_MASTER.backgrounds);

  // camera simple preset
  tab2_bindSelect('tab2_camera', [
    { id: 'closeup', label: 'Close-up' },
    { id: 'medium', label: 'Medium shot' },
    { id: 'wide', label: 'Wide shot' }
  ]);

  console.log('[TAB2] Master data loaded');
}

function tab2_bindSelect(id, list) {
  const sel = qs(id);
  sel.innerHTML = '<option value="">-- chọn --</option>';
  list.forEach(it => {
    const o = document.createElement('option');
    o.value = it.id;
    o.textContent = it.label || it.id;
    sel.appendChild(o);
  });
}

let tab2Data = {
  scenes: [],
  currentScene: null,
  currentFrame: null
};

// ---------- LOAD DATA ----------

function tab2_loadFromLocal() {
  if (!appState.scenes || !appState.scenes.length) {
    alert('Tab 1 chưa có scene');
    return;
  }
  tab2_initFromScenes(appState.scenes);
}

async function tab2_loadFromRemote() {
  const url = prompt('Nhập path JSON A:', '/substance/XNC-20260110-0005_A.json');
  if (!url) return;
  const json = await fetch(url).then(r => r.json());
  tab2_initFromScenes(json.scenes || []);
}

// ---------- SCENE → FRAME ----------

function tab2_initFromScenes(scenes) {
  tab2Data.scenes = scenes.map(scene => ({
    sceneId: scene.id,
    narration: scene.narration,
    frames: tab2_generateFrames(scene)
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

// 🔥 1 THOẠI = 1 FRAME
function tab2_generateFrames(scene) {
  let idx = 1;
  return scene.dialogues.map(d => ({
    frameId: `${scene.id}_F${String(idx++).padStart(2, '0')}`,
    actor: d.character,
    text: d.text,
    camera: 'closeup',
    emotion: '',
    outfit: '',
    note: ''
  }));
}

// ---------- SELECT ----------

function tab2_selectScene(index) {
  tab2Data.currentScene = tab2Data.scenes[index];
  const sel = qs('tab2_frameSelect');
  sel.innerHTML = '';

  tab2Data.currentScene.frames.forEach((f, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = f.frameId;
    sel.appendChild(o);
  });

  sel.onchange = () => tab2_selectFrame(sel.value);
  tab2_selectFrame(0);
}

function tab2_selectFrame(index) {
  const f = tab2Data.currentScene.frames[index];
  tab2Data.currentFrame = f;

  qs('tab2_actor').value = f.actor;
  qs('tab2_text').value = f.text;
  qs('tab2_camera').value = f.camera;
  qs('tab2_emotion').value = f.emotion;
  qs('tab2_outfit').value = f.outfit;
  qs('tab2_note').value = f.note;
}

// ---------- EDIT ----------

function tab2_saveFrame() {
  const f = tab2Data.currentFrame;
  f.actor = qs('tab2_actor').value;
  f.text = qs('tab2_text').value;
  f.camera = qs('tab2_camera').value;
  f.emotion = qs('tab2_emotion').value;
  f.outfit = qs('tab2_outfit').value;
  f.note = qs('tab2_note').value;

  qs('tab2_debug').textContent =
    JSON.stringify(tab2Data, null, 2);
}

// ---------- MERGE FRAME ----------

function tab2_mergeFrames() {
  const frames = tab2Data.currentScene.frames;
  if (frames.length < 2) return;

  const f1 = frames.shift();
  const f2 = frames.shift();

  frames.unshift({
    frameId: `${f1.frameId}_${f2.frameId}`,
    actor: `${f1.actor}, ${f2.actor}`,
    text: `${f1.text} ${f2.text}`,
    camera: 'medium',
    emotion: '',
    outfit: '',
    note: 'Merged frame'
  });

  tab2_selectScene(0);
}

// ---------- EXPORT TAB 3 ----------

function tab2_export() {
  const payload = {
    type: 'VIDEO_PROMPT_V1',
    scenes: tab2Data.scenes.map(s => ({
      sceneId: s.sceneId,
      frames: s.frames.map(f => ({
        frameId: f.frameId,
        prompt: `Close-up of ${f.actor}, emotion ${f.emotion}, wearing ${f.outfit}, ${f.text}`
      }))
    }))
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'video_prompt.json';
  a.click();
}

// ---------- INIT ----------

function initTab2() {
  qs('tab2_load_local').onclick = tab2_loadFromLocal;
  qs('tab2_load_remote').onclick = tab2_loadFromRemote;
  qs('tab2_saveFrame').onclick = tab2_saveFrame;
  qs('tab2_mergeFrames').onclick = tab2_mergeFrames;
  qs('tab2_export').onclick = tab2_export;

  console.log('[TAB2] READY');
}

