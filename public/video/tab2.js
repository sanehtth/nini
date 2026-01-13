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
const elFrameJson = document.getElementById("frameJson"); // phải tồn tại trong HTML

// ---------- SAFE GUARD ----------
function must(el, id) {
  if (!el) {
    console.error("[TAB2] Missing element:", id);
  }
  return el;
}

// ---------- LOAD JSON ----------
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
      action: "",
      background: "",
      camera: "",
      style: ""
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
    characters,
    faces,
    actions,
    states,
    outfits,
    backgrounds,
    styleJson
  ] = await Promise.all([
    loadJSON(base + "XNC_characters.json"),
    loadJSON(base + "XNC_faces.json"),
    loadJSON(base + "XNC_actions.json"),
    loadJSON(base + "XNC_states.json"),
    loadJSON(base + "XNC_outfits.json"),
    loadJSON(base + "XNC_backgrounds.json"),
    loadJSON(base + "XNC_style.json")
  ]);

  // character
  fillSelect(elChar, characters.characters, "id", "name");

  // face
  fillSelect(elFace, faces.faces, "id", "label");

  // action
  fillSelect(elAction, actions.actions, "id", "label");

  // background
  fillSelect(elBg, backgrounds.backgrounds, "id", "label");

  // camera (LẤY ĐÚNG STRUCT)
  fillSelect(elCamera, Object.keys(styleJson.style.camera));

  // style / emotion tone
  fillSelect(elStyle, Object.keys(styleJson.style.emotion_tone_map));

  console.log("[TAB2] Libraries loaded");
}

// ---------- UI HELPERS ----------
function fillSelect(el, list, idKey, labelKey) {
  if (!el || !list) return;

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

  if (elFrameInfo) {
    elFrameInfo.textContent = `Frame ${currentFrameIndex + 1}/${frames.length}`;
  }

  if (elChar) elChar.value = f.character;
  if (elFace) elFace.value = f.face;
  if (elAction) elAction.value = f.action;
  if (elBg) elBg.value = f.background;
  if (elCamera) elCamera.value = f.camera;
  if (elStyle) elStyle.value = f.style;

  if (elFrameJson) {
    elFrameJson.textContent = JSON.stringify(f, null, 2);
  }
}

// ---------- BIND INPUT ----------
function bindField(el, key) {
  if (!el) return;
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

if (elLoadStoryA) elLoadStoryA.onclick = loadStoryAFromLocal;
if (elSaveStoryB) elSaveStoryB.onclick = saveStoryBLocal;

loadLibraries();
