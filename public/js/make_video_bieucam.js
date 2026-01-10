/* =========================
   XNC v14 - Clean Tab1
   Paths:
   - /adn/xomnganchuyen/XNC_characters.json
   - /substance/manifest.json
   ========================= */

const PATHS = {
  characters: "/adn/xomnganchuyen/XNC_characters.json",
  manifest: "/substance/manifest.json",
};

const DRAFT_KEY = "xnc_v14_draft_v1";
const LOCAL_STORY_KEY = "xnc_v14_story_local_v1";

const AppState = {
  version: 1,
  story: { id: "", title: "", rawText: "", characters: [] }, // participants: [{id,label}]
  data: { charactersAll: [], manifest: null, storiesIndex: [] }, // storiesIndex from manifest
  manifest: { storyId: "", scenes: [], styleDNA: "", tone: "XNC-A", aspect: "9:16", layout: "3_1top2", constraints: [] },
  ui: { tab: 1, activeSceneIndex: 0, activeFrameIndex: 0 }
};

/* ---------- Utils ---------- */
function $(id) { return document.getElementById(id); }
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function nowISO() { return new Date().toISOString(); }

function safeJsonParse(s, fallback=null) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

/* ---------- Persistence ---------- */
function persistDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(AppState));
}
function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  const data = safeJsonParse(raw, null);
  if (!data) return;
  Object.assign(AppState, data);
}
function saveLocalStory() {
  const obj = {
    id: AppState.story.id,
    title: AppState.story.title,
    story: AppState.story.rawText,
    characters: AppState.story.characters,
    updatedAt: nowISO(),
  };
  localStorage.setItem(LOCAL_STORY_KEY, JSON.stringify(obj));
}
function loadLocalStory() {
  const raw = localStorage.getItem(LOCAL_STORY_KEY);
  if (!raw) return null;
  return safeJsonParse(raw, null);
}

