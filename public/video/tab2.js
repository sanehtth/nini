/* =========================================================
   TAB 2 – SCENE → FRAME EDITOR
   FINAL STABLE VERSION – ISOLATED SCOPE
   ========================================================= */

const Tab2 = {
  qs: id => document.getElementById(id),

  state: {
    scenes: [],          // từ Tab1 hoặc JSON A
    currentScene: null,
    currentFrame: null,

    masters: {
      characters: [],
      faces: [],
      states: [],
      outfits: [],
      backgrounds: []
    }
  }
};

/* =========================================================
   LOAD MASTER JSON (CHARACTER / FACE / STATE / OUTFIT / BG)
   ========================================================= */

async function tab2_loadMasters() {
  const base = '/adn/xomnganchuyen/';

  async function load(file) {
    const res = await fetch(base + file);
    return await res.json();
  }

  const chars = await load('XNC_characters.json');
  const faces = await load('XNC_faces.json');
  const states = await load('XNC_states.json');
  const outfits = await load('XNC_outfits.json');
  const bgs = await load('XNC_backgrounds.json');

  Tab2.state.masters.characters = chars.characters || [];
  Tab2.state.masters.faces = faces.faces || [];
  Tab2.state.masters.states = states.states || [];
  Tab2.state.masters.outfits = outfits.outfits || [];
  Tab2.state.masters.backgrounds = bgs.backgrounds || [];

  tab2_fillSelect('tab2_characterSelect', Tab2.state.masters.characters);
  tab2_fillSelect('tab2_faceSelect', Tab2.state.masters.faces);
  tab2_fillSelect('tab2_stateSelect', Tab2.state.masters.states);
  tab2_fillSelect('tab2_outfitSelect', Tab2.state.masters.outfits);
  tab2_fillSelect('tab2_bgSelect', Tab2.state.masters.backgrounds);

  console.log('[TAB2] Master JSON loaded');
}

/* =========================================================
   HELPERS
   ========================================================= */

function tab2_fillSelect(id, list) {
  const sel = Tab2.qs(id);
  if (!sel) return;

  sel.innerHTML = '';
  list.forEach(it => {
    const opt = document.createElement('option');
    opt.value = it.id;
    opt.textContent = it.label || it.id;
    sel.appendChild(opt);
  });
}

/* =========================================================
   LOAD FROM TAB1 (LOCAL)
   ========================================================= */

function tab2_loadFromLocal() {
  if (!window.appState || !appState.scenes) {
    alert('Chưa có dữ liệu từ Tab1');
    return;
  }

  Tab2.state.scenes = JSON.parse(JSON.stringify(appState.scenes));
  tab2_initSceneSelect();
  console.log('[TAB2] Loaded from Tab1');
}

/* =========================================================
   LOAD FROM JSON A (GITHUB)
   ========================================================= */

async function tab2_loadFromJSON() {
  const storyId = appState.storyId;
  if (!storyId) {
    alert('Chưa có Story ID');
    return;
  }

  const url = `/substance/${storyId}_A.json`;
  const res = await fetch(url);
  const json = await res.json();

  Tab2.state.scenes = json.scenes || [];
  tab2_initSceneSelect();

  console.log('[TAB2] Loaded JSON A');
}

/* =========================================================
   SCENE / FRAME SELECT
   ========================================================= */

function tab2_initSceneSelect() {
  const sel = Tab2.qs('tab2_sceneSelect');
  sel.innerHTML = '';

  Tab2.state.scenes.forEach(sc => {
    const opt = document.createElement('option');
    opt.value = sc.id;
    opt.textContent = sc.id;
    sel.appendChild(opt);
  });

  if (Tab2.state.scenes.length) {
    tab2_selectScene(Tab2.state.scenes[0].id);
  }
}

function tab2_selectScene(sceneId) {
  Tab2.state.currentScene =
    Tab2.state.scenes.find(s => s.id === sceneId);

  tab2_initFrameSelect();
}

function tab2_initFrameSelect() {
  const sel = Tab2.qs('tab2_frameSelect');
  sel.innerHTML = '';

  const frames = Tab2.state.currentScene.frames || [];
  frames.forEach(fr => {
    const opt = document.createElement('option');
    opt.value = fr.frameId;
    opt.textContent = fr.frameId;
    sel.appendChild(opt);
  });

  if (frames.length) {
    tab2_selectFrame(frames[0].frameId);
  }
}

function tab2_selectFrame(frameId) {
  Tab2.state.currentFrame =
    Tab2.state.currentScene.frames.find(f => f.frameId === frameId);

  tab2_fillFrameForm();
}

/* =========================================================
   FRAME EDIT
   ========================================================= */

function tab2_fillFrameForm() {
  const f = Tab2.state.currentFrame;
  if (!f) return;

  Tab2.qs('tab2_dialogue').value = f.text || '';
  Tab2.qs('tab2_characterSelect').value = f.character || '';
  Tab2.qs('tab2_faceSelect').value = f.face || '';
  Tab2.qs('tab2_stateSelect').value = f.state || '';
  Tab2.qs('tab2_outfitSelect').value = f.outfit || '';
  Tab2.qs('tab2_bgSelect').value = f.background || '';
  Tab2.qs('tab2_note').value = f.note || '';
}

function tab2_saveFrame() {
  const f = Tab2.state.currentFrame;
  if (!f) return;

  f.text = Tab2.qs('tab2_dialogue').value;
  f.character = Tab2.qs('tab2_characterSelect').value;
  f.face = Tab2.qs('tab2_faceSelect').value;
  f.state = Tab2.qs('tab2_stateSelect').value;
  f.outfit = Tab2.qs('tab2_outfitSelect').value;
  f.background = Tab2.qs('tab2_bgSelect').value;
  f.note = Tab2.qs('tab2_note').value;

  alert('Đã lưu frame');
}

/* =========================================================
   EXPORT JSON B (FOR TAB3)
   ========================================================= */

function tab2_exportJSONB() {
  const storyId = appState.storyId;
  const out = {
    type: 'VIDEO_PROMPT_V2',
    storyId,
    scenes: []
  };

  Tab2.state.scenes.forEach(sc => {
    const outScene = {
      sceneId: sc.id,
      frames: []
    };

    sc.frames.forEach(fr => {
      const char = Tab2.state.masters.characters
        .find(c => c.id === fr.character);

      outScene.frames.push({
        frameId: fr.frameId,
        text: fr.text,
        character: fr.character,
        characterProfile: char ? {
          desc_en: char.desc_en,
          desc_vi: char.desc_vi
        } : {},
        face: fr.face,
        state: fr.state,
        outfit: fr.outfit,
        background: fr.background,
        note: fr.note
      });
    });

    out.scenes.push(outScene);
  });

  const blob = new Blob(
    [JSON.stringify(out, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${storyId}_B.json`;
  a.click();
}

/* =========================================================
   INIT
   ========================================================= */

function tab2_init() {
  tab2_loadMasters();

  Tab2.qs('tab2_loadLocalBtn').onclick = tab2_loadFromLocal;
  Tab2.qs('tab2_loadJsonBtn').onclick = tab2_loadFromJSON;
  Tab2.qs('tab2_saveFrameBtn').onclick = tab2_saveFrame;
  Tab2.qs('tab2_exportBtn').onclick = tab2_exportJSONB;

  Tab2.qs('tab2_sceneSelect').onchange =
    e => tab2_selectScene(e.target.value);

  Tab2.qs('tab2_frameSelect').onchange =
    e => tab2_selectFrame(e.target.value);

  console.log('[TAB2] READY');
}

document.addEventListener('DOMContentLoaded', tab2_init);
