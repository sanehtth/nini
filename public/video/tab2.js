/* =====================================================
   TAB 2 – SCENE → FRAME EDITOR
   FINAL STABLE VERSION
===================================================== */

const tab2State = {
  scenes: [],
  currentSceneId: null,
  currentFrameId: null,

  masters: {
    characters: [],
    faces: [],
    states: [],
    outfits: [],
    backgrounds: []
  }
};

/* =======================
   HELPERS
======================= */

const tab2_qs = (id) => document.getElementById(id);

const safe = (v) =>
  v === undefined || v === null ? "" : v;

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

  const characters = await load("XNC_characters.json");
  const faces = await load("XNC_faces.json");
  const states = await load("XNC_states.json");
  const outfits = await load("XNC_outfits.json");
  const backgrounds = await load("XNC_backgrounds.json");

  // 🔥 FIX QUAN TRỌNG: characters.characters
  tab2State.masters.characters = characters?.characters ?? [];
  tab2State.masters.faces = faces?.faces ?? [];
  tab2State.masters.states = states?.states ?? [];
  tab2State.masters.outfits = outfits?.outfits ?? [];
  tab2State.masters.backgrounds = backgrounds?.backgrounds ?? [];

  tab2_renderCharacterSelect();
  tab2_renderMasters();

  console.log("[TAB2] Master JSON loaded");
}

/* =======================
   LOAD FROM TAB 1
======================= */

function tab2_loadFromLocal() {
  if (!window.appState || !Array.isArray(appState.scenes)) {
    alert("Tab 1 chưa có scene");
    return;
  }

  tab2State.scenes = appState.scenes.map((s) => ({
    sceneId: s.id,
    frames: s.dialogues.map((d, i) => ({
      frameId: `${s.id}_F${i + 1}`,
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

  tab2_renderSceneSelect();
  console.log("[TAB2] Loaded from Tab 1");
}

/* =======================
   RENDER SELECTS
======================= */

function tab2_renderSceneSelect() {
  const sel = tab2_qs("tab2_sceneSelect");
  sel.innerHTML = "";

  tab2State.scenes.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.sceneId;
    opt.textContent = s.sceneId;
    sel.appendChild(opt);
  });

  if (tab2State.scenes.length) {
    sel.value = tab2State.scenes[0].sceneId;
    tab2_selectScene(sel.value);
  }
}

function tab2_selectScene(sceneId) {
  tab2State.currentSceneId = sceneId;
  const scene = tab2State.scenes.find(s => s.sceneId === sceneId);
  if (!scene) return;

  const sel = tab2_qs("tab2_frameSelect");
  sel.innerHTML = "";

  scene.frames.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.frameId;
    opt.textContent = f.frameId;
    sel.appendChild(opt);
  });

  if (scene.frames.length) {
    sel.value = scene.frames[0].frameId;
    tab2_selectFrame(sel.value);
  }
}

function tab2_selectFrame(frameId) {
  tab2State.currentFrameId = frameId;

  const scene = tab2State.scenes.find(s => s.sceneId === tab2State.currentSceneId);
  const frame = scene.frames.find(f => f.frameId === frameId);

  tab2_qs("tab2_character").value = safe(frame.character);
  tab2_qs("tab2_text").value = safe(frame.text);
  tab2_qs("tab2_camera").value = safe(frame.camera);
  tab2_qs("tab2_face").value = safe(frame.face);
  tab2_qs("tab2_state").value = safe(frame.state);
  tab2_qs("tab2_outfit").value = safe(frame.outfit);
  tab2_qs("tab2_background").value = safe(frame.background);
  tab2_qs("tab2_note").value = safe(frame.note);
}

/* =======================
   RENDER MASTER DROPDOWNS
======================= */

function tab2_renderCharacterSelect() {
  const sel = tab2_qs("tab2_character");
  sel.innerHTML = "";

  tab2State.masters.characters.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    option.textContent = c.label ?? c.title ?? c.code ?? c.id ?? '[unknown]';
    sel.appendChild(opt);
  });
}

function tab2_renderMasters() {
  const map = [
    ["tab2_face", tab2State.masters.faces],
    ["tab2_state", tab2State.masters.states],
    ["tab2_outfit", tab2State.masters.outfits],
    ["tab2_background", tab2State.masters.backgrounds]
  ];

  map.forEach(([id, list]) => {
    const sel = tab2_qs(id);
    sel.innerHTML = "";
    list.forEach(i => {
      const opt = document.createElement("option");
      opt.value = i.id;
      opt.textContent = i.label || i.id;
      sel.appendChild(opt);
    });
  });
}

/* =======================
   SAVE FRAME
======================= */

function tab2_saveFrame() {
  const scene = tab2State.scenes.find(s => s.sceneId === tab2State.currentSceneId);
  const frame = scene.frames.find(f => f.frameId === tab2State.currentFrameId);

  frame.character = tab2_qs("tab2_character").value;
  frame.text = tab2_qs("tab2_text").value;
  frame.camera = tab2_qs("tab2_camera").value;
  frame.face = tab2_qs("tab2_face").value;
  frame.state = tab2_qs("tab2_state").value;
  frame.outfit = tab2_qs("tab2_outfit").value;
  frame.background = tab2_qs("tab2_background").value;
  frame.note = tab2_qs("tab2_note").value;

  alert("Đã lưu frame");
}

/* =======================
   EXPORT JSON (B)
   🔥 CÓ MÔ TẢ CHARACTER
======================= */

function tab2_exportJSON() {
  const out = {
    type: "VIDEO_PROMPT_V2",
    scenes: []
  };

  tab2State.scenes.forEach(scene => {
    const s = {
      sceneId: scene.sceneId,
      frames: []
    };

    scene.frames.forEach(f => {
      const char = tab2State.masters.characters.find(c => c.id === f.character);

      const charDesc =
        char
          ? `${char.label}, ${char.desc_en || char.desc_vi || ""}`
          : "";

      const prompt = `
${f.camera} of ${charDesc}
facial expression: ${f.face}
action/state: ${f.state}
outfit: ${f.outfit}
background: ${f.background}
dialogue: "${f.text}"
`.trim();

      s.frames.push({
        frameId: f.frameId,
        prompt
      });
    });

    out.scenes.push(s);
  });

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${appState.currentStory?.storyId || "story"}_B.json`;
  a.click();
}

/* =======================
   INIT
======================= */

function tab2_init() {
  tab2_loadMasters();

  tab2_qs("tab2_loadFromLocalBtn").onclick = tab2_loadFromLocal;
  tab2_qs("tab2_saveFrameBtn").onclick = tab2_saveFrame;
  tab2_qs("tab2_exportBtn").onclick = tab2_exportJSON;

  tab2_qs("tab2_sceneSelect").onchange =
    e => tab2_selectScene(e.target.value);

  tab2_qs("tab2_frameSelect").onchange =
    e => tab2_selectFrame(e.target.value);

  console.log("[TAB2] READY");
}

document.addEventListener("DOMContentLoaded", tab2_init);

