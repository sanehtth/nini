/* =========================================================
   XNC Motion Comic Builder (FULL)
   - Load ADN JSONs: layouts/backgrounds/characters/actions/style
   - Choose layout -> auto build panels
   - Choose panel -> configure background/style/aspect + add actors/actions
   - Export JSON + Export Prompt (Image/Video ready)
   ========================================================= */

/* ---------- DOM helpers ---------- */
const $ = (id) => document.getElementById(id);
const on = (id, evt, fn) => $(id)?.addEventListener(evt, fn);

function log(msg) {
  const box = $("logBox") || $("log") || $("logOutput");
  const t = `[${new Date().toLocaleTimeString()}] ${msg}`;
  if (box) {
    box.textContent = (box.textContent ? box.textContent + "\n" : "") + t;
    box.scrollTop = box.scrollHeight;
  }
  console.log(t);
}

/* ---------- Safe read helpers (schema tolerant) ---------- */
function pick(obj, keys, fallback) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return fallback;
}

function normalizeDict(maybeDict, fallbackKey = "items") {
  // Accept:
  // - { items: {...} } or { backgrounds: {...} } or { characters: {...} }
  // - direct dict: { id: {...}, id2: {...} }
  if (!maybeDict) return {};
  if (typeof maybeDict !== "object") return {};
  // If it already looks like a dict of records (has many keys and each value is object)
  const keys = Object.keys(maybeDict);
  if (keys.length && typeof maybeDict[keys[0]] === "object") {
    // could still be wrapper; try common wrappers first
    const wrapped =
      maybeDict.layouts ||
      maybeDict.backgrounds ||
      maybeDict.characters ||
      maybeDict.actions ||
      maybeDict.styles ||
      maybeDict.items;
    if (wrapped && typeof wrapped === "object") return wrapped;
    return maybeDict;
  }
  // wrapper
  return maybeDict[fallbackKey] || {};
}

function getTextDesc(x) {
  return (
    pick(x, ["desc", "description", "dna", "prompt", "text"], "") || ""
  ).toString();
}

/* ---------- Config ---------- */
function getQueryParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

// Cho phép đổi series sau này: ?adn=xomnganchuyen
const ADN_ID = getQueryParam("adn") || "xomnganchuyen";
const ADN_BASE = `/adn/${ADN_ID}`;

// Các file bạn vừa add
const ADN_FILES = {
  layouts: `${ADN_BASE}/XNC_layouts.json`,
  backgrounds: `${ADN_BASE}/XNC_backgrounds.json`,
  characters: `${ADN_BASE}/XNC_characters.json`,
  actions: `${ADN_BASE}/XNC_actions.json`,
  style: `${ADN_BASE}/XNC_style.json`
};

const DEFAULT_ASPECTS = [
  { id: "9:16", label: "9:16 (Short)" },
  { id: "16:9", label: "16:9 (Video)" },
  { id: "1:1", label: "1:1 (Square)" }
];

/* ---------- Global ADN store ---------- */
const ADN = {
  layouts: {},
  backgrounds: {},
  characters: {},
  actions: {},
  style: {}
};

/* ---------- State ---------- */
const state = {
  layoutId: "",
  aspect: "9:16",
  styleId: "style",
  activePanelIndex: 0,
  panelCount: 4,
  panels: [] // each: { backgroundId, actors:[{charId, actionId}] , motionNote:"" }
};

/* ---------- Load ADN JSONs ---------- */
async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return await res.json();
}

async function loadADN() {
  log("Loading ADN JSON...");
  const [layouts, backgrounds, characters, actions, style] = await Promise.all([
    loadJSON(ADN_FILES.layouts),
    loadJSON(ADN_FILES.backgrounds),
    loadJSON(ADN_FILES.characters),
    loadJSON(ADN_FILES.actions),
    loadJSON(ADN_FILES.style)
  ]);

  ADN.layouts = normalizeDict(layouts, "layouts");
  ADN.backgrounds = normalizeDict(backgrounds, "backgrounds");
  ADN.characters = normalizeDict(characters, "characters");
  ADN.actions = normalizeDict(actions, "actions");
  ADN.style = style || {};

  log("ADN loaded OK.");
}