/* ---------- Fetch helper ---------- */
async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${res.statusText}`);
  return await res.json();
}

/* ---------- Data loaders ---------- */
async function loadCharacters() {
  const json = await fetchJSON(PATHS.characters);

  // support both {characters:[...]} or [...]
  const chars = Array.isArray(json) ? json : (Array.isArray(json.characters) ? json.characters : []);
  AppState.data.charactersAll = chars.map(c => ({
    id: c.id || c.charId || c.key || c.name || "",
    label: c.label || c.name || c.title || c.id || "",
    gender: c.gender || "",
    role: c.role || c.desc || ""
  })).filter(c => c.id && c.label);

  console.log("[XNC] Loaded characters:", AppState.data.charactersAll.length);
}

function normalizeStoriesFromManifest(manifestJson) {
  // Bạn đang dùng manifest để quản lý danh sách truyện.
  // Vì format thực tế có thể khác, mình hỗ trợ nhiều kiểu:
  // 1) { stories: [{id,title,file}] }
  // 2) [{id,title,file}]
  // 3) { items:[...] }
  const list =
    (Array.isArray(manifestJson) ? manifestJson :
    Array.isArray(manifestJson.stories) ? manifestJson.stories :
    Array.isArray(manifestJson.items) ? manifestJson.items :
    []);

  // mỗi item phải có path file json truyện
  // ưu tiên field: file | path | href | url
  return list.map(it => ({
    id: it.id || it.storyId || "",
    title: it.title || it.name || it.storyTitle || it.id || "(no title)",
    file: it.file || it.path || it.href || it.url || ""
  })).filter(x => x.file);
}

async function loadManifestIndex() {
  const mj = await fetchJSON(PATHS.manifest);
  AppState.data.manifest = mj;
  AppState.data.storiesIndex = normalizeStoriesFromManifest(mj);
  console.log("[XNC] Loaded manifest items:", AppState.data.storiesIndex.length);
}

/* ---------- State helpers ---------- */
function setState(mutator) {
  mutator(AppState);
  persistDraft();
  renderAll();
}

function setTab(tab) {
  setState(st => { st.ui.tab = tab; });
}

function getActiveScene() {
  return AppState.manifest.scenes[AppState.ui.activeSceneIndex] || null;
}
function getActiveFrame() {
  const s = getActiveScene();
  return s?.frames?.[AppState.ui.activeFrameIndex] || null;
}

function setActiveScene(idx) {
  setState(st => {
    st.ui.activeSceneIndex = clamp(idx, 0, Math.max(0, st.manifest.scenes.length - 1));
    st.ui.activeFrameIndex = 0;
  });
}
function setActiveFrame(idx) {
  setState(st => {
    const s = getActiveScene();
    const max = Math.max(0, (s?.frames?.length || 1) - 1);
    st.ui.activeFrameIndex = clamp(idx, 0, max);
  });
}

function requireParticipants() {
  if (!AppState.story.characters || AppState.story.characters.length === 0) {
    alert("Bạn cần chọn ít nhất 1 nhân vật tham gia.");
    return false;
  }
  return true;
}

/* ---------- Participants UI ---------- */
function renderParticipants() {
  const box = $("participantsBox");
  if (!box) return;

  const q = ($("participantsSearch")?.value || "").toLowerCase().trim();
  const selected = new Set(AppState.story.characters.map(c => c.id));

  const filtered = AppState.data.charactersAll.filter(c => {
    if (!q) return true;
    return (c.label || "").toLowerCase().includes(q) || (c.id || "").toLowerCase().includes(q);
  });

  box.innerHTML = filtered.map(c => {
    const checked = selected.has(c.id);
    return `
      <label class="char-row ${checked ? "checked" : ""}">
        <input type="checkbox" data-char-id="${escapeHtml(c.id)}" data-char-label="${escapeHtml(c.label)}" ${checked ? "checked" : ""}/>
        <b>${escapeHtml(c.label)}</b>
        <small>${escapeHtml(c.gender || "")}${c.role ? " • " + escapeHtml(c.role) : ""}</small>
      </label>
    `;
  }).join("");

  $("participantsCount").textContent = `Đã chọn: ${AppState.story.characters.length}`;

  // event delegation (bind once)
  box.onchange = (e) => {
    const cb = e.target;
    if (!cb || cb.tagName !== "INPUT") return;
    const id = cb.dataset.charId;
    const label = cb.dataset.charLabel;

    setState(st => {
      const map = new Map(st.story.characters.map(x => [x.id, x]));
      if (cb.checked) map.set(id, { id, label });
      else map.delete(id);
      st.story.characters = Array.from(map.values());
    });
  };
}

/* ---------- Manifest UI (story select) ---------- */
function renderStorySelect() {
  const sel = $("storySelect");
  if (!sel) return;
  const items = AppState.data.storiesIndex || [];
  const cur = sel.value;

  sel.innerHTML = `<option value="">-- Chọn truyện --</option>` + items.map(it => {
    const value = escapeHtml(it.file);
    const label = escapeHtml(`${it.id ? it.id + " • " : ""}${it.title}`);
    return `<option value="${value}">${label}</option>`;
  }).join("");

  // keep selection if possible
  if (cur) sel.value = cur;
  $("manifestStatus").textContent = `Manifest: ${items.length ? "OK ("+items.length+" truyện)" : "rỗng / sai format"}`;
}

/* ---------- Load story from selected item ---------- */
async function loadStoryFromSelected() {
  const file = $("storySelect").value;
  if (!file) {
    alert("Bạn chưa chọn truyện trong dropdown.");
    return;
  }

  // file có thể là relative trong /substance/..., hoặc absolute
  // file có thể là relative trong /substance/..., hoặc absolute
let path = String(file || "").trim();

// absolute url
if (/^https?:\/\//i.test(path)) {
  // giữ nguyên
} else {
  // bỏ ./ nếu có
  path = path.replace(/^\.\//, "");

  // nếu chưa có "/" đầu -> coi như tên file, mặc định nằm trong /substance/
  if (!path.startsWith("/")) path = "/substance/" + path;

  // nếu có "/" đầu nhưng không có "/substance/" và chỉ là "/XNC-....json" -> fix lại
  if (path.startsWith("/") && !path.startsWith("/substance/")) {
    // nếu chỉ là "/XNC-xxx.json" (không có thư mục)
    if (!path.slice(1).includes("/")) {
      path = "/substance/" + path.slice(1);
    }
  }
}

const storyJson = await fetchJSON(path);


  // support your existing story json:
  // { id, title, story, characters:[...] }
  const id = storyJson.id || storyJson.storyId || "";
  const title = storyJson.title || storyJson.name || "";
  const rawText = storyJson.story || storyJson.text || storyJson.content || "";

  // characters list could be ["Bô-Lô", ...] or [{id,label}]
  let participants = [];
  if (Array.isArray(storyJson.characters)) {
    if (typeof storyJson.characters[0] === "string") {
      // map label -> id by charactersAll label
      const labelSet = new Set(storyJson.characters);
      const mapped = AppState.data.charactersAll.filter(c => labelSet.has(c.label));
      participants = mapped.map(m => ({ id: m.id, label: m.label }));
    } else {
      participants = storyJson.characters.map(x => ({ id: x.id || x.char_id || "", label: x.label || x.name || "" })).filter(x => x.id);
    }
  }

  setState(st => {
    st.story.id = id || st.story.id;
    st.story.title = title || st.story.title;
    st.story.rawText = rawText || st.story.rawText;
    if (participants.length) st.story.characters = participants;
  });

  console.log("[XNC] Story loaded from:", path);
}

/* ---------- Scene splitting (basic, deterministic) ---------- */
function splitScenesFromStoryText(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  // Strategy:
  // - split blocks by "**[Scene:" marker if exists
  // - also treat Title/SFX lines before first Scene as S01
  const blocks = [];
  const re = /\*\*\[Scene:\s*([\s\S]*?)\]\*\*/g;
  let lastIndex = 0;
  let m;

  // collect "pre-scene" block
  while ((m = re.exec(text)) !== null) {
    const idx = m.index;
    const pre = text.slice(lastIndex, idx).trim();
    if (pre) blocks.push({ kind:"pre", header:"", body: pre });
    const header = m[0]; // full scene marker line
    lastIndex = idx;
    // move lastIndex to end of marker line
    // find line end
    const endLine = text.indexOf("\n", re.lastIndex);
    const markerEnd = endLine >= 0 ? endLine : re.lastIndex;
    // scene body starts after marker line
    const bodyStart = markerEnd;
    // next match index will define end
    const nextIdx = re.lastIndex; // placeholder, will be overwritten by loop; we handle after loop using lastIndex.
    // We'll push later by slicing from lastIndex to next marker.
  }

  // If we found at least 1 scene marker, we need a different approach:
  if (text.includes("**[Scene:")) {
    // Split by scene markers into segments
    const parts = text.split(/\*\*\[Scene:\s*[\s\S]*?\]\*\*\s*\n?/);
    const headers = text.match(/\*\*\[Scene:\s*[\s\S]*?\]\*\*/g) || [];

    // pre is parts[0]
    const pre = (parts[0] || "").trim();
    const out = [];
    if (pre) out.push({ id:"S01", title:"Intro", rawBlock: pre });

    for (let i = 1; i < parts.length; i++) {
      const body = (parts[i] || "").trim();
      const header = headers[i-1] || "**[Scene]**";
      const title = header.replace(/\*\*/g,"").replace(/^\[Scene:\s*/,"").replace(/\]$/,"").trim();
      out.push({ id: `S${String(out.length+1).padStart(2,"0")}`, title: title || `Scene ${i}`, rawBlock: header + "\n" + body });
    }
    return out;
  }

  // fallback: no explicit Scene marker -> split by blank lines into chunks (limit)
  const paras = text.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean);
  const out = paras.map((p, i) => ({ id:`S${String(i+1).padStart(2,"0")}`, title:`Block ${i+1}`, rawBlock: p }));
  return out;
}

function parseDialogueLines(rawBlock) {
  // Supported:
  // **Bô-Lô:** text
  // **[SFX: ...]**
  // plain lines kept as "narration"
  const lines = [];
  const rows = String(rawBlock || "").split("\n").map(s => s.trim()).filter(Boolean);

  let order = 1;
  for (const r of rows) {
    // SFX
    const sfx = r.match(/^\*\*\[SFX:\s*([\s\S]+?)\]\*\*$/i) || r.match(/^\[SFX:\s*([\s\S]+?)\]$/i);
    if (sfx) {
      lines.push({ order: order++, type:"sfx", text: sfx[1].trim() });
      continue;
    }

    // **Name:** dialogue
    const dm = r.match(/^\*\*([^*]+)\:\*\*\s*(.+)$/);
    if (dm) {
      const label = dm[1].trim();
      const text = dm[2].trim();

      // map label -> charId
      const found = AppState.data.charactersAll.find(c => c.label === label);
      const charId = found?.id || "";

      lines.push({ order: order++, type:"dialogue", charId, charLabel: label, text });
      continue;
    }

    // fallback narration
    lines.push({ order: order++, type:"narration", text: r });
  }
  return lines;
}

function buildDefaultFramesForScene(scene, mode) {
  const lines = parseDialogueLines(scene.rawBlock);

  // filter to only participants if selected (optional)
  const allow = new Set(AppState.story.characters.map(c => c.id));
  const filteredLines = lines.map(ln => {
    if (ln.type === "dialogue") {
      if (ln.charId && allow.size && !allow.has(ln.charId)) {
        // keep but charId empty (unmapped)
        return { ...ln, charId: "" };
      }
    }
    return ln;
  });

  const frames = [];

  if (mode === "closeup") {
    // each dialogue line becomes one frame (plus sfx lines become their own frame)
    let fi = 1;
    for (const ln of filteredLines) {
      if (ln.type === "dialogue") {
        frames.push({
          id: `${scene.id}_F${String(fi++).padStart(2,"0")}`,
          note: "",
          backgroundId: "",
          cameraAngle: "",
          cameraMove: "",
          duration: 1.5,
          actors: [
            { charId: ln.charId || "", actionId:"", faceId:"", outfitId:"", order:1 }
          ],
          lines: [ ln ]
        });
      } else if (ln.type === "sfx") {
        frames.push({
          id: `${scene.id}_F${String(fi++).padStart(2,"0")}`,
          note: "",
          backgroundId: "",
          cameraAngle: "",
          cameraMove: "",
          duration: 1.0,
          actors: [],
          lines: [ ln ]
        });
      }
    }
    return frames.length ? frames : [{
      id: `${scene.id}_F01`, note:"", backgroundId:"", cameraAngle:"", cameraMove:"", duration:1.5, actors:[], lines: filteredLines
    }];
  }

  if (mode === "dialogue") {
    // group dialogue turn-taking into frames (2-person shots), keep sfx separated
    let fi = 1;
    let buffer = [];
    for (const ln of filteredLines) {
      if (ln.type === "sfx") {
        if (buffer.length) {
          frames.push(makeDialogueFrame(scene.id, fi++, buffer));
          buffer = [];
        }
        frames.push({
          id: `${scene.id}_F${String(fi++).padStart(2,"0")}`,
          note:"",
          backgroundId:"",
          cameraAngle:"",
          cameraMove:"",
          duration: 1.0,
          actors: [],
          lines: [ln]
        });
        continue;
      }

      // accumulate and flush every 2-4 dialogue lines
      buffer.push(ln);
      if (buffer.length >= 4) {
        frames.push(makeDialogueFrame(scene.id, fi++, buffer));
        buffer = [];
      }
    }
    if (buffer.length) frames.push(makeDialogueFrame(scene.id, fi++, buffer));
    return frames.length ? frames : [{
      id: `${scene.id}_F01`, note:"", backgroundId:"", cameraAngle:"", cameraMove:"", duration:1.5, actors:[], lines: filteredLines
    }];
  }

  // hybrid: simple rule - 1 dialogue frame (3-4 lines) then 1 closeup frame (next 1 line) repeated
  if (mode === "hybrid") {
    let fi = 1;
    let i = 0;
    while (i < filteredLines.length) {
      const ln = filteredLines[i];
      if (ln.type === "sfx") {
        frames.push({
          id: `${scene.id}_F${String(fi++).padStart(2,"0")}`,
          note:"",
          backgroundId:"",
          cameraAngle:"",
          cameraMove:"",
          duration: 1.0,
          actors: [],
          lines: [ln]
        });
        i++;
        continue;
      }

      // dialogue chunk
      const chunk = [];
      while (i < filteredLines.length && chunk.length < 4 && filteredLines[i].type !== "sfx") {
        chunk.push(filteredLines[i]);
        i++;
      }
      if (chunk.length) frames.push(makeDialogueFrame(scene.id, fi++, chunk));

      // closeup one line if available
      while (i < filteredLines.length && filteredLines[i].type === "sfx") break;
      if (i < filteredLines.length && filteredLines[i].type === "dialogue") {
        const one = filteredLines[i];
        frames.push({
          id: `${scene.id}_F${String(fi++).padStart(2,"0")}`,
          note:"",
          backgroundId:"",
          cameraAngle:"",
          cameraMove:"",
          duration: 1.2,
          actors: [{ charId: one.charId || "", actionId:"", faceId:"", outfitId:"", order:1 }],
          lines: [one]
        });
        i++;
      }
    }
    return frames.length ? frames : [{
      id: `${scene.id}_F01`, note:"", backgroundId:"", cameraAngle:"", cameraMove:"", duration:1.5, actors:[], lines: filteredLines
    }];
  }

  return [{
    id: `${scene.id}_F01`, note:"", backgroundId:"", cameraAngle:"", cameraMove:"", duration:1.5, actors:[], lines: filteredLines
  }];
}

function makeDialogueFrame(sceneId, fi, lines) {
  // derive up to 2 characters from dialogue lines
  const seen = [];
  for (const ln of lines) {
    if (ln.type !== "dialogue") continue;
    const cid = ln.charId || "";
    if (cid && !seen.includes(cid)) seen.push(cid);
    if (seen.length >= 2) break;
  }
  return {
    id: `${sceneId}_F${String(fi).padStart(2,"0")}`,
    note:"",
    backgroundId:"",
    cameraAngle:"",
    cameraMove:"",
    duration: 1.5,
    actors: [
      { charId: seen[0] || "", actionId:"", faceId:"", outfitId:"", order:1 },
      { charId: seen[1] || "", actionId:"", faceId:"", outfitId:"", order:2 }
    ].filter(a => a.charId),
    lines
  };
}

/* ---------- Actions ---------- */
function splitScenesAndBuildManifest() {
  if (!requireParticipants()) return;

  const raw = AppState.story.rawText;
  const scenes = splitScenesFromStoryText(raw);

  const built = scenes.map((sc, idx) => {
    const mode = "dialogue"; // default
    const frames = buildDefaultFramesForScene(sc, mode);
    return {
      id: sc.id,
      title: sc.title,
      rawBlock: sc.rawBlock,
      note: "",
      mode,
      frames
    };
  });

  setState(st => {
    st.manifest.storyId = st.story.id || "XNC_STORY";
    st.manifest.scenes = built;
    st.ui.activeSceneIndex = 0;
    st.ui.activeFrameIndex = 0;
  });

  setPreview(AppState.manifest);
}

function setPreview(obj) {
  $("preview").textContent = JSON.stringify(obj, null, 2);
}

/* ---------- Scene editor bindings ---------- */
function renderSceneEditorSelectors() {
  const sceneSel = $("sceneSelect");
  const frameSel = $("frameSelect");
  const modeSel = $("modeSelect");
  if (!sceneSel || !frameSel || !modeSel) return;

  const scenes = AppState.manifest.scenes || [];
  sceneSel.innerHTML = scenes.length
    ? scenes.map((s, i) => `<option value="${i}">${escapeHtml(s.id)} • ${escapeHtml(s.title || "")}</option>`).join("")
    : `<option value="">--</option>`;

  if (scenes.length) sceneSel.value = String(AppState.ui.activeSceneIndex);

  const s = getActiveScene();
  const frames = s?.frames || [];
  frameSel.innerHTML = frames.length
    ? frames.map((f, i) => `<option value="${i}">${escapeHtml(f.id)}</option>`).join("")
    : `<option value="">--</option>`;
  if (frames.length) frameSel.value = String(AppState.ui.activeFrameIndex);

  // mode reflects scene
  if (s?.mode) modeSel.value = s.mode;

  // active label
  const f = getActiveFrame();
  $("activeLabel").textContent = s ? `${s.id} • ${f?.id || "no frame"} • Mode: ${s.mode || "?"}` : "Chưa có Scene";

  // notes
  $("sceneNote").value = s?.note || "";
  $("frameNote").value = f?.note || "";

  // handlers
  sceneSel.onchange = () => setActiveScene(parseInt(sceneSel.value, 10) || 0);
  frameSel.onchange = () => setActiveFrame(parseInt(frameSel.value, 10) || 0);

  modeSel.onchange = () => {
    const newMode = modeSel.value;
    setState(st => {
      const ss = st.manifest.scenes[st.ui.activeSceneIndex];
      if (!ss) return;
      ss.mode = newMode;
      // regenerate frames skeleton from rawBlock (clean behavior)
      ss.frames = buildDefaultFramesForScene({ id:ss.id, rawBlock:ss.rawBlock }, newMode);
      st.ui.activeFrameIndex = 0;
    });
  };

  $("sceneNote").oninput = (e) => {
    const v = e.target.value;
    setState(st => {
      const ss = st.manifest.scenes[st.ui.activeSceneIndex];
      if (ss) ss.note = v;
    });
  };
  $("frameNote").oninput = (e) => {
    const v = e.target.value;
    setState(st => {
      const ss = st.manifest.scenes[st.ui.activeSceneIndex];
      const ff = ss?.frames?.[st.ui.activeFrameIndex];
      if (ff) ff.note = v;
    });
  };
}

function renderSceneList() {
  const box = $("sceneList");
  if (!box) return;

  const scenes = AppState.manifest.scenes || [];
  if (!scenes.length) {
    box.innerHTML = `<div class="muted">Chưa tách scene. Bấm “Tách Scene & Thoại” để tạo manifest.</div>`;
    return;
  }

  box.innerHTML = scenes.map((s, i) => {
    const chars = AppState.story.characters.map(x => x.label).join(", ");
    return `
      <div class="scene-item">
        <div class="head">
          <div>
            <div class="title">${escapeHtml(s.id)} — ${escapeHtml(s.title || "")}</div>
            <div class="muted">Nhân vật (global): ${escapeHtml(chars || "(chưa chọn)")}</div>
          </div>
          <div class="row" style="margin:0;">
            <span class="pill">Mode: ${escapeHtml(s.mode)}</span>
            <button class="btn" data-goto-scene="${i}">Chỉnh</button>
          </div>
        </div>

        <details>
          <summary>Xem raw block</summary>
          <pre style="white-space:pre-wrap; color:#111; background:#fff; border:1px solid #eee;">${escapeHtml(s.rawBlock)}</pre>
        </details>

        <details>
          <summary>Xem frames (${(s.frames||[]).length})</summary>
          ${(s.frames||[]).map(f => `
            <div style="margin-top:8px; padding:8px; border:1px solid #eee; border-radius:8px; background:#fff;">
              <div><b>${escapeHtml(f.id)}</b> <span class="muted">duration ${escapeHtml(f.duration)}</span></div>
              <div class="muted">actors: ${(f.actors||[]).map(a => escapeHtml(a.charId)).join(", ") || "-"}</div>
              <div style="margin-top:6px;">
                ${(f.lines||[]).map(ln => {
                  if (ln.type === "dialogue") return `<div>• <b>${escapeHtml(ln.charLabel||ln.charId||"?")}</b>: ${escapeHtml(ln.text)}</div>`;
                  if (ln.type === "sfx") return `<div>• <i>[SFX]</i> ${escapeHtml(ln.text)}</div>`;
                  return `<div>• ${escapeHtml(ln.text)}</div>`;
                }).join("")}
              </div>
            </div>
          `).join("")}
        </details>
      </div>
    `;
  }).join("");

  // bind goto buttons
  box.querySelectorAll("[data-goto-scene]").forEach(btn => {
    btn.onclick = () => setActiveScene(parseInt(btn.dataset.gotoScene, 10) || 0);
  });
}
//=======================================
function normalizeStoryPath(p) {
  if (!p) return "";
  p = String(p).trim();

  // Nếu đã là URL tuyệt đối http(s) thì giữ nguyên
  if (/^https?:\/\//i.test(p)) return p;

  // Nếu đã có "/substance/" hoặc bắt đầu bằng "/" thì giữ nguyên (chỉ fix trường hợp thiếu)
  if (p.startsWith("/")) return p;

  // Nếu manifest chỉ ghi "XNC-xxxx.json" thì tự prefix folder đúng
  return "/substance/" + p.replace(/^\.?\//, "");
}

/* ---------- Main render ---------- */
function renderAll() {
  // tabs
  $("tab1").style.display = AppState.ui.tab === 1 ? "" : "none";
  $("tab2").style.display = AppState.ui.tab === 2 ? "" : "none";

  // story fields
  $("storyId").value = AppState.story.id || "";
  $("storyTitle").value = AppState.story.title || "";
  $("storyText").value = AppState.story.rawText || "";

  renderStorySelect();
  renderParticipants();
  renderSceneEditorSelectors();
  renderSceneList();
}

/* ---------- Events ---------- */
function bindEvents() {
  $("btnTab1").onclick = () => setTab(1);
  $("btnTab2").onclick = () => setTab(2);

  $("btnReloadManifest").onclick = async () => {
    try { await loadManifestIndex(); renderAll(); }
    catch (e) { alert("Load manifest lỗi: " + e.message); }
  };

  $("btnLoadStory").onclick = async () => {
    try { await loadStoryFromSelected(); }
    catch (e) { alert("Load truyện lỗi: " + e.message); }
  };

  $("participantsSearch").oninput = () => renderParticipants();

  $("btnPickAll").onclick = () => {
    setState(st => {
      st.story.characters = st.data.charactersAll.map(c => ({ id:c.id, label:c.label }));
    });
  };
  $("btnPickNone").onclick = () => {
    setState(st => { st.story.characters = []; });
  };

  $("storyId").oninput = (e) => setState(st => { st.story.id = e.target.value; });
  $("storyTitle").oninput = (e) => setState(st => { st.story.title = e.target.value; });
  $("storyText").oninput = (e) => setState(st => { st.story.rawText = e.target.value; });

  $("btnSaveLocal").onclick = () => { saveLocalStory(); alert("Đã lưu story local."); };

  $("btnExportStory").onclick = () => {
    if (!requireParticipants()) return;
    const out = {
      id: AppState.story.id,
      title: AppState.story.title,
      story: AppState.story.rawText,
      characters: AppState.story.characters.map(c => c.label),
      updatedAt: nowISO()
    };
    downloadJSON(out, `${AppState.story.id || "story"}_story.json`);
  };

  $("btnSplit").onclick = () => {
    try { splitScenesAndBuildManifest(); }
    catch (e) { alert("Tách scene lỗi: " + e.message); }
  };

  $("btnExportDialogue").onclick = () => {
    const out = {
      version: 1,
      storyId: AppState.story.id,
      title: AppState.story.title,
      participants: AppState.story.characters,
      lines: []
    };

    (AppState.manifest.scenes || []).forEach(s => {
      (s.frames || []).forEach(f => {
        (f.lines || []).forEach(ln => {
          if (ln.type === "dialogue") {
            out.lines.push({
              scene: s.id,
              frame: f.id,
              order: ln.order,
              charId: ln.charId || "",
              charLabel: ln.charLabel || "",
              text: ln.text
            });
          }
        });
      });
    });

    downloadJSON(out, `${AppState.story.id || "story"}_dialogue.json`);
  };

  $("btnClearPreview").onclick = () => { $("preview").textContent = "{}"; };

  $("btnPrevScene").onclick = () => setActiveScene(AppState.ui.activeSceneIndex - 1);
  $("btnNextScene").onclick = () => setActiveScene(AppState.ui.activeSceneIndex + 1);
}

/* ---------- Boot ---------- */
async function boot() {
  loadDraft();

  try { await loadCharacters(); }
  catch (e) { console.warn("Load characters failed:", e.message); }

  try { await loadManifestIndex(); }
  catch (e) { console.warn("Load manifest failed:", e.message); }

  // if no story loaded, try local
  if (!AppState.story.rawText) {
    const local = loadLocalStory();
    if (local?.story) {
      AppState.story.id = local.id || "";
      AppState.story.title = local.title || "";
      AppState.story.rawText = local.story || "";
      if (Array.isArray(local.characters)) AppState.story.characters = local.characters;
    }
  }

  bindEvents();
  renderAll();

  console.log("[XNC] v14 ready. characters:", AppState.data.charactersAll.length, "stories:", AppState.data.storiesIndex.length);
}

document.addEventListener("DOMContentLoaded", boot);
