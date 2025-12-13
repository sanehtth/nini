const $ = id => document.getElementById(id);

const state = {
  layouts: {},
  activeLayout: null,
  panels: [],
  activePanelIndex: 0
};

/* ================= LOAD ADN ================= */

async function loadLayouts(){
  const res = await fetch("./XNC_layouts.json");
  const json = await res.json();
  state.layouts = json.layouts;
  renderLayoutSelect();
}

/* ================= UI ================= */

function renderLayoutSelect(){
  const sel = $("layout");
  sel.innerHTML = "";
  Object.values(state.layouts).forEach(l=>{
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.label;
    sel.appendChild(opt);
  });
  sel.onchange = e => setGridTemplate(e.target.value);
  setGridTemplate(sel.value);
}

/* ================= GRID ================= */

function setGridTemplate(layoutId){
  const layout = state.layouts[layoutId];
  if(!layout) return;

  state.activeLayout = layout;
  const grid = $("grid");

  grid.style.gridTemplateColumns = "";
  grid.style.gridTemplateRows = "";
  grid.style.gridTemplateAreas = "";

  if(layout.css){
    const css = layout.css;
    const get = p => (new RegExp(p+"\\s*:\\s*([^;]+)","i").exec(css)||[])[1];
    if(get("grid-template-columns")) grid.style.gridTemplateColumns = get("grid-template-columns");
    if(get("grid-template-rows")) grid.style.gridTemplateRows = get("grid-template-rows");
    if(get("grid-template-areas")) grid.style.gridTemplateAreas = get("grid-template-areas");
  }

  buildPanels(layout.panels);
}

/* ================= PANELS ================= */

function buildPanels(count){
  const grid = $("grid");
  grid.innerHTML = "";
  state.panels = [];

  const areaMap = ["a","b","c","d"];

  for(let i=0;i<count;i++){
    const p = document.createElement("div");
    p.className = "panel";
    p.dataset.index = i;
    if(grid.style.gridTemplateAreas){
      p.style.gridArea = areaMap[i];
    }
    p.innerHTML = `<div class="panelTag">P${i+1}</div>`;
    p.onclick = ()=> state.activePanelIndex = i;
    grid.appendChild(p);
    state.panels.push({ actors: [], background: null });
  }
}

/* ================= EXPORT ================= */

function exportJSON(){
  const out = {
    layout: state.activeLayout.id,
    panels: state.panels
  };
  $("output").textContent = JSON.stringify(out,null,2);
}

/* ================= INIT ================= */

async function init(){
  await loadLayouts();
  $("btnExportJson").onclick = exportJSON;
}

init();