/* ---------- Ensure panels in state ---------- */
function ensurePanelCount(n) {
  state.panelCount = n;

  while (state.panels.length < n) {
    state.panels.push({
      backgroundId: "",
      actors: [],
      motionNote: ""
    });
  }
  while (state.panels.length > n) {
    state.panels.pop();
  }

  if (state.activePanelIndex >= n) state.activePanelIndex = 0;
}

/* ---------- UI render ---------- */
function renderLayoutSelect() {
  const select = $("layoutSelect");
  if (!select) return;

  const ids = Object.keys(ADN.layouts || {});
  select.innerHTML = "";

  if (!ids.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(Chưa có layout – kiểm tra XNC_layouts.json)";
    select.appendChild(opt);
    return;
  }

  // sort stable: 1->4 first if id naming L1/L2/L3/L4
  ids.sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));

  for (const id of ids) {
    const item = ADN.layouts[id] || {};
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = item.label || item.name || id;
    select.appendChild(opt);
  }

  if (!state.layoutId || !ADN.layouts[state.layoutId]) {
    state.layoutId = ids[0];
  }
  select.value = state.layoutId;

  select.onchange = () => {
    state.layoutId = select.value;
    setGridTemplate(state.layoutId);
  };
}

function renderAspectSelect() {
  const select = $("aspectSelect") || $("aspect");
  if (!select) return;

  select.innerHTML = "";
  for (const a of DEFAULT_ASPECTS) {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.label;
    select.appendChild(opt);
  }
  select.value = state.aspect;

  select.onchange = () => {
    state.aspect = select.value || "9:16";
  };
}

function renderStyleSelect() {
  const select = $("styleSelect") || $("toneSelect") || $("style");
  if (!select) return;

  // XNC_style.json có thể có {style:{...}} hoặc {styles:{...}}...
  const styles = normalizeDict(ADN.style, "styles");
  const ids = Object.keys(styles || {});
  select.innerHTML = "";

  if (!ids.length) {
    const opt = document.createElement("option");
    opt.value = "style";
    opt.textContent = "style";
    select.appendChild(opt);
    select.value = "style";
    state.styleId = "style";
    return;
  }

  ids.sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  for (const id of ids) {
    const it = styles[id] || {};
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = it.label || it.name || id;
    select.appendChild(opt);
  }

  if (!state.styleId || !styles[state.styleId]) state.styleId = ids[0];
  select.value = state.styleId;

  select.onchange = () => {
    state.styleId = select.value;
  };
}

function renderBackgroundSelect() {
  const select = $("bgSelect") || $("backgroundSelect") || $("background");
  if (!select) return;

  const ids = Object.keys(ADN.backgrounds || {});
  select.innerHTML = "";

  // placeholder
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "-- Chọn bối cảnh --";
  select.appendChild(ph);

  ids.sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  for (const id of ids) {
    const it = ADN.backgrounds[id] || {};
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = it.label || it.name || id;
    select.appendChild(opt);
  }

  // set from active panel
  const p = state.panels[state.activePanelIndex];
  select.value = p?.backgroundId || "";

  select.onchange = () => {
    const panel = state.panels[state.activePanelIndex];
    if (!panel) return;
    panel.backgroundId = select.value || "";
    renderPanelBackground();
  };
}

function renderCharacterSelect() {
  const select = $("charSelect") || $("characterSelect");
  if (!select) return;

  const ids = Object.keys(ADN.characters || {});
  select.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "-- Chọn nhân vật --";
  select.appendChild(ph);

  ids.sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  for (const id of ids) {
    const it = ADN.characters[id] || {};
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = it.name || it.label || id;
    select.appendChild(opt);
  }
}

