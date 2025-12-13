// XNC Motion Comic Engine (Cách A) - JSON-driven builder + per-panel prompt export
const $ = (id) => document.getElementById(id);

function log(msg){
  const el = $("log");
  const now = new Date().toLocaleTimeString();
  if(el) el.textContent = `[${now}] ${msg}\n` + el.textContent;
}

async function fetchJSON(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`${url} (${res.status})`);
  return await res.json();
}

/**
 * ADN paths
 * - Bạn chỉ cần đổi ADN_BASE cho đúng folder json trong repo của bạn.
 * - Các file json có thể là array hoặc object {items:[]}. Hàm normalizeList sẽ tự xử lý.
 */
const ADN_BASE = "/adn/xomnganchuyen"; // <-- đổi cho đúng
const ADN_FILES = {
  layouts:     `${ADN_BASE}/XNC_layouts.json`,
  backgrounds: `${ADN_BASE}/XNC_backgrounds.json`,
  characters:  `${ADN_BASE}/XNC_characters.json`,
  actions:     `${ADN_BASE}/XNC_actions.json`,
  styles:      `${ADN_BASE}/XNC_style.json`,
  cameras:     `${ADN_BASE}/XNC_cameras.json`, // optional (nếu không có sẽ dùng fallback)
  tones:       `${ADN_BASE}/XNC_tones.json`,   // optional (nếu không có sẽ dùng fallback)
};

const FALLBACK_CAMERAS = [
  { id:"", label:"(Không bắt buộc)", desc:"" },
  { id:"wide", label:"Wide shot", desc:"wide establishing view" },
  { id:"medium", label:"Medium shot", desc:"waist-up" },
  { id:"closeup", label:"Close-up", desc:"face close-up" },
  { id:"over_shoulder", label:"Over-the-shoulder", desc:"OTS" },
  { id:"low_angle", label:"Low angle", desc:"looking up" },
  { id:"high_angle", label:"High angle", desc:"looking down" },
];

const FALLBACK_TONES = [
  { id:"", label:"(Không bắt buộc)", desc:"" },
  { id:"funny", label:"Hài hước", desc:"funny" },
  { id:"tense", label:"Căng thẳng", desc:"tense" },
  { id:"warm", label:"Ấm áp", desc:"warm" },
  { id:"sad", label:"Buồn", desc:"sad" },
  { id:"epic", label:"Kịch tính", desc:"epic" },
];

function normalizeList(data){
  if(Array.isArray(data)) return data;
  if(!data || typeof data !== "object") return [];
  // common keys
  for(const k of ["items","list","data","layouts","backgrounds","characters","actions","styles","cameras","tones"]){
    if(Array.isArray(data[k])) return data[k];
  }
  return [];
}

function toId(v){ return String(v ?? "").trim(); }
function getLabel(o){
  return o?.label || o?.name || o?.title || o?.id || "";
}

function layoutPanelCount(layout){
  return layout?.panels || layout?.panelCount || layout?.count || layout?.n || 4;
}

function layoutCss(layout){
  // allow layout.css as string OR object {columns,rows,areas} OR layout.grid...
  if(!layout) return null;
  if(typeof layout.css === "string") return parseGridCssString(layout.css);
  if(layout.css && typeof layout.css === "object"){
    const c = layout.css.columns || layout.css.cols || layout.css.gridTemplateColumns;
    const r = layout.css.rows || layout.css.gridTemplateRows;
    const a = layout.css.areas || layout.css.gridTemplateAreas;
    return { columns: c || "", rows: r || "", areas: a || "" };
  }
  if(layout.grid && typeof layout.grid === "object"){
    const c = layout.grid.columns || layout.grid.cols;
    const r = layout.grid.rows;
    const a = layout.grid.areas;
    return { columns: c || "", rows: r || "", areas: a || "" };
  }
  return null;
}

function parseGridCssString(css){
  const cols = /grid-template-columns\s*:\s*([^;]+)/i.exec(css);
  const rows = /grid-template-rows\s*:\s*([^;]+)/i.exec(css);
  const areas = /grid-template-areas\s*:\s*([^;]+)/i.exec(css);
  return {
    columns: cols ? cols[1].trim() : "",
    rows: rows ? rows[1].trim() : "",
    areas: areas ? areas[1].trim() : "",
  };
}

