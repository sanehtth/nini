// character.js
document.addEventListener("DOMContentLoaded", () => {
  const nameInput       = document.getElementById("charName");
  const rawInput        = document.getElementById("charRaw");
  const roleInput       = document.getElementById("charRole");
  const hairInput       = document.getElementById("charHair");
  const outfitInput     = document.getElementById("charOutfit");
  const toolsInput      = document.getElementById("charTools");
  const paletteInput    = document.getElementById("charPalette");
  const styleInput      = document.getElementById("charStyle");
  const extraInput      = document.getElementById("charExtra");

  const buildBtn        = document.getElementById("buildCharPromptBtn");
  const statusSpan      = document.getElementById("charStatus");
  const promptOutput    = document.getElementById("charFinal");
  const jsonOutput      = document.getElementById("charJson");
  const copyPromptBtn   = document.getElementById("copyCharPromptBtn");
  const copyJsonBtn     = document.getElementById("copyCharJsonBtn");

  function buildPromptAndJson() {
    const name       = (nameInput.value || "").trim() || "Unnamed character";
    const raw        = (rawInput.value || "").trim();
    const role       = (roleInput.value || "").trim();
    const hair       = (hairInput.value || "").trim();
    const outfit     = (outfitInput.value || "").trim();
    const tools      = (toolsInput.value || "").trim();
    const palette    = (paletteInput.value || "").trim();
    const style      = (styleInput.value || "").trim();
    const extra      = (extraInput.value || "").trim();

    // ---------- PROMPT TEXT ----------
    const headerLine = `${name}, ${role || "original character"}.`;
    const sheetLine  = "Full anime character sheet: front, left, right, back, hair details, clothing and tool breakdown.";

    let appearanceBlock = "APPEARANCE:";
    if (hair) {
      appearanceBlock += `\n– ${hair}`;
    }
    if (raw) {
      appearanceBlock += `\n– ${raw}`;
    }

    let outfitBlock = "OUTFIT:";
    outfitBlock += outfit ? `\n– ${outfit}` : "\n– Main outfit details.";

    let toolsBlock = "TOOLS & PROPS:";
    toolsBlock += tools ? `\n– ${tools}` : "\n– Key gadgets, weapons, props.";

    let paletteBlock = "COLOR PALETTE:";
    paletteBlock += palette ? `\n– ${palette}` : "\n– Main color scheme.";

    let styleBlock = "STYLE:";
    styleBlock += style
      ? `\n${style}`
      : "\nAnime, detailed reference sheet, clean layout.";

    if (extra) {
      styleBlock += `\n\nNOTES:\n– ${extra}`;
    }

    const finalPrompt =
      `${headerLine}\n${sheetLine}\n\n` +
      `${appearanceBlock}\n\n` +
      `${outfitBlock}\n\n` +
      `${toolsBlock}\n\n` +
      `${paletteBlock}\n\n` +
      `${styleBlock}`;

    promptOutput.value = finalPrompt;

    // ---------- JSON DATA ----------
    const charObj = {
      name,
      short_description: raw,
      age_role: role,
      appearance: hair,
      outfit,
      tools_props: tools,
      color_palette: palette,
      artstyle_layout: style,
      notes: extra,
      full_prompt: finalPrompt
    };

    jsonOutput.value = JSON.stringify(charObj, null, 2);
    statusSpan.textContent = "Đã tạo prompt + JSON ✔";
    setTimeout(() => (statusSpan.textContent = ""), 2500);
  }

  buildBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    buildPromptAndJson();
  });

  copyPromptBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!promptOutput.value) return;
    navigator.clipboard.writeText(promptOutput.value).then(() => {
      statusSpan.textContent = "Đã copy prompt ✔";
      setTimeout(() => (statusSpan.textContent = ""), 2000);
    });
  });

  copyJsonBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!jsonOutput.value) return;
    navigator.clipboard.writeText(jsonOutput.value).then(() => {
      statusSpan.textContent = "Đã copy JSON ✔";
      setTimeout(() => (statusSpan.textContent = ""), 2000);
    });
  });
});