function renderActionSelect() {
  const select = $("actionSelect");
  if (!select) return;

  const ids = Object.keys(ADN.actions || {});
  select.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "-- Chọn hành động/biểu cảm --";
  select.appendChild(ph);

  ids.sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  for (const id of ids) {
    const it = ADN.actions[id] || {};
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = it.label || it.name || id;
    select.appendChild(opt);
  }
}

function renderPanelSelect() {
  const select = $("panelSelect");
  if (!select) return;

  const count = state.panelCount || state.panels.length || 1;

  select.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `P${i + 1}`;
    select.appendChild(opt);
  }

  if (typeof state.activePanelIndex !== "number") state.activePanelIndex = 0;
  if (state.activePanelIndex < 0 || state.activePanelIndex >= count) state.activePanelIndex = 0;

  select.value = String(state.activePanelIndex);

  select.onchange = () => {
    state.activePanelIndex = Number(select.value) || 0;
    syncSidebarFromState();
    highlightActivePanel();
  };
}

function syncSidebarFromState() {
  renderBackgroundSelect();
  renderActorsEditor();
  const note = $("motionNote");
  if (note) note.value = state.panels[state.activePanelIndex]?.motionNote || "";
}

function highlightActivePanel() {
  const grid = $("grid");
  if (!grid) return;
  const nodes = grid.querySelectorAll(".panel");
  nodes.forEach((n) => n.classList.remove("active"));
  const active = grid.querySelector(`.panel[data-panel-index="${state.activePanelIndex}"]`);
  active?.classList.add("active");
}

/* ---------- Panel visuals ---------- */
function renderPanelBackground() {
  const grid = $("grid");
  if (!grid) return;
  const panels = grid.querySelectorAll(".panel");
  panels.forEach((panelEl) => {
    const idx = Number(panelEl.dataset.panelIndex || "0");
    const stPanel = state.panels[idx];
    const bgId = stPanel?.backgroundId || "";
    const bg = bgId ? ADN.backgrounds[bgId] : null;
    const bgDesc = bg ? (bg.preview || bg.image || bg.url || "") : "";

    const bgLayer = panelEl.querySelector(".panelBg");
    if (bgLayer) {
      // demo: nếu có ảnh preview -> set background-image, không thì gradient ADN
      if (bgDesc && typeof bgDesc === "string" && (bgDesc.startsWith("http") || bgDesc.startsWith("/") || bgDesc.endsWith(".png") || bgDesc.endsWith(".jpg") || bgDesc.endsWith(".jpeg") || bgDesc.endsWith(".webp"))) {
        bgLayer.style.backgroundImage = `url("${bgDesc}")`;
        bgLayer.style.backgroundSize = "cover";
        bgLayer.style.backgroundPosition = "center";
      } else {
        bgLayer.style.backgroundImage = "";
      }
    }
  });
}

/* ---------- Actors editor per panel ---------- */
function renderActorsEditor() {
  const wrap = $("actorsWrap") || $("actorsList") || $("actorsContainer");
  if (!wrap) return;

  const panel = state.panels[state.activePanelIndex];
  wrap.innerHTML = "";

  const list = panel?.actors || [];
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Chưa có nhân vật trong panel này. Bấm +Add để thêm.";
    wrap.appendChild(empty);
    return;
  }

  list.forEach((a, i) => {
    const row = document.createElement("div");
    row.className = "actorRow";

    const charSel = document.createElement("select");
    charSel.className = "actorChar";
    charSel.innerHTML = `<option value="">-- nhân vật --</option>`;
    Object.keys(ADN.characters).sort((x,y)=>x.localeCompare(y,"vi",{numeric:true})).forEach((id) => {
      const it = ADN.characters[id] || {};
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = it.name || it.label || id;
      charSel.appendChild(opt);
    });
    charSel.value = a.charId || "";
    charSel.onchange = () => {
      a.charId = charSel.value || "";
    };

    const actSel = document.createElement("select");
    actSel.className = "actorAction";
    actSel.innerHTML = `<option value="">-- hành động/biểu cảm --</option>`;
    Object.keys(ADN.actions).sort((x,y)=>x.localeCompare(y,"vi",{numeric:true})).forEach((id) => {
      const it = ADN.actions[id] || {};
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = it.label || it.name || id;
      actSel.appendChild(opt);
    });
    actSel.value = a.actionId || "";
    actSel.onchange = () => {
      a.actionId = actSel.value || "";
    };

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btnDel";
    btnDel.textContent = "×";
    btnDel.onclick = () => {
      panel.actors.splice(i, 1);
      renderActorsEditor();
      renderActorsOnPanels();
    };

    row.appendChild(charSel);
    row.appendChild(actSel);
    row.appendChild(btnDel);
    wrap.appendChild(row);
  });
}