const state = {
  adn: null,
  layouts: [],
  backgrounds: [],
  characters: [],
  actions: [],
  styles: [],
  cameras: [],
  tones: [],

  layoutId: null,
  aspect: "9:16",

  // global scene meta
  cameraId: "",
  toneId: "",
  moodDetail: "",
  durationSec: 2,
  baseVideoPrompt: "",
  globalMotion: "",

  activePanelIndex: 0,
  panels: [], // [{backgroundId, styleId, motionNote, actors:[{charId, actionId}]}]
};

function ensurePanelCount(n){
  while(state.panels.length < n){
    state.panels.push({ backgroundId:"", styleId:"", motionNote:"", actors:[] });
  }
  if(state.panels.length > n) state.panels.length = n;
  state.activePanelIndex = Math.max(0, Math.min(state.activePanelIndex, n-1));
}

function optionHTML(items, selectedId, placeholder){
  const opts = [];
  if(placeholder) opts.push(`<option value="">${placeholder}</option>`);
  for(const it of items){
    const id = toId(it.id ?? it.key ?? it.value ?? it.name ?? it.label);
    const label = getLabel(it);
    const sel = id === selectedId ? "selected" : "";
    opts.push(`<option value="${escapeAttr(id)}" ${sel}>${escapeHtml(label)}</option>`);
  }
  return opts.join("");
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,"&quot;"); }

function renderLayoutSelect(){
  const sel = $("layoutSelect");
  if(!sel) return;
  sel.innerHTML = optionHTML(state.layouts, state.layoutId, "");
}

function renderPanelSelect(){
  const sel = $("panelSelect");
  if(!sel) return;
  const n = state.panels.length;
  const opts = [];
  for(let i=0;i<n;i++){
    const v = String(i);
    const label = `P${i+1}`;
    opts.push(`<option value="${v}" ${i===state.activePanelIndex?"selected":""}>${label}</option>`);
  }
  sel.innerHTML = opts.join("");
}

function renderBackgroundSelect(){
  const sel = $("backgroundSelect");
  if(!sel) return;
  const p = state.panels[state.activePanelIndex];
  sel.innerHTML = optionHTML(state.backgrounds, p?.backgroundId || "", "— Chọn bối cảnh —");
}

function renderStyleSelect(){
  const sel = $("styleSelect");
  if(!sel) return;
  const p = state.panels[state.activePanelIndex];
  sel.innerHTML = optionHTML(state.styles, p?.styleId || "", "style (mặc định)");
}

function renderCharacterSelect(){
  const sel = $("charSelect");
  if(!sel) return;
  sel.innerHTML = optionHTML(state.characters, "", "— Chọn nhân vật —");
}

function renderActionSelect(){
  const sel = $("actionSelect");
  if(!sel) return;
  sel.innerHTML = optionHTML(state.actions, "", "— Chọn hành động / biểu cảm —");
}

function renderCameraSelect(){
  const sel = $("cameraSelect");
  if(!sel) return;
  sel.innerHTML = optionHTML(state.cameras, state.cameraId, "(Không bắt buộc)");
}

function renderToneSelect(){
  const sel = $("toneSelect");
  if(!sel) return;
  sel.innerHTML = optionHTML(state.tones, state.toneId, "(Không bắt buộc)");
}

function syncSidebarFromState(){
  const p = state.panels[state.activePanelIndex];
  if($("aspectSelect")) $("aspectSelect").value = state.aspect;
  if($("motionNote")) $("motionNote").value = p?.motionNote || "";
  if($("moodDetail")) $("moodDetail").value = state.moodDetail || "";
  if($("durationSec")) $("durationSec").value = String(state.durationSec || 2);
  if($("baseVideoPrompt")) $("baseVideoPrompt").value = state.baseVideoPrompt || "";
  if($("globalMotion")) $("globalMotion").value = state.globalMotion || "";
  if($("cameraSelect")) $("cameraSelect").value = state.cameraId || "";
  if($("toneSelect")) $("toneSelect").value = state.toneId || "";
}

