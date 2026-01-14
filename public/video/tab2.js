// ================= TAB 2 – FRAME EDITOR =================
console.log("[TAB2] init");

let storyA = null;
let frames = [];
let frameIndex = 0;

/* ===== LIBRARIES ===== */
const LIB = {
  backgrounds: [],
  actions: [],
  faces: [],
  states: [],
  outfits: [],
  style: {}
};

/* ===== LOAD JSON LIBS ===== */
async function loadLibraries() {
  const base = "/public/adn/xomnganchuyen/";
  const map = {
    backgrounds: "XNC_backgrounds.json",
    actions: "XNC_actions.json",
    faces: "XNC_faces.json",
    states: "XNC_states.json",
    outfits: "XNC_outfits.json",
    style: "XNC_style.json"
  };

  for (const k in map) {
    const res = await fetch(base + map[k]);
    LIB[k] = await res.json();
  }

  fillSelect("frameBackground", LIB.backgrounds.backgrounds);
  fillSelect("frameAction", LIB.actions.actions);
  fillSelect("frameExpression", LIB.faces.faces);
  fillSelect("frameCamera", Object.entries(LIB.style.camera)
    .map(([id, label]) => ({ id, label })));
  fillSelect("frameStyle", Object.entries(LIB.style.style)
    .map(([id]) => ({ id, label: id })));

  console.log("[TAB2] Libraries loaded");
}

/* ===== SELECT HELPER ===== */
function fillSelect(id, list) {
  const el = document.getElementById(id);
  if (!el) return;
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
  const keys = Object.keys(localStorage).filter(k => k.startsWith("storyA_"));
  if (!keys.length) {
    alert("Chưa có Story A trong local");
    return;
  }

  storyA = JSON.parse(localStorage.getItem(keys[0]));
  frames = buildFramesFromStory(storyA);
  frameIndex = 0;
  renderFrame();
}

/* ===== BUILD FRAMES ===== */
function buildFramesFromStory(story) {
  return story.dialogues.map((d, i) => ({
    index: i,
    scene_id: d.scene_id,
    character: d.character,
    dialogue: d.text,
    expression: "",
    action: "",
    background: "",
    camera: "",
    style: ""
  }));
}

/* ===== RENDER ===== */
function renderFrame() {
  const f = frames[frameIndex];
  if (!f) return;

  document.getElementById("frameCharacter").value = f.character || "";
  document.getElementById("frameExpression").value = f.expression || "";
  document.getElementById("frameAction").value = f.action || "";
  document.getElementById("frameBackground").value = f.background || "";
  document.getElementById("frameCamera").value = f.camera || "";
  document.getElementById("frameStyle").value = f.style || "";

  document.getElementById("frameJson").textContent =
    JSON.stringify(f, null, 2);
}

/* ===== EVENTS ===== */
document.getElementById("btnLoadStoryA").onclick = async () => {
  await loadLibraries();
  loadStoryFromLocal();
};

document.getElementById("btnPrevFrame").onclick = () => {
  if (frameIndex > 0) frameIndex--;
  renderFrame();
};

document.getElementById("btnNextFrame").onclick = () => {
  if (frameIndex < frames.length - 1) frameIndex++;
  renderFrame();
};

/* BIND SELECT → FRAME */
["frameExpression","frameAction","frameBackground","frameCamera","frameStyle"]
.forEach(id => {
  const el = document.getElementById(id);
  el.onchange = () => {
    const f = frames[frameIndex];
    if (!f) return;
    f[id.replace("frame","").toLowerCase()] = el.value;
    renderFrame();
  };
});
