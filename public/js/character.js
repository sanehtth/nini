// public/js/character.js
document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("charName");
  const rawEl = document.getElementById("charRaw");
  const ageRoleEl = document.getElementById("charAgeRole");
  const appearanceEl = document.getElementById("charAppearance");
  const outfitEl = document.getElementById("charOutfit");
  const toolsEl = document.getElementById("charTools");
  const paletteEl = document.getElementById("charPalette");
  const styleEl = document.getElementById("charStyle");
  const finalEl = document.getElementById("charFinal");

  const buildBtn = document.getElementById("buildCharPromptBtn");
  const copyBtn = document.getElementById("copyCharPromptBtn");

  function buildPrompt() {
    const name = (nameEl.value || "Kha").trim();
    const raw = rawEl.value.trim();
    const ageRole = ageRoleEl.value.trim() || "12–14 year-old ancient steampunk crafter boy";
    const appearance = appearanceEl.value.trim();
    const outfit = outfitEl.value.trim();
    const tools = toolsEl.value.trim();
    const palette = paletteEl.value.trim() || "Forest green, brown leather, antique brass, teal glow";
    const style = styleEl.value.trim() ||
      "Anime, ancient-steampunk fantasy hybrid, detailed reference sheet with organized labeled panels.";

    const lines = [];

    // Header
    lines.push(`${name.toUpperCase()}, ${ageRole}.`);
    lines.push("Full anime character sheet: front, left, right, back, hair details, clothing and tool breakdown.");
    lines.push("");

    if (raw) {
      lines.push("BASE CONCEPT:");
      lines.push(`– ${raw}`);
      lines.push("");
    }

    if (appearance) {
      lines.push("APPEARANCE:");
      appearance.split("\n").forEach((l) => {
        if (l.trim()) lines.push(`– ${l.trim()}`);
      });
      lines.push("");
    }

    if (outfit) {
      lines.push("OUTFIT:");
      outfit.split("\n").forEach((l) => {
        if (l.trim()) lines.push(`– ${l.trim()}`);
      });
      lines.push("");
    }

    if (tools) {
      lines.push("TOOLS:");
      tools.split("\n").forEach((l) => {
        if (l.trim()) lines.push(`– ${l.trim()}`);
      });
      lines.push("");
    }

    if (palette) {
      lines.push("COLOR PALETTE:");
      palette.split(",").forEach((c) => {
        if (c.trim()) lines.push(`– ${c.trim()}`);
      });
      lines.push("");
    }

    if (style) {
      lines.push("STYLE:");
      lines.push(style);
    }

    finalEl.value = lines.join("\n");
  }

  function copyPrompt() {
    if (!finalEl.value.trim()) {
      buildPrompt();
    }
    navigator.clipboard.writeText(finalEl.value).then(
      () => alert("Đã copy prompt vào clipboard!"),
      () => alert("Copy không thành công, hãy chọn và copy thủ công.")
    );
  }

  buildBtn?.addEventListener("click", buildPrompt);
  copyBtn?.addEventListener("click", copyPrompt);
});