function highlightActivePanel(){
  const grid = $("grid");
  if(!grid) return;
  [...grid.querySelectorAll(".panel")].forEach((el)=>{
    el.classList.toggle("active", Number(el.dataset.panelIndex) === state.activePanelIndex);
  });
}

function renderActorList(){
  const wrap = $("actorList");
  if(!wrap) return;
  const p = state.panels[state.activePanelIndex];
  const actors = p?.actors || [];
  wrap.innerHTML = actors.map((a,idx)=>{
    const charSel = `<select data-kind="char" data-idx="${idx}">${optionHTML(state.characters, a.charId, "")}</select>`;
    const actSel  = `<select data-kind="action" data-idx="${idx}">${optionHTML(state.actions, a.actionId, "")}</select>`;
    const delBtn  = `<button class="iconBtn ghost" data-kind="del" data-idx="${idx}">×</button>`;
    return `<div class="actorLine">${charSel}${actSel}${delBtn}</div>`;
  }).join("");

  wrap.querySelectorAll("select").forEach((sel)=>{
    sel.addEventListener("change", ()=>{
      const idx = Number(sel.dataset.idx);
      const kind = sel.dataset.kind;
      if(!Number.isFinite(idx)) return;
      if(kind === "char") actors[idx].charId = sel.value;
      if(kind === "action") actors[idx].actionId = sel.value;
      renderActorsOnPanels();
    });
  });
  wrap.querySelectorAll("button[data-kind='del']").forEach((btn)=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.dataset.idx);
      actors.splice(idx,1);
      renderActorList();
      renderActorsOnPanels();
    });
  });
}

function renderActorsOnPanels(){
  const grid = $("grid");
  if(!grid) return;
  const panels = [...grid.querySelectorAll(".panel")];
  panels.forEach((panelEl)=>{
    const i = Number(panelEl.dataset.panelIndex);
    const p = state.panels[i];
    // remove old chips
    panelEl.querySelectorAll(".chip").forEach(e=>e.remove());
    // background label
    const bgId = p?.backgroundId;
    const bgObj = state.backgrounds.find(b=>toId(b.id)===toId(bgId));
    const bgLabel = bgObj ? getLabel(bgObj) : "";
    // put a small bg label bar (optional)
    if(bgLabel){
      const bar = document.createElement("div");
      bar.style.position="absolute"; bar.style.left="10px"; bar.style.bottom="10px";
      bar.style.background="rgba(0,0,0,.18)"; bar.style.color="#fff";
      bar.style.padding="4px 8px"; bar.style.borderRadius="10px"; bar.style.fontSize="12px";
      bar.textContent = bgLabel;
      panelEl.appendChild(bar);
    }

    // actor chips
    const actors = p?.actors || [];
    actors.slice(0,4).forEach((a,idx)=>{
      const cObj = state.characters.find(c=>toId(c.id)===toId(a.charId));
      const actObj = state.actions.find(ac=>toId(ac.id)===toId(a.actionId));
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.style.top = `${30 + idx*70}px`;
      chip.innerHTML = `<b>${escapeHtml(getLabel(cObj)||a.charId||"")}</b><small>${escapeHtml(getLabel(actObj)||a.actionId||"")}</small>`;
      panelEl.appendChild(chip);
    });
  });
}

