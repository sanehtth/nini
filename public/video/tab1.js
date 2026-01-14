console.log("[TAB1] init");

window.storyA = null;

const elManifest = document.getElementById("selManifest");
const elId = document.getElementById("storyId");
const elTitle = document.getElementById("storyTitle");
const elText = document.getElementById("storyText");
const elPreview = document.getElementById("previewA");

// DEMO MANIFEST (bạn có thể fetch sau)
const manifest = [
  { id: "XNC-20260110-0005", title: "Nhầm mặt.. TU luôn!" }
];

manifest.forEach(m => {
  const o = document.createElement("option");
  o.value = m.id;
  o.textContent = `${m.id} – ${m.title}`;
  elManifest.appendChild(o);
});

document.getElementById("btnLoadStory").onclick = () => {
  elId.value = elManifest.value;
  elTitle.value = elManifest.selectedOptions[0].text;
};

document.getElementById("btnParseStory").onclick = () => {
  const lines = elText.value.split("\n").filter(Boolean);

  window.storyA = {
    id: elId.value.trim(),
    title: elTitle.value.trim(),
    dialogues: lines.map((t, i) => ({
      index: i,
      scene_id: "S1",
      character: "Tên Trộm Gà",
      dialogue: t
    }))
  };

  elPreview.textContent = JSON.stringify(window.storyA, null, 2);
  console.log("[TAB1] Parse OK", window.storyA);
};

document.getElementById("btnSaveLocalA").onclick = () => {
  if (!window.storyA) return alert("Chưa có Story A");
  localStorage.setItem(
    `storyA_${window.storyA.id}`,
    JSON.stringify(window.storyA, null, 2)
  );
  alert("✅ Đã lưu Story A");
};

document.getElementById("btnExportA").onclick = () => {
  if (!window.storyA) return;
  downloadJSON(window.storyA, `${window.storyA.id}_A.json`);
};

function downloadJSON(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
