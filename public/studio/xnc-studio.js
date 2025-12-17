/* XNC Studio - Minimal local app
   - Tab 1: prompt generator + local prompt registry (LocalStorage)
   - Tab 2: scene composer for motion comic layouts + export project.json
   No server required. No MP4 rendering in-browser in this minimal version.
*/
const LS_PROMPTS = "xnc_prompts_registry_v1";
const LS_PROJECT = "xnc_project_v1";

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls) => { const n=document.createElement(tag); if(cls) n.className=cls; return n; };

function nowStamp() {
  const d = new Date();
  const pad = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function autoPromptId(name) {
  const safe = (name || "PROMPT").trim().toUpperCase()
    .replace(/[\u0000-\u001f\u007f]+/g,"")
    .replace(/[^\p{L}\p{N}]+/gu,"_")
    .replace(/^_+|_+$/g,"")
    .slice(0,32);
  return `P_${safe}_${nowStamp()}`;
}
function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
  catch { return fallback; }
}
function writeLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

let LABELS = null;

// ---------- Tabs ----------
document.querySelectorAll(".tabbtn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tabbtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    $("#tab-prompt").classList.toggle("hidden", tab !== "prompt");
    $("#tab-compose").classList.toggle("hidden", tab !== "compose");
    if(tab==="compose") refreshProjectPreview();
  });
});

// ---------- Load labels ----------
async function loadLabels() {
  try {
    const res = await fetch("xnc-labels.json");
    LABELS = await res.json();
    $("#labelsStatus").textContent = "Labels: OK";
    bindLabelOptions();
    refreshPromptList();
    loadProject();
  } catch (e) {
    $("#labelsStatus").textContent = "Labels: FAIL";
    console.error(e);
  }
}
function fillSelect(sel, items) {
  sel.innerHTML = "";
  (items||[]).forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
}
function bindLabelOptions() {
  fillSelect($("#pChar"), LABELS.characters);
  fillSelect($("#pFace"), LABELS.faces);
  fillSelect($("#pAction"), LABELS.actions);
  fillSelect($("#pBg"), LABELS.backgrounds);
  fillSelect($("#pCam"), LABELS.cameras);
  fillSelect($("#pStyle"), LABELS.styles);
}

// ---------- Prompt generator ----------
function buildPromptVI() {
  const c = $("#pChar").value;
  const f = $("#pFace").value;
  const a = $("#pAction").value;
  const bg = $("#pBg").value;
  const cam = $("#pCam").value;
  const st = $("#pStyle").value;

  return [
    `Nhân vật: ${c}.`,
    `Biểu cảm: ${f}.`,
    `Hành động: ${a}.`,
    `Bối cảnh: ${bg}.`,
    `Góc máy: ${cam}.`,
    `Phong cách: ${st}.`,
    `Tông: hài đời thường, Việt Nam, motion comic sạch, nền rõ, nhân vật rõ, không chữ, không logo, tránh vibe Hàn/Idol.`
  ].join(" ");
}

function currentPromptObj() {
  return {
    prompt_id: ($("#pId").value || "").trim(),
    name: ($("#pName").value || "").trim(),
    type: $("#pType").value,
    character: $("#pChar").value,
    face: $("#pFace").value,
    action: $("#pAction").value,
    background: $("#pBg").value,
    camera: $("#pCam").value,
    style: $("#pStyle").value,
    prompt_vi: $("#pOut").value.trim(),
    note: ($("#pNote").value || "").trim(),
    updated_at: new Date().toISOString()
  };
}

function setPromptObj(p) {
  $("#pName").value = p.name || "";
  $("#pId").value = p.prompt_id || "";
  $("#pType").value = p.type || "image_to_video";
  $("#pChar").value = p.character || (LABELS?.characters?.[0] || "");
  $("#pFace").value = p.face || (LABELS?.faces?.[0] || "");
  $("#pAction").value = p.action || (LABELS?.actions?.[0] || "");
  $("#pBg").value = p.background || (LABELS?.backgrounds?.[0] || "");
  $("#pCam").value = p.camera || (LABELS?.cameras?.[0] || "");
  $("#pStyle").value = p.style || (LABELS?.styles?.[0] || "");
  $("#pNote").value = p.note || "";
  $("#pOut").value = p.prompt_vi || "";
  $("#pJson").value = JSON.stringify(p, null, 2);
}

