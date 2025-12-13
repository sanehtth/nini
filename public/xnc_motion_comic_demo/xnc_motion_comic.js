// xnc_motion_comic.js
const ADN_PATH = "/adn/xomnganchuyen";
const FILES = {
  characters: "XNC_characters.json",
  actions: "XNC_actions.json",
  backgrounds: "XNC_backgrounds.json",
  layouts: "XNC_layouts.json",
  style: "XNC_style.json",
};
const $ = (id) => document.getElementById(id);
const logEl = $("log");
function log(msg){
  const t = new Date().toTimeString().slice(0,8);
  logEl.textContent += `[${t}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}
let ADN = null;
let state = {
  series: "xomnganchuyen",
  layoutId: null,
  panels: [],
  activePanelIndex: 0,
  styleId: null,
  aspect: "9:16",
};
async function loadADN(){
  const out = {};
  for (const [k, file] of Object.entries(FILES)){
    const url = `${ADN_PATH}/${file}`;
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error(`Không load được ${url} (${res.status})`);
    out[k] = await res.json();
  }
  return out;
}
function objEntries(o){ return o ? Object.entries(o) : []; }
function getLayouts(){ return ADN.layouts.layouts || ADN.layouts; }
function getCharacters(){ return ADN.characters.characters || ADN.characters; }
function getActions(){ return ADN.actions.actions || ADN.actions; }
function getBackgrounds(){ return ADN.backgrounds.backgrounds || ADN.backgrounds; }
function getStyles(){ return ADN.style.styles || ADN.style; }

function ensurePanelCount(count){
  const panels = [];
  for(let i=0;i<count;i++){
    const prev = state.panels[i];
    panels.push(prev || { id:`P${i+1}`, backgroundId:null, actors:[], motionNote:"" });
  }
  state.panels = panels;
  if(state.activePanelIndex >= count) state.activePanelIndex = 0;
}

function setGridTemplate(layoutId) {
  const layouts = getLayouts();
  const layout = layouts?.[layoutId] || null;

  const grid = $("grid");
  if (!grid) return;

  // ====== panelCount an toàn ======
  const panelCountRaw = layout?.panels ?? layout?.panelCount ?? layout?.count ?? 4;
  const panelCount = Math.max(1, Math.min(4, Number(panelCountRaw) || 4));

  // Lưu layout đang chọn
  state.layoutId = layoutId;
  state.panelCount = panelCount;

  // ====== reset CSS grid ======
  grid.style.gridTemplateColumns = "";
  grid.style.gridTemplateRows = "";
  grid.style.gridTemplateAreas = "";

  // ====== apply css từ layouts.json nếu có ======
  if (layout?.css) {
    const css = String(layout.css);

    const cols = /grid-template-columns\s*:\s*([^;]+)/i.exec(css);
    const rows = /grid-template-rows\s*:\s*([^;]+)/i.exec(css);
    const areas = /grid-template-areas\s*:\s*([^;]+)/i.exec(css);

    if (cols) grid.style.gridTemplateColumns = cols[1].trim();
    if (rows) grid.style.gridTemplateRows = rows[1].trim();
    if (areas) grid.style.gridTemplateAreas = areas[1].trim();
  } else {
    // ====== fallback layout basic ======
    if (panelCount === 1) {
      grid.style.gridTemplateColumns = "1fr";
      grid.style.gridTemplateRows = "1fr";
    } else if (panelCount === 2) {
      const id = String(layoutId).toLowerCase();
      if (id.includes("top") || id.includes("tb") || id.includes("tren") || id.includes("duoi")) {
        grid.style.gridTemplateColumns = "1fr";
        grid.style.gridTemplateRows = "1fr 1fr";
      } else {
        grid.style.gridTemplateColumns = "1fr 1fr";
        grid.style.gridTemplateRows = "1fr";
      }
    } else if (panelCount === 3) {
      const id = String(layoutId).toLowerCase();

      // 3 khung thẳng hàng
      if (id.includes("3row") || id.includes("ngang") || id.includes("row")) {
        grid.style.gridTemplateColumns = "1fr";
        grid.style.gridTemplateRows = "1fr 1fr 1fr";
        grid.style.gridTemplateAreas = "";
      } else {
        // các dạng 2x2 nhưng dùng areas để tạo 3 panel
        grid.style.gridTemplateColumns = "1fr 1fr";
        grid.style.gridTemplateRows = "1fr 1fr";

        if (id.includes("1top2") || id.includes("tren") || id.includes("top")) {
          grid.style.gridTemplateAreas = `"a a" "b c"`;
        } else if (id.includes("1bottom2") || id.includes("duoi") || id.includes("bottom")) {
          grid.style.gridTemplateAreas = `"b c" "a a"`;
        } else if (id.includes("1left2") || id.includes("trai") || id.includes("left")) {
          grid.style.gridTemplateAreas = `"a b" "a c"`;
        } else if (id.includes("1right2") || id.includes("phai") || id.includes("right")) {
          grid.style.gridTemplateAreas = `"b a" "c a"`;
        } else {
          grid.style.gridTemplateAreas = `"a a" "b c"`;
        }
      }
    } else {
      // 4 khung mặc định 2x2
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gridTemplateRows = "1fr 1fr";
      grid.style.gridTemplateAreas = "";
    }
  }

  // ====== đảm bảo state.panels đủ panel và có schema ======
  if (!Array.isArray(state.panels)) state.panels = [];

  const makeDefaultPanel = () => ({
    backgroundId: "",
    styleId: "",        // nếu bạn có style riêng từng panel
    actors: [],         // [{ characterId, actionId }]
    motionNote: "",     // ghi chú motion
    notes: ""           // ghi chú khác (optional)
  });

  while (state.panels.length < panelCount) state.panels.push(makeDefaultPanel());
  if (state.panels.length > panelCount) state.panels.length = panelCount;

  // ====== đảm bảo activePanelIndex hợp lệ ======
  if (typeof state.activePanelIndex !== "number") state.activePanelIndex = 0;
  if (state.activePanelIndex < 0 || state.activePanelIndex >= panelCount) {
    state.activePanelIndex = 0;
  }

  // ====== render DOM panels ======
  grid.innerHTML = "";

  const hasAreas = !!grid.style.gridTemplateAreas;
  const areaMap = ["a", "b", "c", "d"];

  for (let i = 0; i < panelCount; i++) {
    const p = document.createElement("div");
    p.className = "panel";
    p.dataset.panelIndex = String(i);

    if (hasAreas && areaMap[i]) {
      p.style.gridArea = areaMap[i];
    }

    p.innerHTML = `
      <div class="panelBg"></div>
      <div class="panelTag">P${i + 1}</div>
    `;

    p.addEventListener("click", () => {
      state.activePanelIndex = i;
      renderPanelSelect();
      highlightActivePanel();

      // chỉ sync khi panel tồn tại
      if (state.panels?.[state.activePanelIndex]) {
        syncSidebarFromState();
      }
    });

    grid.appendChild(p);
  }

  // ====== các render khác ======
  // renderActorsOnPanels nên đọc state.panels[i].actors (đã đảm bảo tồn tại)
  renderActorsOnPanels?.();
  highlightActivePanel?.();
  renderPanelSelect?.();

  // Quan trọng: gọi sync sau khi state.panels đã có đủ schema
  if (state.panels?.[state.activePanelIndex]) {
    syncSidebarFromState?.();
  }
}
//======================

function highlightActivePanel(){
  document.querySelectorAll(".panel").forEach(el=>{
    const i=Number(el.dataset.panelIndex);
    el.style.outline = (i===state.activePanelIndex) ? "3px solid rgba(99,179,109,.55)" : "none";
  });
}

function renderActor(charId){
  const chars = getCharacters();
  const c = chars[charId] || {name:charId||"Actor"};
  const el = document.createElement("div");
  el.className="actor";
  el.innerHTML = `<div class="face">${(c.name||"").slice(0,1).toUpperCase()}</div><div class="badge">${c.name||charId}</div>`;
  return el;
}

function renderActorsOnPanels(){
  const panels = document.querySelectorAll(".panel");
  panels.forEach(panelEl=>{
    const i=Number(panelEl.dataset.panelIndex);
    const pdata = state.panels[i];
    panelEl.querySelectorAll(".actor").forEach(a=>a.remove());
    const bg = pdata.backgroundId ? getBackgrounds()[pdata.backgroundId] : null;
    const bgEl = panelEl.querySelector(".panelBg");
    if(bg && bg.tint){ bgEl.style.background = bg.tint; } else { bgEl.style.background = ""; }
    const pos=[{left:"18%",top:"18%"},{left:"60%",top:"18%"},{left:"18%",top:"55%"},{left:"60%",top:"55%"}];
    (pdata.actors||[]).slice(0,4).forEach((a,idx)=>{
      const el = renderActor(a.charId);
      el.style.left=pos[idx].left; el.style.top=pos[idx].top;
      panelEl.appendChild(el);
    });
  });
}

function renderLayoutSelect(){
  const select = $("layoutSelect");
  select.innerHTML="";
  const layouts = getLayouts();
  for(const [id,l] of objEntries(layouts)){
    const opt = document.createElement("option");
    opt.value=id;
    opt.textContent=l.label||l.name||id;
    select.appendChild(opt);
  }
  if(!state.layoutId) state.layoutId = select.options[0]?.value || null;
  if(state.layoutId) select.value = state.layoutId;
  select.onchange = ()=>{
    state.layoutId = select.value;
    log(`Layout set: ${state.layoutId}`);
    setGridTemplate(state.layoutId);
  };
}

function renderPanelSelect(){
  const select = $("panelSelect");
  select.innerHTML="";
  state.panels.forEach((p,idx)=> select.add(new Option(p.id,String(idx))));
  select.value=String(state.activePanelIndex);
  select.onchange=()=>{
    state.activePanelIndex=Number(select.value);
    syncSidebarFromState();
    highlightActivePanel();
  };
}

function renderBackgroundSelect(){
  const select = $("bgSelect");
  select.innerHTML="";
  select.add(new Option("— Chọn bối cảnh —",""));
  for(const [id,b] of objEntries(getBackgrounds())){
    select.add(new Option(b.label||b.name||id,id));
  }
  select.onchange=()=>{
    state.panels[state.activePanelIndex].backgroundId = select.value || null;
    renderActorsOnPanels();
  };
}

function renderStyleSelect(){
  const select = $("styleSelect");
  select.innerHTML="";
  for(const [id,s] of objEntries(getStyles())){
    select.add(new Option(s.label||s.name||id,id));
  }
  if(!state.styleId) state.styleId = select.options[0]?.value || null;
  if(state.styleId) select.value = state.styleId;
  select.onchange=()=> state.styleId = select.value;
}

function renderActorsList(){
  const wrap = $("actorsList");
  wrap.innerHTML="";
  const pdata = state.panels[state.activePanelIndex];
  const actors = pdata.actors || [];
  actors.forEach((a,idx)=>{
    const row = document.createElement("div");
    row.className="actorRow";
    row.innerHTML = `<select class="charSel"></select><select class="actSel"></select><button class="iconBtn" title="Xóa">✕</button>`;
    const charSel=row.querySelector(".charSel");
    const actSel=row.querySelector(".actSel");
    const del=row.querySelector(".iconBtn");

    for(const [id,c] of objEntries(getCharacters())) charSel.add(new Option(c.name||id,id));
    charSel.value = a.charId || charSel.options[0]?.value || "";

    actSel.add(new Option("— Action —",""));
    for(const [id,ac] of objEntries(getActions())) actSel.add(new Option(ac.label||ac.name||id,id));
    actSel.value = a.actionId || "";

    charSel.onchange=()=>{ a.charId = charSel.value; renderActorsOnPanels(); };
    actSel.onchange=()=>{ a.actionId = actSel.value || null; };
    del.onclick=()=>{ actors.splice(idx,1); renderActorsList(); renderActorsOnPanels(); };

    wrap.appendChild(row);
  });
}

function syncSidebarFromState(){
  // Nếu chưa có panels thì thôi, đừng crash
  if (!state.panels || !state.panels.length) return;

  // Nếu activePanelId chưa set hoặc không còn tồn tại -> set về panel đầu
  let panel = state.panels.find(p => p.id === state.activePanelId);
  if (!panel) {
    state.activePanelId = state.panels[0].id;
    panel = state.panels[0];
  }
  const pdata = state.panels[state.activePanelIndex];
  $("bgSelect").value = pdata.backgroundId || "";
  $("motionNote").value = pdata.motionNote || "";
  renderActorsList();
}

function addActor(){
  const pdata = state.panels[state.activePanelIndex];
  pdata.actors = pdata.actors || [];
  const firstChar = Object.keys(getCharacters())[0] || null;
  pdata.actors.push({charId:firstChar, actionId:null});
  renderActorsList();
  renderActorsOnPanels();
}

function buildSceneJSON(){
  return {
    meta:{
      series: state.series,
      layout: state.layoutId,
      aspect: state.aspect,
      style: state.styleId,
      createdAt: new Date().toISOString(),
      version: "xnc_motion_comic_v1"
    },
    panels: state.panels.map(p=>({
      id: p.id,
      background: p.backgroundId,
      motionNote: p.motionNote || "",
      actors: (p.actors||[]).map(a=>({char:a.charId, action:a.actionId}))
    }))
  };
}

function buildPrompt(){
  const style = getStyles()[state.styleId] || {};
  const styleDesc = style.desc || style.description || style.prompt || style.text || "pastel chibi 2D, green-brown Vietnamese vibe, clean illustration, soft lighting";
  const bgs = getBackgrounds();
  const chars = getCharacters();
  const actions = getActions();
  const lines=[];
  lines.push(`STYLE DNA (XNC): ${styleDesc}`);
  lines.push(`ASPECT: ${state.aspect}`);
  lines.push("");
  state.panels.forEach((p,idx)=>{
    const bg = p.backgroundId ? bgs[p.backgroundId] : null;
    const bgDesc = bg ? (bg.desc||bg.description||bg.prompt||bg.label||"") : "Vietnamese rural neighborhood, pastel green-brown tones";
    lines.push(`PANEL ${idx+1} (${p.id})`);
    lines.push(`Background: ${bgDesc}`);
    const actorLines = (p.actors||[]).map(a=>{
      const c = chars[a.charId] || {name:a.charId};
      const ac = a.actionId ? (actions[a.actionId]||{}) : {};
      const actDesc = ac.desc || ac.description || ac.prompt || (a.actionId||"neutral pose");
      return `- ${c.name||a.charId}: ${actDesc}`;
    });
    lines.push(`Actors:\n${actorLines.length?actorLines.join("\n"):"- (none)"}`);
    if(p.motionNote) lines.push(`Motion note: ${p.motionNote}`);
    lines.push("Constraints: no text, no subtitles, no UI, consistent characters, comic panel framing.");
    lines.push("");
  });
  lines.push("MOTION COMIC NOTE: Panel borders act as masks; use overlay layer for out-of-frame actions (throw/punch/pull) across panels.");
  return lines.join("\n");
}

function setOutput(text){ $("output").textContent = text; }
function downloadJson(obj){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download = `xnc_scene_${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// overlay demo
let overlayEl=null;
function ensureOverlay(){
  if(overlayEl) return overlayEl;
  overlayEl=document.createElement("div");
  overlayEl.className="overlay";
  document.body.appendChild(overlayEl);
  return overlayEl;
}
function getPanelRect(index){
  const panel=document.querySelector(`.panel[data-panel-index="${index}"]`);
  return panel.getBoundingClientRect();
}
function flyProp(fromIdx,toIdx,kind="throw"){
  const ov=ensureOverlay(); ov.innerHTML="";
  const prop=document.createElement("div"); prop.className="prop"; ov.appendChild(prop);
  const a=getPanelRect(fromIdx), b=getPanelRect(toIdx);
  const start={x:a.left+a.width*0.70,y:a.top+a.height*0.55};
  const end={x:b.left+b.width*0.35,y:b.top+b.height*0.45};
  prop.style.left=`${start.x}px`; prop.style.top=`${start.y}px`;
  const dx=end.x-start.x, dy=end.y-start.y;
  const kf=[
    {transform:"translate(0px,0px) rotate(0deg) scale(1)"},
    {transform:`translate(${dx*0.55}px, ${dy*0.35-80}px) rotate(${kind==="punch"?80:120}deg) scale(1.05)`},
    {transform:`translate(${dx}px, ${dy}px) rotate(${kind==="punch"?140:220}deg) scale(1)`},
  ];
  prop.animate(kf,{duration:650,easing:"cubic-bezier(.2,.8,.2,1)"});
  setTimeout(()=>{ov.innerHTML="";},760);
}

async function init(){
  log("Loading ADN JSON...");
  ADN = await loadADN();
  log("ADN loaded.");
  renderLayoutSelect();
  renderBackgroundSelect();
  renderStyleSelect();

  $("aspectSelect").onchange=()=> state.aspect = $("aspectSelect").value;
  $("btnAddActor").onclick=()=>{ addActor(); log("Actor added."); };
  $("motionNote").addEventListener("input", ()=>{ state.panels[state.activePanelIndex].motionNote = $("motionNote").value; });

  if(state.layoutId) setGridTemplate(state.layoutId);

  $("btnExportJson").onclick=()=>{ const obj=buildSceneJSON(); setOutput(JSON.stringify(obj,null,2)); window.__lastExport={type:"json",payload:obj}; log("Export JSON."); };
  $("btnExportPrompt").onclick=()=>{ const text=buildPrompt(); setOutput(text); window.__lastExport={type:"prompt",payload:text}; log("Export Prompt."); };

  $("btnCopy").onclick=async()=>{ await navigator.clipboard.writeText($("output").textContent||""); log("Copied output."); };
  $("btnDownload").onclick=()=>{ const last=window.__lastExport; if(!last||last.type!=="json"){ alert("Chưa có JSON. Bấm “Xuất JSON” trước."); return;} downloadJson(last.payload); log("Downloaded JSON."); };

  $("btnThrow").onclick=()=>{ const from=state.activePanelIndex; const to=(from+1)%state.panels.length; flyProp(from,to,"throw"); log(`Action: THROW_PROP ${state.panels[from].id} -> ${state.panels[to].id}`); };
  $("btnPunch").onclick=()=>{ const from=state.activePanelIndex; const to=(from+1)%state.panels.length; flyProp(from,to,"punch"); log(`Action: PUNCH ${state.panels[from].id} -> ${state.panels[to].id}`); };
  $("btnPull").onclick=()=>{ const from=state.activePanelIndex; const to=(from+1)%state.panels.length; flyProp(from,to,"throw"); log(`Action: PULL (placeholder) ${state.panels[from].id} -> ${state.panels[to].id}`); };
  $("btnReset").onclick=()=>{ state.panels.forEach(p=>{p.actors=[];p.backgroundId=null;p.motionNote="";}); renderActorsOnPanels(); syncSidebarFromState(); setOutput("Đã reset cảnh."); log("Scene reset."); };

}
init().catch(err=>{
  console.error(err);
  alert("Lỗi load ADN: "+err.message+"\nKiểm tra đường dẫn JSON trong /public/adn/xomnganchuyen/");
});
