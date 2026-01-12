console.log("[TAB2] init");

let storyA = null;
let storyB = null;
let currentFrameIndex = 0;

// DOM
const elInfo = document.getElementById("frameInfo");
const elChar = document.getElementById("frameCharacter");
const elExpr = document.getElementById("frameExpression");
const elAction = document.getElementById("frameAction");
const elBg = document.getElementById("frameBackground");
const elCam = document.getElementById("frameCamera");
const elStyle = document.getElementById("frameStyle");
const elPreview = document.getElementById("previewStoryB");

// -------- LOAD STORY A --------
document.getElementById("btnLoadStoryA").onclick = () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("storyA_"));
  if (!keys.length) {
    alert("Chưa có Story A trong local");
    return;
  }

  storyA = JSON.parse(localStorage.getItem(keys[keys.length - 1]));
  buildStoryB();
  loadFrame(0);

  console.log("[TAB2] Loaded storyA", storyA);
};

// -------- BUILD STORY B --------
function buildStoryB() {
  storyB = {
    id: storyA.id,
    from: "storyA",
    frames: storyA.dialogues.map((d, i) => ({
      index: i,
      scene_id: d.scene_id,
      character: d.character || "",
      dialogue: d.text || "",
      expression: "",
      action: "",
      background: "",
      camera: "",
      style: ""
    }))
  };
}

// -------- LOAD FRAME --------
function loadFrame(i) {
  if (!storyB || !storyB.frames[i]) return;

  currentFrameIndex = i;
  const f = storyB.frames[i];

  elInfo.textContent = `Frame ${i + 1} / ${storyB.frames.length}`;
  elChar.value = f.character;
  elExpr.value = f.expression;
  elAction.value = f.action;
  elBg.value = f.background;
  elCam.value = f.camera;
  elStyle.value = f.style;

  elPreview.textContent = JSON.stringify(f, null, 2);
}

// -------- SAVE CURRENT FRAME --------
function saveFrame() {
  const f = storyB.frames[currentFrameIndex];
  f.character = elChar.value;
  f.expression = elExpr.value;
  f.action = elAction.value;
  f.background = elBg.value;
  f.camera = elCam.value;
  f.style = elStyle.value;
}

// -------- NAVIGATION --------
document.getElementById("btnPrevFrame").onclick = () => {
  saveFrame();
  if (currentFrameIndex > 0) loadFrame(currentFrameIndex - 1);
};

document.getElementById("btnNextFrame").onclick = () => {
  saveFrame();
  if (currentFrameIndex < storyB.frames.length - 1) {
    loadFrame(currentFrameIndex + 1);
  }
};

// -------- SAVE LOCAL --------
document.getElementById("btnSaveStoryB").onclick = () => {
  if (!storyB) {
    alert("Chưa có Story B");
    return;
  }
  localStorage.setItem(`storyB_${storyB.id}`, JSON.stringify(storyB));
  alert("Đã lưu Story B vào local");
  console.log("[TAB2] Saved storyB", storyB);
};
