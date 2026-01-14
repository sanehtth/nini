/* =========================================================
   TAB 2 – SCENE → FRAME EDITOR (STABLE)
   ========================================================= */

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

/* ================= HELPERS ================= */

const qs = (id) => document.getElementById(id);

function safe(v) {
  return v === undefined || v === null ? "" : v;
}

function setVal(id, v) {
  const el = qs(id);
  if (!el) return;
  el.value = safe(v);
}

/* ================= LOAD MASTER JSON ================= */

async function tab2_loadMasters() {
  const base = "/adn/xomnganchuyen/";

  async function load(file) {
    const res = await fetch(base + file);
    return await res.json();
  }

  const chars = await load("XNC_characters.json");
  const faces = await load("XNC_faces.json");
  const states = await load("XNC_states.json");
  const outfits = await load("XNC_outfits.json");
  const bgs = await load("XNC_backgrounds.json");

  tab2State.masters.characters = chars.characters || [];
  tab2State.masters.faces = faces.faces || [];
  tab2State.masters.states = states.states || [];
  tab2State.masters.outfits = outfits.outfits || [];
  tab2State.masters.backgrounds = bgs.backgrounds || [];

  renderCharacterSelect();
  renderFaceSelect();
  renderStateSelect();
  renderOutfitSelect();
  renderBackgroundSelect();

  console.log("[TAB2] Master loaded OK");
}

/* ================= RENDER SELECTS ================= */

function renderCharacterSelect() {
  const el = qs("tab2_character");
  if (!el) return;
  el.innerHTML = `<option value="">--</option>`;
  tab2State.masters.characters.forEach(c => {
    el.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function renderFaceSelect() {
  const el = qs("tab2_face");
  if (!el) return;
  el.innerHTML = `<option value="">--</option>`;
  tab2State.masters.faces.forEach(f => {
    el.innerHTML += `<option value="${f.id}">${f.name}</option>`;
  });
}

function renderStateSelect() {
  const el = qs("tab2_state");
  if (!el) return;
  el.innerHTML = `<option value="">--</option>`;
  tab2State.masters.states.forEach(s => {
    el.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });
}

function renderOutfitSelect() {
  const el = qs("tab2_outfit");
  if (!el) return;
  el.innerHTML = `<option value="">--</option>`;
  tab2State.masters.outfits.forEach(o => {
    el.innerHTML += `<option value="${o.id}">${o.name}</option>`;
  });
}

function renderBackgroundSelect() {
  const el = qs("tab2_background");
  if (!el) return;
  el.innerHTML = `<option value="">--</option>`;
  tab2State.masters.backgrounds.forEach(b => {
    el.innerHTML += `<option value="${b.id}">${b.name}</option>`;
  });
}

/* ================= LOAD FROM TAB 1 ================= */

function tab2_loadFromTab1() {
  if (!window.appState || !appState.scenes) {
    alert("Chưa có dữ liệu từ Tab 1");
    return;
  }

  tab2State.scenes = appState.scenes.map(sc => ({
    id: sc.id,
    frames: sc.dialogues.map((d, i) => ({
      frameId: `${sc.id}_F${i + 1}`,
      character: "",
      face: "",
      state: "",
      outfit: "",
      background: "",
      dialogue: d.text || "",
      note: ""
    }))
  }));

  renderSceneSelect();
  console.log("[TAB2] Loaded from Tab 1");
}

/* ================= SCENE / FRAME ================= */

function renderSceneSelect() {
  const el = qs("tab2_sceneSelect");
  if (!el) return;
  el.innerHTML = "";
  tab2State.scenes.forEach(sc => {
    el.innerHTML += `<option value="${sc.id}">${sc.id}</option>`;
  });
  if (tab2State.scenes.length) {
    selectScene(tab2State.scenes[0].id);
  }
}

function selectScene(sceneId) {
  tab2State.currentScene = tab2State.scenes.find(s => s.id === sceneId);
  renderFrameSelect();
}

function renderFrameSelect() {
  const el = qs("tab2_frameSelect");
  if (!el) return;
  el.innerHTML = "";
  tab2State.currentScene.frames.forEach(f => {
    el.innerHTML += `<option value="${f.frameId}">${f.frameId}</option>`;
  });
  if (tab2State.currentScene.frames.length) {
    selectFrame(tab2State.currentScene.frames[0].frameId);
  }
}

function selectFrame(frameId) {
  const f = tab2State.currentScene.frames.find(x => x.frameId === frameId);
  if (!f) return;
  tab2State.currentFrame = f;

  setVal("tab2_character", f.character);
  setVal("tab2_face", f.face);
  setVal("tab2_state", f.state);
  setVal("tab2_outfit", f.outfit);
  setVal("tab2_background", f.background);
  setVal("tab2_dialogue", f.dialogue);
  setVal("tab2_note", f.note);

  renderPreview();
}

/* ================= SAVE FRAME ================= */

function tab2_saveFrame() {
  const f = tab2State.currentFrame;
  if (!f) return;

  f.character = qs("tab2_character")?.value || "";
  f.face = qs("tab2_face")?.value || "";
  f.state = qs("tab2_state")?.value || "";
  f.outfit = qs("tab2_outfit")?.value || "";
  f.background = qs("tab2_background")?.value || "";
  f.dialogue = qs("tab2_dialogue")?.value || "";
  f.note = qs("tab2_note")?.value || "";

  renderPreview();
}

/* ================= PROMPT BUILDER ================= */

function findById(arr, id) {
  return arr.find(x => x.id === id);
}

function renderPreview() {
  const f = tab2State.currentFrame;
  if (!f) return;

  const c = findById(tab2State.masters.characters, f.character);
  const face = findById(tab2State.masters.faces, f.face);
  const st = findById(tab2State.masters.states, f.state);
  const o = findById(tab2State.masters.outfits, f.outfit);
  const bg = findById(tab2State.masters.backgrounds, f.background);

  let out = "";

  if (c) {
    out += `CHARACTER: ${c.name}\n`;
    out += `${c.base_desc_en || ""}\n\n`;
  }

  if (face) out += `Face: ${face.base_desc_en}\n`;
  if (st) out += `Action: ${st.base_desc_en}\n`;
  if (o) out += `Outfit: ${o.variants?.male?.base_desc_en || ""}\n`;
  if (bg) out += `Background: ${bg.base_desc_en}\n`;
  if (f.dialogue) out += `Dialogue: "${f.dialogue}"\n`;

  qs("tab2_preview").textContent = out;
}

/* ================= INIT ================= */

function tab2_init() {
  tab2_loadMasters();

  qs("tab2_loadLocalBtn")?.addEventListener("click", tab2_loadFromTab1);
  qs("tab2_sceneSelect")?.addEventListener("change", e => selectScene(e.target.value));
  qs("tab2_frameSelect")?.addEventListener("change", e => selectFrame(e.target.value));
  qs("tab2_saveFrameBtn")?.addEventListener("click", tab2_saveFrame);

  console.log("[TAB2] READY – STABLE");
}

document.addEventListener("DOMContentLoaded", tab2_init);
