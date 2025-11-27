// =========== DANH SÁCH NHÂN VẬT ===============
let characterList = [];

// ===============================================
// 1. TẠO PROMPT
// ===============================================
function buildCharacterPrompt() {
  const id = document.getElementById("charId").value.trim();
  const name = document.getElementById("charName").value.trim();
  const summary = document.getElementById("charSummary").value.trim();
  const ageRole = document.getElementById("charAgeRole").value.trim();
  const appearance = document.getElementById("charAppearance").value.trim();
  const outfit = document.getElementById("charOutfit").value.trim();
  const tools = document.getElementById("charTools").value.trim();
  const colors = document.getElementById("charColors").value.trim();
  const art = document.getElementById("charArt").value.trim();

  if (!id || !name) {
    alert("ID và Tên nhân vật là bắt buộc!");
    return;
  }

  const prompt = `
${name}, ${ageRole}.
Full anime character sheet: front, left, right, back, hair details, outfit & accessory breakdown.

APPEARANCE:
– ${appearance}

OUTFIT:
– ${outfit}

TOOLS:
– ${tools}

COLOR PALETTE:
– ${colors}

STYLE:
${art}
`.trim();

  document.getElementById("finalPrompt").value = prompt;
}

// ===============================================
// 2. COPY PROMPT
// ===============================================
function copyPrompt() {
  const txt = document.getElementById("finalPrompt").value;
  navigator.clipboard.writeText(txt);
  alert("Đã copy!");
}

// ===============================================
// 3. THÊM NHÂN VẬT VÀO JSON
// ===============================================
function addToJson() {
  const obj = {
    id: document.getElementById("charId").value.trim(),
    name: document.getElementById("charName").value.trim(),
    summary: document.getElementById("charSummary").value.trim(),
    ageRole: document.getElementById("charAgeRole").value.trim(),
    appearance: document.getElementById("charAppearance").value.trim(),
    outfit: document.getElementById("charOutfit").value.trim(),
    tools: document.getElementById("charTools").value.trim(),
    colorPalette: document.getElementById("charColors").value.trim(),
    artStyle: document.getElementById("charArt").value.trim(),
    prompt: document.getElementById("finalPrompt").value.trim()
  };

  if (!obj.id || !obj.name) {
    alert("Thiếu ID hoặc Tên!");
    return;
  }

  // Check duplicate ID
  if (characterList.some(c => c.id === obj.id)) {
    alert("ID đã tồn tại trong danh sách!");
    return;
  }

  characterList.push(obj);

  document.getElementById("jsonList").value =
    JSON.stringify(characterList, null, 2);

  alert("Đã thêm vào JSON!");
}


// ===============================================
// 4. TẢI FILE JSON
// ===============================================
function downloadJson() {
  const data = JSON.stringify(characterList, null, 2);
  const blob = new Blob([data], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "character.json";
  link.click();
}

// ===============================================
// 5. XÓA DANH SÁCH JSON
// ===============================================
function clearJson() {
  if (!confirm("Xóa toàn bộ danh sách?")) return;
  characterList = [];
  document.getElementById("jsonList").value = "[]";
}
