/* =====================================================
   TAB 2 – SCENE → FRAME EDITOR
   FINAL STABLE VERSION
===================================================== */

const Tab2 = (() => {
  const qs = id => document.getElementById(id);

  const state = {
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

  /* ================= LOAD MASTER DATA ================= */

  async function loadMasters() {
    const base = '/adn/xomnganchuyen/';
    async function load(file) {
      const r = await fetch(base + file);
      return await r.json();
    }

    state.masters.characters = (await load('XNC_characters.json')).characters || [];
    state.masters.faces       = (await load('XNC_faces.json')).faces || [];
    state.masters.states      = (await load('XNC_states.json')).states || [];
    state.masters.outfits     = (await load('XNC_outfits.json')).outfits || [];
    state.masters.backgrounds = (await load('XNC_backgrounds.json')).backgrounds || [];

    fillMasterSelects();
    console.log('[TAB2] Master JSON loaded');
  }

  function fillMasterSelects() {
    fillSelect('tab2_character', state.masters.characters, 'id', 'label');
    fillSelect('tab2_face', state.masters.faces, 'id', 'label');
    fillSelect('tab2_state', state.masters.states, 'id', 'label');
    fillSelect('tab2_outfit', state.masters.outfits, 'id', 'label');
    fillSelect('tab2_background', state.masters.backgrounds, 'id', 'label');
  }

  function fillSelect(id, list, val, label) {
    const el = qs(id);
    if (!el) return;
    el.innerHTML = '';
    list.forEach(i => {
      const o = document.createElement('option');
      o.value = i[val];
      o.textContent = i[label] || i[val];
      el.appendChild(o);
    });
  }

  /* ================= LOAD DATA ================= */

  function loadFromTab1() {
    if (!window.appState || !appState.scenes) {
      alert('Tab1 chưa có dữ liệu');
      return;
    }
    state.scenes = JSON.parse(JSON.stringify(appState.scenes));
    buildSceneSelect();
  }

  async function loadFromJSON() {
    const storyId = appState?.storyId;
    if (!storyId) return alert('Chưa có storyId');

    const url = `/substance/${storyId}_A.json`;
    const r = await fetch(url);
    const json = await r.json();

    state.scenes = json.scenes || [];
    buildSceneSelect();
  }

  /* ================= UI BUILD ================= */

  function buildSceneSelect() {
    const sel = qs('tab2_sceneSelect');
    sel.innerHTML = '';
    state.scenes.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.id;
      sel.appendChild(o);
    });
    selectScene(sel.value);
  }

  function selectScene(id) {
    state.currentScene = state.scenes.find(s => s.id === id);
    buildFrameSelect();
  }

  function buildFrameSelect() {
    const sel = qs('tab2_frameSelect');
    sel.innerHTML = '';
    if (!state.currentScene) return;

    state.currentScene.frames ??= [];
    state.currentScene.frames.forEach(f => {
      const o = document.createElement('option');
      o.value = f.frameId;
      o.textContent = f.frameId;
      sel.appendChild(o);
    });

    if (sel.value) selectFrame(sel.value);
  }

  function selectFrame(fid) {
    state.currentFrame =
      state.currentScene.frames.find(f => f.frameId === fid);
    if (!state.currentFrame) return;

    qs('tab2_dialogue').value   = state.currentFrame.text || '';
    qs('tab2_camera').value     = state.currentFrame.camera || '';
    qs('tab2_face').value       = state.currentFrame.face || '';
    qs('tab2_state').value      = state.currentFrame.state || '';
    qs('tab2_outfit').value     = state.currentFrame.outfit || '';
    qs('tab2_background').value = state.currentFrame.background || '';
    qs('tab2_character').value  = state.currentFrame.character || '';
  }

  /* ================= SAVE / EXPORT ================= */

  function saveFrame() {
    if (!state.currentFrame) return;

    Object.assign(state.currentFrame, {
      character: qs('tab2_character').value,
      text: qs('tab2_dialogue').value,
      camera: qs('tab2_camera').value,
      face: qs('tab2_face').value,
      state: qs('tab2_state').value,
      outfit: qs('tab2_outfit').value,
      background: qs('tab2_background').value
    });

    alert('Đã lưu frame');
  }

  function exportJSONB() {
    const out = {
      type: 'VIDEO_PROMPT_V2',
      scenes: state.scenes
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

  /* ================= INIT ================= */

  function init() {
    loadMasters();

    qs('tab2_loadLocalBtn').onclick = loadFromTab1;
    qs('tab2_loadJSONBtn').onclick  = loadFromJSON;
    qs('tab2_saveFrameBtn').onclick = saveFrame;
    qs('tab2_exportBtn').onclick    = exportJSONB;

    qs('tab2_sceneSelect').onchange = e => selectScene(e.target.value);
    qs('tab2_frameSelect').onchange = e => selectFrame(e.target.value);

    console.log('[TAB2] READY');
  }

  return { init };
})();
