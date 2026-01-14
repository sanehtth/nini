// ================= TAB 2 – FRAME EDITOR =================

const qs = (id) => document.getElementById(id);

// ---------- STATE ----------
let TAB2 = {
  master: null,
  sceneId: null,
  frameId: null,
  frameData: {}
};

// ---------- LOAD FROM TAB1 ----------
window.tab2_loadFromTab1 = function () {
  if (!window.TAB1_MASTER_JSON) {
    alert('Chưa có dữ liệu từ Tab 1');
    return;
  }
  TAB2.master = window.TAB1_MASTER_JSON;
  buildSceneSelect();
  console.log('[TAB2] Loaded from Tab1');
};

// ---------- BUILD SCENE / FRAME ----------
function buildSceneSelect() {
  const sel = qs('tab2_scene');
  sel.innerHTML = '';
  Object.keys(TAB2.master.scenes).forEach(id => {
    sel.append(new Option(id, id));
  });
  sel.onchange = selectScene;
  sel.value = Object.keys(TAB2.master.scenes)[0];
  selectScene();
}

function selectScene() {
  TAB2.sceneId = qs('tab2_scene').value;
  const frames = TAB2.master.scenes[TAB2.sceneId].frames;
  const sel = qs('tab2_frame');
  sel.innerHTML = '';
  Object.keys(frames).forEach(fid => {
    sel.append(new Option(fid, fid));
  });
  sel.onchange = selectFrame;
  sel.value = Object.keys(frames)[0];
  selectFrame();
}

function selectFrame() {
  TAB2.frameId = qs('tab2_frame').value;
  TAB2.frameData = TAB2.master.scenes[TAB2.sceneId].frames[TAB2.frameId] || {};
  fillForm();
  renderPreview();
}

// ---------- FILL FORM ----------
function fillForm() {
  const f = TAB2.frameData;

  qs('tab2_character').value = f.character_id || '';
  qs('tab2_dialog').value = f.dialog || '';
  qs('tab2_camera').value = f.camera || '';
  qs('tab2_face').value = f.face || '';
  qs('tab2_state').value = f.state || '';
  qs('tab2_outfit').value = f.outfit || '';
  qs('tab2_background').value = f.background || '';
  qs('tab2_note').value = f.note || '';
}

// ---------- SAVE ----------
qs('tab2_saveFrameBtn').onclick = () => {
  const f = TAB2.frameData;

  f.character_id = qs('tab2_character').value;
  f.dialog = qs('tab2_dialog').value;
  f.camera = qs('tab2_camera').value;
  f.face = qs('tab2_face').value;
  f.state = qs('tab2_state').value;
  f.outfit = qs('tab2_outfit').value;
  f.background = qs('tab2_background').value;
  f.note = qs('tab2_note').value;

  renderPreview();
  console.log('[TAB2] Frame saved', f);
};

// ---------- PROMPT BUILD ----------
function renderPreview() {
  const pre = qs('tab2_preview');
  if (!pre) return;

  const f = TAB2.frameData;
  const char = TAB2.master.maps.characters[f.character_id];
  const face = TAB2.master.maps.faces[f.face];
  const state = TAB2.master.maps.states[f.state];
  const bg = TAB2.master.maps.backgrounds[f.background];
  const outfit = TAB2.master.maps.outfits[f.outfit];

  let lines = [];

  if (char) {
    lines.push(`CHARACTER: ${char.name}`);
    lines.push(char.base_desc_en || char.prompt_en || '');
  }

  if (face) lines.push(`Face: ${face.desc_en}`);
  if (state) lines.push(`Action: ${state.desc_en}`);

  if (outfit) {
    const variant =
      outfit.variants?.[char.gender] ||
      outfit.variants?.male ||
      outfit.variants?.female;
    if (variant?.base_desc_en) {
      lines.push(`Outfit: ${variant.base_desc_en}`);
    }
  }

  if (bg) lines.push(`Background: ${bg.desc_en}`);
  if (f.dialog) lines.push(`Dialogue: "${f.dialog}"`);

  pre.textContent = lines.filter(Boolean).join('\n\n');
}

// ---------- INIT ----------
console.log('[TAB2] READY');
