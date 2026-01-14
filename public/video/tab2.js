/* =====================================================
   TAB 2 – SCENE → FRAME EDITOR (STABLE)
===================================================== */

window.tab2State = {
  scenes: [],
  currentScene: null,
  currentFrame: null,

  masters: {
    characters: [],
    faces: [],
    states: [],
    outfits: [],
    backgrounds: []
  },

  inited: false
};

/* ================= HELPERS ================= */

function tab2_safe(v) {
  return v === undefined || v === null ? '' : v;
}

function tab2_log(msg, data) {
  const box = qs('tab2_debug');
  if (box) {
    box.textContent =
      msg + (data ? '\n' + JSON.stringify(data, null, 2) : '');
  }
  console.log('[TAB2]', msg, data || '');
}

/* ================= LOAD MASTER JSON ================= */

async function tab2_loadMasters() {
  const base = '/adn/xomnganchuyen/';

  async function load(file) {
    const res = await fetch(base + file);
    return res.json();
  }

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

  tab2_fillSelects();
  tab2_log('Master JSON loaded');
}

/* ================= FILL SELECT ================= */

function fillSelect(id, items, label = 'label', value = 'id') {
  const sel = qs(id);
  if (!sel) return;

  sel.innerHTML = '';
  items.forEach(it => {
    const o = document.createElement('option');
    o.value = it[value];
    o.textContent = it[label];
    sel.appendChild(o);
  });
}

function tab2_fillSelects() {
  fillSelect('tab2_actor',
    tab2State.masters.characters,
    'label',
    'id'
  );

  fillSelect('tab2_face',
    tab2State.masters.faces,
    'label',
    'id'
  );

  fillSelect('tab2_state',
    tab2State.masters.states,
    'label',
    'id'
  );

  fillSelect('tab2_outfit',
    tab2State.masters.outfits,
    'id',
    'id'
  );

  fillSelect('tab2_background',
    tab2State.masters.backgrounds,
    'label',
    'id'
  );
}

/* ================= LOAD FROM TAB 1 ================= */

function tab2_loadFromLocal() {
  if (!window.appState?.scenes?.length) {
    alert('Tab 1 chưa có scene');
    return;
  }

  tab2State.scenes = appState.scenes.map(scene => ({
    id: scene.id,
    frames: scene.dialogues.map((d, i) => ({
      frameId: `${scene.id}_F${i + 1}`,
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

  tab2_buildSceneSelect();
  tab2_log('Loaded from Tab 1', tab2State.scenes);
}

/* ================= UI BUILD ================= */

function tab2_buildSceneSelect() {
  const sel = qs('tab2_sceneSelect');
  sel.innerHTML = '';

  tab2State.scenes.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.id;
    sel.appendChild(o);
  });

  if (tab2State.scenes.length) {
    tab2_selectScene(tab2State.scenes[0].id);
  }
}

function tab2_selectScene(id) {
  tab2State.currentScene =
    tab2State.scenes.find(s => s.id === id);

  const sel = qs('tab2_frameSelect');
  sel.innerHTML = '';

  tab2State.currentScene.frames.forEach(f => {
    const o = document.createElement('option');
    o.value = f.frameId;
    o.textContent = f.frameId;
    sel.appendChild(o);
  });

  if (tab2State.currentScene.frames.length) {
    tab2_selectFrame(
      tab2State.currentScene.frames[0].frameId
    );
  }
}

function tab2_selectFrame(id) {
  tab2State.currentFrame =
    tab2State.currentScene.frames.find(f => f.frameId === id);

  const f = tab2State.currentFrame;
  if (!f) return;

  qs('tab2_actor').value = tab2_safe(f.character);
  qs('tab2_text').value = tab2_safe(f.text);
  qs('tab2_camera').value = tab2_safe(f.camera);
  qs('tab2_face').value = tab2_safe(f.face);
  qs('tab2_state').value = tab2_safe(f.state);
  qs('tab2_outfit').value = tab2_safe(f.outfit);
  qs('tab2_background').value = tab2_safe(f.background);
  qs('tab2_note').value = tab2_safe(f.note);

  tab2_preview();
}

/* ================= SAVE / PREVIEW ================= */

function tab2_saveFrame() {
  const f = tab2State.currentFrame;
  if (!f) return;

  f.character = qs('tab2_actor').value;
  f.text = qs('tab2_text').value;
  f.camera = qs('tab2_camera').value;
  f.face = qs('tab2_face').value;
  f.state = qs('tab2_state').value;
  f.outfit = qs('tab2_outfit').value;
  f.background = qs('tab2_background').value;
  f.note = qs('tab2_note').value;

  tab2_preview();
}

function tab2_preview() {
  const f = tab2State.currentFrame;
  if (!f) return;

  const txt = `
${f.camera} of ${f.character},
face: ${f.face},
state: ${f.state},
outfit: ${f.outfit},
background: ${f.background}

"${f.text}"
`;

  qs('tab2_preview').textContent = txt.trim();
}

/* ================= INIT ================= */

window.tab2_init = async function () {
  if (tab2State.inited) return;
  tab2State.inited = true;

  await tab2_loadMasters();

  qs('tab2_load_local').onclick = tab2_loadFromLocal;
  qs('tab2_sceneSelect').onchange =
    e => tab2_selectScene(e.target.value);
  qs('tab2_frameSelect').onchange =
    e => tab2_selectFrame(e.target.value);
  qs('tab2_saveFrame').onclick = tab2_saveFrame;

  tab2_log('TAB 2 READY');
};
