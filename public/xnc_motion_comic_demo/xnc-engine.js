// XNC Motion Comic Engine (Cách A: JSON-driven)
const $ = (id) => document.getElementById(id);
// ===== ADN GETTERS (fix: getLayouts is not defined) =====
// ADN có thể đang nằm ở biến `ADN` hoặc `adn` hoặc `window.ADN` tuỳ bản bạn merge.
// Đoạn này cố tình "chịu lỗi" để không crash.
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

function log(msg){
  const el = $("log");
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

const ADN_URLS = {
  layouts: "/adn/xomnganchuyen/XNC_layouts.json",
  backgrounds: "/adn/xomnganchuyen/XNC_backgrounds.json",
  characters: "/adn/xomnganchuyen/XNC_characters.json",
  actions: "/adn/xomnganchuyen/XNC_actions.json",
  style: "/adn/xomnganchuyen/XNC_style.json",
};

const ADN = { layouts: [], backgrounds: [], characters: [], actions: [], style: [] };

// ADN guardrails
const TONE_LOCKED_ID = "A"; // khóa tone theo ADN XNC

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
  const obj = raw?.characters && typeof raw.characters === "object" ? raw.characters : null;
  if(!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({ id, name: v.name || id, role: v.role || "" }));
}
function normalizeActions(raw){
  const arr = toArrayFromPossibles(raw, ["actions","data"]);
  return arr.map(x => ({ id: x.id, label: x.label || x.name || x.id, desc: x.desc || x.description || "" }))
    .filter(x => x.id);
}
function normalizeStyle(raw){
  const arr = toArrayFromPossibles(raw, ["styles","style","data"]);
  return arr.map(x => ({ id: x.id, label: x.label || x.name || x.id, dna: x.dna || x.desc || x.description || "" }))
    .filter(x => x.id);
}

function ensurePanelCount(n){
  state.panelCount = n;
  while(state.panels.length < n){
    state.panels.push({ backgroundId: null, styleId: null, motionNote: "", cameraAngle: "", cameraMove: "", durationSec: 1.5, moodDetail: "", refPrompt: "", actors: [] });
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
  const areaMap = ["a","b","c","d"];
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

function renderLayoutSelect(){
  const sel = $("layoutSelect");
  sel.innerHTML = "";
  ADN.layouts.forEach(l=>{
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.label;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ state.layoutId = sel.value; setGridTemplate(state.layoutId);

    // per-panel fields
    const motionEl = $("motionNote");
    if(motionEl) motionEl.oninput = ()=>{ state.panels[state.activePanelIndex].motionNote = motionEl.value; };

    const durEl = $("panelDuration");
    if(durEl) durEl.oninput = ()=>{ state.panels[state.activePanelIndex].durationSec = Number(durEl.value||1.5); };

    const moodEl = $("moodDetail");
    if(moodEl) moodEl.oninput = ()=>{ state.panels[state.activePanelIndex].moodDetail = moodEl.value; };

    const refEl = $("refPrompt");
    if(refEl) refEl.oninput = ()=>{ state.panels[state.activePanelIndex].refPrompt = refEl.value; };
 };
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
  sel.onchange = ()=>{ state.activePanelIndex = Number(sel.value||0); highlightActivePanel(); syncSidebarFromState(); renderActorsOnPanels(); };
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
  sel.onchange = ()=>{
    const p = state.panels[state.activePanelIndex];
    p.cameraAngle = sel.value || "";
  };
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
  sel.onchange = ()=>{
    const p = state.panels[state.activePanelIndex];
    p.cameraMove = sel.value || "";
  };
}



function renderCharacterSelect(){
  const sel = $("charSelect");
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
  sel.innerHTML = "";
  ADN.actions.forEach(a=>{
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.label;
    sel.appendChild(opt);
  });
}

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

    charSel.onchange = ()=>{ a.charId = charSel.value; renderActorsOnPanels(); };
    actSel.onchange = ()=>{ a.actionId = actSel.value; renderActorsOnPanels(); };

    const del = document.createElement("button");
    del.textContent = "×";
    del.className = "ghost";
    del.onclick = ()=>{ p.actors.splice(idx, 1); renderActorsList(); renderActorsOnPanels(); };

    row.appendChild(charSel);
    row.appendChild(actSel);
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
      const chip = document.createElement("div");
      chip.className = "actorChip";
      chip.style.top = `${50 + (k*18)}%`;
      chip.style.left = `${50 + (k%2? 18 : -18)}%`;
      chip.innerHTML = `<div style="font-weight:800;color:#0b1410">${c?.name || a.charId}</div><small>${ac?.label || a.actionId}</small>`;
      el.appendChild(chip);
    });
  });
}