$("#btnGen").addEventListener("click", ()=>{
  if(!$("#pId").value.trim()) $("#pId").value = autoPromptId($("#pName").value);
  $("#pOut").value = buildPromptVI();
  $("#pJson").value = JSON.stringify(currentPromptObj(), null, 2);
});

$("#btnCopy").addEventListener("click", async ()=>{
  const txt = $("#pOut").value || "";
  await navigator.clipboard.writeText(txt);
  $("#btnCopy").textContent = "Copied!";
  setTimeout(()=>$("#btnCopy").textContent="Copy Prompt", 700);
});

$("#btnNew").addEventListener("click", ()=>{
  $("#pName").value = "";
  $("#pId").value = "";
  $("#pNote").value = "";
  $("#pOut").value = "";
  $("#pJson").value = "";
});

$("#btnSave").addEventListener("click", ()=>{
  const p = currentPromptObj();
  if(!p.prompt_id) {
    p.prompt_id = autoPromptId(p.name);
    $("#pId").value = p.prompt_id;
  }
  if(!p.prompt_vi) p.prompt_vi = buildPromptVI();
  const store = readLocal(LS_PROMPTS, {meta:{version:"1.0"}, prompts:[]});
  const idx = store.prompts.findIndex(x=>x.prompt_id===p.prompt_id);
  if(idx>=0) store.prompts[idx]=p; else store.prompts.unshift(p);
  writeLocal(LS_PROMPTS, store);
  $("#pJson").value = JSON.stringify(p, null, 2);
  refreshPromptList();
});

$("#btnExportPrompts").addEventListener("click", ()=>{
  const store = readLocal(LS_PROMPTS, {meta:{version:"1.0"}, prompts:[]});
  downloadJson(`prompts_${nowStamp()}.json`, store);
});

function refreshPromptList() {
  const wrap = $("#promptList");
  wrap.innerHTML = "";
  const store = readLocal(LS_PROMPTS, {meta:{version:"1.0"}, prompts:[]});
  store.prompts.slice(0,30).forEach(p=>{
    const item = el("div","scene");
    const head = el("div","scene-head");
    const left = el("div");
    const title = el("strong");
    title.textContent = p.name || p.prompt_id;
    const sub = el("div","small mono");
    sub.textContent = p.prompt_id;
    left.appendChild(title); left.appendChild(sub);

    const act = el("div","scene-actions");
    const btnUse = el("button","mini primary"); btnUse.textContent="Load";
    btnUse.addEventListener("click", ()=> setPromptObj(p));
    const btnDel = el("button","mini"); btnDel.textContent="Del";
    btnDel.addEventListener("click", ()=>{
      const s = readLocal(LS_PROMPTS, {meta:{version:"1.0"}, prompts:[]});
      s.prompts = s.prompts.filter(x=>x.prompt_id!==p.prompt_id);
      writeLocal(LS_PROMPTS, s);
      refreshPromptList();
    });
    act.appendChild(btnUse); act.appendChild(btnDel);

    head.appendChild(left); head.appendChild(act);
    item.appendChild(head);

    const meta = el("div","small");
    meta.textContent = `${p.character || ""} · ${p.face || ""} · ${p.action || ""} · ${p.background || ""}`;
    item.appendChild(meta);

    wrap.appendChild(item);
  });
}

// ---------- Composer (Scenes) ----------
function getProject() {
  return readLocal(LS_PROJECT, {
    meta: {aspect:"9:16", fps:30, max_scene_sec:5, title:""},
    scenes: []
  });
}
function setProject(p) { writeLocal(LS_PROJECT, p); }

function defaultScene(n) {
  const maxSec = Number($("#projMaxSec")?.value || 5);
  const pad = (x)=>String(x).padStart(2,"0");
  return {
    scene_auto_id: `AUTO_${pad(n)}_${nowStamp()}`,
    name: `S${pad(n)}`,
    duration_sec: maxSec,
    layout: {type:"single_full"},
    prompt_ref: "",
    clip: {src:"", trim_in:0, trim_out:maxSec, fit:"cover", pan:{x:0,y:0,scale:1}},
    sfx: [],
    text: [],
    notes: ""
  };
}

