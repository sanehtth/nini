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
let OBJECTS = null;
let MOTIONS = null;
let FACES_FULL = null;
let HANDS = null;

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
    const base = new URL('.', window.location.href);

    // Core labels (characters, faces, actions, backgrounds...)
    const res = await fetch(new URL('./xnc-labels.json', base).toString());
    LABELS = await res.json();

    // Optional extra libraries (objects, motions, faces, hands)
    try {
      const rObj = await fetch(new URL('./XNC_objects.json', base).toString());
      if (rObj.ok) OBJECTS = await rObj.json();
    } catch (e) { console.warn("No XNC_objects.json", e); }

    try {
      const rMot = await fetch(new URL('./XNC_motions.json', base).toString());
      if (rMot.ok) MOTIONS = await rMot.json();
    } catch (e) { console.warn("No XNC_motions.json", e); }

    try {
      const rFace = await fetch(new URL('./XNC_faces.json', base).toString());
      if (rFace.ok) FACES_FULL = await rFace.json();
    } catch (e) { console.warn("No XNC_faces.json", e); }

    try {
      const rHands = await fetch(new URL('./XNC_hands.json', base).toString());
      if (rHands.ok) HANDS = await rHands.json();
    } catch (e) { console.warn("No XNC_hands.json", e); }

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

