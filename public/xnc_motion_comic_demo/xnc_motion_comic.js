/* XNC Motion Comic Builder
 * - Load ADN JSON: layouts/backgrounds/characters/actions/style
 * - Pick layout → auto build correct panel count
 * - Configure per-panel: background + aspect + style + actors(actions)
 * - Export JSON + Export Prompt (image/video)
 */

const $ = (id) => document.getElementById(id);

function log(msg) {
  const el = $("log");
  const now = new Date().toLocaleTimeString();
  el.textContent = `[${now}] ${msg}\n` + el.textContent;
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} (${res.status})`);
  return res.json();
}

/* ========= ADN PATHS (đúng theo repo của bạn) ========= */
const ADN_BASE = "/adn/xomnganchuyen";
const ADN_FILES = {
  layouts: `${ADN_BASE}/XNC_layouts.json`,
  backgrounds: `${ADN_BASE}/XNC_backgrounds.json`,
  characters: `${ADN_BASE}/XNC_characters.json`,
  actions: `${ADN_BASE}/XNC_actions.json`,
  style: `${ADN_BASE}/XNC_style.json`,
};

/* ========= State ========= */
const state = {
  adn: null,
  layoutId: null,
  activePanelIndex: 0,
  aspect: "9:16",
  panels: [], // [{ backgroundId, styleId, note, motionNote, actors:[{characterId, actionId}] }]
  lastOutput: null, // string | object
  lastOutputType: null, // "json" | "prompt"
};

/* ========= Normalizers (đỡ lệ thuộc format JSON) ========= */
function normalizeLayouts(raw) {
  // hỗ trợ: {layouts:{...}} hoặc {items:[...]} hoặc raw object
  const out = {};
  const src = raw?.layouts || raw?.items || raw?.data || raw;
  if (Array.isArray(src)) {
    src.forEach((it) => { if (it?.id) out[it.id] = it; });
  } else if (typeof src === "object") {
    Object.keys(src || {}).forEach((k) => (out[k] = src[k]));
  }
  return out;
}

function normalizeBackgrounds(raw) {
  // hỗ trợ: {backgrounds:{...}} hoặc raw object
  const src = raw?.backgrounds || raw?.items || raw?.data || raw;
  const out = {};
  if (Array.isArray(src)) {
    src.forEach((it) => { if (it?.id) out[it.id] = it; });
  } else if (typeof src === "object") {
    Object.keys(src || {}).forEach((k) => (out[k] = src[k]));
  }
  return out;
}

function normalizeCharacters(raw) {
  // format bạn đang dùng: { "characters": { "bolo": {name, signatures:[]}, ... } }
  const src = raw?.characters || raw?.items || raw?.data || raw;
  const out = {};
  if (Array.isArray(src)) {
    src.forEach((it) => { if (it?.id) out[it.id] = it; });
  } else if (typeof src === "object") {
    Object.keys(src || {}).forEach((k) => (out[k] = src[k]));
  }
  return out;
}

function normalizeActions(raw) {
  // hỗ trợ: {actions:{...}} hoặc {items:[...]} hoặc raw object
  const src = raw?.actions || raw?.items || raw?.data || raw;
  const out = {};
  if (Array.isArray(src)) {
    src.forEach((it) => { if (it?.id) out[it.id] = it; });
  } else if (typeof src === "object") {
    Object.keys(src || {}).forEach((k) => (out[k] = src[k]));
  }
  return out;
}

function normalizeStyle(raw) {
  // hỗ trợ: {styleDNA, constraints, styles:{...}} hoặc raw
  const dna = raw?.styleDNA || raw?.dna || raw?.STYLE_DNA || "";
  const constraints = raw?.constraints || raw?.CONSTRAINTS || "no text, no subtitles, no UI";
  const styles = raw?.styles || raw?.items || raw?.data || raw?.style || raw;
  const stylesOut = {};
  if (Array.isArray(styles)) {
    styles.forEach((it) => { if (it?.id) stylesOut[it.id] = it; });
  } else if (typeof styles === "object") {
    // nếu raw là {styles:{...}} thì styles đã là object; nếu raw là style file thuần, ta lọc key
    Object.keys(styles || {}).forEach((k) => {
      // bỏ qua key meta nếu có
      if (["styleDNA", "constraints", "dna", "STYLE_DNA", "CONSTRAINTS"].includes(k)) return;
      stylesOut[k] = styles[k];
    });
  }
  return { dna, constraints, styles: stylesOut };
}

/* ========= Default Layouts bổ sung (nếu JSON thiếu) ========= */
function ensureDefaultLayouts(layoutsObj) {
  const addIfMissing = (id, obj) => { if (!layoutsObj[id]) layoutsObj[id] = obj; };

  // 1 panel
  addIfMissing("1_full", { id:"1_full", label:"1 khung (toàn màn hình)", panels:1,
    css:`grid-template-columns:1fr; grid-template-rows:1fr;`
  });

  // 2 panels
  addIfMissing("2_tb", { id:"2_tb", label:"2 khung (trên/dưới)", panels:2,
    css:`grid-template-columns:1fr; grid-template-rows:1fr 1fr;`
  });
  addIfMissing("2_lr", { id:"2_lr", label:"2 khung (trái/phải)", panels:2,
    css:`grid-template-columns:1fr 1fr; grid-template-rows:1fr;`
  });

  // 3 panels: 1 trên 2 dưới
  addIfMissing("3_1top2", { id:"3_1top2", label:"3 khung (1 trên, 2 dưới)", panels:3,
    css:`grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; grid-template-areas:"a a" "b c";`
  });
  // 3 panels: 2 trên 1 dưới
  addIfMissing("3_2top1", { id:"3_2top1", label:"3 khung (2 trên, 1 dưới)", panels:3,
    css:`grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; grid-template-areas:"b c" "a a";`
  });
  // 3 panels: 1 trái 2 phải
  addIfMissing("3_1left2", { id:"3_1left2", label:"3 khung (1 trái, 2 phải)", panels:3,
    css:`grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; grid-template-areas:"a b" "a c";`
  });
  // 3 panels: 2 trái 1 phải
  addIfMissing("3_2left1", { id:"3_2left1", label:"3 khung (2 trái, 1 phải)", panels:3,
    css:`grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; grid-template-areas:"b a" "c a";`
  });
  // 3 panels: 3 hàng ngang (dọc xếp 3)
  addIfMissing("3_col", { id:"3_col", label:"3 khung (3 hàng dọc)", panels:3,
    css:`grid-template-columns:1fr; grid-template-rows:1fr 1fr 1fr;`
  });

  // 4 panels (2x2)
  addIfMissing("4_2x2", { id:"4_2x2", label:"4 khung (2x2)", panels:4,
    css:`grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr;`
  });

  return layoutsObj;
}

/* ========= UI render ========= */
function renderLayoutSelect() {
  const sel = $("layoutSelect");
  sel.innerHTML = "";

  const layouts = state.adn.layouts;
  const ids = Object.keys(layouts);

  // sort: 1,2,3,4 rồi alpha
  ids.sort((a,b) => {
    const pa = layouts[a]?.panels ?? layouts[a]?.panelCount ?? 99;
    const pb = layouts[b]?.panels ?? layouts[b]?.panelCount ?? 99;
    if (pa !== pb) return pa - pb;
    return String(layouts[a]?.label || a).localeCompare(String(layouts[b]?.label || b));
  });

  ids.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = layouts[id]?.label || id;
    sel.appendChild(opt);
  });

  // default
  if (!state.layoutId) {
    state.layoutId = ids.includes("1_full") ? "1_full" : ids[0];
  }
  sel.value = state.layoutId;
}

function renderPanelSelect() {
  const sel = $("panelSelect");
  sel.innerHTML = "";
  state.panels.forEach((_, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = `P${idx+1}`;
    sel.appendChild(opt);
  });
  sel.value = String(state.activePanelIndex);
}

function renderBgSelect() {
  const sel = $("bgSelect");
  sel.innerHTML = `<option value="">— Chọn bối cảnh —</option>`;
  const bgs = state.adn.backgrounds;
  Object.keys(bgs).sort().forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = bgs[id]?.label || bgs[id]?.name || id;
    sel.appendChild(opt);
  });
}

function renderStyleSelect() {
  const sel = $("styleSelect");
  sel.innerHTML = `<option value="">style</option>`;
  const styles = state.adn.style.styles;
  Object.keys(styles).sort().forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = styles[id]?.label || styles[id]?.name || id;
    sel.appendChild(opt);
  });
}

function syncSidebarFromState() {
  const p = state.panels[state.activePanelIndex];
  if (!p) return;

  $("bgSelect").value = p.backgroundId || "";
  $("styleSelect").value = p.styleId || "";
  $("sceneNote").value = p.note || "";
  $("motionNote").value = p.motionNote || "";
  $("aspectSelect").value = state.aspect || "9:16";

  renderActorsList();
}

function ensurePanelCount(n) {
  while (state.panels.length < n) {
    state.panels.push({
      backgroundId: "",
      styleId: "",
      note: "",
      motionNote: "",
      actors: [],
    });
  }
  while (state.panels.length > n) {
    state.panels.pop();
  }
  if (state.activePanelIndex >= n) state.activePanelIndex = 0;
}

function setGridTemplate(layoutId) {
  const grid = $("grid");
  const layouts = state.adn.layouts;
  const layout = layouts[layoutId];

  if (!layout) {
    log(`Layout not found: ${layoutId} → fallback 4_2x2`);
    return setGridTemplate("4_2x2");
  }

  const panelCount = layout.panels ?? layout.panelCount ?? layout.count ?? 4;

  // reset
  grid.style.gridTemplateColumns = "";
  grid.style.gridTemplateRows = "";
  grid.style.gridTemplateAreas = "";

  // apply css if present
  if (layout.css) {
    const css = String(layout.css);

    const cols = /grid-template-columns\s*:\s*([^;]+)/i.exec(css);
    const rows = /grid-template-rows\s*:\s*([^;]+)/i.exec(css);
    const areas = /grid-template-areas\s*:\s*([^;]+)/i.exec(css);

    if (cols) grid.style.gridTemplateColumns = cols[1].trim();
    if (rows) grid.style.gridTemplateRows = rows[1].trim();
    if (areas) grid.style.gridTemplateAreas = areas[1].trim();
  } else {
    // fallback
    if (panelCount === 1) {
      grid.style.gridTemplateColumns = "1fr";
      grid.style.gridTemplateRows = "1fr";
    } else if (panelCount === 2) {
      grid.style.gridTemplateColumns = "1fr";
      grid.style.gridTemplateRows = "1fr 1fr";
    } else if (panelCount === 3) {
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gridTemplateRows = "1fr 1fr";
      grid.style.gridTemplateAreas = `"a a" "b c"`;
    } else {
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gridTemplateRows = "1fr 1fr";
    }
  }

  // build panels DOM
  grid.innerHTML = "";
  for (let i = 0; i < panelCount; i++) {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.dataset.panelIndex = String(i);

    if (grid.style.gridTemplateAreas) {
      const areaMap = ["a", "b", "c", "d"];
      panel.style.gridArea = areaMap[i] || "";
    }

    panel.innerHTML = `
      <div class="panelTag">P${i + 1}</div>
      <div class="actorsLayer"></div>
      <div class="panelBgLabel"></div>
    `;

    panel.addEventListener("click", () => {
      state.activePanelIndex = i;
      renderPanelSelect();
      syncSidebarFromState();
      highlightActivePanel();
    });

    grid.appendChild(panel);
  }

  ensurePanelCount(panelCount);
  renderPanelSelect();
  renderActorsOnPanels();
  highlightActivePanel();
  syncSidebarFromState();

  log(`Layout set: ${layoutId} (${panelCount} panels)`);
}

function highlightActivePanel() {
  document.querySelectorAll(".panel").forEach((el) => {
    const idx = Number(el.dataset.panelIndex || "0");
    el.classList.toggle("active", idx === state.activePanelIndex);
  });
}

function renderActorsOnPanels() {
  const panels = document.querySelectorAll(".panel");
  panels.forEach((panelEl) => {
    const idx = Number(panelEl.dataset.panelIndex || "0");
    const p = state.panels[idx];
    if (!p) return;

    // bg label
    const bgLabel = panelEl.querySelector(".panelBgLabel");
    const bgObj = p.backgroundId ? state.adn.backgrounds[p.backgroundId] : null;
    bgLabel.textContent = bgObj?.label || bgObj?.name || (p.backgroundId ? p.backgroundId : "—");

    // actors
    const layer = panelEl.querySelector(".actorsLayer");
    layer.innerHTML = "";

    p.actors.forEach((a, k) => {
      const ch = state.adn.characters[a.characterId];
      const ac = state.adn.actions[a.actionId];

      const chip = document.createElement("div");
      chip.className = "actorChip";
      chip.style.top = `${35 + (k * 18)}%`;
      chip.style.left = `${50 + ((k % 2) ? 10 : -10)}%`;

      const cname = ch?.name || a.characterId;
      const aname = ac?.label || ac?.name || a.actionId || "";

      chip.innerHTML = `${cname}${aname ? `<small>${aname}</small>` : ""}`;
      layer.appendChild(chip);
    });
  });
}

function makeActorRow(actor, index) {
  const wrap = document.createElement("div");
  wrap.className = "actorRow";

  const charSel = document.createElement("select");
  const actSel = document.createElement("select");
  const delBtn = document.createElement("button");

  delBtn.className = "xBtn";
  delBtn.textContent = "×";
  delBtn.title = "Xóa actor";

  // characters
  const chars = state.adn.characters;
  Object.keys(chars).sort().forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = chars[id]?.name || id;
    charSel.appendChild(opt);
  });

  // actions
  const actions = state.adn.actions;
  actSel.innerHTML = `<option value="">(chọn action)</option>`;
  Object.keys(actions).sort().forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = actions[id]?.label || actions[id]?.name || id;
    actSel.appendChild(opt);
  });

  charSel.value = actor.characterId || Object.keys(chars)[0] || "";
  actSel.value = actor.actionId || "";

  charSel.addEventListener("change", () => {
    const p = state.panels[state.activePanelIndex];
    p.actors[index].characterId = charSel.value;
    renderActorsOnPanels();
  });

  actSel.addEventListener("change", () => {
    const p = state.panels[state.activePanelIndex];
    p.actors[index].actionId = actSel.value;
    renderActorsOnPanels();
  });

  delBtn.addEventListener("click", () => {
    const p = state.panels[state.activePanelIndex];
    p.actors.splice(index, 1);
    renderActorsList();
    renderActorsOnPanels();
  });

  wrap.appendChild(charSel);
  wrap.appendChild(actSel);
  wrap.appendChild(delBtn);

  return wrap;
}

function renderActorsList() {
  const box = $("actorsList");
  box.innerHTML = "";
  const p = state.panels[state.activePanelIndex];
  if (!p) return;

  if (!p.actors.length) {
    const d = document.createElement("div");
    d.className = "muted";
    d.style.marginTop = "8px";
    d.textContent = "Chưa có actor. Bấm + Add để thêm.";
    box.appendChild(d);
    return;
  }

  p.actors.forEach((actor, idx) => {
    box.appendChild(makeActorRow(actor, idx));
  });
}

/* ========= Export ========= */
function buildSceneJSON() {
  const layoutId = state.layoutId;
  const layouts = state.adn.layouts;
  const layout = layouts[layoutId];
  const panelCount = layout?.panels ?? layout?.panelCount ?? 4;

  const out = {
    meta: {
      series: "xomnganchuyen",
      layoutId,
      panelCount,
      aspect: state.aspect,
      createdAt: new Date().toISOString(),
    },
    styleDNA: state.adn.style.dna || "",
    constraints: state.adn.style.constraints || "",
    panels: state.panels.map((p, idx) => ({
      id: `P${idx + 1}`,
      backgroundId: p.backgroundId || "",
      styleId: p.styleId || "",
      note: p.note || "",
      motionNote: p.motionNote || "",
      actors: (p.actors || []).map((a) => ({
        characterId: a.characterId,
        actionId: a.actionId || "",
      })),
    })),
  };

  return out;
}

function buildPromptText() {
  const scene = buildSceneJSON();
  const dna = scene.styleDNA ? `STYLE DNA (XNC): ${scene.styleDNA}` : "STYLE DNA (XNC): (missing)";
  const aspect = `ASPECT: ${scene.meta.aspect}`;

  const constraints = scene.constraints
    ? `Constraints: ${scene.constraints}, consistent characters, comic panel framing.`
    : `Constraints: no text, no subtitles, no UI, consistent characters, comic panel framing.`;

  const lines = [];
  lines.push(dna);
  lines.push(aspect);
  lines.push("");

  scene.panels.forEach((p, i) => {
    const bg = p.backgroundId ? (state.adn.backgrounds[p.backgroundId]?.desc || state.adn.backgrounds[p.backgroundId]?.label || p.backgroundId) : "(none)";
    const st = p.styleId ? (state.adn.style.styles[p.styleId]?.desc || state.adn.style.styles[p.styleId]?.label || p.styleId) : "(default style)";
    lines.push(`PANEL ${i + 1} (${p.id})`);
    lines.push(`Background: ${bg}`);
    lines.push(`Style: ${st}`);
    if (p.note) lines.push(`Note: ${p.note}`);
    if (p.motionNote) lines.push(`Motion: ${p.motionNote}`);

    if (p.actors?.length) {
      lines.push(`Actors:`);
      p.actors.forEach((a) => {
        const ch = state.adn.characters[a.characterId];
        const ac = state.adn.actions[a.actionId];
        const cname = ch?.name || a.characterId;
        const adesc = ac?.desc || ac?.label || ac?.name || a.actionId || "";
        lines.push(`- ${cname}${adesc ? `: ${adesc}` : ""}`);
      });
    } else {
      lines.push(`Actors: (none)`);
    }

    lines.push(constraints);
    lines.push("");
  });

  return lines.join("\n");
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
  log("Copied to clipboard.");
}

function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ========= FX demo (vượt khung) ========= */
function getPanelRect(panelIndex) {
  const el = document.querySelector(`.panel[data-panel-index="${panelIndex}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function spawnProp(text, x, y) {
  const overlay = $("overlay");
  const p = document.createElement("div");
  p.className = "fxProp";
  p.textContent = text;
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  overlay.appendChild(p);
  return p;
}

