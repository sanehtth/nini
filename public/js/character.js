function byId(id){return document.getElementById(id);} 
function toast(msg){console.log(msg); alert(msg);} 

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
  const colorPalette = (document.getElementById("charColorPalette").value || "").trim();
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
  const outEl = byId("charJsonOutput");
  const txt = (outEl?.value || "").trim();
  if (!txt) return alert("Chưa có dữ liệu JSON.");

  // Validate JSON
  try { JSON.parse(txt); } 
  catch (e) { return alert("JSON đang lỗi, kiểm tra lại trước khi tải."); }

  const blob = new Blob([txt], { type: "application/json" });
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
  byId("charJsonOutput").value = "[]";
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


// ===== ADN / character.json helpers =====
let adnCharactersCache = null;

function safeJsonParse(str, fallback = {}) {
  try { return JSON.parse(str); } catch (_) { return fallback; }
}

function normalizeCharacter(obj) {
  // Normalize a character record to the form schema used on this page
  const c = obj || {};
  return {
    id: c.id || c.charId || "",
    name: c.name || c.charName || "",
    summary: c.summary || c.charSummary || "",
    ageRole: c.ageRole || c.charAgeRole || "",
    appearance: c.appearance || c.charAppearance || "",
    outfit: c.outfit || c.charOutfit || "",
    tools: c.tools || c.charTools || "",
    palette: c.palette || c.charColorPalette || "",
    artStyle: c.artStyle || c.charArtStyle || "",
    imagePath: c.imagePath || c.charImagePath || "",
    promptFinal: c.promptFinal || c.charPromptFinal || "",
    // optional 3D payload
    threeD: c.threeD || c.three_d || c.model3d || c.model3D || null
  };
}

function fillFormFromCharacter(c0) {
  const c = normalizeCharacter(c0);
  byId("charId").value = c.id;
  byId("charName").value = c.name;
  byId("charSummary").value = c.summary;
  byId("charAgeRole").value = c.ageRole;
  byId("charAppearance").value = c.appearance;
  byId("charOutfit").value = c.outfit;
  byId("charTools").value = c.tools;
  byId("charColorPalette").value = c.palette;
  byId("charArtStyle").value = c.artStyle;
  byId("charImagePath").value = c.imagePath;
  byId("charPromptFinal").value = c.promptFinal;
  byId("char3dJson").value = c.threeD ? JSON.stringify(c.threeD, null, 2) : "";
}

async function loadAdnFromUrl(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Không tải được: " + res.status);
  const data = await res.json();
  // Accept {characters:[...]} OR [...]
  const list = Array.isArray(data) ? data : (data.characters || data.items || []);
  adnCharactersCache = list.map(normalizeCharacter);
  return adnCharactersCache;
}

function populateAdnSelect(list) {
  const sel = byId("adnCharacterSelect");
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "(chọn nhân vật)";
  sel.appendChild(opt0);

  (list || []).forEach((c, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = (c.name ? c.name : "(no-name)") + (c.id ? " — " + c.id : "");
    sel.appendChild(opt);
  });
}

function buildCharacterObjectFromForm() {
  const threeD = safeJsonParse(byId("char3dJson").value, null);
  return {
    id: byId("charId").value.trim(),
    name: byId("charName").value.trim(),
    summary: byId("charSummary").value.trim(),
    ageRole: byId("charAgeRole").value.trim(),
    appearance: byId("charAppearance").value.trim(),
    outfit: byId("charOutfit").value.trim(),
    tools: byId("charTools").value.trim(),
    palette: byId("charColorPalette").value.trim(),
    artStyle: byId("charArtStyle").value.trim(),
    imagePath: byId("charImagePath").value.trim(),
    promptFinal: byId("charPromptFinal").value,
    ...(threeD ? { threeD } : {})
  };
}

// Hook ADN UI
document.addEventListener("DOMContentLoaded", () => {
  const loadBtn = byId("loadAdnBtn");
  const loadSelectedBtn = byId("loadSelectedBtn");
  const importBtn = byId("importFileBtn");
  const applyPathBtn = byId("applyAdnPathBtn");
  const adnSeriesEl = byId("adnSeries");
  const adnFileNameEl = byId("adnFileName");

  const updateAdnUrlFromSeries = () => {
    const series = (adnSeriesEl?.value || "").trim();
    const fileName = (adnFileNameEl?.value || "").trim();
    if (!series || !fileName) return;
    // public/ là web root, nên chỉ cần đường dẫn tương đối
    byId("adnUrl").value = `adn/${series}/${fileName}`;
  };

  // Auto-build ADN path for multiple series
  applyPathBtn?.addEventListener("click", updateAdnUrlFromSeries);
  adnSeriesEl?.addEventListener("change", updateAdnUrlFromSeries);
  adnFileNameEl?.addEventListener("change", updateAdnUrlFromSeries);
  updateAdnUrlFromSeries();

  loadBtn?.addEventListener("click", async () => {
    const url = byId("adnUrl").value.trim();
    try {
      const list = await loadAdnFromUrl(url);
      populateAdnSelect(list);
      toast("Đã tải " + list.length + " nhân vật từ ADN");
    } catch (e) {
      console.error(e);
      toast("Lỗi tải ADN: " + (e?.message || e));
    }
  });

  loadSelectedBtn?.addEventListener("click", () => {
    const idxStr = byId("adnCharacterSelect").value;
    if (!idxStr) return toast("Chưa chọn nhân vật");
    const idx = Number(idxStr);
    const c = adnCharactersCache?.[idx];
    if (!c) return toast("Không tìm thấy nhân vật");
    fillFormFromCharacter(c);
    toast("Đã nạp: " + (c.name || c.id || "nhân vật"));
  });

  importBtn?.addEventListener("click", async () => {
    const fileInput = byId("importFile");
    const file = fileInput?.files?.[0];
    if (!file) return toast("Chưa chọn file JSON");
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      const list = Array.isArray(data) ? data : (data.characters || data.items || []);
      adnCharactersCache = list.map(normalizeCharacter);
      populateAdnSelect(adnCharactersCache);
      toast("Import thành công: " + adnCharactersCache.length + " nhân vật");
    } catch (e) {
      console.error(e);
      toast("Import lỗi: " + (e?.message || e));
    }
  });

  // Patch existing addToJson behavior: keep original, but ensure we save 3D too when adding.
  const addBtn = byId("addToJsonBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      try {
        const c = buildCharacterObjectFromForm();
        // Append to current JSON output if it's an array or has {characters:[]}
        const outEl = byId("charJsonOutput");
        const current = safeJsonParse(outEl.value, null);
        let next;
        if (Array.isArray(current)) {
          next = [...current, c];
        } else if (current && typeof current === "object") {
          const arr = Array.isArray(current.characters) ? current.characters : [];
          next = { ...current, characters: [...arr, c] };
        } else {
          next = { characters: [c] };
        }
        outEl.value = JSON.stringify(next, null, 2);
      } catch (e) {
        console.error(e);
      }
    }, { capture: true });
  }
});