function setGridTemplate(layoutId){
  const layout = state.layouts.find(l=>toId(l.id)===toId(layoutId));
  const grid = $("grid");
  if(!grid) return;

  const panelCount = layoutPanelCount(layout) || 1;

  // reset css
  grid.style.gridTemplateColumns = "";
  grid.style.gridTemplateRows = "";
  grid.style.gridTemplateAreas = "";

  const css = layoutCss(layout);
  if(css){
    if(css.columns) grid.style.gridTemplateColumns = css.columns;
    if(css.rows) grid.style.gridTemplateRows = css.rows;
    if(css.areas) grid.style.gridTemplateAreas = css.areas;
  } else {
    // fallback: simple layouts by count
    if(panelCount === 1){
      grid.style.gridTemplateColumns="1fr";
      grid.style.gridTemplateRows="1fr";
    } else if(panelCount === 2){
      grid.style.gridTemplateColumns="1fr 1fr";
      grid.style.gridTemplateRows="1fr";
    } else if(panelCount === 3){
      grid.style.gridTemplateColumns="1fr 1fr 1fr";
      grid.style.gridTemplateRows="1fr";
    } else {
      grid.style.gridTemplateColumns="1fr 1fr";
      grid.style.gridTemplateRows="1fr 1fr";
    }
  }

  grid.innerHTML = "";
  for(let i=0;i<panelCount;i++){
    const p = document.createElement("div");
    p.className = "panel";
    p.dataset.panelIndex = String(i);

    if(grid.style.gridTemplateAreas){
      const areaMap=["a","b","c","d","e","f"];
      p.style.gridArea = areaMap[i] || "";
    }

    p.innerHTML = `<div class="panelBg"></div><div class="panelTag">P${i+1}</div>`;
    p.addEventListener("click", ()=>{
      state.activePanelIndex = i;
      renderPanelSelect();
      renderBackgroundSelect();
      renderStyleSelect();
      renderActorList();
      syncSidebarFromState();
      highlightActivePanel();
    });
    grid.appendChild(p);
  }

  ensurePanelCount(panelCount);
  renderPanelSelect();
  renderBackgroundSelect();
  renderStyleSelect();
  renderActorList();
  syncSidebarFromState();
  renderActorsOnPanels();
  highlightActivePanel();
}

function buildPanelPrompt(panelIndex){
  const p = state.panels[panelIndex];
  const layout = state.layouts.find(l=>toId(l.id)===toId(state.layoutId));
  const bgObj = state.backgrounds.find(b=>toId(b.id)===toId(p?.backgroundId));
  const styleObj = state.styles.find(s=>toId(s.id)===toId(p?.styleId));
  const camObj = state.cameras.find(c=>toId(c.id)===toId(state.cameraId));
  const toneObj = state.tones.find(t=>toId(t.id)===toId(state.toneId));

  const styleLine = styleObj?.desc ? `STYLE DNA (XNC): ${styleObj.desc}` : `STYLE DNA (XNC): (missing)`;
  const camLine = camObj?.desc ? `Camera: ${camObj.desc}` : (camObj?.label ? `Camera: ${camObj.label}` : "");
  const toneLine = toneObj?.desc ? `Tone: ${toneObj.desc}` : (toneObj?.label ? `Tone: ${toneObj.label}` : "");
  const moodLine = state.moodDetail ? `Mood: ${state.moodDetail}` : "";
  const durLine = state.durationSec ? `Duration: ${state.durationSec}s` : "";
  const baseLine = state.baseVideoPrompt ? `Base prompt: ${state.baseVideoPrompt}` : "";
  const globalMotion = state.globalMotion ? `Global motion: ${state.globalMotion}` : "";

  const lines = [];
  lines.push(styleLine);
  if(camLine) lines.push(camLine);
  if(toneLine) lines.push(toneLine);
  if(moodLine) lines.push(moodLine);
  if(durLine) lines.push(durLine);
  if(baseLine) lines.push(baseLine);

  lines.push(`ASPECT: ${state.aspect}`);
  lines.push(`LAYOUT: ${layout?.id || state.layoutId || ""}`);
  lines.push(`PANEL ${panelIndex+1} (P${panelIndex+1})`);

  if(bgObj) lines.push(`Background: ${bgObj.id || getLabel(bgObj)}`);
  else if(p?.backgroundId) lines.push(`Background: ${p.backgroundId}`);

  const actors = p?.actors || [];
  if(actors.length){
    lines.push("Actors:");
    for(const a of actors){
      const cObj = state.characters.find(c=>toId(c.id)===toId(a.charId));
      const actObj = state.actions.find(ac=>toId(ac.id)===toId(a.actionId));
      const cLabel = cObj ? getLabel(cObj) : a.charId;
      const actLabel = actObj ? getLabel(actObj) : a.actionId;
      lines.push(`- ${cLabel} — ${actLabel}`);
    }
  }

  if(p?.motionNote) lines.push(`Motion note: ${p.motionNote}`);
  if(globalMotion) lines.push(globalMotion);

  lines.push("Constraints: no text, no subtitles, no UI, consistent characters, comic panel framing.");
  return lines.filter(Boolean).join("\n");
}

