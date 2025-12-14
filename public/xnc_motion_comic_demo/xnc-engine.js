// XNC Motion Comic Engine (JSON-driven) — FULL (gender + states + action variants)
// Drop-in replacement for xnc-engine.js

const $ = (id) => document.getElementById(id);

// ===== ADN GETTERS (tolerant) =====
function _getADN(){
  return (typeof ADN !== "undefined" && ADN) ||
         (typeof adn !== "undefined" && adn) ||
         (window && window.ADN) ||
         (window && window.adn) ||
         null;
}
function getLayouts(){      return _getADN()?.layouts      || {}; }
function getBackgrounds(){  return _getADN()?.backgrounds  || {}; }
function getStyles(){       return _getADN()?.styles       || {}; }
function getCharacters(){   return _getADN()?.characters   || {}; }
function getActions(){      return _getADN()?.actions      || {}; }
function getStates(){       return _getADN()?.states       || {}; }

function log(msg){
  const el = $("log");
  if(!el) return;
  const now = new Date().toLocaleTimeString();
  el.textContent = `[${now}] ${msg}\n` + el.textContent;
}

async function loadJSON(url){
  const r = await fetch(url, { cache: "no-store" });
  if(!r.ok) throw new Error(`HTTP ${r.status} when loading ${url}`);
  return await r.json();
}

function toArrayFromPossibles(data, keys){
  for(const k of keys){
    if(Array.isArray(data?.[k])) return data[k];
    if(data?.[k] && typeof data[k] === "object") return Object.values(data[k]);
  }
  if(Array.isArray(data)) return data;
  return [];
}

// ===== ADN URLS =====
const ADN_URLS = {
  layouts: "/adn/xomnganchuyen/XNC_layouts.json",
  backgrounds: "/adn/xomnganchuyen/XNC_backgrounds.json",
  characters: "/adn/xomnganchuyen/XNC_characters.json",
  actions: "/adn/xomnganchuyen/XNC_actions.json",
  states: "/adn/xomnganchuyen/XNC_states.json",   // NEW
  style: "/adn/xomnganchuyen/XNC_style.json",
};

const ADN = { layouts: [], backgrounds: [], characters: [], actions: [], states: [], style: [] };

// ADN guardrails
const TONE_LOCKED_ID = "A";

const CAMERA_ANGLES = [
  {id:"", label:"(auto / none)"},
  {id:"establishing_wide", label:"Establishing wide (toàn cảnh)"},
  {id:"wide", label:"Wide (rộng)"},
  {id:"medium", label:"Medium (trung)"},
  {id:"closeup", label:"Close-up (cận)"},
  {id:"extreme_closeup", label:"Extreme close-up (siêu cận)"},
  {id:"over_shoulder", label:"Over-the-shoulder (qua vai)"},
  {id:"low_angle", label:"Low angle (từ dưới lên)"},
  {id:"high_angle", label:"High angle (từ trên xuống)"},
  {id:"top_down", label:"Top-down (thẳng từ trên)"},
  {id:"dutch_tilt", label:"Dutch tilt (nghiêng)"}
];

const CAMERA_MOVES = [
  {id:"", label:"(static / none)"},
  {id:"push_in", label:"Push-in (tiến gần)"},
  {id:"pull_out", label:"Pull-out (lùi xa)"},
  {id:"pan_left", label:"Pan left"},
  {id:"pan_right", label:"Pan right"},
  {id:"tilt_up", label:"Tilt up"},
  {id:"tilt_down", label:"Tilt down"},
  {id:"dolly", label:"Dolly (trượt)"},
  {id:"handheld", label:"Handheld (rung nhẹ)"},
  {id:"shake", label:"Shake (rung mạnh)"}
];

const state = {
  layoutId: null,
  panelCount: 4,
  activePanelIndex: 0,
  aspect: "9:16",
  panels: [],
};

