/* =========================================================
   TAB 2 – SCENE / FRAME EDITOR (FINAL – SAFE VERSION)
   ========================================================= */

console.log("[TAB2] LOADED – FINAL SAFE");

/* ===================== STATE ===================== */

window.tab2State = {
  scenes: {},
  masters: {
    characters: [],
    faces: [],
    states: [],
    outfits: [],
    backgrounds: []
  },
  currentScene: null,
  currentFrame: null
};

/* ===================== SAFE DOM ===================== */

function $(id) {
  return document.getElementById(id);
}

function getVal(id) {
  const el = $(id);
  return el ? el.value : "";
}

function setVal(id, v) {
  const el = $(id);
  if (!el) return;
  el.value = v ?? "";
}

/* ===================== MASTER LOAD ===================== */

async function tab2_loadMasters() {
  const base = "/adn/xomnganchuyen/";

  async function load(file) {
    const r = await fetch(base + file);
    return r.json();
  }

  const [c, f, s, o, b] = await Promise.all([
    load("XNC_characters.json"),
    load("XNC_faces.json"),
    load("XNC_states.json"),
    load("XNC_outfits.json"),
    load("XNC_backgrounds.json")
  ]);

  tab2State.masters.characters = c.characters || [];
  tab2State.masters.faces = f.faces || [];
  tab2State.masters.states = s.states || [];
  tab2State.masters.outfits = o.outfits || [];
  tab2State.masters.backgrounds = b.backgrounds || [];

  renderSelect("tab2_character", tab2State.masters.characters, "id", "name");
  renderSelect("tab2_face", tab2State.masters.faces);
  renderSelect("tab2_state", tab2State.masters.states);
  renderSelect("tab2_outfit", tab2State.masters.outfits, "id", "name");
  renderSelect("tab2_background", tab2State.masters.backgrounds);

  console.log("[TAB2] Masters loaded OK");
}

/* ===================== SELECT RENDER ===================== */

function renderSelect(id, arr, valKey = "id", labelKey = "name") {
  const el = $(id);
  if (!el) return;

  el.innerHTML = `<option value="">--</option>`;
  arr.forEach(x => {
    const o = document.createElement("option");
    o.value = x[valKey];
    o.textContent = x[labelKey] || x[valKey];
    el.appendChild(o);
  });
}

/* ===================== FRAME ===================== */

function selectFrame(sceneId, frameId) {
  const frame = tab2State.scenes?.[sceneId]?.frames?.[frameId];
  if (!frame) return;

  tab2State.currentScene = sceneId;
  tab2State.currentFrame = frameId;

  setVal("tab2_character", frame.character);
  setVal("tab2_dialogue", frame.dialogue);
  setVal("tab2_camera", frame.camera);
  setVal("tab2_face", frame.face);
  setVal("tab2_state", frame.state);
  setVal("tab2_outfit", frame.outfit);
  setVal("tab2_background", frame.background);
  setVal("tab2_note", frame.note);

  renderPreview(frame);
}

/* ===================== SAVE ===================== */

function tab2_saveFrame() {
  if (!tab2State.currentScene || !tab2State.currentFrame) return;

  const f = tab2State.scenes[tab2State.currentScene].frames[tab2State.currentFrame];

  f.character = getVal("tab2_character");
  f.dialogue = getVal("tab2_dialogue");
  f.camera = getVal("tab2_camera");
  f.face = getVal("tab2_face");
  f.state = getVal("tab2_state");
  f.outfit = getVal("tab2_outfit");
  f.background = getVal("tab2_background");
  f.note = getVal("tab2_note");

  renderPreview(f);
}

/* ===================== PREVIEW ===================== */

function findById(arr, id) {
  return arr.find(x => x.id === id);
}

function renderPreview(frame) {
  const out = [];

  const c = findById(tab2State.masters.characters, frame.character);
  const face = findById(tab2State.masters.faces, frame.face);
  const act = findById(tab2State.masters.states, frame.state);
  const outfit = findById(tab2State.masters.outfits, frame.outfit);
  const bg = findById(tab2State.masters.backgrounds, frame.background);

  if (c) {
    out.push(`CHARACTER: ${c.name}`);
    out.push(c.base_desc_en || "");
  }
  if (face) out.push(`Face: ${face.base_desc_en || face.name}`);
  if (act) out.push(`Action: ${act.base_desc_en || act.name}`);
  if (outfit) {
    const v = outfit.variants?.male || outfit.variants?.female;
    out.push(`Outfit: ${v?.base_desc_en || outfit.name}`);
  }
  if (bg) out.push(`Background: ${bg.base_desc_en || bg.name}`);
  if (frame.dialogue) out.push(`Dialogue: "${frame.dialogue}"`);

  const box = $("tab2_preview");
  if (box) box.textContent = out.join("\n\n");
}

/* ===================== INIT ===================== */

function tab2_init() {
  tab2_loadMasters();

  $("tab2_saveFrameBtn")?.addEventListener("click", tab2_saveFrame);

  console.log("[TAB2] READY – FINAL");
}

document.addEventListener("DOMContentLoaded", tab2_init);