/* ---------- Render actor badges into panels (simple preview) ---------- */
function renderActorsOnPanels() {
  const grid = $("grid");
  if (!grid) return;

  const panelEls = grid.querySelectorAll(".panel");
  panelEls.forEach((panelEl) => {
    const idx = Number(panelEl.dataset.panelIndex || "0");
    const stPanel = state.panels[idx];

    // remove old badges
    panelEl.querySelectorAll(".actorBadge").forEach((x) => x.remove());

    (stPanel?.actors || []).forEach((a) => {
      const name = a.charId ? (ADN.characters[a.charId]?.name || a.charId) : "NV?";
      const badge = document.createElement("div");
      badge.className = "actorBadge";
      badge.textContent = name;
      panelEl.appendChild(badge);
    });
  });
}

/* ---------- Layout engine (YOUR requested function, fixed) ---------- */
function setGridTemplate(layoutId) {
  const layouts = ADN.layouts || {};
  const layout = layouts[layoutId];

  const grid = $("grid");
  if (!grid) return;

  // panel count priority
  const panelCount = Number(
    pick(layout, ["panels", "panelCount", "count"], 4)
  );

  // reset
  grid.style.gridTemplateColumns = "";
  grid.style.gridTemplateRows = "";
  grid.style.gridTemplateAreas = "";

  // apply css if provided
  if (layout?.css) {
    const css = String(layout.css);

    const cols = /grid-template-columns\s*:\s*([^;]+)/i.exec(css);
    const rows = /grid-template-rows\s*:\s*([^;]+)/i.exec(css);
    const areas = /grid-template-areas\s*:\s*([^;]+)/i.exec(css);

    if (cols) grid.style.gridTemplateColumns = cols[1].trim();
    if (rows) grid.style.gridTemplateRows = rows[1].trim();
    if (areas) grid.style.gridTemplateAreas = areas[1].trim().replace(/\s+/g, " ");
  } else {
    // fallback basic
    if (panelCount === 1) {
      grid.style.gridTemplateColumns = "1fr";
      grid.style.gridTemplateRows = "1fr";
    } else if (panelCount === 2) {
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gridTemplateRows = "1fr";
    } else {
      grid.style.gridTemplateColumns = "1fr 1fr";
      grid.style.gridTemplateRows = "1fr 1fr";
    }
  }

  // rebuild panels DOM
  grid.innerHTML = "";

  // Map areas for up to 4
  const areaMap = ["a", "b", "c", "d"];

  for (let i = 0; i < panelCount; i++) {
    const p = document.createElement("div");
    p.className = "panel";
    p.dataset.panelIndex = String(i);

    if (grid.style.gridTemplateAreas) {
      p.style.gridArea = areaMap[i] || "";
    }

    p.innerHTML = `
      <div class="panelBg"></div>
      <div class="panelTag">P${i + 1}</div>
    `;

    p.addEventListener("click", () => {
      state.activePanelIndex = i;
      renderPanelSelect();
      syncSidebarFromState();
      highlightActivePanel();
    });

    grid.appendChild(p);
  }

  ensurePanelCount(panelCount);

  // re-render
  renderPanelSelect();
  syncSidebarFromState();
  renderPanelBackground();
  renderActorsOnPanels();
  highlightActivePanel();

  log(`Layout set: ${layoutId} (${panelCount} panels)`);
}

