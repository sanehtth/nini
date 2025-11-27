// character.js
// Tool nhỏ: build prompt nhân vật + quản lý JSON nhiều character

(function () {
  const buildBtn   = document.getElementById("buildCharPromptBtn");
  const copyBtn    = document.getElementById("copyCharPromptBtn");
  const addJsonBtn = document.getElementById("addCharToJsonBtn");
  const dlJsonBtn  = document.getElementById("downloadJsonBtn");
  const clearJsonBtn = document.getElementById("clearJsonBtn");

  const idEl       = document.getElementById("charId");
  const nameEl     = document.getElementById("charName");
  const rawEl      = document.getElementById("charRaw");
  const ageRoleEl  = document.getElementById("charAgeRole");
  const hairEl     = document.getElementById("charHair");
  const outfitEl   = document.getElementById("charOutfit");
  const toolsEl    = document.getElementById("charTools");
  const colorsEl   = document.getElementById("charColors");
  const styleEl    = document.getElementById("charStyle");
  const finalEl    = document.getElementById("charFinal");
  const jsonEl     = document.getElementById("charJson");

  // Mảng lưu nhiều nhân vật trong session hiện tại
  let characters = [];

  function generateIdFallback() {
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 1000);
    return `char_${ts}_${rand}`;
  }

  function buildPrompt() {
    const name      = nameEl.value.trim() || "Unnamed character";
    const raw       = rawEl.value.trim();
    const ageRole   = ageRoleEl.value.trim();
    const hair      = hairEl.value.trim();
    const outfit    = outfitEl.value.trim();
    const tools     = toolsEl.value.trim();
    const colors    = colorsEl.value.trim();
    const artstyle  = styleEl.value.trim();

    const titleLine = name
      ? `${name}, ${ageRole || "fantasy character"}.`
      : ageRole || "Fantasy character.";

    const promptParts = [];

    promptParts.push(titleLine);
    if (raw) {
      promptParts.push(raw);
    }

    promptParts.push("");
    promptParts.push("APPEARANCE:");
    if (hair)   promptParts.push("– " + hair);
    if (outfit) promptParts.push("– " + outfit);

    promptParts.push("");
    promptParts.push("TOOLS & PROPS:");
    if (tools) promptParts.push("– " + tools);

    promptParts.push("");
    promptParts.push("COLOR PALETTE:");
    if (colors) promptParts.push("– " + colors);

    promptParts.push("");
    promptParts.push("STYLE:");
    promptParts.push(
      artstyle ||
        "Anime, detailed character reference sheet with multiple views and labeled panels."
    );

    finalEl.value = promptParts.join("\n");
    return finalEl.value;
  }

  function buildCharacterObject() {
    const id = (idEl.value.trim() || generateIdFallback()).replace(/\s+/g, "_");
    idEl.value = id; // điền lại để user thấy

    const prompt = finalEl.value.trim() || buildPrompt();

    const character = {
      id,
      name: nameEl.value.trim(),
      summary: rawEl.value.trim(),
      ageRole: ageRoleEl.value.trim(),
      appearance: hairEl.value.trim(),
      outfit: outfitEl.value.trim(),
      tools: toolsEl.value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      colorPalette: colorsEl.value.trim(),
      artStyle: styleEl.value.trim(),
      prompt, // prompt đã build
    };

    return character;
  }

  function refreshJsonTextarea() {
    jsonEl.value = JSON.stringify(characters, null, 2);
  }

  // ====== Event handlers ======

  if (buildBtn) {
    buildBtn.onclick = () => {
      buildPrompt();
    };
  }

  if (copyBtn && navigator.clipboard) {
    copyBtn.onclick = async () => {
      const text = finalEl.value.trim();
      if (!text) {
        alert("Chưa có prompt để copy. Hãy bấm 'Tạo prompt nhân vật' trước.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "✅ Đã copy";
        setTimeout(() => (copyBtn.textContent = "📋 Copy prompt"), 1500);
      } catch (e) {
        console.error(e);
        alert("Trình duyệt không cho phép copy tự động, hãy chọn tay.");
      }
    };
  }

  if (addJsonBtn) {
    addJsonBtn.onclick = () => {
      const charObj = buildCharacterObject();

      // Nếu ID đã tồn tại → thay thế; nếu không → push mới
      const existingIndex = characters.findIndex((c) => c.id === charObj.id);
      if (existingIndex >= 0) {
        characters[existingIndex] = charObj;
      } else {
        characters.push(charObj);
      }

      refreshJsonTextarea();
      addJsonBtn.textContent = "✅ Đã thêm / cập nhật JSON";
      setTimeout(
        () => (addJsonBtn.textContent = "➕ Thêm vào danh sách JSON"),
        1500
      );
    };
  }

  if (dlJsonBtn) {
    dlJsonBtn.onclick = () => {
      if (!characters.length) {
        alert("Chưa có nhân vật nào trong JSON. Hãy thêm ít nhất 1 nhân vật.");
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
    };
  }

  if (clearJsonBtn) {
    clearJsonBtn.onclick = () => {
      if (!confirm("Xoá toàn bộ danh sách JSON trong session hiện tại?")) return;
      characters = [];
      refreshJsonTextarea();
    };
  }

  // Nếu người dùng tự sửa JSON textbox → sync lại vào mảng (optional)
  if (jsonEl) {
    jsonEl.addEventListener("change", () => {
      try {
        const parsed = JSON.parse(jsonEl.value);
        if (Array.isArray(parsed)) {
          characters = parsed;
        }
      } catch (e) {
        console.warn("JSON không hợp lệ, bỏ qua", e);
      }
    });
  }
})();
