// ADN Tools - form based (no need to type JSON)
// Expected repo structure (per your note):
//   public/pages/character.html
//   public/js/character.js
//   public/adn/templates/*.json
//
// NOTE about deploy:
// If your site URL is .../public/pages/character.html then basePath should be /public.
// All fetch URLs below are built as absolute paths (start with '/'), to avoid the
// browser auto-prepending /public/pages/...

(function(){
  const $ = (id)=>document.getElementById(id);

  // ---------- Tabs ----------
  const panels = {
    style: $("panel-style"),
    background: $("panel-background"),
    character: $("panel-character"),
    outfit: $("panel-outfit"),
  };
  function showTab(tab){
    Object.keys(panels).forEach(k=>{
      panels[k].classList.toggle("hide", k!==tab);
    });
    document.querySelectorAll(".tab").forEach(b=>{
      b.classList.toggle("active", b.dataset.tab===tab);
    });
  }
  document.querySelectorAll(".tab").forEach(b=>{
    b.addEventListener("click", ()=>showTab(b.dataset.tab));
  });

  // ---------- Paths ----------
  function basePath(){
    const v = ($("basePath")?.value || "/public").trim();
    if(!v) return "/public";
    return v.startsWith("/") ? v.replace(/\/+$/,"") : "/" + v.replace(/\/+$/,"");
  }
  function seriesFolder(){
    return ($("seriesFolder")?.value || "xomnganchuyen").trim();
  }
  function prefix(){
    return ($("filePrefix")?.value || "XNC").trim();
  }
  function urlTemplates(name){
    return `${basePath()}/adn/templates/${name}`;
  }
  function urlAdn(fileName){
    // fileName should already include .json
    return `${basePath()}/adn/${seriesFolder()}/${fileName}`;
  }

  // ---------- JSON helpers ----------
  function safeJsonParse(text){
    const clean = (text || "").replace(/^\uFEFF/, "").trim();
    return JSON.parse(clean);
  }
  function downloadJson(filename, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 500);
  }
  async function fetchJson(url){
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
    const txt = await res.text();
    return safeJsonParse(txt);
  }
  function pickFileJson(fileInput){
    return new Promise((resolve, reject)=>{
      const f = fileInput.files?.[0];
      if(!f) return reject(new Error("Chưa chọn file JSON"));
      const r = new FileReader();
      r.onload = ()=>{ try{ resolve(safeJsonParse(String(r.result||""))); } catch(e){ reject(e); } };
      r.onerror = ()=>reject(new Error("Không đọc được file"));
      r.readAsText(f, "utf-8");
    });
  }

  // ---------- Templates (Style) ----------
  let styleTemplates = [];
  async function loadStyleTemplates(){
    const sel = $("styleTemplateSelect");
    if(!sel) return;
    sel.innerHTML = `<option value="">(Không dùng template)</option>`;
    try{
      const data = await fetchJson(urlTemplates("style_templates.json"));
      styleTemplates = Array.isArray(data?.templates) ? data.templates : (Array.isArray(data) ? data : []);
      styleTemplates.forEach((t, i)=>{
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = t.name || t.id || `Template ${i+1}`;
        sel.appendChild(opt);
      });
    }catch(e){
      console.warn(e);
      // keep empty
    }
  }
  function applyStyleTemplate(idx){
    const t = styleTemplates[idx];
    if(!t) return;
    $("styleBrandPrimary").value = t.brand_primary || t.brand?.primary || "";
    $("styleAccent").value = t.accent || "";
    $("styleArt").value = t.art_style || "";
    $("styleLight").value = t.lighting || "";
    $("stylePalette").value = Array.isArray(t.palette) ? t.palette.join(",") : (t.palette || "");
    $("styleNotes").value = t.notes || "";
  }

  $("styleTemplateSelect")?.addEventListener("change", (ev)=>{
    const v = ev.target.value;
    if(v==="") return;
    const idx = Number(v);
    if(Number.isFinite(idx)) applyStyleTemplate(idx);
  });

  // ---------- Build objects ----------
  function buildStyleJson(){
    const pal = ($("stylePalette").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    return {
      version: "1.0",
      series_id: prefix(),
      style: {
        brand_palette: {
          green_primary: $("styleBrandPrimary").value.trim() || undefined,
          accent: $("styleAccent").value.trim() || undefined
        },
        palette: pal.length? pal : undefined,
        art_style: $("styleArt").value.trim() || undefined,
        lighting: $("styleLight").value.trim() || undefined,
        notes: $("styleNotes").value.trim() || undefined
      }
    };
  }

  function buildBackgroundJson(){
    const id = $("bgId").value.trim() || "bg_1";
    const tags = ($("bgTags").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    return {
      version: "1.0",
      series_id: prefix(),
      backgrounds: [{
        id,
        type: $("bgType").value,
        time: $("bgTime").value,
        desc: $("bgDesc").value.trim(),
        details: $("bgDetails").value.trim() || undefined,
        tags: tags.length?tags:undefined
      }]
    };
  }

  function buildCharacterJson(){
    const actions = ($("cActions").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    const faces = ($("cFaces").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    const accessories = ($("cAccessories").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    return {
      version: "1.1",
      series_id: prefix(),
      characters: [{
        id: $("cId").value.trim() || "char_1",
        name: $("cName").value.trim() || "",
        gender: $("cGender").value,
        role: $("cRole").value.trim() || "",
        base_desc: $("cBaseDesc").value.trim() || "",
        default_accessories: accessories,
        default_outfit: $("cDefaultOutfit").value.trim() || "",
        preferred_actions: actions,
        preferred_faces: faces
      }]
    };
  }

  function buildOutfitJson(){
    const colors = ($("oColors").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    const props = ($("oProps").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    const acc = ($("oAcc").value||"").split(",").map(s=>s.trim()).filter(Boolean);
    return {
      version: "1.0",
      series_id: prefix(),
      outfits: [{
        id: $("oId").value.trim() || "outfit_1",
        name: $("oName").value.trim() || "",
        category: $("oCategory").value,
        gender_fit: $("oGenderFit").value,
        desc: $("oDesc").value.trim() || "",
        colors,
        props,
        accessories: acc
      }]
    };
  }

  // ---------- Render outputs ----------
  function setOut(preId, obj){
    const el = $(preId);
    if(el) el.textContent = JSON.stringify(obj, null, 2);
  }

  // ---------- Buttons ----------
  $("btnStyleToJson")?.addEventListener("click", ()=>{
    const obj = buildStyleJson();
    setOut("styleJsonOut", obj);
    downloadJson(`${prefix()}_style.json`, obj);
  });
  $("btnBgToJson")?.addEventListener("click", ()=>{
    const obj = buildBackgroundJson();
    setOut("bgJsonOut", obj);
    downloadJson(`${prefix()}_backgrounds.json`, obj);
  });
  $("btnCharToJson")?.addEventListener("click", ()=>{
    const obj = buildCharacterJson();
    setOut("charJsonOut", obj);
    downloadJson(`${prefix()}_characters.json`, obj);
  });
  $("btnOutfitToJson")?.addEventListener("click", ()=>{
    const obj = buildOutfitJson();
    setOut("outfitJsonOut", obj);
    downloadJson(`${prefix()}_outfits.json`, obj);
  });

  $("btnStyleLoadJson")?.addEventListener("click", async ()=>{
    try{
      const obj = await pickFileJson($("styleJsonFile"));
      const s = obj.style || obj;
      $("styleBrandPrimary").value = s?.brand_palette?.green_primary || s?.brand_primary || "";
      $("styleAccent").value = s?.brand_palette?.accent || s?.accent || "";
      $("styleArt").value = s?.art_style || "";
      $("styleLight").value = s?.lighting || "";
      $("stylePalette").value = Array.isArray(s?.palette) ? s.palette.join(",") : (s?.palette || "");
      $("styleNotes").value = s?.notes || "";
      setOut("styleJsonOut", obj);
    }catch(e){ alert(e.message || String(e)); }
  });

  $("btnBgLoadJson")?.addEventListener("click", async ()=>{
    try{
      const obj = await pickFileJson($("bgJsonFile"));
      const bg = (obj.backgrounds && obj.backgrounds[0]) ? obj.backgrounds[0] : (obj[0]||{});
      $("bgId").value = bg.id || "";
      $("bgType").value = bg.type || "outdoor";
      $("bgTime").value = bg.time || "morning";
      $("bgDesc").value = bg.desc || "";
      $("bgDetails").value = bg.details || "";
      $("bgTags").value = Array.isArray(bg.tags)? bg.tags.join(",") : (bg.tags||"");
      setOut("bgJsonOut", obj);
    }catch(e){ alert(e.message || String(e)); }
  });

  $("btnCharLoadJson")?.addEventListener("click", async ()=>{
    try{
      const obj = await pickFileJson($("charJsonFile"));
      const c = (obj.characters && obj.characters[0]) ? obj.characters[0] : (obj[0]||{});
      $("cId").value = c.id || "";
      $("cName").value = c.name || "";
      $("cGender").value = c.gender || "other";
      $("cRole").value = c.role || "";
      $("cBaseDesc").value = c.base_desc || c.base_desc_en || "";
      $("cAccessories").value = Array.isArray(c.default_accessories)? c.default_accessories.join(",") : (c.default_accessories||"");
      $("cDefaultOutfit").value = c.default_outfit || "";
      $("cActions").value = Array.isArray(c.preferred_actions)? c.preferred_actions.join(",") : (c.preferred_actions||"");
      $("cFaces").value = Array.isArray(c.preferred_faces)? c.preferred_faces.join(",") : (c.preferred_faces||"");
      setOut("charJsonOut", obj);
    }catch(e){ alert(e.message || String(e)); }
  });

  $("btnOutfitLoadJson")?.addEventListener("click", async ()=>{
    try{
      const obj = await pickFileJson($("outfitJsonFile"));
      const o = (obj.outfits && obj.outfits[0]) ? obj.outfits[0] : (obj[0]||{});
      $("oId").value = o.id || "";
      $("oName").value = o.name || "";
      $("oCategory").value = o.category || "casual";
      $("oGenderFit").value = o.gender_fit || "unisex";
      $("oDesc").value = o.desc || "";
      $("oColors").value = Array.isArray(o.colors)? o.colors.join(",") : (o.colors||"");
      $("oProps").value = Array.isArray(o.props)? o.props.join(",") : (o.props||"");
      $("oAcc").value = Array.isArray(o.accessories)? o.accessories.join(",") : (o.accessories||"");
      setOut("outfitJsonOut", obj);
    }catch(e){ alert(e.message || String(e)); }
  });

  // Global validate & download (current tab)
  function currentTab(){
    return document.querySelector(".tab.active")?.dataset?.tab || "style";
  }
  $("btnValidate")?.addEventListener("click", ()=>{
    try{
      const tab = currentTab();
      const obj = tab==="style"?buildStyleJson():
                  tab==="background"?buildBackgroundJson():
                  tab==="character"?buildCharacterJson():
                  buildOutfitJson();
      JSON.stringify(obj);
      alert("OK: JSON hợp lệ");
    }catch(e){ alert("JSON lỗi: " + (e.message||e)); }
  });
  $("btnDownload")?.addEventListener("click", ()=>{
    const tab = currentTab();
    const obj = tab==="style"?buildStyleJson():
                tab==="background"?buildBackgroundJson():
                tab==="character"?buildCharacterJson():
                buildOutfitJson();
    const name = tab==="style"?`${prefix()}_style.json`:
                 tab==="background"?`${prefix()}_backgrounds.json`:
                 tab==="character"?`${prefix()}_characters.json`:
                 `${prefix()}_outfits.json`;
    downloadJson(name, obj);
  });

  // Load tab from repo (optional): fetch the existing JSON file for that tab and fill the form.
  $("btnLoadAll")?.addEventListener("click", async ()=>{
    const tab = currentTab();
    try{
      if(tab==="style"){
        const obj = await fetchJson(urlAdn(`${prefix()}_style.json`));
        const s = obj.style || obj;
        $("styleBrandPrimary").value = s?.brand_palette?.green_primary || s?.brand_primary || "";
        $("styleAccent").value = s?.brand_palette?.accent || s?.accent || "";
        $("styleArt").value = s?.art_style || "";
        $("styleLight").value = s?.lighting || "";
        $("stylePalette").value = Array.isArray(s?.palette) ? s.palette.join(",") : (s?.palette || "");
        $("styleNotes").value = s?.notes || "";
        setOut("styleJsonOut", obj);
      }else if(tab==="background"){
        const obj = await fetchJson(urlAdn(`${prefix()}_backgrounds.json`));
        const bg = obj?.backgrounds?.[0] || {};
        $("bgId").value = bg.id || "";
        $("bgType").value = bg.type || "outdoor";
        $("bgTime").value = bg.time || "morning";
        $("bgDesc").value = bg.desc || "";
        $("bgDetails").value = bg.details || "";
        $("bgTags").value = Array.isArray(bg.tags)? bg.tags.join(",") : (bg.tags||"");
        setOut("bgJsonOut", obj);
      }else if(tab==="character"){
        const obj = await fetchJson(urlAdn(`${prefix()}_characters.json`));
        const c = obj?.characters?.[0] || {};
        $("cId").value = c.id || "";
        $("cName").value = c.name || "";
        $("cGender").value = c.gender || "other";
        $("cRole").value = c.role || "";
        $("cBaseDesc").value = c.base_desc || c.base_desc_en || "";
        $("cAccessories").value = Array.isArray(c.default_accessories)? c.default_accessories.join(",") : (c.default_accessories||"");
        $("cDefaultOutfit").value = c.default_outfit || "";
        $("cActions").value = Array.isArray(c.preferred_actions)? c.preferred_actions.join(",") : (c.preferred_actions||"");
        $("cFaces").value = Array.isArray(c.preferred_faces)? c.preferred_faces.join(",") : (c.preferred_faces||"");
        setOut("charJsonOut", obj);
      }else{
        const obj = await fetchJson(urlAdn(`${prefix()}_outfits.json`));
        const o = obj?.outfits?.[0] || {};
        $("oId").value = o.id || "";
        $("oName").value = o.name || "";
        $("oCategory").value = o.category || "casual";
        $("oGenderFit").value = o.gender_fit || "unisex";
        $("oDesc").value = o.desc || "";
        $("oColors").value = Array.isArray(o.colors)? o.colors.join(",") : (o.colors||"");
        $("oProps").value = Array.isArray(o.props)? o.props.join(",") : (o.props||"");
        $("oAcc").value = Array.isArray(o.accessories)? o.accessories.join(",") : (o.accessories||"");
        setOut("outfitJsonOut", obj);
      }
    }catch(e){
      alert(`Lỗi tải ADN: ${e.message || e}`);
    }
  });

  // Init
  showTab("style");
  loadStyleTemplates();
})();
