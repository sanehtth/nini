/* =====================================================
   TAB 2 – SCENE → FRAME EDITOR
   FIXED VERSION – đúng data, đúng preview, đúng prompt
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
  },

  map: {
    characters: {},
    faces: {},
    states: {},
    outfits: {},
    backgrounds: {}
  }
};

/* =======================
   HELPERS (RIÊNG TAB 2)
======================= */
const $2 = (id) => document.getElementById(id);
const safe = (v) => (v == null ? "" : v);

/* =======================
   LOAD MASTER JSON
======================= */
async function tab2_loadMasters() {
  const base = "/adn/xomnganchuyen/";

  async function load(file) {
    const res = await fetch(base + file);
    if (!res.ok) throw new Error("Load fail: " + file);
    return res.json();
  }

  const [
    charJ, faceJ, stateJ, outfitJ, bgJ
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

  // build lookup map
  ["characters","faces","states","outfits","backgrounds"].forEach(k => {
    tab2State.masters[k].forEach(o => {
      tab2State.map[k][o.id] = o;
    });
  });

  renderCharacterSelect();
  renderMasterSelects();

  console.log("[TAB2] Master loaded OK");
}

/* =======================
   LOAD FROM TAB 1
======================= */
function tab2_loadFromTab1() {
  if (!window.appState?.scenes) {
    alert("Tab 1 chưa có scene");
    return;
  }

  tab2State.scenes = appState.scenes.map(sc => ({
    sceneId: sc.id,
    frames: sc.dialogues.map((d, i) => ({
      frameId: `${sc.id}_F${i+1}`,
      character: "",
      text: d.text || "",
      camera: "close-up",
      face: "",
      state: "",
      outfit: "",
      background: "",
      note: ""
    }))
  }));

  renderSceneSelect();
}

/* =======================
   RENDER SELECTS
======================= */
function renderSceneSelect() {
  const sel = $2("tab2_sceneSelect");
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

  const sel = $2("tab2_frameSelect");
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

  $2("tab2_character").value = safe(f.character);
  $2("tab2_text").value = safe(f.text);
  $2("tab2_camera").value = safe(f.camera);
  $2("tab2_face").value = safe(f.face);
  $2("tab2_state").value = safe(f.state);
  $2("tab2_outfit").value = safe(f.outfit);
  $2("tab2_background").value = safe(f.background);
  $2("tab2_note").value = safe(f.note);

  renderPreview(f);
}

/* =======================
   MASTER DROPDOWNS
======================= */
function renderCharacterSelect() {
  const sel = $2("tab2_character");
  sel.innerHTML = "<option value=''>-- chọn --</option>";
  tab2State.masters.characters.forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name || c.label || c.id;
    sel.appendChild(o);
  });
}

function renderMasterSelects() {
  [
    ["tab2_face","faces"],
    ["tab2_state","states"],
    ["tab2_outfit","outfits"],
    ["tab2_background","backgrounds"]
  ].forEach(([id,key]) => {
    const sel = $2(id);
    sel.innerHTML = "<option value=''>--</option>";
    tab2State.masters[key].forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = o.label || o.name || o.id;
      sel.appendChild(opt);
    });
  });
}

/* =======================
   SAVE + PREVIEW
======================= */
function tab2_saveFrame() {
  const f = tab2State.currentFrame;
  if (!f) return;

  f.character = $2("tab2_character").value;
  f.text = $2("tab2_text").value;
  f.camera = $2("tab2_camera").value;
  f.face = $2("tab2_face").value;
  f.state = $2("tab2_state").value;
  f.outfit = $2("tab2_outfit").value;
  f.background = $2("tab2_background").value;
  f.note = $2("tab2_note").value;

  renderPreview(f);
}

function renderPreview() {
  const f = tab2State.currentFrame;
  if (!f) return;

  const char = tab2State.masters.characters.find(c => c.id === f.character_id);
  const outfit = tab2State.masters.outfits.find(o => o.id === f.outfit_id);
  const face = tab2State.masters.faces.find(x => x.id === f.face_id);
  const action = tab2State.masters.states.find(x => x.id === f.state_id);
  const bg = tab2State.masters.backgrounds.find(x => x.id === f.background_id);

  let lines = [];

  // ===== CHARACTER =====
  if (char?.base_desc_en) {
    lines.push(`CHARACTER: ${char.base_desc_en}`);
  }

  // ===== FACE =====
  if (face?.base_desc_en) {
    lines.push(`Face: ${face.base_desc_en}`);
  }

  // ===== ACTION =====
  if (action?.base_desc_en) {
    lines.push(`Action: ${action.base_desc_en}`);
  }

  // ===== OUTFIT (QUAN TRỌNG NHẤT) =====
  if (outfit) {
    const gender = char?.gender || 'male';
    const variant = outfit.variants?.[gender];

    if (variant?.base_desc_en) {
      if (outfit.category === 'uniform' || outfit.allow_signature_color === false) {
        // 🔒 Uniform → KHÔNG pha màu nhân vật
        lines.push(`Outfit: ${variant.base_desc_en}`);
      } else {
        // 🎨 Outfit thường → dùng màu nhân vật
        const colors = char?.signature_colors?.join(', ');
        lines.push(
          `Outfit: ${variant.base_desc_en}${colors ? ', dominant colors: ' + colors : ''}`
        );
      }
    }
  }

  // ===== BACKGROUND =====
  if (bg?.base_desc_en) {
    lines.push(`Background: ${bg.base_desc_en}`);
  }

  // ===== DIALOGUE =====
  if (f.dialogue) {
    lines.push(`Dialogue: "${f.dialogue}"`);
  }

  qs('tab2_preview').textContent = lines.join('\n\n');
}


/* =======================
   EXPORT JSON (B)
======================= */
function tab2_exportJSON() {
  const scenes = tab2State.scenes.map(sc => ({
    sceneId: sc.sceneId,
    frames: sc.frames.map(f => {
      const c = tab2State.map.characters[f.character];
      return {
        frameId: f.frameId,
        prompt: renderPreviewToText(f, c)
      };
    })
  }));

  const blob = new Blob(
    [JSON.stringify({ type:"XNC_VIDEO_B", scenes }, null, 2)],
    { type:"application/json" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "video_B.json";
  a.click();
}

function renderPreviewToText(f, c) {
  return `
${f.camera} shot
Character: ${c?.name}
${c?.base_desc_en || ""}
Face: ${tab2State.map.faces[f.face]?.desc_en || ""}
Action: ${tab2State.map.states[f.state]?.desc_en || ""}
Outfit: ${tab2State.map.outfits[f.outfit]?.desc_en || ""}
Background: ${tab2State.map.backgrounds[f.background]?.desc_en || ""}
Dialogue: "${f.text}"
`.trim();
}

/* =======================
   INIT
======================= */
document.addEventListener("DOMContentLoaded", () => {
  tab2_loadMasters();

  $2("tab2_loadFromLocalBtn").onclick = tab2_loadFromTab1;
  $2("tab2_saveFrameBtn").onclick = tab2_saveFrame;
  $2("tab2_exportBtn").onclick = tab2_exportJSON;
  $2("tab2_sceneSelect").onchange = e => selectScene(e.target.value);
  $2("tab2_frameSelect").onchange = e => selectFrame(e.target.value);

  console.log("[TAB2] READY – FIXED");
});

