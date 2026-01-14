/* ==============================
   TAB 2 – Scene / Frame Editor
   FINAL – STABLE – HTML SAFE
================================ */

const qs = (id) => document.getElementById(id);

/* ---------- STATE ---------- */
const tab2State = {
  scenes: {},
  masters: {
    characters: [],
    outfits: [],
    faces: [],
    actions: [],
    backgrounds: []
  }
};

/* ---------- SAFE SET ---------- */
function setVal(id, v) {
  const el = qs(id);
  if (!el) return;
  el.value = v ?? "";
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", tab2_init);

function tab2_init() {
  tab2_bindEvents();
  console.log("[TAB2] READY – FINAL");
}

/* ---------- EVENTS ---------- */
function tab2_bindEvents() {
  qs("tab2_scene")?.addEventListener("change", renderFrameList);
  qs("tab2_frame")?.addEventListener("change", selectFrame);
  qs("tab2_saveFrameBtn")?.addEventListener("click", saveFrame);
  qs("tab2_loadFromTab1Btn")?.addEventListener("click", tab2_loadFromTab1);
}

/* ---------- LOAD MASTER JSON ---------- */
async function tab2_loadMasters() {
  const base = "/public/adn/xomnganchuyen/";

  const load = async (file) =>
    fetch(base + file).then(r => r.json());

  const [c, o, f, a, b] = await Promise.all([
    load("XNC_characters.json"),
    load("XNC_outfits.json"),
    load("XNC_faces.json"),
    load("XNC_actions.json"),
    load("XNC_backgrounds.json")
  ]);

  tab2State.masters.characters = c.characters || [];
  tab2State.masters.outfits = o.outfits || [];
  tab2State.masters.faces = f.faces || [];
  tab2State.masters.actions = a.actions || [];
  tab2State.masters.backgrounds = b.backgrounds || [];

  renderCharacterSelect();
  renderSimpleSelect("tab2_face", tab2State.masters.faces);
  renderSimpleSelect("tab2_state", tab2State.masters.actions);
  renderSimpleSelect("tab2_outfit", tab2State.masters.outfits);
  renderSimpleSelect("tab2_background", tab2State.masters.backgrounds);

  console.log("[TAB2] Master JSON loaded OK");
}

/* ---------- RENDER SELECTS ---------- */
function renderCharacterSelect() {
  const sel = qs("tab2_character");
  if (!sel) return;

  sel.innerHTML = `<option value="">--</option>`;
  tab2State.masters.characters.forEach(c => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.name;
    sel.appendChild(op);
  });
}

function renderSimpleSelect(id, arr) {
  const sel = qs(id);
  if (!sel) return;

  sel.innerHTML = `<option value="">--</option>`;
  arr.forEach(x => {
    const op = document.createElement("option");
    op.value = x.id;
    op.textContent = x.name || x.id;
    sel.appendChild(op);
  });
}

/* ---------- LOAD FROM TAB1 ---------- */
function tab2_loadFromTab1() {
  if (!window.appState?.scenes) return;

  tab2State.scenes = structuredClone(window.appState.scenes);
  renderSceneList();
  renderFrameList();
  console.log("[TAB2] Loaded from Tab1");
}

function renderSceneList() {
  const sel = qs("tab2_scene");
  if (!sel) return;

  sel.innerHTML = "";
  Object.keys(tab2State.scenes).forEach(k => {
    sel.add(new Option(k, k));
  });
}

/* ---------- FRAME ---------- */
function renderFrameList() {
  const sceneId = qs("tab2_scene")?.value;
  const sel = qs("tab2_frame");
  if (!sceneId || !sel) return;

  sel.innerHTML = "";
  Object.keys(tab2State.scenes[sceneId] || {}).forEach(k => {
    sel.add(new Option(k, k));
  });

  selectFrame();
}

function selectFrame() {
  const s = qs("tab2_scene")?.value;
  const f = qs("tab2_frame")?.value;
  if (!s || !f) return;

  const frame = tab2State.scenes[s][f];
  if (!frame) return;

  setVal("tab2_character", frame.character);
  setVal("tab2_dialogue", frame.dialogue);
  setVal("tab2_face", frame.face);
  setVal("tab2_state", frame.state);
  setVal("tab2_outfit", frame.outfit);
  setVal("tab2_background", frame.background);
  setVal("tab2_note", frame.note);

  renderPreview(frame);
}

/* ---------- SAVE ---------- */
function saveFrame() {
  const s = qs("tab2_scene")?.value;
  const f = qs("tab2_frame")?.value;
  if (!s || !f) return;

  tab2State.scenes[s][f] = {
    character: qs("tab2_character")?.value || "",
    dialogue: qs("tab2_dialogue")?.value || "",
    face: qs("tab2_face")?.value || "",
    state: qs("tab2_state")?.value || "",
    outfit: qs("tab2_outfit")?.value || "",
    background: qs("tab2_background")?.value || "",
    note: qs("tab2_note")?.value || ""
  };

  renderPreview(tab2State.scenes[s][f]);
}

/* ---------- PROMPT HELPERS ---------- */
function getCharacterDesc(id) {
  const c = tab2State.masters.characters.find(x => x.id === id);
  return c?.prompt_en || c?.base_desc_en || "";
}

function getOutfitDesc(charId, outfitId) {
  const o = tab2State.masters.outfits.find(x => x.id === outfitId);
  const c = tab2State.masters.characters.find(x => x.id === charId);
  if (!o || !c) return "";

  const gender = c.gender || "male";
  return o.variants?.[gender]?.base_desc_en || "";
}

/* ---------- PREVIEW ---------- */
function renderPreview(frame) {
  const pre = qs("tab2_preview");
  if (!pre) return;

  pre.textContent = `
CHARACTER:
${getCharacterDesc(frame.character)}

FACE:
${frame.face}

ACTION:
${frame.state}

OUTFIT:
${getOutfitDesc(frame.character, frame.outfit)}

BACKGROUND:
${frame.background}

DIALOGUE:
"${frame.dialogue}"
`.trim();
}