function renderScenes() {
  const list = $("#sceneList");
  list.innerHTML = "";
  const project = getProject();

  project.scenes.forEach((sc, idx)=>{
    const box = el("div","scene");
    const head = el("div","scene-head");

    const left = el("div");
    const title = el("strong");
    title.textContent = sc.name || `Scene ${idx+1}`;
    const sub = el("div","small mono");
    sub.textContent = sc.scene_auto_id;
    left.appendChild(title); left.appendChild(sub);

    const acts = el("div","scene-actions");
    const up = el("button","mini"); up.textContent="↑";
    const dn = el("button","mini"); dn.textContent="↓";
    const del = el("button","mini"); del.textContent="Del";
    up.addEventListener("click", ()=> moveScene(idx, -1));
    dn.addEventListener("click", ()=> moveScene(idx, +1));
    del.addEventListener("click", ()=> removeScene(idx));
    acts.appendChild(up); acts.appendChild(dn); acts.appendChild(del);

    head.appendChild(left); head.appendChild(acts);
    box.appendChild(head);

    const r1 = el("div","row");
    const c1 = el("div");
    const c2 = el("div");

    const lab1 = el("label"); lab1.textContent="Duration (s)";
    const inpDur = el("input"); inpDur.type="number"; inpDur.min="1"; inpDur.max="20"; inpDur.value=sc.duration_sec;
    inpDur.addEventListener("change", ()=>{
      sc.duration_sec = Number(inpDur.value||5);
      sc.clip.trim_out = Math.min(sc.clip.trim_out, sc.duration_sec);
      saveProjectAndRefresh(project);
    });
    c1.appendChild(lab1); c1.appendChild(inpDur);

    const lab2 = el("label"); lab2.textContent="Layout";
    const selLay = el("select");
    ["single_full","top_bottom","three_panel"].forEach(v=>{
      const o=document.createElement("option"); o.value=v; o.textContent=v;
      selLay.appendChild(o);
    });
    selLay.value = sc.layout?.type || "single_full";
    selLay.addEventListener("change", ()=>{
      sc.layout = {type: selLay.value};
      saveProjectAndRefresh(project);
    });
    c2.appendChild(lab2); c2.appendChild(selLay);

    r1.appendChild(c1); r1.appendChild(c2);
    box.appendChild(r1);

    const r2 = el("div","row");
    const d1 = el("div"); const d2 = el("div");

    const lfit = el("label"); lfit.textContent="Fit";
    const sfit = el("select");
    ["cover","contain"].forEach(v=>{
      const o=document.createElement("option"); o.value=v; o.textContent=v; sfit.appendChild(o);
    });
    sfit.value = sc.clip.fit || "cover";
    sfit.addEventListener("change", ()=>{ sc.clip.fit = sfit.value; saveProjectAndRefresh(project); });
    d1.appendChild(lfit); d1.appendChild(sfit);

    const lref = el("label"); lref.textContent="Prompt ref (optional)";
    const iref = el("input"); iref.value = sc.prompt_ref || "";
    iref.placeholder = "VD: P_T11_APPLE_HOOK";
    iref.addEventListener("change", ()=>{ sc.prompt_ref = iref.value.trim(); saveProjectAndRefresh(project); });
    d2.appendChild(lref); d2.appendChild(iref);

    r2.appendChild(d1); r2.appendChild(d2);
    box.appendChild(r2);

    const lnote = el("label"); lnote.textContent="Notes";
    const inote = el("input"); inote.value = sc.notes || "";
    inote.placeholder = "VD: thêm SFX XOẢNG ở 2.1s";
    inote.addEventListener("change", ()=>{ sc.notes = inote.value; saveProjectAndRefresh(project); });
    box.appendChild(lnote); box.appendChild(inote);

    const drop = el("div","drop");
    drop.textContent = sc.clip.src ? `Clip: ${sc.clip.src}` : "Thả clip MP4 vào đây (hoặc bấm để chọn)";
    drop.tabIndex = 0;

    const fileInput = el("input");
    fileInput.type="file"; fileInput.accept="video/*"; fileInput.className="hidden";

    drop.addEventListener("click", ()=> fileInput.click());
    fileInput.addEventListener("change", (ev)=>{
      const f = ev.target.files?.[0];
      if(f) attachClip(sc, f);
    });

    ["dragenter","dragover"].forEach(evt=> drop.addEventListener(evt, (e)=>{
      e.preventDefault(); e.stopPropagation();
      drop.classList.add("drag");
    }));
    ["dragleave","drop"].forEach(evt=> drop.addEventListener(evt, (e)=>{
      e.preventDefault(); e.stopPropagation();
      drop.classList.remove("drag");
    }));
    drop.addEventListener("drop", (e)=>{
      const f = e.dataTransfer.files?.[0];
      if(f) attachClip(sc, f);
    });

    box.appendChild(drop);
    box.appendChild(fileInput);

    if(sc._objectUrl) {
      const prev = el("div","preview");
      const v = document.createElement("video");
      v.src = sc._objectUrl;
      v.controls = true;
      v.playsInline = true;
      prev.appendChild(v);
      box.appendChild(prev);
    }

    list.appendChild(box);
  });

  refreshProjectPreview(true);
}