// ===== NORMALIZERS =====
function normalizeLayouts(raw){
  const arr = toArrayFromPossibles(raw, ["layouts","layout","data"]);
  return arr.map(x => ({
    id: x.id,
    label: x.label || x.name || x.id,
    panelCount: x.panelCount ?? x.panels ?? x.count ?? 4,
    css: x.css || x.grid || null,
  })).filter(x => x.id);
}
function normalizeBackgrounds(raw){
  const arr = toArrayFromPossibles(raw, ["backgrounds","bg","data"]);
  return arr.map(x => ({
    id: x.id,
    label: x.label || x.name || x.id,
    desc: x.desc || x.description || "",
  })).filter(x => x.id);
}
function normalizeCharacters(raw){
  const arr = toArrayFromPossibles(raw, ["characters","data"]);
  if(arr.length){
    return arr.map(v => ({
      id: v.id,
      name: v.name || v.label || v.id,
      role: v.role || "",
      gender: v.gender || "",
      base_desc_en: v.base_desc_en || v.desc_en || v.desc || v.description || ""
    })).filter(x => x.id);
  }
  const obj = raw?.characters && typeof raw.characters === "object" ? raw.characters : null;
  if(!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({
    id,
    name: v.name || id,
    role: v.role || "",
    gender: v.gender || "",
    base_desc_en: v.base_desc_en || v.desc_en || v.desc || v.description || ""
  }));
}
function normalizeActions(raw){
  const arr = toArrayFromPossibles(raw, ["actions","data"]);
  return arr.map(x => ({
    id: x.id,
    label: x.label || x.name || x.id,
    desc_en: x.desc_en || x.desc || x.description || "",
    variants: (x.variants && typeof x.variants === "object") ? x.variants : null
  })).filter(x => x.id);
}
function normalizeStates(raw){
  const arr = toArrayFromPossibles(raw, ["states","data"]);
  return arr.map(x => ({
    id: x.id,
    label: x.label || x.name || x.id,
    desc_en: x.desc_en || x.desc || x.description || "",
    intensity: x.intensity || ""
  })).filter(x => x.id);
}
function normalizeStyle(raw){
  const arr = toArrayFromPossibles(raw, ["styles","style","data"]);
  return arr.map(x => ({
    id: x.id,
    label: x.label || x.name || x.id,
    dna: x.dna || x.desc || x.description || ""
  })).filter(x => x.id);
}

function ensurePanelCount(n){
  state.panelCount = n;
  while(state.panels.length < n){
    state.panels.push({
      backgroundId: null,
      styleId: null,
      motionNote: "",
      cameraAngle: "",
      cameraMove: "",
      durationSec: 1.5,
      moodDetail: "",
      refPrompt: "",
      actors: []
    });
  }
  while(state.panels.length > n) state.panels.pop();
  if(state.activePanelIndex >= n) state.activePanelIndex = 0;
}

function getLayoutById(id){ return ADN.layouts.find(x => x.id === id) || null; }

function parseCssToGrid(css){
  if(!css) return null;
  if(typeof css === "object"){
    return {
      columns: css.columns || css.cols || css.gridTemplateColumns || null,
      rows: css.rows || css.gridTemplateRows || null,
      areas: css.areas || css.gridTemplateAreas || null,
    };
  }
  if(typeof css === "string"){
    const cols = /grid-template-columns\s*:\s*([^;]+)/i.exec(css)?.[1]?.trim() || null;
    const rows = /grid-template-rows\s*:\s*([^;]+)/i.exec(css)?.[1]?.trim() || null;
    const areas = /grid-template-areas\s*:\s*([^;]+)/i.exec(css)?.[1]?.trim() || null;
    return { columns: cols, rows: rows, areas };
  }
  return null;
}