/* ---------- Add actor to active panel ---------- */
function addActorFromUI() {
  const charId = ($("charSelect")?.value || "").trim();
  const actionId = ($("actionSelect")?.value || "").trim();

  if (!charId) {
    alert("Chọn nhân vật trước.");
    return;
  }

  const panel = state.panels[state.activePanelIndex];
  panel.actors.push({ charId, actionId });

  renderActorsEditor();
  renderActorsOnPanels();
}

/* ---------- Motion note ---------- */
function bindMotionNote() {
  const note = $("motionNote");
  if (!note) return;
  note.addEventListener("input", () => {
    const panel = state.panels[state.activePanelIndex];
    if (panel) panel.motionNote = note.value || "";
  });
}

/* ---------- Build output JSON ---------- */
function buildSceneJSON() {
  const layouts = ADN.layouts || {};
  const layout = layouts[state.layoutId] || {};

  // style text
  const styles = normalizeDict(ADN.style, "styles");
  const styleObj = styles[state.styleId] || styles.style || ADN.style.style || {};
  const styleDNA = getTextDesc(styleObj) || getTextDesc(ADN.style) || "";

  const out = {
    meta: {
      series: ADN_ID,
      layoutId: state.layoutId,
      layoutLabel: layout.label || layout.name || state.layoutId,
      aspect: state.aspect,
      styleId: state.styleId
    },
    style: {
      label: styleObj.label || styleObj.name || state.styleId,
      dna: styleDNA
    },
    panels: state.panels.map((p, idx) => {
      const bg = p.backgroundId ? ADN.backgrounds[p.backgroundId] : null;
      return {
        id: `P${idx + 1}`,
        backgroundId: p.backgroundId || "",
        backgroundLabel: bg?.label || bg?.name || "",
        backgroundDesc: bg ? getTextDesc(bg) : "",
        motionNote: p.motionNote || "",
        actors: (p.actors || []).map((a) => {
          const ch = a.charId ? ADN.characters[a.charId] : null;
          const ac = a.actionId ? ADN.actions[a.actionId] : null;
          return {
            charId: a.charId || "",
            charName: ch?.name || ch?.label || "",
            charRole: ch?.role || "",
            actionId: a.actionId || "",
            actionLabel: ac?.label || ac?.name || "",
            actionDesc: ac ? getTextDesc(ac) : ""
          };
        })
      };
    })
  };

  return out;
}

/* ---------- Build prompt (image/video) ---------- */
function buildPrompt() {
  const scene = buildSceneJSON();

  const baseConstraints =
    "no text, no subtitles, no UI, consistent characters, clean illustration, comic panel framing";

  const lines = [];
  if (scene.style?.dna) {
    lines.push(`STYLE DNA (XNC): ${scene.style.dna}`);
  } else {
    lines.push(`STYLE DNA (XNC): pastel chibi 2D, green-brown Vietnamese vibe, clean illustration, soft lighting`);
  }

  lines.push(`ASPECT: ${scene.meta.aspect}`);

  scene.panels.forEach((p) => {
    lines.push("");
    lines.push(`PANEL ${p.id}:`);

    if (p.backgroundLabel || p.backgroundDesc) {
      const bgLine = [p.backgroundLabel, p.backgroundDesc].filter(Boolean).join(" — ");
      lines.push(`Background: ${bgLine}`);
    } else {
      lines.push(`Background: (none)`);
    }

    if (p.actors?.length) {
      lines.push(`Actors:`);
      p.actors.forEach((a) => {
        const part = [
          a.charName ? `${a.charName}` : a.charId || "Unknown",
          a.charRole ? `(${a.charRole})` : "",
          a.actionDesc ? `— ${a.actionDesc}` : ""
        ].filter(Boolean).join(" ");
        lines.push(`- ${part}`);
      });
    } else {
      lines.push(`Actors: (none)`);
    }

    if (p.motionNote) {
      lines.push(`Motion note: ${p.motionNote}`);
    }

    lines.push(`Constraints: ${baseConstraints}.`);
  });

  return lines.join("\n");
}