function buildFullPrompt(){
  const layout = state.layouts.find(l=>toId(l.id)===toId(state.layoutId));
  const blocks = [];
  // header block uses panel 0 as reference for style line too, but style can be per panel; keep as "missing" globally
  const styleObj0 = state.styles.find(s=>toId(s.id)===toId(state.panels[0]?.styleId));
  const styleLine = styleObj0?.desc ? `STYLE DNA (XNC): ${styleObj0.desc}` : `STYLE DNA (XNC): (missing)`;
  blocks.push(styleLine);
  blocks.push(`ASPECT: ${state.aspect}`);
  blocks.push(`LAYOUT: ${layout?.id || state.layoutId || ""}`);
  if(state.cameraId){
    const camObj = state.cameras.find(c=>toId(c.id)===toId(state.cameraId));
    blocks.push(`Camera: ${camObj?.desc || camObj?.label || state.cameraId}`);
  }
  if(state.toneId){
    const tObj = state.tones.find(t=>toId(t.id)===toId(state.toneId));
    blocks.push(`Tone: ${tObj?.desc || tObj?.label || state.toneId}`);
  }
  if(state.moodDetail) blocks.push(`Mood: ${state.moodDetail}`);
  if(state.durationSec) blocks.push(`Duration: ${state.durationSec}s`);
  if(state.baseVideoPrompt) blocks.push(`Base prompt: ${state.baseVideoPrompt}`);
  if(state.globalMotion) blocks.push(`Global motion: ${state.globalMotion}`);
  blocks.push("Constraints: no text, no subtitles, no UI, consistent characters, comic panel framing.");
  blocks.push("");

  for(let i=0;i<state.panels.length;i++){
    blocks.push(buildPanelPrompt(i));
    blocks.push("");
  }
  return blocks.join("\n").trim();
}

function exportPromptAll(){
  $("output").textContent = buildFullPrompt();
}

function exportPromptPanel(){
  const idx = state.activePanelIndex ?? 0;
  $("output").textContent = buildPanelPrompt(idx);
}

function exportJSON(){
  const out = {
    meta: {
      aspect: state.aspect,
      layoutId: state.layoutId,
      cameraId: state.cameraId,
      toneId: state.toneId,
      moodDetail: state.moodDetail,
      durationSec: state.durationSec,
      baseVideoPrompt: state.baseVideoPrompt,
      globalMotion: state.globalMotion,
      updatedAt: new Date().toISOString(),
    },
    panels: state.panels.map((p)=>({
      backgroundId: p.backgroundId,
      styleId: p.styleId,
      motionNote: p.motionNote,
      actors: p.actors.map(a=>({ charId:a.charId, actionId:a.actionId })),
    })),
  };
  $("output").textContent = JSON.stringify(out, null, 2);
}

function copyOutput(){
  const txt = $("output")?.textContent || "";
  if(!txt) return;
  navigator.clipboard?.writeText(txt).then(()=>log("Copied output."), ()=>log("Copy failed (permission)."));
}

