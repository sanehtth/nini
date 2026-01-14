// ================= TAB 2 – FRAME EDITOR =================
console.log("[TAB2] init");

let storyA = null;
let frames = [];
let frameIndex = 0;

/* ===== LIB ===== */
const LIB = {
  backgrounds: null,
  actions: null,
  faces: null,
  outfits: null,
  states: null,
  style: null
};

/* ===== LOAD LIBRARIES ===== */
async function loadLibraries() {
  const base = "/public/adn/xomnganchuyen/";

  async function load(name) {
    const res = await fetch(base + name);
    return res.json();
  }

  LIB.backgrounds = await load("XNC_backgrounds.json");
  LIB.actions     = await load("XNC_actions.json");
  LIB.faces       = await load("XNC_faces.json");
  LIB.outfits     = await load("XNC_outfits.json");
  LIB.states      = await load("XNC_states.json");
  LIB.style       = await load("XNC_style.json");

  fillSelect("frameBackground", LIB.backgrounds.backgrounds);
  fillSelect("frameAction", LIB.actions.actions);
  fillSelect("frameExpression", LIB.faces.faces);

  // ✅ FIX CAMERA
  fillSelect(
    "frameCamera",
    Object.entries(LIB.style.style.camera).map(
      ([id, label]) => ({ id, label })
    )
  );

  // STYLE = emotion tone
  fillSelect(
    "frameStyle",
    Object.entries(LIB.style.style.emotion_tone_map).map(
      ([id]) => ({ id, label: id })
    )
  );
// STATES
fillSelect(
  "frameState",
  LIB.states.states
);

// OUTFITS
fillSelect(
  "frameOutfit",
  LIB.outfits.outfits
);

  console.log("[TAB2] Libraries loaded");
}

/* ===== SELECT HELPER ===== */
function fillSelect(id, list) {
  const el = document.getElementById(id);
  el.innerHTML = `<option value="">-- chọn --</option>`;
  list.forEach(i => {
    const o = document.createElement("option");
    o.value = i.id;
    o.textContent = i.label || i.id;
    el.appendChild(o);
  });
}

/* ===== LOAD STORY A ===== */
function loadStoryFromLocal() {
  const key = Object.keys(localStorage).find(k => k.startsWith("storyA_"));
  if (!key) {
    alert("Không có Story A trong local");
    return;
  }

  storyA = JSON.parse(localStorage.getItem(key));
  frames = buildFrames(storyA);
  frameIndex = 0;
  renderFrame();
}

/* ===== BUILD FRAMES ===== */
function buildFrames(story) {
  return story.dialogues.map((d, i) => ({
    index: i,
    scene_id: d.scene_id,
    character: d.character,
    dialogue: d.text,

    expression: "",
    action: "",
    background: "",
    camera: "",
    style: "",

    state: "",     // ✅ mới
    outfit: ""     // ✅ mới
  }));
}


/* ===== RENDER ===== */
function renderFrame() {
  const f = frames[frameIndex];
  if (!f) return;

  frameCharacter.value  = f.character || "";
  frameExpression.value = f.expression || "";
  frameAction.value     = f.action || "";
  frameBackground.value = f.background || "";
  frameCamera.value     = f.camera || "";
  frameStyle.value      = f.style || "";
frameState.value  = f.state || "";
frameOutfit.value = f.outfit || "";

  frameJson.textContent = JSON.stringify(f, null, 2);
}

/* ===== EVENTS ===== */
btnLoadStoryA.onclick = async () => {
  await loadLibraries();
  loadStoryFromLocal();
};

btnPrevFrame.onclick = () => {
  if (frameIndex > 0) frameIndex--;
  renderFrame();
};

btnNextFrame.onclick = () => {
  if (frameIndex < frames.length - 1) frameIndex++;
  renderFrame();
};

/* ===== BIND ===== */
["Expression","Action","Background","Camera","Style","State","Outfit"].forEach(k => {
  const el = document.getElementById("frame" + k);
  if (!el) return;
  el.onchange = () => {
    const f = frames[frameIndex];
    if (!f) return;
    f[k.toLowerCase()] = el.value;
    renderFrame();
  };
});


/* ===== EXPORT ===== */
btnExportStoryB.onclick = () => {
  const blob = new Blob([JSON.stringify(frames, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${storyA.id}_B.json`;
  a.click();
};

/* ===== IMPORT ===== */
inputImportStoryA.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    storyA = JSON.parse(r.result);
    frames = buildFrames(storyA);
    frameIndex = 0;
    renderFrame();
  };
  r.readAsText(file);
};