function setGridTemplate(layoutId){
  const grid = $("grid");
  const layout = getLayoutById(layoutId);
  const panelCount = layout?.panelCount ?? 4;

  grid.style.gridTemplateColumns = "";
  grid.style.gridTemplateRows = "";
  grid.style.gridTemplateAreas = "";

  const g = parseCssToGrid(layout?.css);
  if(g?.columns) grid.style.gridTemplateColumns = g.columns;
  if(g?.rows) grid.style.gridTemplateRows = g.rows;
  if(g?.areas) grid.style.gridTemplateAreas = g.areas;

  if(!g?.columns && !g?.rows && !g?.areas){
    if(panelCount === 1){
      grid.style.gridTemplateColumns = "1fr";
      grid.style.gridTemplateRows = "1fr";
    } else if(panelCount === 2){
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gridTemplateRows = "1fr";
    } else if(panelCount === 3){
      grid.style.gridTemplateColumns="1fr 1fr";
      grid.style.gridTemplateRows="1fr 1fr";
      grid.style.gridTemplateAreas = `"a a" "b c"`;
    } else {
      grid.style.gridTemplateColumns="1fr 1fr";
      grid.style.gridTemplateRows="1fr 1fr";
    }
  }

  grid.innerHTML = "";
  const areaMap = ["a","b","c","d","e","f","g","h"];
  for(let i=0;i<panelCount;i++){
    const p = document.createElement("div");
    p.className = "panel";
    p.dataset.panelIndex = String(i);
    if(grid.style.gridTemplateAreas) p.style.gridArea = areaMap[i] || "";
    p.innerHTML = `<div class="panelTag">P${i+1}</div><div class="panelBgLabel" data-role="bgLabel"></div>`;
    p.addEventListener("click", ()=>{
      state.activePanelIndex = i;
      renderPanelSelect();
      syncSidebarFromState();
      highlightActivePanel();
      renderActorsOnPanels();
    });
    grid.appendChild(p);
  }

  ensurePanelCount(panelCount);
  highlightActivePanel();
  renderPanelSelect();
  syncSidebarFromState();
  renderActorsOnPanels();
  log(`Layout set: ${layoutId} (${panelCount} panels)`);
}

function highlightActivePanel(){
  [...$("grid").querySelectorAll(".panel")].forEach((p, idx)=> p.classList.toggle("active", idx === state.activePanelIndex));
}

// ===== RENDER SELECTS =====
function renderLayoutSelect(){
  const sel = $("layoutSelect");
  sel.innerHTML = "";
  ADN.layouts.forEach(l=>{
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.label;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ state.layoutId = sel.value; setGridTemplate(state.layoutId); };
  if(state.layoutId) sel.value = state.layoutId;
}

function renderPanelSelect(){
  const sel = $("panelSelect");
  sel.innerHTML = "";
  for(let i=0;i<state.panelCount;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `P${i+1}`;
    sel.appendChild(opt);
  }
  sel.value = String(state.activePanelIndex);
  sel.onchange = ()=>{
    state.activePanelIndex = Number(sel.value||0);
    highlightActivePanel();
    syncSidebarFromState();
    renderActorsOnPanels();
  };
}

function renderBackgroundSelect(){
  const sel = $("bgSelect");
  sel.innerHTML = `<option value="">— Chọn bối cảnh —</option>`;
  ADN.backgrounds.forEach(b=>{
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.label;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{
    const p = state.panels[state.activePanelIndex];
    p.backgroundId = sel.value || null;
    renderActorsOnPanels();
  };
}

function renderStyleSelect(){
  const sel = $("styleSelect");
  sel.innerHTML = `<option value="">style (mặc định)</option>`;
  ADN.style.forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ state.panels[state.activePanelIndex].styleId = sel.value || null; };
}

function renderCameraAngleSelect(){
  const sel = $("cameraAngleSelect");
  if(!sel) return;
  sel.innerHTML = "";
  CAMERA_ANGLES.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ state.panels[state.activePanelIndex].cameraAngle = sel.value || ""; };
}
function renderCameraMoveSelect(){
  const sel = $("cameraMoveSelect");
  if(!sel) return;
  sel.innerHTML = "";
  CAMERA_MOVES.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ state.panels[state.activePanelIndex].cameraMove = sel.value || ""; };
}

function renderCharacterSelect(){
  const sel = $("charSelect");
  if(!sel) return;
  sel.innerHTML = "";
  ADN.characters.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}