function buildSceneJSON(){
  return {
    version: "xnc_scene_v1",
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
      actors: p.actors.map(a=>({ charId: a.charId, actionId: a.actionId })),
    })),
    sources: ADN_URLS,
    exportedAt: new Date().toISOString(),
  };
}

function buildPromptText(){
  const scene = buildSceneJSON();
  const styleDna = (styleId)=> styleId ? (ADN.style.find(s=>s.id===styleId)?.dna || "") : "";
  const bgDesc = (bgId)=>{
    const b = ADN.backgrounds.find(x=>x.id===bgId);
    return b ? (b.desc ? `${b.label} (${b.desc})` : b.label) : "";
  };
  const charName = (id)=> ADN.characters.find(x=>x.id===id)?.name || id;
  const actionDesc = (id)=>{
    const a = ADN.actions.find(x=>x.id===id);
    return a ? (a.desc ? `${a.label}: ${a.desc}` : a.label) : id;
  };

  const defaultStyle = ADN.style.find(s=>s.id==="style") || ADN.style[0];
  const defaultDna = defaultStyle?.dna || "pastel chibi 2D, green-brown Vietnamese vibe, clean illustration, soft lighting";

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
    if(p.motionNote) out += `Motion note: ${p.motionNote}\n`;
    if(p.cameraAngle) out += `Camera angle: ${p.cameraAngle}\n`;
    if(p.cameraMove) out += `Camera move: ${p.cameraMove}\n`;
    if(p.durationSec) out += `Duration: ${p.durationSec}s\n`;
    if(p.moodDetail) out += `Mood: ${p.moodDetail}\n`;
    if(p.refPrompt) out += `Reference prompt: ${p.refPrompt}\n`;
    if(p.actors.length){
      out += `Actors:\n`;
      p.actors.forEach(a=>{ out += `- ${charName(a.charId)} — ${actionDesc(a.actionId)}\n`; });
    } else out += `Actors: (none)\n`;
    out += `\n`;
  });

  return out.trim();
}

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
  state.panels.forEach(p=>{ p.backgroundId=null; p.styleId=null; p.motionNote=""; p.actors=[]; });
  renderLayoutSelect();
  setGridTemplate(state.layoutId);

    // per-panel fields
    const motionEl = $("motionNote");
    if(motionEl) motionEl.oninput = ()=>{ state.panels[state.activePanelIndex].motionNote = motionEl.value; };

    const durEl = $("panelDuration");
    if(durEl) durEl.oninput = ()=>{ state.panels[state.activePanelIndex].durationSec = Number(durEl.value||1.5); };

    const moodEl = $("moodDetail");
    if(moodEl) moodEl.oninput = ()=>{ state.panels[state.activePanelIndex].moodDetail = moodEl.value; };

    const refEl = $("refPrompt");
    if(refEl) refEl.oninput = ()=>{ state.panels[state.activePanelIndex].refPrompt = refEl.value; };

  $("output").textContent = "Chưa có output. Chọn layout + cấu hình rồi bấm “Xuất Prompt” hoặc “Xuất JSON”.";
  log("Reset done.");
}

