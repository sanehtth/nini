console.log("[TAB2] init");

let storyA = null;
let storyB = null;
let currentFrameIndex = 0;

// ===== DOM (TAB 2 – đặt tên RIÊNG) =====
const elFrameInfo = document.getElementById("frameInfo");
const elFrameChar = document.getElementById("frameCharacter");
const elFrameExpr = document.getElementById("frameExpression");
const elFrameAction = document.getElementById("frameAction");
const elFrameBg = document.getElementById("frameBackground");
const elFrameCam = document.getElementById("frameCamera");
const elFrameStyle = document.getElementById("frameStyle");
const elPreviewB = document.getElementById("previewStoryB");

// ===== LOAD STORY A =====
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

// ===== BUILD STORY B =====
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

// ===== LOAD FRAME =====
function loadFrame(i) {
  if (!storyB || !storyB.frames[i]) return;

  currentFrameIndex = i;
  const f = storyB.frames[i];

  elFrameInfo.textContent = `Frame ${i + 1} / ${storyB.frames.length}`;
  elFrameChar.value = f.character;
  elFrameExpr.value = f.expression;
  elFrameAction.value = f.action;
  elFrameBg.value = f.background;
  elFrameCam.value = f.camera;
  elFrameStyle.value = f.style;

  elPreviewB.textContent = JSON.stringify(f, null, 2);
}

// ===== SAVE CURRENT FRAME =====
function saveFrame() {
  const f = storyB.frames[currentFrameIndex];
  f.character = elFrameChar.value;
  f.expression = elFrameExpr.value;
  f.action = elFrameAction.value;
  f.background = elFrameBg.value;
  f.camera = elFrameCam.value;
  f.style = elFrameStyle.value;
}

// ===== NAVIGATION =====
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

// ===== SAVE LOCAL STORY B =====
document.getElementById("btnSaveStoryB").onclick = () => {
  if (!storyB) {
    alert("Chưa có Story B");
    return;
  }
  localStorage.setItem(`storyB_${storyB.id}`, JSON.stringify(storyB));
  alert("Đã lưu Story B vào local");
  console.log("[TAB2] Saved storyB", storyB);
};