function attachClip(scene, file) {
  if(scene._objectUrl) URL.revokeObjectURL(scene._objectUrl);
  scene._objectUrl = URL.createObjectURL(file);
  scene.clip.src = file.name;
  const maxSec = Number($("#projMaxSec")?.value || 5);
  scene.duration_sec = scene.duration_sec || maxSec;
  scene.clip.trim_in = 0;
  scene.clip.trim_out = Math.min(scene.duration_sec, maxSec);
  saveProjectAndRefresh(getProject());
}

function saveProjectAndRefresh(project) {
  const clean = {
    meta: project.meta,
    scenes: project.scenes.map(sc=>{
      const { _objectUrl, ...rest } = sc;
      return rest;
    })
  };
  setProject(clean);
  // Reload and re-render (object URLs are not persisted by design in minimal version)
  loadProject();
}

function moveScene(idx, delta) {
  const p = getProject();
  const j = idx + delta;
  if(j<0 || j>=p.scenes.length) return;
  const tmp = p.scenes[idx];
  p.scenes[idx] = p.scenes[j];
  p.scenes[j] = tmp;
  setProject(p);
  loadProject();
}
function removeScene(idx) {
  const p = getProject();
  p.scenes.splice(idx,1);
  setProject(p);
  loadProject();
}

$("#btnAddScene").addEventListener("click", ()=>{
  const p = getProject();
  p.scenes.push(defaultScene(p.scenes.length+1));
  setProject(p);
  loadProject();
});

$("#btnSaveProject").addEventListener("click", ()=> refreshProjectPreview(true));

$("#btnClearProject").addEventListener("click", ()=>{
  setProject({meta:{aspect:"9:16", fps:30, max_scene_sec:5, title:""}, scenes:[]});
  loadProject();
});

$("#btnExportProject").addEventListener("click", ()=>{
  const p = getProject();
  downloadJson(`project_${nowStamp()}.json`, p);
});

$("#btnImportProject").addEventListener("click", ()=> $("#fileImportProject").click());

$("#fileImportProject").addEventListener("change", async (ev)=>{
  const f = ev.target.files?.[0];
  if(!f) return;
  const txt = await f.text();
  const obj = JSON.parse(txt);
  setProject(obj);
  loadProject();
});

function loadProject() {
  const p = getProject();
  $("#projAspect").value = p.meta.aspect || "9:16";
  $("#projFps").value = p.meta.fps || 30;
  $("#projMaxSec").value = p.meta.max_scene_sec || 5;
  $("#projTitle").value = p.meta.title || "";
  renderScenes();
}

["projAspect","projFps","projMaxSec","projTitle"].forEach(id=>{
  $("#"+id).addEventListener("change", ()=>{
    const p = getProject();
    p.meta.aspect = $("#projAspect").value;
    p.meta.fps = Number($("#projFps").value||30);
    p.meta.max_scene_sec = Number($("#projMaxSec").value||5);
    p.meta.title = $("#projTitle").value || "";
    setProject(p);
    refreshProjectPreview(true);
  });
});

function refreshProjectPreview(forceSave=false) {
  const p = getProject();
  p.meta.aspect = $("#projAspect").value;
  p.meta.fps = Number($("#projFps").value||30);
  p.meta.max_scene_sec = Number($("#projMaxSec").value||5);
  p.meta.title = $("#projTitle").value || "";
  if(forceSave) setProject(p);
  $("#projJson").value = JSON.stringify(p, null, 2);
}

// Init
loadLabels();