async function init(){
  try{
    log("Loading ADN JSON...");
    const [l,b,c,a,s] = await Promise.all([
      loadJSON(ADN_URLS.layouts),
      loadJSON(ADN_URLS.backgrounds),
      loadJSON(ADN_URLS.characters),
      loadJSON(ADN_URLS.actions),
      loadJSON(ADN_URLS.style),
    ]);

    ADN.layouts = normalizeLayouts(l);
    ADN.backgrounds = normalizeBackgrounds(b);
    ADN.characters = normalizeCharacters(c);
    ADN.actions = normalizeActions(a);
    ADN.style = normalizeStyle(s);

    log(`ADN loaded: layouts=${ADN.layouts.length}, backgrounds=${ADN.backgrounds.length}, characters=${ADN.characters.length}, actions=${ADN.actions.length}, styles=${ADN.style.length}`);

    if(!ADN.layouts.length) throw new Error("No layouts in JSON");
    state.layoutId = ADN.layouts[0].id;

    renderLayoutSelect();
    renderBackgroundSelect();
    renderStyleSelect();
    renderCharacterSelect();
    renderActionSelect();
    renderCameraAngleSelect();
    renderCameraMoveSelect();

    setGridTemplate(state.layoutId);

    // per-panel fields
    const motionEl = $("motionNote");
    if(motionEl) motionEl.oninput = ()=>{ state.panels[state.activePanelIndex].motionNote = motionEl.value; };

    const durEl = $("panelDuration");
    if(durEl) durEl.oninput = ()=>{ state.panels[state.activePanelIndex].durationSec = Number(durEl.value||1.5); };

    const moodEl = $("moodDetail");
    if(moodEl) moodEl.oninput = ()=>{ state.panels[state.activePanelIndex].moodDetail = moodEl.value; };

    const refEl = $("refPrompt");
    if(refEl) refEl.oninput = ()=>{ state.panels[state.activePanelIndex].refPrompt = refEl.value; };

    $("btnExportPanelPrompt").onclick = () => {
    const i = state.activePanelIndex ?? 0;       // panel đang chọn
    const txt = buildPanelPrompt(i);
    $("output").textContent = txt;               // hoặc output.value tùy bạn dùng <pre> hay <textarea>
    };

    $("aspectSelect").onchange = ()=>{ state.aspect = $("aspectSelect").value; };
    $("motionNote").addEventListener("input", ()=>{ state.panels[state.activePanelIndex].motionNote = $("motionNote").value || ""; });

    $("btnAddActor").onclick = ()=>{
      const p = state.panels[state.activePanelIndex];
      p.actors.push({ charId: $("charSelect").value, actionId: $("actionSelect").value });
      renderActorsList();
      renderActorsOnPanels();
    };
function buildPanelPrompt(panelIndex){
  const p = state.panels[panelIndex];
  const layout = getLayouts()?.[state.layoutId] || {};
  const styleObj = (getStyles && getStyles()[state.styleId]) || null;

  const styleLine = styleObj?.desc
    ? `STYLE DNA (XNC): ${styleObj.desc}`
    : `STYLE DNA (XNC): ${state.styleId || "(missing)"}`;

  const aspectLine = `ASPECT: ${state.aspect || "9:16"}`;
  const layoutLine = `LAYOUT: ${layout.id || state.layoutId || "(unknown)"}`;

  const bgName = (getBackgrounds && getBackgrounds()[p.backgroundId]?.label) || p.backgroundId || "(none)";
  const panelName = `PANEL ${panelIndex + 1} (P${panelIndex + 1})`;

  const actorsLines = (p.actors || []).length
    ? (p.actors || []).map(a => {
        const cname = (getCharacters && getCharacters()[a.charId]?.name) || a.charName || a.charId || "(char)";
        const aname = (getActions && getActions()[a.actionId]?.label) || a.actionLabel || a.actionId || "(action)";
        return `- ${cname} — ${aname}`;
      }).join("\n")
    : "- (none)";

  const motionNote = (p.motionNote || "").trim();
  const motionLine = motionNote ? `Motion: ${motionNote}` : "";

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
    "Actors:",
    actorsLines,
    motionLine ? motionLine : null,
    constraints
  ].filter(Boolean).join("\n");
}

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
    $("output").textContent = `Lỗi load JSON.\n${err.message}\n\nKiểm tra đường dẫn ADN_URLS trong xnc-engine.js (folder /ad/xomnganchuyen/...).`;
  }
}

window.addEventListener("load", init);