function renderActionSelect(){
  const sel = $("actionSelect");
  if(!sel) return;
  sel.innerHTML = "";
  ADN.actions.forEach(a=>{
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.label;
    sel.appendChild(opt);
  });
}
function renderStateSelect(){
  const sel = $("stateSelect");
  if(!sel) return;
  sel.innerHTML = "";
  ADN.states.forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    sel.appendChild(opt);
  });
  if(ADN.states.some(x=>x.id==="neutral")) sel.value = "neutral";
}

// ===== SIDEBAR SYNC =====
function syncSidebarFromState(){
  const p = state.panels[state.activePanelIndex];
  $("bgSelect").value = p.backgroundId || "";
  $("styleSelect").value = p.styleId || "";
  $("motionNote").value = p.motionNote || "";
  const ca = $("cameraAngleSelect"); if(ca) ca.value = p.cameraAngle || "";
  const cm = $("cameraMoveSelect"); if(cm) cm.value = p.cameraMove || "";
  const dur = $("panelDuration"); if(dur) dur.value = String(p.durationSec ?? 1.5);
  const md = $("moodDetail"); if(md) md.value = p.moodDetail || "";
  const rp = $("refPrompt"); if(rp) rp.value = p.refPrompt || "";
  $("aspectSelect").value = state.aspect || "9:16";
  renderActorsList();
}

function renderActorsList(){
  const wrap = $("actorsList");
  wrap.innerHTML = "";
  const p = state.panels[state.activePanelIndex];

  if(!p.actors.length){
    const div = document.createElement("div");
    div.style.color = "var(--muted)";
    div.style.fontSize = "12px";
    div.textContent = "Chưa có actor. Bấm + Add để thêm.";
    wrap.appendChild(div);
    return;
  }

  p.actors.forEach((a, idx)=>{
    const row = document.createElement("div");
    row.className = "actorRow";

    const charSel = document.createElement("select");
    ADN.characters.forEach(c=>{
      const opt = document.createElement("option");
      opt.value = c.id; opt.textContent = c.name;
      charSel.appendChild(opt);
    });
    charSel.value = a.charId;

    const actSel = document.createElement("select");
    ADN.actions.forEach(x=>{
      const opt = document.createElement("option");
      opt.value = x.id; opt.textContent = x.label;
      actSel.appendChild(opt);
    });
    actSel.value = a.actionId;

    const stateSel = document.createElement("select");
    ADN.states.forEach(s=>{
      const opt = document.createElement("option");
      opt.value = s.id; opt.textContent = s.label;
      stateSel.appendChild(opt);
    });
    stateSel.value = a.stateId || (ADN.states.some(x=>x.id==="neutral") ? "neutral" : (ADN.states[0]?.id || ""));

    charSel.onchange = ()=>{ a.charId = charSel.value; renderActorsOnPanels(); };
    actSel.onchange  = ()=>{ a.actionId = actSel.value; renderActorsOnPanels(); };
    stateSel.onchange= ()=>{ a.stateId = stateSel.value; renderActorsOnPanels(); };

    const del = document.createElement("button");
    del.textContent = "×";
    del.className = "ghost";
    del.onclick = ()=>{ p.actors.splice(idx, 1); renderActorsList(); renderActorsOnPanels(); };

    row.appendChild(charSel);
    row.appendChild(actSel);
    row.appendChild(stateSel);
    row.appendChild(del);
    wrap.appendChild(row);
  });
}

function renderActorsOnPanels(){
  const panels = [...$("grid").querySelectorAll(".panel")];
  panels.forEach((el, idx)=>{
    [...el.querySelectorAll(".actorChip")].forEach(x=>x.remove());

    const p = state.panels[idx];
    const bgLabel = el.querySelector('[data-role="bgLabel"]');
    const bg = ADN.backgrounds.find(b=>b.id === p.backgroundId);
    bgLabel.textContent = bg ? bg.label : "";

    p.actors.forEach((a, k)=>{
      const c = ADN.characters.find(x=>x.id === a.charId);
      const ac = ADN.actions.find(x=>x.id === a.actionId);
      const st = ADN.states.find(x=>x.id === a.stateId);

      const chip = document.createElement("div");
      chip.className = "actorChip";
      chip.style.top = `${50 + (k*18)}%`;
      chip.style.left = `${50 + (k%2? 18 : -18)}%`;
      chip.innerHTML =
        `<div style="font-weight:800;color:#0b1410">${c?.name || a.charId}</div>
         <small>${ac?.label || a.actionId}${st ? " · " + st.label : ""}</small>`;
      el.appendChild(chip);
    });
  });
}