/* ---------- Output UI ---------- */
function setOutput(text) {
  const out = $("output") || $("outputBox") || $("outputArea");
  if (out) out.value != null ? (out.value = text) : (out.textContent = text);
}

async function copyOutput() {
  const out = $("output") || $("outputBox") || $("outputArea");
  const text = out?.value ?? out?.textContent ?? "";
  if (!text) return;
  await navigator.clipboard.writeText(text);
  log("Copied output to clipboard.");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Action buttons (optional) ---------- */
function wireQuickActions() {
  // If your HTML has these IDs, we enable them.
  on("btnThrow", "click", () => log("Action: THROW_PROP (demo)"));
  on("btnPunch", "click", () => log("Action: PUNCH (demo)"));
  on("btnPull", "click", () => log("Action: PULL (demo)"));

  on("btnReset", "click", () => {
    // reset state (keep ADN loaded)
    state.layoutId = Object.keys(ADN.layouts)[0] || "";
    state.aspect = "9:16";
    state.styleId = "style";
    state.activePanelIndex = 0;
    state.panels = [];
    ensurePanelCount(4);
    renderLayoutSelect();
    renderAspectSelect();
    renderStyleSelect();
    setGridTemplate(state.layoutId);
    setOutput("Đã reset.");
    log("Reset scene.");
  });
}

/* ---------- Export buttons ---------- */
function wireExportButtons() {
  on("btnExportJson", "click", () => {
    const json = buildSceneJSON();
    setOutput(JSON.stringify(json, null, 2));
    log("Export JSON done.");
  });

  on("btnExportPrompt", "click", () => {
    const prompt = buildPrompt();
    setOutput(prompt);
    log("Export Prompt done.");
  });

  on("btnCopy", "click", copyOutput);

  on("btnDownload", "click", () => {
    const out = $("output") || $("outputBox") || $("outputArea");
    const text = out?.value ?? out?.textContent ?? "";
    if (!text) return;

    const isJson = text.trim().startsWith("{") || text.trim().startsWith("[");
    downloadText(isJson ? "xnc_scene.json" : "xnc_prompt.txt", text);
    log("Downloaded output.");
  });

  on("btnAddActor", "click", () => {
    addActorFromUI();
  });
}

/* ---------- Init ---------- */
async function init() {
  try {
    await loadADN();

    // init state defaults
    const layoutIds = Object.keys(ADN.layouts || {});
    if (!layoutIds.length) {
      alert("Không tìm thấy layout. Kiểm tra XNC_layouts.json");
      return;
    }
    state.layoutId = layoutIds.sort((a,b)=>a.localeCompare(b,"vi",{numeric:true}))[0];

    ensurePanelCount(4);

    // render dropdowns
    renderLayoutSelect();
    renderAspectSelect();
    renderStyleSelect();
    renderPanelSelect();
    renderBackgroundSelect();
    renderCharacterSelect();
    renderActionSelect();
    bindMotionNote();

    // apply initial layout
    setGridTemplate(state.layoutId);

    // exports
    wireExportButtons();

    // optional actions
    wireQuickActions();

    log("Ready.");
  } catch (err) {
    console.error(err);
    log("ERROR: " + (err?.message || String(err)));
    alert("Lỗi load ADN: " + (err?.message || String(err)) + "\n\nKiểm tra:\n- Đường dẫn /adn/<series>/XNC_*.json\n- JSON có hợp lệ không\n- Hard refresh (Ctrl+F5)");
  }
}

document.addEventListener("DOMContentLoaded", init);
