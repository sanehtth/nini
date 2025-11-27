// character.js

// Mảng lưu tất cả nhân vật trong session
let characters = [];

// Helper: tạo ID nếu user bỏ trống
function makeAutoId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `char_${y}${m}${d}_${h}${mi}${s}`;
}

// Chuẩn hoá tên để đưa vào file path
function makeSafeName(rawName) {
  if (!rawName) return "noname";
  // Bỏ dấu tiếng Việt + ký tự lạ
  let s = rawName
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")   // mọi thứ không phải a-z0-9 -> _
    .replace(/^_+|_+$/g, "");      // bỏ _ ở đầu/cuối
  return s || "noname";
}

// Gộp các field thành prompt chuẩn
function buildCharacterPrompt() {
  const id = (document.getElementById("charId").value || "").trim();
  const name = (document.getElementById("charName").value || "").trim();
  const summary = (document.getElementById("charSummary").value || "").trim();
  const ageRole = (document.getElementById("charAgeRole").value || "").trim();
  const appearance = (document.getElementById("charAppearance").value || "").trim();
  const outfit = (document.getElementById("charOutfit").value || "").trim();
  const tools = (document.getElementById("charTools").value || "").trim();
  const colorPalette = (document.getElementById("charPalette").value || "").trim();
  const artStyle = (document.getElementById("charArtStyle").value || "").trim();

  const imgInput = document.getElementById("charImagePath");
  let imagePath = (imgInput?.value || "").trim();

  const finalId = id || makeAutoId();

  // Nếu chưa nhập path hình thì tự generate
  if (!imagePath) {
    const safeName = makeSafeName(name);
    imagePath = `public/assets/character/${finalId}_${safeName}.webp`;
    if (imgInput) imgInput.value = imagePath; // fill lại vào ô cho user thấy
  }

  // Phần đầu: tên + tuổi / role
  let headerLine = "";
  if (name && ageRole) {
    headerLine = `${name}, ${ageRole}`;
  } else if (ageRole) {
    headerLine = ageRole;
  } else if (name) {
    headerLine = name;
  }

  const promptLines = [];

  if (headerLine) {
    promptLines.push(headerLine);
  }

  if (summary) {
    promptLines.push(summary);
  }

  // Phần mô tả layout sheet
  promptLines.push(
    "Full anime character sheet: front, left, right, back, hair details, clothing and tool breakdown."
  );

  if (appearance) {
    promptLines.push("\nAPPEARANCE:");
    promptLines.push(appearance);
  }

  if (outfit) {
    promptLines.push("\nOUTFIT (Ancient Steampunk Fantasy):");
    promptLines.push(outfit);
  }

  if (tools) {
    promptLines.push("\nTOOLS:");
    promptLines.push(tools);
  }

  if (colorPalette) {
    promptLines.push("\nCOLOR PALETTE:");
    promptLines.push(colorPalette);
  }

  if (artStyle) {
    promptLines.push("\nSTYLE:");
    promptLines.push(artStyle);
  }

  // (tuỳ chọn) thêm info file minh hoạ vào cuối prompt
  if (imagePath) {
    promptLines.push("\nILLUSTRATION FILE PATH:");
    promptLines.push(imagePath);
  }

  const finalPrompt = promptLines.join("\n");

  const promptBox = document.getElementById("charPromptFinal");
  if (promptBox) promptBox.value = finalPrompt;

  // Trả thêm object để dùng khi add JSON
  return {
    id: finalId,
    name,
    summary,
    ageRole,
    appearance,
    outfit,
    tools,
    colorPalette,
    artStyle,
    imagePath,
    prompt: finalPrompt,
  };
}

// Thêm nhân vật hiện tại vào mảng JSON
function addCurrentCharacterToJson() {
  const obj = buildCharacterPrompt(); // build lại để chắc chắn luôn sync
  characters.push(obj);
  renderCharactersJson();
}

// In mảng characters ra textarea JSON
function renderCharactersJson() {
  const output = document.getElementById("charJsonOutput");
  if (output) {
    output.value = JSON.stringify(characters, null, 2);
  }
}

// Copy prompt
function copyPromptToClipboard() {
  const promptBox = document.getElementById("charPromptFinal");
  if (!promptBox) return;
  promptBox.select();
  document.execCommand("copy");
}

// Download characters.json
function downloadCharactersJson() {
  if (!characters.length) {
    alert("Chưa có nhân vật nào trong JSON.");
    return;
  }
  const blob = new Blob([JSON.stringify(characters, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "characters.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Clear danh sách JSON
function clearCharactersJson() {
  if (!confirm("Xoá toàn bộ danh sách nhân vật trong JSON?")) return;
  characters = [];
  renderCharactersJson();
}

// Gắn event sau khi DOM ready
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("buildPromptBtn")
    ?.addEventListener("click", buildCharacterPrompt);

  document
    .getElementById("addToJsonBtn")
    ?.addEventListener("click", addCurrentCharacterToJson);

  document
    .getElementById("copyPromptBtn")
    ?.addEventListener("click", copyPromptToClipboard);

  document
    .getElementById("downloadJsonBtn")
    ?.addEventListener("click", downloadCharactersJson);

  document
    .getElementById("clearJsonBtn")
    ?.addEventListener("click", clearCharactersJson);

  // Render mảng rỗng ban đầu
  renderCharactersJson();
});
