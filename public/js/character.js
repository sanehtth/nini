function byId(id){return document.getElementById(id);} 
function toast(msg){console.log(msg); alert(msg);} 

// character.js

// Mảng lưu tất cả nhân vật trong session
let characters = [];

// Helper: tạo ID nếu user bỏ trống
function makeAutoId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `char_${y}${m}${d}_${h}${mi}${s}`;
}

// Chuẩn hoá tên để đưa vào file path
function makeSafeName(rawName) {
  if (!rawName) return "noname";
  // Bỏ dấu tiếng Việt + ký tự lạ
  let s = rawName
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")   // mọi thứ không phải a-z0-9 -> _
    .replace(/^_+|_+$/g, "");      // bỏ _ ở đầu/cuối
  return s || "noname";
}

// Gộp các field thành prompt chuẩn
function buildCharacterPrompt() {
  const id = (document.getElementById("charId").value || "").trim();
  const name = (document.getElementById("charName").value || "").trim();
  const summary = (document.getElementById("charSummary").value || "").trim();
  const ageRole = (document.getElementById("charAgeRole").value || "").trim();
  const appearance = (document.getElementById("charAppearance").value || "").trim();
  const outfit = (document.getElementById("charOutfit").value || "").trim();
  const tools = (document.getElementById("charTools").value || "").trim();
  const colorPalette = (document.getElementById("charPalette").value || "").trim();
  const artStyle = (document.getElementById("charArtStyle").value || "").trim();

  const imgInput = document.getElementById("charImagePath");
  let imagePath = (imgInput?.value || "").trim();

  const finalId = id || makeAutoId();

  // Nếu chưa nhập path hình thì tự generate
  if (!imagePath) {
    const safeName = makeSafeName(name);
    imagePath = `public/assets/character/${finalId}_${safeName}.webp`;
    if (imgInput) imgInput.value = imagePath; // fill lại vào ô cho user thấy
  }

  // Phần đầu: tên + tuổi / role
  let headerLine = "";
  if (name && ageRole) {
    headerLine = `${name}, ${ageRole}`;
  } else if (ageRole) {
    headerLine = ageRole;
  } else if (name) {
    headerLine = name;
  }

  const promptLines = [];

  if (headerLine) {
    promptLines.push(headerLine);
  }

  if (summary) {
    promptLines.push(summary);
  }

  // Phần mô tả layout sheet
  promptLines.push(
    "Full anime character sheet: front, left, right, back, hair details, clothing and tool breakdown."
  );

  if (appearance) {
    promptLines.push("\nAPPEARANCE:");
    promptLines.push(appearance);
  }

  if (outfit) {
    promptLines.push("\nOUTFIT (Ancient Steampunk Fantasy):");
    promptLines.push(outfit);
  }

  if (tools) {
    promptLines.push("\nTOOLS:");
    promptLines.push(tools);
  }

  if (colorPalette) {
    promptLines.push("\nCOLOR PALETTE:");
    promptLines.push(colorPalette);
  }

  if (artStyle) {
    promptLines.push("\nSTYLE:");
    promptLines.push(artStyle);
  }

  // (tuỳ chọn) thêm info file minh hoạ vào cuối prompt
  if (imagePath) {
    promptLines.push("\nILLUSTRATION FILE PATH:");
    promptLines.push(imagePath);
  }

  const finalPrompt = promptLines.join("\n");

  const promptBox = document.getElementById("charPromptFinal");
  if (promptBox) promptBox.value = finalPrompt;

  // Trả thêm object để dùng khi add JSON
  return {
    id: finalId,
    name,
    summary,
    ageRole,
    appearance,
    outfit,
    tools,
    colorPalette,
    artStyle,
    imagePath,
    prompt: finalPrompt,
  };
}

// Thêm nhân vật hiện tại vào mảng JSON
function addCurrentCharacterToJson() {
  const obj = buildCharacterPrompt(); // build lại để chắc chắn luôn sync
  characters.push(obj);
  renderCharactersJson();
}