function downloadJSON(){
  const txt = $("output")?.textContent || "";
  const blob = new Blob([txt], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "xnc_output.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function resetAll(){
  state.layoutId = state.layouts[0]?.id || "";
  state.aspect = "9:16";
  state.cameraId = "";
  state.toneId = "";
  state.moodDetail = "";
  state.durationSec = 2;
  state.baseVideoPrompt = "";
  state.globalMotion = "";
  state.activePanelIndex = 0;
  state.panels = [];
  setGridTemplate(state.layoutId);
  $("output").textContent = "";
  log("Reset.");
}

async function init(){
  try{
    $("output").textContent = "";
    log("Loading ADN JSON...");

    const [layoutsRaw, bgsRaw, charsRaw, actsRaw, stylesRaw] = await Promise.all([
      fetchJSON(ADN_FILES.layouts),
      fetchJSON(ADN_FILES.backgrounds),
      fetchJSON(ADN_FILES.characters),
      fetchJSON(ADN_FILES.actions),
      fetchJSON(ADN_FILES.styles),
    ]);

    state.layouts = normalizeList(layoutsRaw);
    state.backgrounds = normalizeList(bgsRaw);
    state.characters = normalizeList(charsRaw);
    state.actions = normalizeList(actsRaw);
    state.styles = normalizeList(stylesRaw);

    // optional
    try { state.cameras = normalizeList(await fetchJSON(ADN_FILES.cameras)); }
    catch { state.cameras = FALLBACK_CAMERAS; }
    try { state.tones = normalizeList(await fetchJSON(ADN_FILES.tones)); }
    catch { state.tones = FALLBACK_TONES; }

    state.layoutId = state.layouts[0]?.id || "";
    renderLayoutSelect();
    renderCameraSelect();
    renderToneSelect();
    renderCharacterSelect();
    renderActionSelect();

    setGridTemplate(state.layoutId);
    log(`ADN loaded. layouts=${state.layouts.length}, backgrounds=${state.backgrounds.length}, characters=${state.characters.length}, actions=${state.actions.length}, styles=${state.styles.length}`);

    // events
    $("layoutSelect").addEventListener("change", ()=>{
      state.layoutId = $("layoutSelect").value;
      log(`Layout set: ${state.layoutId}`);
      setGridTemplate(state.layoutId);
    });

    $("panelSelect").addEventListener("change", ()=>{
      state.activePanelIndex = Number($("panelSelect").value || 0);
      renderBackgroundSelect();
      renderStyleSelect();
      renderActorList();
      syncSidebarFromState();
      highlightActivePanel();
    });

    $("backgroundSelect").addEventListener("change", ()=>{
      state.panels[state.activePanelIndex].backgroundId = $("backgroundSelect").value;
      renderActorsOnPanels();
    });

    $("styleSelect").addEventListener("change", ()=>{
      state.panels[state.activePanelIndex].styleId = $("styleSelect").value;
    });

    $("aspectSelect").addEventListener("change", ()=>{
      state.aspect = $("aspectSelect").value;
    });

    $("cameraSelect").addEventListener("change", ()=>{
      state.cameraId = $("cameraSelect").value;
    });

    $("toneSelect").addEventListener("change", ()=>{
      state.toneId = $("toneSelect").value;
    });

    $("moodDetail").addEventListener("input", ()=>{
      state.moodDetail = $("moodDetail").value || "";
    });

    $("durationSec").addEventListener("input", ()=>{
      const v = Number($("durationSec").value);
      state.durationSec = Number.isFinite(v) ? v : 2;
    });

    $("baseVideoPrompt").addEventListener("input", ()=>{
      state.baseVideoPrompt = $("baseVideoPrompt").value || "";
    });

    $("globalMotion").addEventListener("input", ()=>{
      state.globalMotion = $("globalMotion").value || "";
    });

    $("motionNote").addEventListener("input", ()=>{
      state.panels[state.activePanelIndex].motionNote = $("motionNote").value || "";
    });

    $("btnAddActor").addEventListener("click", ()=>{
      const charId = $("charSelect").value;
      const actionId = $("actionSelect").value;
      if(!charId && !actionId) return;
      const p = state.panels[state.activePanelIndex];
      p.actors.push({ charId, actionId });
      renderActorList();
      renderActorsOnPanels();
    });

    const bind = (id, fn)=>{ const el=$(id); if(el) el.addEventListener("click", fn); };
    bind("btnExportPrompt", exportPromptAll);
    bind("btnExportPrompt2", exportPromptAll);
    bind("btnExportPanelPrompt", exportPromptPanel);
    bind("btnExportPanelPrompt2", exportPromptPanel);
    bind("btnExportJSON", exportJSON);
    bind("btnExportJSON2", exportJSON);
    bind("btnCopy", copyOutput);
    bind("btnDownload", downloadJSON);
    bind("btnReset", resetAll);
    bind("btnReset2", resetAll);

  } catch(err){
    console.error(err);
    log(`ERROR: ${err.message}`);
    $("output").textContent = `Lỗi load JSON.\n${err.message}\n\nKiểm tra ADN_BASE & file paths trong xnc-engine.js.`;
  }
}

window.addEventListener("load", init);