// ===== PROMPT HELPERS =====
function _char(id){ return ADN.characters.find(x=>x.id===id) || null; }
function _action(id){ return ADN.actions.find(x=>x.id===id) || null; }
function _state(id){ return ADN.states.find(x=>x.id===id) || null; }

function characterLine(c){
  if(!c) return "";
  const parts = [];
  if(c.gender) parts.push(`${c.gender} child character`);
  parts.push(c.name);
  if(c.base_desc_en) parts.push(c.base_desc_en);
  return parts.filter(Boolean).join(", ");
}

function actionLine(actionObj, charId){
  if(!actionObj) return "";
  const v = actionObj.variants?.[charId];
  const desc = (v && String(v).trim()) ? String(v).trim() : (actionObj.desc_en || "");
  if(desc) return `${actionObj.label}: ${desc}`;
  return actionObj.label;
}

function stateLine(stateObj){
  if(!stateObj) return "";
  return stateObj.desc_en ? `${stateObj.label}: ${stateObj.desc_en}` : stateObj.label;
}

// ===== EXPORT JSON + PROMPTS =====
function buildSceneJSON(){
  return {
    version: "xnc_scene_v2",
    aspect: state.aspect,
    layoutId: state.layoutId,
    panels: state.panels.map((p, i)=>({
      id: `P${i+1}`,
      backgroundId: p.backgroundId,
      styleId: p.styleId,
      motionNote: p.motionNote || "",
      cameraAngle: p.cameraAngle || "",
      cameraMove: p.cameraMove || "",
      durationSec: p.durationSec ?? 1.5,
      moodDetail: p.moodDetail || "",
      refPrompt: p.refPrompt || "",
      actors: p.actors.map(a=>({ charId: a.charId, actionId: a.actionId, stateId: a.stateId || "" })),
    })),
    sources: ADN_URLS,
    exportedAt: new Date().toISOString(),
  };
}

function buildPromptText(){
  const scene = buildSceneJSON();

  const defaultStyle = ADN.style.find(s=>s.id==="style") || ADN.style[0];
  const defaultDna = defaultStyle?.dna || "pastel chibi 2D, Vietnamese vibe, clean illustration, soft lighting";

  const bgDesc = (bgId)=>{
    const b = ADN.backgrounds.find(x=>x.id===bgId);
    return b ? (b.desc ? `${b.label} (${b.desc})` : b.label) : "";
  };
  const styleDna = (styleId)=> styleId ? (ADN.style.find(s=>s.id===styleId)?.dna || "") : "";

  let out = "";
  out += `STYLE DNA (XNC): ${defaultDna}\n`;
  out += `TONE: XNC-${TONE_LOCKED_ID} (locked)\n`;
  out += `ASPECT: ${scene.aspect}\n`;
  out += `LAYOUT: ${scene.layoutId}\n`;
  out += `Constraints: no text, no subtitles, no UI, consistent characters, comic panel framing.\n\n`;

  scene.panels.forEach((p)=>{
    out += `PANEL ${p.id}\n`;
    out += `Background: ${bgDesc(p.backgroundId) || "(none)"}\n`;
    const sd = styleDna(p.styleId);
    if(sd) out += `Style override: ${sd}\n`;
    if(p.cameraAngle) out += `Camera angle: ${p.cameraAngle}\n`;
    if(p.cameraMove) out += `Camera move: ${p.cameraMove}\n`;
    if(p.durationSec) out += `Duration: ${p.durationSec}s\n`;
    if(p.moodDetail) out += `Mood: ${p.moodDetail}\n`;
    if(p.motionNote) out += `Motion note: ${p.motionNote}\n`;
    if(p.refPrompt) out += `Reference prompt: ${p.refPrompt}\n`;

    if(p.actors.length){
      out += `Actors:\n`;
      p.actors.forEach(a=>{
        const c = _char(a.charId);
        const ac = _action(a.actionId);
        const st = _state(a.stateId || "neutral");
        out += `- ${characterLine(c)}\n  Action: ${actionLine(ac, a.charId)}\n`;
        if(st) out += `  State: ${stateLine(st)}\n`;
      });
    } else {
      out += `Actors: (none)\n`;
    }
    out += `\n`;
  });

  return out.trim();
}