function animateThrow() {
  const from = getPanelRect(0);
  const to = getPanelRect(1) || getPanelRect(0);
  if (!from || !to) return;

  const startX = from.left + from.width * 0.75;
  const startY = from.top + from.height * 0.65;
  const endX = to.left + to.width * 0.25;
  const endY = to.top + to.height * 0.55;

  const prop = spawnProp("DÉP", startX, startY);

  const t0 = performance.now();
  const dur = 650;

  function step(t) {
    const k = Math.min(1, (t - t0) / dur);
    const ease = 1 - Math.pow(1 - k, 3);
    const x = startX + (endX - startX) * ease;
    const y = startY + (endY - startY) * ease - Math.sin(Math.PI * k) * 90;
    prop.style.left = `${x}px`;
    prop.style.top = `${y}px`;
    prop.style.transform = `rotate(${ease * 540}deg)`;

    if (k < 1) requestAnimationFrame(step);
    else setTimeout(() => prop.remove(), 500);
  }
  requestAnimationFrame(step);
  log("Action: THROW_PROP (demo overlay)");
}

function animatePunch() {
  const from = getPanelRect(2) || getPanelRect(0);
  const to = getPanelRect(3) || getPanelRect(1) || getPanelRect(0);
  if (!from || !to) return;

  const startX = from.left + from.width * 0.85;
  const startY = from.top + from.height * 0.45;
  const endX = to.left + to.width * 0.15;
  const endY = to.top + to.height * 0.45;

  const prop = spawnProp("ĐẤM", startX, startY);

  const t0 = performance.now();
  const dur = 420;

  function step(t) {
    const k = Math.min(1, (t - t0) / dur);
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const x = startX + (endX - startX) * ease;
    const y = startY + (endY - startY) * ease;
    prop.style.left = `${x}px`;
    prop.style.top = `${y}px`;
    prop.style.transform = `scale(${1 + Math.sin(Math.PI * k) * 0.25})`;

    if (k < 1) requestAnimationFrame(step);
    else setTimeout(() => prop.remove(), 450);
  }
  requestAnimationFrame(step);
  log("Action: PUNCH (demo overlay)");
}

