console.log("[TAB2] init");

let frames = [];
let frameIndex = 0;
let storyA = null;

// ===== SELECT ELEMENTS =====
const selects = {
  character: fCharacter,
  expression: fExpression,
  state: fState,
  outfit: fOutfit,
  action: fAction,
  background: fBackground,
  camera: fCamera,
  style: fStyle
};

// ===== DEMO LIBRARIES =====
const LIB = {
  character: ["Tên Trộm Gà", "Túm-La"],
  expression: ["neutral", "joy_bright"],
  state: ["walking_curious", "running_fast"],
  outfit: ["xnc_outfit_thief_chicken_sneaky"],
  action: ["run", "look_back"],
  background: ["xnc_bactu_rambutan_garden"],
  camera: ["closeup", "medium"],
  style: ["happy", "drama"]
};

Object.keys(LIB).forEach(k => {
  LIB[k].forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    selects[k].appendChild(o);
  });
});

// ===== LOAD STORY A =====
document.getElementById("btnLoadLocalA").onclick = () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("storyA_"));
  if (!keys.length) return alert("Không có Story A");

  storyA = JSON.parse(localStorage.getItem(keys[0]));
  frames = storyA.dialogues.map((d, i) => ({
    index: i,
    scene_id: d.scene_id,
    character: d.character,
    dialogue: d.dialogue
  }));

  frameIndex = 0;
  renderFrame();
  console.log("[TAB2] Loaded Story A", frames.length);
};

// ===== RENDER FRAME =====
function renderFrame() {
  const f = frames[frameIndex];
  if (!f) return;

  Object.keys(selects).forEach(k => {
    if (f[k]) selects[k].value = f[k];
  });

  previewFrame.textContent = JSON.stringify(f, null, 2);
}

// ===== UPDATE FRAME =====
Object.keys(selects).forEach(k => {
  selects[k].onchange = () => {
    frames[frameIndex][k] = selects[k].value;
    renderFrame();
  };
});

// ===== NAV =====
btnPrevFrame.onclick = () => {
  if (frameIndex > 0) frameIndex--;
  renderFrame();
};

btnNextFrame.onclick = () => {
  if (frameIndex < frames.length - 1) frameIndex++;
  renderFrame();
};

// ===== SAVE LOCAL B =====
btnSaveLocalB.onclick = () => {
  if (!storyA) return alert("Chưa load Story A");

  localStorage.setItem(
    `storyB_${storyA.id}`,
    JSON.stringify({ story_id: storyA.id, frames }, null, 2)
  );

  btnSaveLocalB.textContent = "✅ Đã lưu Story B";
  setTimeout(() => btnSaveLocalB.textContent = "Lưu tạm Story B (local)", 1200);
};

// ===== EXPORT =====
btnExportB.onclick = () => {
  if (!storyA) return;
  downloadJSON({ story_id: storyA.id, frames }, `${storyA.id}_B.json`);
};

function downloadJSON(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