function buildPanelPrompt(panelIndex){
  const p = state.panels[panelIndex];
  const layout = getLayoutById(state.layoutId) || {};
  const styleObj = ADN.style.find(s=>s.id === (p.styleId || "")) || (ADN.style.find(s=>s.id==="style") || ADN.style[0]);

  const styleLine = styleObj?.dna
    ? `STYLE DNA (XNC): ${styleObj.dna}`
    : `STYLE DNA (XNC): ${state.styleId || "(missing)"}`;

  const aspectLine = `ASPECT: ${state.aspect || "9:16"}`;
  const layoutLine = `LAYOUT: ${layout.id || state.layoutId || "(unknown)"}`;

  const bg = ADN.backgrounds.find(b=>b.id === p.backgroundId);
  const bgName = bg ? (bg.desc ? `${bg.label} (${bg.desc})` : bg.label) : (p.backgroundId || "(none)");
  const panelName = `PANEL ${panelIndex + 1} (P${panelIndex + 1})`;

  const actorBlocks = (p.actors || []).length
    ? (p.actors || []).map(a => {
        const c = _char(a.charId);
        const ac = _action(a.actionId);
        const st = _state(a.stateId || "neutral");
        const lines = [
          `- ${characterLine(c)}`,
          `  Action: ${actionLine(ac, a.charId)}`,
        ];
        if(st) lines.push(`  State: ${stateLine(st)}`);
        return lines.join("\n");
      }).join("\n")
    : "- (none)";

  const constraints = `Constraints: no text, no subtitles, no UI, consistent characters, comic panel framing.`;

  return [
    styleLine,
    aspectLine,
    layoutLine,
    "",
    panelName,
    `Background: ${bgName}`,
    `Tone: XNC-${TONE_LOCKED_ID} (locked)`,
    (p.cameraAngle?`Camera angle: ${p.cameraAngle}`:null),
    (p.cameraMove?`Camera move: ${p.cameraMove}`:null),
    (p.durationSec?`Duration: ${p.durationSec}s`:null),
    (p.moodDetail?`Mood: ${p.moodDetail}`:null),
    (p.refPrompt?`Reference prompt: ${p.refPrompt}`:null),
    (p.motionNote?`Motion: ${p.motionNote}`:null),
    "Actors:",
    actorBlocks,
    constraints
  ].filter(Boolean).join("\n");
}

// ===== UTILS =====
async function copyOutput(){
  await navigator.clipboard.writeText($("output").textContent || "");
  log("Copied output to clipboard.");
}

function downloadJSON(){
  const data = buildSceneJSON();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "xnc_scene.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  log("Downloaded xnc_scene.json");
}

function resetAll(){
  state.layoutId = ADN.layouts[0]?.id || null;
  state.activePanelIndex = 0;
  state.aspect = "9:16";
  ensurePanelCount(getLayoutById(state.layoutId)?.panelCount || 4);
  state.panels.forEach(p=>{
    p.backgroundId=null; p.styleId=null; p.motionNote="";
    p.cameraAngle=""; p.cameraMove=""; p.durationSec=1.5;
    p.moodDetail=""; p.refPrompt="";
    p.actors=[];
  });
  renderLayoutSelect();
  setGridTemplate(state.layoutId);
  $("output").textContent = "Chưa có output. Chọn layout + cấu hình rồi bấm “Xuất Prompt” hoặc “Xuất JSON”.";
  log("Reset done.");
}