function animatePull() {
  const from = getPanelRect(3) || getPanelRect(0);
  const to = getPanelRect(0);
  if (!from || !to) return;

  const startX = from.left + from.width * 0.25;
  const startY = from.top + from.height * 0.35;
  const endX = to.left + to.width * 0.75;
  const endY = to.top + to.height * 0.35;

  const prop = spawnProp("KÉO", startX, startY);

  const t0 = performance.now();
  const dur = 720;

  function step(t) {
    const k = Math.min(1, (t - t0) / dur);
    const ease = 1 - Math.pow(1 - k, 4);
    const x = startX + (endX - startX) * ease;
    const y = startY + (endY - startY) * ease + Math.sin(Math.PI * k) * 16;
    prop.style.left = `${x}px`;
    prop.style.top = `${y}px`;
    prop.style.transform = `rotate(${Math.sin(Math.PI * k) * 18}deg)`;

    if (k < 1) requestAnimationFrame(step);
    else setTimeout(() => prop.remove(), 450);
  }
  requestAnimationFrame(step);
  log("Action: PULL (demo overlay)");
}

/* ========= Init ========= */
async function init() {
  try {
    log("Loading ADN JSON...");
    const [layoutsRaw, bgsRaw, charsRaw, actionsRaw, styleRaw] = await Promise.all([
      fetchJSON(ADN_FILES.layouts),
      fetchJSON(ADN_FILES.backgrounds),
      fetchJSON(ADN_FILES.characters),
      fetchJSON(ADN_FILES.actions),
      fetchJSON(ADN_FILES.style),
    ]);

    const layouts = ensureDefaultLayouts(normalizeLayouts(layoutsRaw));
    const backgrounds = normalizeBackgrounds(bgsRaw);
    const characters = normalizeCharacters(charsRaw);
    const actions = normalizeActions(actionsRaw);
    const style = normalizeStyle(styleRaw);

    state.adn = { layouts, backgrounds, characters, actions, style };

    log(`ADN loaded. layouts=${Object.keys(layouts).length}, backgrounds=${Object.keys(backgrounds).length}, characters=${Object.keys(characters).length}, actions=${Object.keys(actions).length}`);

    // render selects
    renderLayoutSelect();
    renderBgSelect();
    renderStyleSelect();

    // bind events
    $("layoutSelect").addEventListener("change", () => {
      state.layoutId = $("layoutSelect").value;
      setGridTemplate(state.layoutId);
    });

    $("panelSelect").addEventListener("change", () => {
      state.activePanelIndex = Number($("panelSelect").value || "0");
      syncSidebarFromState();
      highlightActivePanel();
    });

    $("bgSelect").addEventListener("change", () => {
      const p = state.panels[state.activePanelIndex];
      p.backgroundId = $("bgSelect").value;
      renderActorsOnPanels();
    });

    $("styleSelect").addEventListener("change", () => {
      const p = state.panels[state.activePanelIndex];
      p.styleId = $("styleSelect").value;
    });

    $("aspectSelect").addEventListener("change", () => {
      state.aspect = $("aspectSelect").value || "9:16";
    });

    $("sceneNote").addEventListener("input", () => {
      const p = state.panels[state.activePanelIndex];
      p.note = $("sceneNote").value;
    });

    $("motionNote").addEventListener("input", () => {
      const p = state.panels[state.activePanelIndex];
      p.motionNote = $("motionNote").value;
    });

    $("btnAddActor").addEventListener("click", () => {
      const p = state.panels[state.activePanelIndex];
      const firstChar = Object.keys(state.adn.characters)[0] || "";
      p.actors.push({ characterId: firstChar, actionId: "" });
      renderActorsList();
      renderActorsOnPanels();
    });

    $("btnExportJson").addEventListener("click", () => {
      const obj = buildSceneJSON();
      const txt = JSON.stringify(obj, null, 2);
      state.lastOutput = txt;
      state.lastOutputType = "json";
      $("output").textContent = txt;
      log("Exported JSON.");
    });

    $("btnExportPrompt").addEventListener("click", () => {
      const txt = buildPromptText();
      state.lastOutput = txt;
      state.lastOutputType = "prompt";
      $("output").textContent = txt;
      log("Exported Prompt.");
    });

    $("btnCopy").addEventListener("click", async () => {
      const txt = String(state.lastOutput || $("output").textContent || "");
      if (!txt.trim()) return;
      await copyToClipboard(txt);
    });

    $("btnDownload").addEventListener("click", () => {
      const txt = String(state.lastOutput || $("output").textContent || "");
      if (!txt.trim()) return;
      const name = state.lastOutputType === "prompt" ? "xnc_prompt.txt" : "xnc_scene.json";
      const mime = state.lastOutputType === "prompt" ? "text/plain;charset=utf-8" : "application/json;charset=utf-8";
      downloadText(name, txt, mime);
      log(`Downloaded ${name}`);
    });

    $("btnThrow").addEventListener("click", animateThrow);
    $("btnPunch").addEventListener("click", animatePunch);
    $("btnPull").addEventListener("click", animatePull);
    $("btnReset").addEventListener("click", () => {
      $("overlay").innerHTML = "";
      state.lastOutput = null;
      state.lastOutputType = null;
      $("output").textContent = "Đã reset overlay. Output giữ nguyên cho đến khi bạn xuất lại.";
      log("Reset overlay.");
    });

    // boot layout
    setGridTemplate(state.layoutId);

    // set initial panel bg/style default (nếu muốn)
    // (để trống mặc định, bạn tự chọn trong UI)

  } catch (err) {
    console.error(err);
    log(`ERROR: ${err.message || err}`);
    $("output").textContent =
      "Không load được ADN JSON.\n" +
      "Kiểm tra đường dẫn:\n" +
      Object.values(ADN_FILES).join("\n") +
      "\n\nLỗi: " + (err.message || err);
  }
}

init();
