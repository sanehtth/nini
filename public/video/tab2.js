/* ================= TAB 2 – FRAME EDITOR ================= */

const tab2State = {
  storyId: '',
  scenes: [],
  masters: {}
};

const qs = id => document.getElementById(id);

/* ---------- LOAD MASTER JSON ---------- */
async function tab2_loadMasters() {
  const base = '/adn/xomnganchuyen/';
  const load = f => fetch(base + f).then(r => r.json());

  const [
    faces, states, outfits, actions, backgrounds
  ] = await Promise.all([
    load('XNC_faces.json'),
    load('XNC_states.json'),
    load('XNC_outfits.json'),
    load('XNC_actions.json'),
    load('XNC_backgrounds.json')
  ]);

  tab2State.masters = { faces, states, outfits, actions, backgrounds };

  fillSelect('tab2_face', faces.faces);
  fillSelect('tab2_state', states.states);
  fillSelect('tab2_outfit', outfits.outfits);
  fillSelect('tab2_background', backgrounds.backgrounds);

  console.log('[TAB2] Master JSON loaded');
}

function fillSelect(id, arr) {
  const el = qs(id);
  el.innerHTML = '';
  arr.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id || o.label;
    opt.textContent = o.label || o.id;
    el.appendChild(opt);
  });
}

/* ---------- LOAD FROM TAB 1 ---------- */
function tab2_loadFromLocal() {
  if (!window.appState?.scenes) {
    alert('Tab 1 chưa có dữ liệu');
    return;
  }
  tab2State.storyId = window.appState.storyDraft.id;
  tab2State.scenes = buildFrames(window.appState.scenes);
  tab2_initUI();
}

/* ---------- LOAD FROM GITHUB ---------- */
async function tab2_loadFromRemote() {
  const id = prompt('Nhập STORY ID (vd: XNC-20260110-0005)');
  if (!id) return;

  const url = `/substance/${id}_A.json`;
  const data = await fetch(url).then(r => r.json());

  tab2State.storyId = data.storyId;
  tab2State.scenes = buildFrames(data.scenes);
  tab2_initUI();
}

/* ---------- BUILD FRAMES ---------- */
function buildFrames(scenes) {
  return scenes.map(s => ({
    sceneId: s.id,
    frames: s.dialogues.map((d, i) => ({
      frameId: `${s.id}_F${i + 1}`,
      character: d.character,
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
/*-------------------------*/
function tab2_bindActors(scene) {
  const actorSet = new Set();
  scene.frames.forEach(f => actorSet.add(f.character));

  const actorSelect = qs('tab2_actor');
  actorSelect.innerHTML = '';

  [...actorSet].forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    actorSelect.appendChild(opt);
  });
}

/* ---------- UI ---------- */
function tab2_initUI() {
  const sceneSel = qs('tab2_sceneSelect');
  sceneSel.innerHTML = '';
  tab2State.scenes.forEach(s => {
    const o = document.createElement('option');
    o.value = s.sceneId;
    o.textContent = s.sceneId;
    sceneSel.appendChild(o);
  });
  sceneSel.onchange = tab2_selectScene;
  tab2_selectScene();
}

function tab2_selectScene() {
  const sceneId = qs('tab2_sceneSelect').value;
  const scene = tab2State.scenes.find(s => s.sceneId === sceneId);

  tab2_bindActors(scene); // ✅ THÊM DÒNG NÀY

  const frameSel = qs('tab2_frameSelect');
  frameSel.innerHTML = '';

  scene.frames.forEach(f => {
    const o = document.createElement('option');
    o.value = f.frameId;
    o.textContent = f.frameId;
    frameSel.appendChild(o);
  });

  frameSel.onchange = tab2_selectFrame;
  tab2_selectFrame();
}


function tab2_selectFrame() {
  const scene = tab2_getScene();
  const frame = tab2_getFrame();
  qs('tab2_actor').value = frame.character;
  qs('tab2_text').value = frame.text;
  qs('tab2_camera').value = frame.camera;
  qs('tab2_face').value = frame.face;
  qs('tab2_state').value = frame.state;
  qs('tab2_outfit').value = frame.outfit;
  qs('tab2_background').value = frame.background;
  qs('tab2_note').value = frame.note;
}

function tab2_getScene() {
  return tab2State.scenes.find(s => s.sceneId === qs('tab2_sceneSelect').value);
}
function tab2_getFrame() {
  return tab2_getScene().frames.find(f => f.frameId === qs('tab2_frameSelect').value);
}

/* ---------- SAVE / MERGE ---------- */
function tab2_saveFrame() {
  const f = tab2_getFrame();
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

function tab2_mergeFrames() {
  const scene = tab2_getScene();
  if (scene.frames.length < 2) return;
  const f1 = scene.frames[0];
  scene.frames.slice(1).forEach(f => {
    f1.text += '\n' + f.text;
  });
  scene.frames = [f1];
  tab2_selectScene();
}

/* ---------- EXPORT JSON B ---------- */
function tab2_export() {
  const out = {
    type: 'VIDEO_PROMPT_V2',
    storyId: tab2State.storyId,
    scenes: tab2State.scenes.map(s => ({
      sceneId: s.sceneId,
      frames: s.frames.map(f => ({
        frameId: f.frameId,
        prompt:
`Camera: ${f.camera}
Character: ${f.character}
Face: ${f.face}
State: ${f.state}
Outfit: ${f.outfit}
Background: ${f.background}
Dialogue: ${f.text}
Note: ${f.note}`
      }))
    }))
  };

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${tab2State.storyId}_B.json`; // ✅ ĐÚNG CHUẨN
  a.click();
}

/* ---------- INIT ---------- */
function initTab2() {
  qs('tab2_load_local').onclick = tab2_loadFromLocal;
  qs('tab2_load_remote').onclick = tab2_loadFromRemote;
  qs('tab2_export').onclick = tab2_export;
  qs('tab2_saveFrame').onclick = tab2_saveFrame;
  qs('tab2_mergeFrames').onclick = tab2_mergeFrames;
  tab2_loadMasters();
  console.log('[TAB2] READY');
}