// In mảng characters ra textarea JSON
function renderCharactersJson() {
  const output = document.getElementById("charJsonOutput");
  if (output) {
    output.value = JSON.stringify(characters, null, 2);
  }
}

// Copy prompt
function copyPromptToClipboard() {
  const promptBox = document.getElementById("charPromptFinal");
  if (!promptBox) return;
  promptBox.select();
  document.execCommand("copy");
}

// Download characters.json
function downloadCharactersJson() {
  if (!characters.length) {
    alert("Chưa có nhân vật nào trong JSON.");
    return;
  }
  const blob = new Blob([JSON.stringify(characters, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "characters.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Clear danh sách JSON
function clearCharactersJson() {
  if (!confirm("Xoá toàn bộ danh sách nhân vật trong JSON?")) return;
  characters = [];
  renderCharactersJson();
}

// Gắn event sau khi DOM ready
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("buildPromptBtn")
    ?.addEventListener("click", buildCharacterPrompt);

  document
    .getElementById("addToJsonBtn")
    ?.addEventListener("click", addCurrentCharacterToJson);

  document
    .getElementById("copyPromptBtn")
    ?.addEventListener("click", copyPromptToClipboard);

  document
    .getElementById("downloadJsonBtn")
    ?.addEventListener("click", downloadCharactersJson);

  document
    .getElementById("clearJsonBtn")
    ?.addEventListener("click", clearCharactersJson);

  // Render mảng rỗng ban đầu
  renderCharactersJson();
});


// ===== ADN / character.json helpers =====
let adnCharactersCache = null;

function safeJsonParse(str, fallback = {}) {
  try { return JSON.parse(str); } catch (_) { return fallback; }
}

function normalizeCharacter(obj) {
  // Normalize a character record to the form schema used on this page
  const c = obj || {};
  return {
    id: c.id || c.charId || "",
    name: c.name || c.charName || "",
    summary: c.summary || c.charSummary || "",
    ageRole: c.ageRole || c.charAgeRole || "",
    appearance: c.appearance || c.charAppearance || "",
    outfit: c.outfit || c.charOutfit || "",
    tools: c.tools || c.charTools || "",
    palette: c.palette || c.charPalette || "",
    artStyle: c.artStyle || c.charArtStyle || "",
    imagePath: c.imagePath || c.charImagePath || "",
    promptFinal: c.promptFinal || c.charPromptFinal || "",
    // optional 3D payload
    threeD: c.threeD || c.three_d || c.model3d || c.model3D || null
  };
}

function fillFormFromCharacter(c0) {
  const c = normalizeCharacter(c0);
  byId("charId").value = c.id;
  byId("charName").value = c.name;
  byId("charSummary").value = c.summary;
  byId("charAgeRole").value = c.ageRole;
  byId("charAppearance").value = c.appearance;
  byId("charOutfit").value = c.outfit;
  byId("charTools").value = c.tools;
  byId("charPalette").value = c.palette;
  byId("charArtStyle").value = c.artStyle;
  byId("charImagePath").value = c.imagePath;
  byId("charPromptFinal").value = c.promptFinal;
  byId("char3dJson").value = c.threeD ? JSON.stringify(c.threeD, null, 2) : "";
}

async function loadAdnFromUrl(url) {
  const data = await fetchJson(normalizeUrl(url));
  // Accept {characters:[...]} OR [...]
  const list = Array.isArray(data) ? data : (data.characters || data.items || []);
  adnCharactersCache = list.map(normalizeCharacter);
  return adnCharactersCache;
}

function populateAdnSelect(list) {
  const sel = byId("adnCharacterSelect");
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "(chọn nhân vật)";
  sel.appendChild(opt0);

  (list || []).forEach((c, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = (c.name ? c.name : "(no-name)") + (c.id ? " — " + c.id : "");
    sel.appendChild(opt);
  });
}

function buildCharacterObjectFromForm() {
  const threeD = safeJsonParse(byId("char3dJson").value, null);
  return {
    id: byId("charId").value.trim(),
    name: byId("charName").value.trim(),
    summary: byId("charSummary").value.trim(),
    ageRole: byId("charAgeRole").value.trim(),
    appearance: byId("charAppearance").value.trim(),
    outfit: byId("charOutfit").value.trim(),
    tools: byId("charTools").value.trim(),
    palette: byId("charPalette").value.trim(),
    artStyle: byId("charArtStyle").value.trim(),
    imagePath: byId("charImagePath").value.trim(),
    promptFinal: byId("charPromptFinal").value,
    ...(threeD ? { threeD } : {})
  };
}

// Hook ADN UI
document.addEventListener("DOMContentLoaded", () => {
  const loadBtn = byId("loadAdnBtn");
  const loadSelectedBtn = byId("loadSelectedBtn");
  const importBtn = byId("importFileBtn");

  loadBtn?.addEventListener("click", async () => {
    const url = byId("adnUrl").value.trim();
    try {
      const list = await loadAdnFromUrl(url);
      populateAdnSelect(list);
      toast("Đã tải " + list.length + " nhân vật từ ADN");
    } catch (e) {
      console.error(e);
      toast("Lỗi tải ADN: " + (e?.message || e));
    }
  });

  loadSelectedBtn?.addEventListener("click", () => {
    const idxStr = byId("adnCharacterSelect").value;
    if (!idxStr) return toast("Chưa chọn nhân vật");
    const idx = Number(idxStr);
    const c = adnCharactersCache?.[idx];
    if (!c) return toast("Không tìm thấy nhân vật");
    fillFormFromCharacter(c);
    toast("Đã nạp: " + (c.name || c.id || "nhân vật"));
  });

  importBtn?.addEventListener("click", async () => {
    const fileInput = byId("importFile");
    const file = fileInput?.files?.[0];
    if (!file) return toast("Chưa chọn file JSON");
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      const list = Array.isArray(data) ? data : (data.characters || data.items || []);
      adnCharactersCache = list.map(normalizeCharacter);
      populateAdnSelect(adnCharactersCache);
      toast("Import thành công: " + adnCharactersCache.length + " nhân vật");
    } catch (e) {
      console.error(e);
      toast("Import lỗi: " + (e?.message || e));
    }
  });

  // Patch existing addToJson behavior: keep original, but ensure we save 3D too when adding.
  const addBtn = byId("addToJsonBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      try {
        const c = buildCharacterObjectFromForm();
        // Append to current JSON output if it's an array or has {characters:[]}
        const outEl = byId("charJsonOutput");
        const current = safeJsonParse(outEl.value, null);
        let next;
        if (Array.isArray(current)) {
          next = [...current, c];
        } else if (current && typeof current === "object") {
          const arr = Array.isArray(current.characters) ? current.characters : [];
          next = { ...current, characters: [...arr, c] };
        } else {
          next = { characters: [c] };
        }
        outEl.value = JSON.stringify(next, null, 2);
      } catch (e) {
        console.error(e);
      }
    }, { capture: true });
  }
});


