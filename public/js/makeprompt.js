// /admin/tools/makeprompt.js
const $  = id => document.getElementById(id);
const val = (id, d="") => { const el = $(id); return el && "value" in el ? el.value : d; };

$("btnMakePrompt")?.addEventListener("click", () => {
  const data = {
    text  : val("lyrics",""),
    total : Number(val("dur",180)),
    step  : Number(val("item",5)),
    preset: val("preset",""),
    combo : val("combo",""),
    aspect: val("aspect","1792x1024")
  };
  // TODO: build prompt theo logic của bạn và đổ ra #output
  $("output").textContent = JSON.stringify(data, null, 2);
});
