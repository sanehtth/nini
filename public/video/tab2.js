/* =====================================================
   TAB 2 – FRAME EDITOR (FINAL – SIMPLE & STABLE)
===================================================== */

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

/* =======================
   HELPERS (GIỮ NGUYÊN qs)
======================= */
function safe(v) {
  return v == null ? "" : v;
}

function findById(arr, id) {
  return arr.find(o => o.id === id);
}

/* =======================
   LOAD MASTER JSON
======================= */
async function tab2_loadMasters() {
  const base = "/adn/xomnganchuyen/";

  async function load(file) {
    const r = await fetch(base + file);
    if (!r.ok) throw new Error("Cannot load " + file);
    return r.json();
  }

  const [
    charJ,
    faceJ,
    stateJ,
    outfitJ,
    bgJ
  ] = await Promise.all([
    load("XNC_characters.json"),
    load("XNC_faces.json"),
    load("XNC_states.json"),
    load("XNC_outfits.json"),
    load("XNC_backgrounds.json")
  ]);

  tab2State.masters.characters = charJ.characters || [];
  tab2State.masters.faces = faceJ.faces || [];
  tab2State.masters.states = stateJ.states || [];
  tab2State.masters.outfits = outfitJ.outfits || [];
  tab2State.masters.backgrounds = bgJ.backgrounds || [];

  renderMasterSelects();
  console.log("[TAB2] Masters loaded");
}

/* =======================
   RENDER MASTER SELECTS
======================= */
function renderMasterSelects() {
  renderSelect("tab2_character", tab2State.masters.characters);
  renderSelect("tab2_face", tab2State.masters.faces);
  renderSelect("tab2_state", tab2State.masters.states);
  renderSelect("tab2_outfit", tab2State.masters.outfits);
  renderSelect("tab2_background", tab2State.masters.backgrounds);
}

function renderSelect(id, list) {
  const sel = qs(id);
  if (!sel) return;

  sel.innerHTML = "<option value=''>--</option>";
  list.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.name || o.label || o.id;
    sel.appendChild(opt);
  });
}

/* =======================
   LOAD FROM TAB 1
======================= */
function tab2_loadFromTab1() {
  if (!window.appState?.scenes) {
    alert("Tab 1 chưa có dữ liệu");
    return;
  }

  tab2State.scenes = appState.scenes.map(sc => ({
    sceneId: sc.id,
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
}

/* =======================
   SCENE / FRAME SELECT
======================= */
function renderSceneSelect() {
  const sel = qs("tab2_sceneSelect");
  sel.innerHTML = "";

  tab2State.scenes.forEach(sc => {
    const o = document.createElement("option");
    o.value = sc.sceneId;
    o.textContent = sc.sceneId;
    sel.appendChild(o);
  });

  if (tab2State.scenes.length) {
    sel.value = tab2State.scenes[0].sceneId;
    selectScene(sel.value);
  }
}

function selectScene(sceneId) {
  tab2State.currentScene =
    tab2State.scenes.find(s => s.sceneId === sceneId);

  const sel = qs("tab2_frameSelect");
  sel.innerHTML = "";

  tab2State.currentScene.frames.forEach(f => {
    const o = document.createElement("option");
    o.value = f.frameId;
    o.textContent = f.frameId;
    sel.appendChild(o);
  });

  if (tab2State.currentScene.frames.length) {
    sel.value = tab2State.currentScene.frames[0].frameId;
    selectFrame(sel.value);
  }
}

function selectFrame(frameId) {
  tab2State.currentFrame =
    tab2State.currentScene.frames.find(f => f.frameId === frameId);

  const f = tab2State.currentFrame;

  qs("tab2_character").value = safe(f.character);
  qs("tab2_face").value = safe(f.face);
  qs("tab2_state").value = safe(f.state);
  qs("tab2_outfit").value = safe(f.outfit);
  qs("tab2_background").value = safe(f.background);
  qs("tab2_dialogue").value = safe(f.dialogue);
  qs("tab2_note").value = safe(f.note);

  renderReview();
}

/* =======================
   SAVE FRAME
======================= */
function tab2_saveFrame() {
  const f = tab2State.currentFrame;
  if (!f) return;

  f.character = qs("tab2_character").value;
  f.face = qs("tab2_face").value;
  f.state = qs("tab2_state").value;
  f.outfit = qs("tab2_outfit").value;
  f.background = qs("tab2_background").value;
  f.dialogue = qs("tab2_dialogue").value;
  f.note = qs("tab2_note").value;

  renderReview();
}

/* =======================
   RENDER REVIEW / PREVIEW
   (PHẦN BẠN NHẮC PHẢI SỬA)
======================= */
function renderReview() {
  const f = tab2State.currentFrame;
  if (!f) return;

  const char = findById(tab2State.masters.characters, f.character);
  const face = findById(tab2State.masters.faces, f.face);
  const state = findById(tab2State.masters.states, f.state);
  const outfit = findById(tab2State.masters.outfits, f.outfit);
  const bg = findById(tab2State.masters.backgrounds, f.background);

  const lines = [];

  // CHARACTER
  if (char) {
    lines.push("CHARACTER:");
    lines.push(char.prompt_en || char.base_desc_en || "");
  }

  // FACE
  if (face?.base_desc_en) {
    lines.push("Face:");
    lines.push(face.base_desc_en);
  }

  // ACTION
  if (state?.base_desc_en) {
    lines.push("Action:");
    lines.push(state.base_desc_en);
  }

  // OUTFIT (CHUẨN – LẤY TỪ MẢNG)
  if (outfit) {
    const gender = char?.gender || "male";
    const variant =
      outfit.variants?.[gender] ||
      outfit.variants?.male ||
      outfit.variants?.female;

    if (variant?.base_desc_en) {
      lines.push("Outfit:");
      lines.push(variant.base_desc_en);
    }
  }

  // BACKGROUND
  if (bg?.base_desc_en) {
    lines.push("Background:");
    lines.push(bg.base_desc_en);
  }

  // DIALOGUE
  if (f.dialogue) {
    lines.push("Dialogue:");
    lines.push(`"${f.dialogue}"`);
  }

  qs("tab2_preview").textContent = lines.join("\n\n");
}

/* =======================
   EXPORT JSON
======================= */
function tab2_exportJSON() {
  if (!tab2State.scenes.length) return;

  const out = {
    type: "XNC_VIDEO_TAB2",
    scenes: tab2State.scenes.map(sc => ({
      sceneId: sc.sceneId,
      frames: sc.frames.map(f => ({
        frameId: f.frameId,
        prompt: buildPromptText(f)
      }))
    }))
  };

  const storyId = appState?.currentStory?.storyId || "story";
  const blob = new Blob([JSON.stringify(out, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${storyId}_B.json`; // ✅ CHUẨN
  a.click();
}

function buildPromptText(f) {
  tab2State.currentFrame = f;
  renderReview();
  return qs("tab2_preview").textContent;
}

/* =======================
   INIT
======================= */
document.addEventListener("DOMContentLoaded", () => {
  tab2_loadMasters();

  qs("tab2_loadFromLocalBtn").onclick = tab2_loadFromTab1;
  qs("tab2_saveFrameBtn").onclick = tab2_saveFrame;
  qs("tab2_exportBtn").onclick = tab2_exportJSON;

  qs("tab2_sceneSelect").onchange = e => selectScene(e.target.value);
  qs("tab2_frameSelect").onchange = e => selectFrame(e.target.value);

  console.log("[TAB2] READY – FINAL");
});