/* -------------------- Tabs -------------------- */
(function initTabs(){
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  function activate(id){
    panels.forEach(p=>p.classList.toggle('active', p.id===id));
    btns.forEach(b=>{
      const on = b.dataset.tab===id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  btns.forEach(b=>b.addEventListener('click', ()=>activate(b.dataset.tab)));
})();

/* -------------------- Style Templates + Form -------------------- */
let styleTemplates = [];
let currentStyle = null;
let extractedSwatches = [];

function $(id){ return document.getElementById(id); }

function normalizeUrl(url){
  if(!url) return url;
  url = String(url).trim();
  if(!url) return url;
  // keep absolute URLs
  if(/^https?:\/\//i.test(url)) return url;
  // convert relative (e.g. "adn/templates/...") -> "/adn/templates/..."
  if(url.startsWith('/')) return url;
  url = url.replace(/^\.\//,'');
  return '/' + url;
}

async function fetchJson(url){
  url = normalizeUrl(url);
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + url);
  // handle BOM
  const txt = await res.text();
  const clean = txt.replace(/^\uFEFF/, '');
  return JSON.parse(clean);
}

function ensureHex(v){
  if(!v) return '#000000';
  v = v.trim();
  if(/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if(/^#[0-9a-fA-F]{3}$/.test(v)){
    return '#' + v.substring(1).split('').map(c=>c+c).join('');
  }
  return '#000000';
}

function renderPaletteFields(containerId, obj){
  const el = $(containerId);
  el.innerHTML = '';
  Object.entries(obj).forEach(([k,v])=>{
    const row = document.createElement('div');
    row.className='field-row';
    row.innerHTML = `
      <input type="text" value="${k}" data-key="name" />
      <input type="color" value="${ensureHex(v)}" data-key="color" />
      <button class="ghost" data-action="remove">X</button>
    `;
    el.appendChild(row);
  });
}

function readPaletteFields(containerId){
  const el = $(containerId);
  const rows = [...el.querySelectorAll('.field-row')];
  const out = {};
  rows.forEach(r=>{
    const name = r.querySelector('input[data-key="name"]').value.trim();
    const color = ensureHex(r.querySelector('input[data-key="color"]').value);
    if(name) out[name]=color;
  });
  return out;
}

function renderColorList(containerId, arr){
  const el = $(containerId);
  el.innerHTML='';
  (arr||[]).forEach((c, idx)=>{
    const row=document.createElement('div');
    row.className='field-row';
    row.innerHTML = `
      <input type="color" value="${ensureHex(c)}" data-key="color" />
      <input type="text" value="${ensureHex(c)}" data-key="hex" />
      <button class="ghost" data-action="remove">X</button>
    `;
    // sync
    const colorInput = row.querySelector('input[data-key="color"]');
    const hexInput = row.querySelector('input[data-key="hex"]');
    colorInput.addEventListener('input', ()=>{ hexInput.value = colorInput.value; });
    hexInput.addEventListener('input', ()=>{ colorInput.value = ensureHex(hexInput.value); });
    el.appendChild(row);
  });
}

function readColorList(containerId){
  const el=$(containerId);
  const rows=[...el.querySelectorAll('.field-row')];
  return rows.map(r=>ensureHex(r.querySelector('input[data-key="color"]').value));
}

function renderToneMapFields(obj){
  renderPaletteFields('toneMapFields', obj);
}

function readToneMapFields(){
  return readPaletteFields('toneMapFields');
}

function renderSelectOptions(selectId, options, selected){
  const sel=$(selectId);
  sel.innerHTML='';
  (options||[]).forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o;
    opt.textContent=o;
    if(o===selected) opt.selected=true;
    sel.appendChild(opt);
  });
}

function applyTemplateToForm(tpl){
  currentStyle = JSON.parse(JSON.stringify(tpl.style||{}));
  // Fill palettes
  renderPaletteFields('brandPaletteFields', currentStyle.brand_palette || {});
  renderColorList('pastelPaletteFields', currentStyle.pastel_palette || []);
  renderToneMapFields(currentStyle.emotion_tone_map || {});
  // camera / lighting selects
  const cam = currentStyle.camera || {};
  const light = currentStyle.lighting || {};
  renderSelectOptions('cameraDefault', cam.presets || [], cam.default || (cam.presets||[])[0]);
  renderSelectOptions('lightingDefault', light.presets || [], light.default || (light.presets||[])[0]);
  updateStylePreview();
}

function collectStyleFromForm(){
  const out = JSON.parse(JSON.stringify(currentStyle || {}));
  out.brand_palette = readPaletteFields('brandPaletteFields');
  out.pastel_palette = readColorList('pastelPaletteFields');
  out.emotion_tone_map = readToneMapFields();

  out.camera = out.camera || {};
  out.camera.default = $('cameraDefault').value || out.camera.default || '';
  // keep presets unchanged

  out.lighting = out.lighting || {};
  out.lighting.default = $('lightingDefault').value || out.lighting.default || '';
  // keep presets unchanged

  return out;
}

function updateStylePreview(){
  const styleObj = collectStyleFromForm();
  const wrapper = {style: styleObj};
  $('styleJsonPreview').value = JSON.stringify(wrapper, null, 2);
}

function setStatus(id, msg){
  const el=$(id);
  if(el) el.textContent = msg || '';
}

/* -------- image palette extraction (simple quantization) -------- */
function rgbToHex(r,g,b){
  const to = (n)=>n.toString(16).padStart(2,'0');
  return '#' + to(r) + to(g) + to(b);
}
function samplePixels(imageData, step){
  const {data, width, height} = imageData;
  const pts=[];
  for(let y=0;y<height;y+=step){
    for(let x=0;x<width;x+=step){
      const i=(y*width+x)*4;
      const a=data[i+3];
      if(a<200) continue;
      pts.push([data[i],data[i+1],data[i+2]]);
    }
  }
  return pts;
}
function kmeans(points, k, iters){
  if(points.length===0) return [];
  // init centroids from random points
  const centroids=[];
  for(let i=0;i<k;i++){
    const p=points[Math.floor(Math.random()*points.length)];
    centroids.push(p.slice());
  }
  for(let t=0;t<iters;t++){
    const sums=new Array(k).fill(0).map(()=>[0,0,0,0]);
    for(const p of points){
      let best=0, bestD=1e18;
      for(let i=0;i<k;i++){
        const c=centroids[i];
        const d=(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2;
        if(d<bestD){bestD=d;best=i;}
      }
      sums[best][0]+=p[0]; sums[best][1]+=p[1]; sums[best][2]+=p[2]; sums[best][3]+=1;
    }
    for(let i=0;i<k;i++){
      if(sums[i][3]===0) continue;
      centroids[i]=[
        Math.round(sums[i][0]/sums[i][3]),
        Math.round(sums[i][1]/sums[i][3]),
        Math.round(sums[i][2]/sums[i][3])
      ];
    }
  }
  return centroids;
}

function renderSwatches(colors){
  const box=$('imageSwatches');
  box.innerHTML='';
  colors.forEach(c=>{
    const d=document.createElement('div');
    d.className='swatch';
    d.style.background=c;
    d.title=c;
    box.appendChild(d);
  });
}

async function analyzeImage(){
  const file = $('styleRefImage').files?.[0];
  if(!file){ setStatus('styleTemplateStatus',''); return; }
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise((resolve, reject)=>{
    img.onload=resolve; img.onerror=reject;
  });

  const canvas=$('styleCanvas');
  const maxW=420;
  const scale=Math.min(1, maxW/img.width);
  canvas.width=Math.round(img.width*scale);
  canvas.height=Math.round(img.height*scale);
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height);

  const pts = samplePixels(data, 4);
  const centers = kmeans(pts, 7, 8);
  extractedSwatches = centers.map(c=>rgbToHex(c[0],c[1],c[2]));
  renderSwatches(extractedSwatches);
  setStatus('styleTemplateStatus','Đã trích palette từ ảnh.');
  URL.revokeObjectURL(img.src);
}

function applyImagePalette(){
  if(!extractedSwatches.length) return;
  // overwrite pastel palette, keep brand palette as-is
  renderColorList('pastelPaletteFields', extractedSwatches);
  updateStylePreview();
}

/* -------- buttons wiring -------- */
async function loadStyleTemplates(){
  try{
    setStatus('styleTemplateStatus','Loading...');
    const url = $('styleTemplateUrl').value.trim();
    const data = await fetchJson(url);
    styleTemplates = data.templates || [];
    const sel = $('styleTemplateSelect');
    sel.innerHTML='';
    styleTemplates.forEach(t=>{
      const opt=document.createElement('option');
      opt.value=t.id;
      opt.textContent = t.name + (t.description ? ' — ' + t.description : '');
      sel.appendChild(opt);
    });
    setStatus('styleTemplateStatus', 'Loaded ' + styleTemplates.length + ' templates.');
    // auto apply first
    if(styleTemplates[0]) applyTemplateToForm(styleTemplates[0]);
  }catch(e){
    console.error(e);
    setStatus('styleTemplateStatus', 'Load failed: ' + e.message);
  }
}

function getSelectedTemplate(){
  const id = $('styleTemplateSelect').value;
  return styleTemplates.find(t=>t.id===id);
}

function exportStyleJson(){
  const wrapper = {style: collectStyleFromForm()};
  const txt = JSON.stringify(wrapper, null, 2);
  const blob = new Blob([txt], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'style.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatus('styleExportStatus','Đã export style.json');
}

async function copyStyleJson(){
  try{
    await navigator.clipboard.writeText($('styleJsonPreview').value);
    setStatus('styleExportStatus','Đã copy JSON');
  }catch(e){
    setStatus('styleExportStatus','Copy thất bại (trình duyệt chặn clipboard).');
  }
}

function addRow(containerId, defaultName){
  const el=$(containerId);
  const row=document.createElement('div');
  row.className='field-row';
  row.innerHTML = `
    <input type="text" value="${defaultName||''}" data-key="name" placeholder="key" />
    <input type="color" value="#000000" data-key="color" />
    <button class="ghost" data-action="remove">X</button>
  `;
  el.appendChild(row);
}

function addColorRow(containerId, hex){
  const el=$(containerId);
  const row=document.createElement('div');
  row.className='field-row';
  row.innerHTML = `
    <input type="color" value="${ensureHex(hex||'#000000')}" data-key="color" />
    <input type="text" value="${ensureHex(hex||'#000000')}" data-key="hex" />
    <button class="ghost" data-action="remove">X</button>
  `;
  const colorInput=row.querySelector('input[data-key="color"]');
  const hexInput=row.querySelector('input[data-key="hex"]');
  colorInput.addEventListener('input', ()=>{ hexInput.value = colorInput.value; updateStylePreview(); });
  hexInput.addEventListener('input', ()=>{ colorInput.value = ensureHex(hexInput.value); updateStylePreview(); });
  el.appendChild(row);
}

function wireDynamicRemovals(){
  document.addEventListener('click', (e)=>{
    const btn=e.target.closest('button[data-action="remove"]');
    if(!btn) return;
    const row=btn.closest('.field-row');
    if(row) row.remove();
    updateStylePreview();
  });
  document.addEventListener('input', (e)=>{
    if(e.target.matches('#brandPaletteFields input, #toneMapFields input')) updateStylePreview();
  });
  document.addEventListener('change', (e)=>{
    if(e.target.matches('#cameraDefault, #lightingDefault')) updateStylePreview();
  });
}

function initStyleTab(){
  wireDynamicRemovals();
  const loadBtn=$('btnLoadStyleTemplates');
  if(loadBtn) loadBtn.addEventListener('click', loadStyleTemplates);

  $('btnApplyStyleTemplate')?.addEventListener('click', ()=>{
    const tpl=getSelectedTemplate();
    if(tpl) applyTemplateToForm(tpl);
  });
  $('btnResetStyleForm')?.addEventListener('click', ()=>{
    const tpl=getSelectedTemplate();
    if(tpl) applyTemplateToForm(tpl);
  });

  $('btnAnalyzeImage')?.addEventListener('click', analyzeImage);
  $('btnApplyImagePalette')?.addEventListener('click', applyImagePalette);

  $('btnExportStyleJson')?.addEventListener('click', exportStyleJson);
  $('btnCopyStyleJson')?.addEventListener('click', copyStyleJson);

  $('btnAddBrandColor')?.addEventListener('click', ()=>{ addRow('brandPaletteFields','new_color'); updateStylePreview(); });
  $('btnAddToneColor')?.addEventListener('click', ()=>{ addRow('toneMapFields','new_tone'); updateStylePreview(); });
  $('btnAddPastelColor')?.addEventListener('click', ()=>{ addColorRow('pastelPaletteFields','#000000'); updateStylePreview(); });

  // initial load
  loadStyleTemplates();
}

document.addEventListener('DOMContentLoaded', initStyleTab);