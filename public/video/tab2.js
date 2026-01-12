// ================= TAB 2 – FRAME EDITOR =================
console.log("[TAB2] init");

window.storyB = null;
let frames = [];
let currentFrameIndex = 0;

// ---------- ELEMENTS ----------
const elLoadStoryA = document.getElementById("btnLoadStoryA");
const elSaveStoryB = document.getElementById("btnSaveStoryB");

const elChar = document.getElementById("frameCharacter");
const elFace = document.getElementById("frameExpression");
const elAction = document.getElementById("frameAction");
const elBg = document.getElementById("frameBackground");
const elCamera = document.getElementById("frameCamera");
const elStyle = document.getElementById("frameStyle");

const elFrameInfo = document.getElementById("frameInfo");
const elFrameJson = document.getElementById("frameJson");

// ---------- LOAD JSON UTILS ----------
async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Load fail: " + url);
  return res.json();
}

// ---------- LOAD STORY A ----------
function loadStoryAFromLocal() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("storyA_"));
  if (!keys.length) {
    alert("Chưa có Story A trong local");
    return;
  }
  const storyA = JSON.parse(localStorage.getItem(keys[0]));
  buildFramesFromStoryA(storyA);
}

// ---------- BUILD FRAMES ----------
function buildFramesFromStoryA(storyA) {
  frames = [];
  let index = 0;

  storyA.dialogues.forEach(d => {
    frames.push({
      index: index++,
      scene_id: d.scene_id,
      character: d.character || "",
      dialogue: d.text || "",
      face: "",
      state: "",
      action: "",
      outfit: "",
      background: "",
      camera: "",
      style: "",
      lighting: ""
    });
  });

  currentFrameIndex = 0;
  window.storyB = {
    id: storyA.id,
    title: storyA.title,
    frames
  };

  console.log("[TAB2] Loaded storyA → frames", frames.length);
  renderFrame();
}

// ---------- LOAD LIBRARIES ----------
async function loadLibraries() {
  const base = "/adn/xomnganchuyen/";
  const [
    chars,
    faces,
    actions,
    states,
    outfits,
    bgs,
    style
  ] = await Promise.all([
    loadJSON(base + "XNC_characters.json"),
    loadJSON(base + "XNC_faces.json"),
    loadJSON(base + "XNC_actions.json"),
    loadJSON(base + "XNC_states.json"),
    loadJSON(base + "XNC_outfits.json"),
    loadJSON(base + "XNC_backgrounds.json"),
    loadJSON(base + "XNC_style.json")
  ]);

  fillSelect(elChar, chars.characters, "id", "name");
  fillSelect(elFace, faces.faces, "id", "label");
  fillSelect(elAction, actions.actions, "id", "label");
  fillSelect(elBg, bgs.backgrounds, "id", "label");
  fillSelect(elCamera, Object.keys(style.camera));
  fillSelect(elStyle, Object.keys(style.emotion_tone_map));
}

// ---------- UI HELPERS ----------
function fillSelect(el, list, idKey, labelKey) {
  el.innerHTML = "";
  list.forEach(i => {
    const opt = document.createElement("option");
    opt.value = idKey ? i[idKey] : i;
    opt.textContent = labelKey ? i[labelKey] : i;
    el.appendChild(opt);
  });
}

// ---------- RENDER FRAME ----------
function renderFrame() {
  const f = frames[currentFrameIndex];
  if (!f) return;

  elFrameInfo.textContent = `Frame ${currentFrameIndex + 1}/${frames.length}`;

  elChar.value = f.character;
  elFace.value = f.face;
  elAction.value = f.action;
  elBg.value = f.background;
  elCamera.value = f.camera;
  elStyle.value = f.style;

  elFrameJson.textContent = JSON.stringify(f, null, 2);
}

// ---------- SAVE FRAME ----------
function bindField(el, key) {
  el.addEventListener("change", () => {
    frames[currentFrameIndex][key] = el.value;
    renderFrame();
  });
}

// ---------- SAVE STORY B ----------
function saveStoryBLocal() {
  if (!window.storyB) return;
  localStorage.setItem(
    "storyB_" + window.storyB.id,
    JSON.stringify(window.storyB, null, 2)
  );
  alert("Đã lưu Story B (local)");
}

// ---------- INIT ----------
bindField(elChar, "character");
bindField(elFace, "face");
bindField(elAction, "action");
bindField(elBg, "background");
bindField(elCamera, "camera");
bindField(elStyle, "style");

elLoadStoryA.onclick = loadStoryAFromLocal;
elSaveStoryB.onclick = saveStoryBLocal;

loadLibraries();