function fillSelectData(sel, arr, valueKey, labelKey, includeEmpty=true) {
  if (!sel) return;
  sel.innerHTML = "";
  if (includeEmpty) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "(none)";
    sel.appendChild(blank);
  }
  (arr || []).forEach(o=>{
    const opt = document.createElement("option");
    const v = o[valueKey];
    opt.value = v;
    opt.textContent = o[labelKey] || v;
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

  // Extra dropdowns if present
  if (OBJECTS?.objects) {
    fillSelectData($("#pObject"), OBJECTS.objects, "id", "label_vi");
  }
  if (MOTIONS?.motions) {
    fillSelectData($("#pMotion"), MOTIONS.motions, "id", "label_vi");
  }
  if (HANDS?.hands) {
    fillSelectData($("#pHand"), HANDS.hands, "id", "label_vi");
  }
  if (HANDS?.poses) {
    fillSelectData($("#pHandPose"), HANDS.poses, "id", "label_vi");
  }
  if (FACES_FULL?.faces && $("#pFaceFull")) {
    fillSelectData($("#pFaceFull"), FACES_FULL.faces, "id", "label");
  }
}

// ---------- Prompt generator ----------
function buildPromptVI() {
  const c = $("#pChar").value;
  const f = $("#pFace").value;
  const a = $("#pAction").value;
  const bg = $("#pBg").value;
  const cam = $("#pCam").value;
  const st = $("#pStyle").value;

  const objId = $("#pObject")?.value || "";
  const motId = $("#pMotion")?.value || "";
  const handId = $("#pHand")?.value || "";
  const handPoseId = $("#pHandPose")?.value || "";
  const faceFullId = $("#pFaceFull")?.value || "";
const objectCount = document.getElementById('pObjectCount').value.trim();
const camNote = document.getElementById('pCamNote').value.trim();
if (camNote) {
  prompt_vi += ` Ghi chú góc máy: ${camNote}.`;
}

   
  const parts = [
    `Nhân vật: ${c}.`,
    `Biểu cảm: ${f}.`,
    `Hành động: ${a}.`,
    `Bối cảnh: ${bg}.`,
    `Góc máy: ${cam}.`,
    `Phong cách: ${st}.`
  ];

  if (faceFullId && FACES_FULL?.faces) {
    const ff = FACES_FULL.faces.find(x=>x.id===faceFullId);
    if (ff) parts.push(`Biểu cảm chi tiết: ${ff.label_vi} (${ff.id}).`);
  }
if (object && objectCount) {
  prompt_vi += ` Số lượng: ${objectCount}.`;
  prompt_en += ` Quantity: ${objectCount}.`;
}

  if (objId && OBJECTS?.objects) {
    const obj = OBJECTS.objects.find(x=>x.id===objId);
    if (obj) parts.push(`Vật thể: ${obj.label_vi} (${obj.id}).`);
  }

  if (motId && MOTIONS?.motions) {
    const m = MOTIONS.motions.find(x=>x.id===motId);
    if (m) parts.push(`Kiểu chuyển động: ${m.label_vi} (${m.id}).`);
  }

  if (handId && HANDS?.hands) {
    const h = HANDS.hands.find(x=>x.id===handId);
    if (h) parts.push(`Bàn tay: ${h.label_vi} (${h.id}).`);
  }

  if (handPoseId && HANDS?.poses) {
    const hp = HANDS.poses.find(x=>x.id===handPoseId);
    if (hp) parts.push(`Tư thế tay: ${hp.label_vi} (${hp.id}).`);
  }

  parts.push(`Tông: hài đời thường, Việt Nam, motion comic sạch, nền rõ, nhân vật rõ, không chữ, không logo, tránh vibe Hàn/Idol.`);

  return parts.join(" ");
}

function currentPromptObj() {
  return {
    prompt_id: ($("#pId").value || "").trim(),
    name: ($("#pName").value || "").trim(),
    type: $("#pType").value,
    character: $("#pChar").value,
    face: $("#pFace").value,
    face_full: $("#pFaceFull") ? $("#pFaceFull").value : "",
    action: $("#pAction").value,
    background: $("#pBg").value,
    camera: $("#pCam").value,
    style: $("#pStyle").value,
    object_id: $("#pObject") ? $("#pObject").value : "",
    motion_id: $("#pMotion") ? $("#pMotion").value : "",
    hand_id: $("#pHand") ? $("#pHand").value : "",
    hand_pose_id: $("#pHandPose") ? $("#pHandPose").value : "",
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
  if ($("#pFaceFull")) $("#pFaceFull").value = p.face_full || "";
  $("#pAction").value = p.action || (LABELS?.actions?.[0] || "");
  $("#pBg").value = p.background || (LABELS?.backgrounds?.[0] || "");
  $("#pCam").value = p.camera || (LABELS?.cameras?.[0] || "");
  $("#pStyle").value = p.style || (LABELS?.styles?.[0] || "");
  if ($("#pObject")) $("#pObject").value = p.object_id || "";
  if ($("#pMotion")) $("#pMotion").value = p.motion_id || "";
  if ($("#pHand")) $("#pHand").value = p.hand_id || "";
  if ($("#pHandPose")) $("#pHandPose").value = p.hand_pose_id || "";
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
    const bits = [];
    if (p.character) bits.push(p.character);
    if (p.face) bits.push(p.face);
    if (p.face_full) bits.push(`face:${p.face_full}`);
    if (p.action) bits.push(p.action);
    if (p.object_id) bits.push(`obj:${p.object_id}`);
    if (p.motion_id) bits.push(`mot:${p.motion_id}`);
    if (p.hand_id) bits.push(`hand:${p.hand_id}`);
    if (p.hand_pose_id) bits.push(`pose:${p.hand_pose_id}`);
    if (p.background) bits.push(p.background);
    meta.textContent = bits.join(" · ");
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
    object_id: "",
    motion_id: "",
    hand_id: "",
    hand_pose_id: "",
    face_id: "",
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

    // Object / Motion / Hands / Face (optional per scene)
    const rObj = el("div","row");
    const o1 = el("div"); const o2 = el("div");
    const o3 = el("div"); const o4 = el("div");

    const lObj = el("label"); lObj.textContent = "Object ID";
    const sObj = el("select"); sObj.id = "";
    if (OBJECTS?.objects) fillSelectData(sObj, OBJECTS.objects, "id", "label_vi");
    sObj.value = sc.object_id || "";
    sObj.addEventListener("change", ()=>{ sc.object_id = sObj.value; saveProjectAndRefresh(project); });
    o1.appendChild(lObj); o1.appendChild(sObj);

    const lMot = el("label"); lMot.textContent = "Motion ID";
    const sMot = el("select");
    if (MOTIONS?.motions) fillSelectData(sMot, MOTIONS.motions, "id", "label_vi");
    sMot.value = sc.motion_id || "";
    sMot.addEventListener("change", ()=>{ sc.motion_id = sMot.value; saveProjectAndRefresh(project); });
    o2.appendChild(lMot); o2.appendChild(sMot);

    const lHand = el("label"); lHand.textContent = "Hand ID";
    const sHand = el("select");
    if (HANDS?.hands) fillSelectData(sHand, HANDS.hands, "id", "label_vi");
    sHand.value = sc.hand_id || "";
    sHand.addEventListener("change", ()=>{ sc.hand_id = sHand.value; saveProjectAndRefresh(project); });
    o3.appendChild(lHand); o3.appendChild(sHand);

    const lPose = el("label"); lPose.textContent = "Hand pose";
    const sPose = el("select");
    if (HANDS?.poses) fillSelectData(sPose, HANDS.poses, "id", "label_vi");
    sPose.value = sc.hand_pose_id || "";
    sPose.addEventListener("change", ()=>{ sc.hand_pose_id = sPose.value; saveProjectAndRefresh(project); });
    o4.appendChild(lPose); o4.appendChild(sPose);

    rObj.appendChild(o1); rObj.appendChild(o2);
    rObj.appendChild(o3); rObj.appendChild(o4);
    box.appendChild(rObj);

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
