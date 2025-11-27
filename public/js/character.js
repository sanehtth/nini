// public/js/character.js
// character.js
document.addEventListener("DOMContentLoaded", () => {
  const buildBtn = document.getElementById("buildCharPromptBtn");
  const copyBtn  = document.getElementById("copyCharPromptBtn");
  const out      = document.getElementById("charPromptFinal");

  buildBtn.onclick = () => {
    const name   = document.getElementById("charName").value.trim();
    const short  = document.getElementById("charShort").value.trim();
    const role   = document.getElementById("charRole").value.trim();
    const hair   = document.getElementById("charHair").value.trim();
    const outfit = document.getElementById("charOutfit").value.trim();
    const tools  = document.getElementById("charTools").value.trim();
    const colors = document.getElementById("charColors").value.trim();
    const style  = document.getElementById("charStyle").value.trim();

    const titleLine = name
      ? `${name.toUpperCase()}, ${role || "original character"}`
      : role || "Original character";

    const prompt = `
${titleLine}

${short}

APPEARANCE:
– ${hair}

OUTFIT:
– ${outfit}

TOOLS:
– ${tools}

COLOR PALETTE:
– ${colors}

STYLE:
${style}
`.trim();

    out.value = prompt;
  };

  copyBtn.onclick = () => {
    if (!out.value) return;
    navigator.clipboard.writeText(out.value).then(() => {
      alert("Đã copy prompt nhân vật vào clipboard!");
    });
  };
});