// ===== INIT =====
async function init(){
  try{
    log("Loading ADN JSON...");
    const [l,b,c,a,st,s] = await Promise.all([
      loadJSON(ADN_URLS.layouts),
      loadJSON(ADN_URLS.backgrounds),
      loadJSON(ADN_URLS.characters),
      loadJSON(ADN_URLS.actions),
      loadJSON(ADN_URLS.states),
      loadJSON(ADN_URLS.style),
    ]);

    ADN.layouts = normalizeLayouts(l);
    ADN.backgrounds = normalizeBackgrounds(b);
    ADN.characters = normalizeCharacters(c);
    ADN.actions = normalizeActions(a);
    ADN.states = normalizeStates(st);
    ADN.style = normalizeStyle(s);

    log(`ADN loaded: layouts=${ADN.layouts.length}, backgrounds=${ADN.backgrounds.length}, characters=${ADN.characters.length}, actions=${ADN.actions.length}, states=${ADN.states.length}, styles=${ADN.style.length}`);

    if(!ADN.layouts.length) throw new Error("No layouts in JSON");
    state.layoutId = ADN.layouts[0].id;

    renderLayoutSelect();
    renderBackgroundSelect();
    renderStyleSelect();
    renderCharacterSelect();
    renderActionSelect();
    renderStateSelect();
    renderCameraAngleSelect();
    renderCameraMoveSelect();

    setGridTemplate(state.layoutId);

    const motionEl = $("motionNote");
    if(motionEl) motionEl.oninput = ()=>{ state.panels[state.activePanelIndex].motionNote = motionEl.value; };

    const durEl = $("panelDuration");
    if(durEl) durEl.oninput = ()=>{ state.panels[state.activePanelIndex].durationSec = Number(durEl.value||1.5); };

    const moodEl = $("moodDetail");
    if(moodEl) moodEl.oninput = ()=>{ state.panels[state.activePanelIndex].moodDetail = moodEl.value; };

    const refEl = $("refPrompt");
    if(refEl) refEl.oninput = ()=>{ state.panels[state.activePanelIndex].refPrompt = refEl.value; };

    const aspectEl = $("aspectSelect");
    if(aspectEl) aspectEl.onchange = ()=>{ state.aspect = aspectEl.value; };

    $("btnAddActor").onclick = ()=>{
      const p = state.panels[state.activePanelIndex];
      const defaultState = $("stateSelect")?.value || (ADN.states.some(x=>x.id==="neutral") ? "neutral" : (ADN.states[0]?.id || ""));
      p.actors.push({
        charId: $("charSelect").value,
        actionId: $("actionSelect").value,
        stateId: defaultState
      });
      renderActorsList();
      renderActorsOnPanels();
    };

    $("btnExportPanelPrompt").onclick = () => {
      const i = state.activePanelIndex ?? 0;
      $("output").textContent = buildPanelPrompt(i);
      log("Panel prompt exported.");
    };

    const exportPrompt = ()=>{ $("output").textContent = buildPromptText(); log("Prompt exported."); };
    const exportJSON = ()=>{ $("output").textContent = JSON.stringify(buildSceneJSON(), null, 2); log("JSON exported."); };

    $("btnExportPrompt").onclick = exportPrompt;
    $("btnExportPrompt2").onclick = exportPrompt;
    $("btnExportJSON").onclick = exportJSON;
    $("btnExportJSON2").onclick = exportJSON;
    $("btnCopy").onclick = copyOutput;
    $("btnDownload").onclick = downloadJSON;
    $("btnReset").onclick = resetAll;

  } catch(err){
    console.error(err);
    log(`ERROR: ${err.message}`);
    $("output").textContent = `Lỗi load JSON.\n${err.message}\n\nKiểm tra đường dẫn ADN_URLS trong xnc-engine.js.`;
  }
}

window.addEventListener("load", init);
