/* ============================
   XNC - make_video_bieucam.js
   Clean rebuild: manifest + load story + participants + split scenes
   ============================ */

(() => {
  // ---------- Config paths (URL when deployed) ----------
  const PATHS = {
    // user said: public/adn/xomnganchuyen/XNC_characters.json
    characters: "/adn/xomnganchuyen/XNC_characters.json",

    // user said: public/substance/manifest.json  => URL: /substance/manifest.json
    manifest: "/substance/manifest.json",
  };

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);

  // ---------- State ----------
  const AppState = {
    data: {
      charactersAll: [], // [{id,label,gender,role}]
      manifestItems: [], // normalized [{id,title,file,updatedAt}]
    },
    story: {
      id: "",
      title: "",
      rawText: "",
      characters: [], // selected participant IDs
      storyFile: "",  // loaded file path
    },
    scene_manifest: null,  // built after split
    ui: {
      currentSceneIdx: 0,
      currentFrameIdx: 0,
    }
  };

  // ---------- Local keys ----------
  const LOCAL_STORY_KEY = "xnc_local_story_v1";
  const LOCAL_DIALOGUE_KEY = "xnc_dialogue_export_v1";
  const LOCAL_SCENE_DRAFT_KEY = "xnc_scene_manifest_draft_v1";

  // ---------- Safe JSON parse ----------
  function safeJSONParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  // ---------- fetch JSON (no-cache) ----------
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return await res.json();
  }

  // Some repos might have multiple manifest names; try first OK.
  async function loadJSONFirstOk(urls) {
    let lastErr = null;
    for (const u of urls) {
      try {
        const json = await fetchJSON(u);
        return { url: u, json };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No manifest found");
  }

  // ---------- Normalize manifest ----------
  function normalizeManifest(json) {
    // Accept these formats:
    // 1) [ {id,title,file,...}, ... ]
    // 2) { items:[...] }
    // 3) { stories:[...] }
    // 4) { data:[...] } or { list:[...] }
    let arr = null;

    if (Array.isArray(json)) arr = json;
    else if (json && Array.isArray(json.items)) arr = json.items;
    else if (json && Array.isArray(json.stories)) arr = json.stories;
    else if (json && Array.isArray(json.data)) arr = json.data;
    else if (json && Array.isArray(json.list)) arr = json.list;

    if (!Array.isArray(arr)) return [];

    const norm = arr
      .map((x) => {
        const id = x?.id || x?.storyId || x?.story_id || "";
        const title = x?.title || x?.name || "";
        const file = x?.file || x?.path || x?.url || "";
        const updatedAt = x?.updatedAt || x?.updated_at || x?.time || "";
        if (!id || !file) return null;
        // force URL to start with '/'
        const fileUrl = file.startsWith("/") ? file : ("/" + file.replace(/^\.?\//, ""));
        return { id, title, file: fileUrl, updatedAt };
      })
      .filter(Boolean);

    return norm;
  }

  // ---------- Load characters ----------
  async function loadCharacters() {
    const json = await fetchJSON(PATHS.characters);
    const chars = Array.isArray(json.characters) ? json.characters : (Array.isArray(json) ? json : []);
    // Normalize minimal fields
    AppState.data.charactersAll = chars.map((c, i) => ({
      id: c.id || c.char_id || c.key || c.slug || `${i}`,
      label: c.label || c.name || c.title || c.id || `NV-${i}`,
      gender: c.gender || "",
      role: c.role || c.desc || "",
    }));

    console.log("[XNC] Loaded characters:", AppState.data.charactersAll.length);
  }

  // ---------- Participants UI ----------
  function getSelectedSet() {
    return new Set(AppState.story.characters || []);
  }

  function updateSelectedCount() {
    $("participantsSelectedCount").textContent = String((AppState.story.characters || []).length);
  }

  function renderParticipantsList(filterText = "") {
    const listEl = $("participantsList");
    if (!listEl) return;

    const q = (filterText || "").trim().toLowerCase();
    const selected = getSelectedSet();

    const items = AppState.data.charactersAll
      .filter(c => !q || c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));

    listEl.innerHTML = "";
    for (const c of items) {
      const row = document.createElement("div");
      row.className = "pitem";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.has(c.id);
      cb.addEventListener("change", () => {
        const cur = getSelectedSet();
        if (cb.checked) cur.add(c.id);
        else cur.delete(c.id);
        AppState.story.characters = Array.from(cur);
        updateSelectedCount();
      });

      const info = document.createElement("div");
      info.style.flex = "1";

      const name = document.createElement("div");
      name.className = "pname";
      name.textContent = c.label;

      const tag = document.createElement("div");
      tag.className = "ptag";
      tag.textContent = `${c.gender || "?"}${c.role ? " • " + c.role : ""} • ${c.id}`;

      info.appendChild(name);
      info.appendChild(tag);

      row.appendChild(cb);
      row.appendChild(info);
      listEl.appendChild(row);
    }

    updateSelectedCount();
  }

  function selectAllParticipants() {
    AppState.story.characters = AppState.data.charactersAll.map(c => c.id);
    renderParticipantsList($("participantsSearch").value);
  }

  function clearParticipants() {
    AppState.story.characters = [];
    renderParticipantsList($("participantsSearch").value);
  }

  // ---------- Manifest UI ----------
  function renderManifestSelect(items) {
    const sel = $("storySelect");
    if (!sel) return;

    const cur = sel.value;
    sel.innerHTML = `<option value="">-- Chọn truyện --</option>`;

    for (const it of items) {
      const opt = document.createElement("option");
      // IMPORTANT: value must be file path, not id (fix: chọn 005 load 004)
      opt.value = it.file;
      opt.textContent = `${it.id}${it.title ? " • " + it.title : ""}`;
      opt.dataset.storyId = it.id;
      opt.dataset.storyTitle = it.title || "";
      sel.appendChild(opt);
    }

    // keep selection if still exists
    if (cur && items.some(x => x.file === cur)) sel.value = cur;
  }

  async function loadManifest() {
    const manifestCandidates = [
      PATHS.manifest,
      "/substance/stories_manifest.json",
      "/substance/story_manifest.json",
      "../substance/manifest.json",
      "./substance/manifest.json",
    ];

    try {
      const out = await loadJSONFirstOk(manifestCandidates);
      $("manifestPath").textContent = out.url;

      const items = normalizeManifest(out.json);
      AppState.data.manifestItems = items;

      renderManifestSelect(items);

      if (items.length > 0) {
        $("manifestStatus").textContent = `Manifest: OK (${items.length} truyện)`;
      } else {
        $("manifestStatus").textContent = "Manifest: rỗng / sai format";
      }

      console.log("[XNC] Loaded manifest items:", items.length, "from", out.url);
    } catch (e) {
      $("manifestStatus").textContent = "Manifest: không load được";
      $("manifestPath").textContent = PATHS.manifest;
      console.error("[XNC] Manifest load error:", e);
    }
  }

  // ---------- Load story from selected manifest item ----------
  async function loadStoryFromSelected() {
    const sel = $("storySelect");
    const file = sel.value;
    if (!file) {
      alert("Bạn chưa chọn truyện trong dropdown.");
      return;
    }

    try {
      const storyJson = await fetchJSON(file);

      // Support your existing story json:
      // { id, title, story, characters:[...] }
      const id = storyJson.id || storyJson.storyId || storyJson.story_id || "";
      const title = storyJson.title || storyJson.name || "";
      const rawText = storyJson.story || storyJson.text || storyJson.content || "";

      AppState.story.id = id;
      AppState.story.title = title;
      AppState.story.rawText = rawText;
      AppState.story.storyFile = file;

      $("storyId").value = id;
      $("storyTitle").value = title;
      $("storyText").value = rawText;

      // Participants initial: try from storyJson.characters
      // It might be labels or ids. Map by label if needed.
      let participants = [];
      if (Array.isArray(storyJson.characters)) {
        if (typeof storyJson.characters[0] === "string") {
          // map labels -> character id
          const labelSet = new Set(storyJson.characters);
          const mapped = AppState.data.charactersAll.filter(c => labelSet.has(c.label));
          participants = mapped.map(x => x.id);
        } else {
          participants = storyJson.characters
            .map(x => x.id || x.char_id || x.key || "")
            .filter(Boolean);
        }
      }
      AppState.story.characters = participants;

      renderParticipantsList($("participantsSearch").value);

      console.log("[XNC] Story loaded from:", file);
      alert(`Load truyện OK: ${id || "(no id)"}${title ? " • " + title : ""}`);
    } catch (e) {
      console.error(e);
      alert(`Load truyện lỗi: ${file} -> ${String(e.message || e)}`);
    }
  }

  // ---------- Preview ----------
  function setPreview(obj) {
    const box = $("previewBox");
    if (!box) return;
    box.textContent = JSON.stringify(obj ?? {}, null, 2);
  }

  // ---------- Validate participants ----------
  function requireAtLeastOneParticipant() {
    const n = (AppState.story.characters || []).length;
    if (n < 1) {
      alert("Bạn cần chọn ít nhất 1 nhân vật tham gia.");
      return false;
    }
    return true;
  }

  // ---------- Simple split: scenes by [Scene: ...] blocks ----------
  // Your story already has [Scene: ...] lines. We split into scenes and then frames by dialogue lines.
  function parseStoryToScenes(rawText) {
    const text = (rawText || "").replace(/\r\n/g, "\n");
    const lines = text.split("\n");

    const scenes = [];
    let current = { title: "Intro", rawLines: [] };

    function pushCurrent() {
      const rawBlock = current.rawLines.join("\n").trim();
      if (!rawBlock) return;
      scenes.push({
        title: current.title || `Scene ${scenes.length + 1}`,
        rawBlock,
      });
    }

    for (const ln of lines) {
      const m = ln.match(/^\s*\*\*\[Scene:\s*(.+?)\]\*\*\s*$/i) || ln.match(/^\s*\[Scene:\s*(.+?)\]\s*$/i);
      if (m) {
        // new scene starts
        pushCurrent();
        current = { title: m[1].trim(), rawLines: [ln] };
      } else {
        current.rawLines.push(ln);
      }
    }
    pushCurrent();
    return scenes;
  }

  function extractDialogueLines(sceneRawBlock) {
    // Detect:
    // **Bô-Lô:** text
    // **Tùm-Lum:** (aside) text
    // **[SFX: ...]**
    const out = [];
    const lines = (sceneRawBlock || "").split("\n").map(s => s.trim()).filter(Boolean);

    let order = 0;
    for (const ln of lines) {
      // SFX
      const sfx = ln.match(/^\*\*\[SFX:\s*(.+?)\]\*\*$/i) || ln.match(/^\[SFX:\s*(.+?)\]$/i);
      if (sfx) {
        out.push({ order: ++order, type: "sfx", char_id: "", char_label: "", text: sfx[1].trim() });
        continue;
      }

      // Dialogue: **Name:** text
      const dlg = ln.match(/^\*\*([^*]+?)\:\*\*\s*(.+)$/);
      if (dlg) {
        const label = dlg[1].trim();
        const text = dlg[2].trim();

        // map label -> char_id if possible
        const found = AppState.data.charactersAll.find(c => c.label === label);
        const char_id = found ? found.id : "";
        out.push({ order: ++order, type: "dialogue", char_id, char_label: label, text });
        continue;
      }

      // Otherwise treat as narration/title
      out.push({ order: ++order, type: "narration", char_id: "", char_label: "", text: ln });
    }

    return out;
  }

  function buildSceneManifest() {
    if (!requireAtLeastOneParticipant()) return;

    const id = $("storyId").value.trim();
    const title = $("storyTitle").value.trim();
    const rawText = $("storyText").value || "";

    AppState.story.id = id;
    AppState.story.title = title;
    AppState.story.rawText = rawText;

    const scenesParsed = parseStoryToScenes(rawText);

    const scenes = scenesParsed.map((sc, idx) => {
      const sid = `S${String(idx + 1).padStart(2, "0")}`;
      const lines = extractDialogueLines(sc.rawBlock);

      // default: each scene has frames; for now create 1 frame per line (simple + controllable)
      // You can later merge frames depending on mode.
      const frames = lines.map((ln, j) => ({
        id: `${sid}_F${String(j + 1).padStart(2, "0")}`,
        note: "",
        backgroundId: "",
        cameraAngle: "",
        cameraMove: "",
        duration: 1.5,
        actors: [],
        lines: [ln],
      }));

      return {
        id: sid,
        title: sc.title || sid,
        raw_text: sc.rawBlock,
        note: "",
        // default mode; user can choose per scene later
        mode: "dialogue",
        frames,
      };
    });

    AppState.scene_manifest = {
      storyId: id || "",
      storyTitle: title || "",
      storyFile: AppState.story.storyFile || "",
      participants: (AppState.story.characters || []),
      scenes,
    };

    // Save draft
    localStorage.setItem(LOCAL_SCENE_DRAFT_KEY, JSON.stringify(AppState.scene_manifest));

    // Update preview
    setPreview(AppState.scene_manifest);

    // Init scene/frame UI
    AppState.ui.currentSceneIdx = 0;
    AppState.ui.currentFrameIdx = 0;
    renderSceneSelectors();
    renderSceneNow();

    $("sceneHint").textContent = `Đã tách ${scenes.length} scene. Chọn Scene/Frame để ghi chú và chọn mode.`;
  }

  // ---------- Scene/Frame UI ----------
  function renderSceneSelectors() {
    const sceneSel = $("sceneSelect");
    const frameSel = $("frameSelect");
    if (!sceneSel || !frameSel) return;

    sceneSel.innerHTML = `<option value="">--</option>`;
    frameSel.innerHTML = `<option value="">--</option>`;

    const manifest = AppState.scene_manifest;
    const scenes = manifest?.scenes || [];
    scenes.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${s.id} • ${s.title || ""}`;
      sceneSel.appendChild(opt);
    });

    // set current selected
    if (scenes.length > 0) {
      sceneSel.value = String(AppState.ui.currentSceneIdx);
      renderFrameSelect();
    }
  }

  function renderFrameSelect() {
    const frameSel = $("frameSelect");
    const sceneSel = $("sceneSelect");
    if (!frameSel || !sceneSel) return;

    frameSel.innerHTML = `<option value="">--</option>`;

    const sIdx = Number(sceneSel.value);
    const sc = AppState.scene_manifest?.scenes?.[sIdx];
    if (!sc) return;

    sc.frames.forEach((f, j) => {
      const opt = document.createElement("option");
      opt.value = String(j);
      opt.textContent = f.id;
      frameSel.appendChild(opt);
    });

    AppState.ui.currentSceneIdx = sIdx;
    AppState.ui.currentFrameIdx = 0;
    frameSel.value = "0";

    // sync mode + notes to UI
    $("modeSelect").value = sc.mode || "dialogue";
    $("sceneNote").value = sc.note || "";
    $("frameNote").value = sc.frames?.[0]?.note || "";

    renderSceneNow();
  }

  function renderSceneNow() {
    const el = $("sceneNow");
    const sc = AppState.scene_manifest?.scenes?.[AppState.ui.currentSceneIdx];
    if (!el) return;

    if (!sc) {
      el.textContent = "Chưa tách scene.";
      return;
    }
    const fr = sc.frames?.[AppState.ui.currentFrameIdx];
    el.textContent = `${sc.id} • ${sc.title || ""}  |  Frame: ${fr?.id || "-" }  |  Mode: ${sc.mode || "dialogue"}`;
  }

  function gotoScene(delta) {
    const scenes = AppState.scene_manifest?.scenes || [];
    if (scenes.length < 1) return;

    let i = AppState.ui.currentSceneIdx + delta;
    if (i < 0) i = 0;
    if (i >= scenes.length) i = scenes.length - 1;

    AppState.ui.currentSceneIdx = i;
    AppState.ui.currentFrameIdx = 0;

    $("sceneSelect").value = String(i);
    renderFrameSelect();
  }

  function bindSceneEditor() {
    $("sceneSelect").addEventListener("change", () => {
      renderFrameSelect();
    });

    $("frameSelect").addEventListener("change", () => {
      const j = Number($("frameSelect").value);
      AppState.ui.currentFrameIdx = isFinite(j) ? j : 0;

      const sc = AppState.scene_manifest?.scenes?.[AppState.ui.currentSceneIdx];
      if (sc) {
        $("modeSelect").value = sc.mode || "dialogue";
        $("sceneNote").value = sc.note || "";
        $("frameNote").value = sc.frames?.[AppState.ui.currentFrameIdx]?.note || "";
      }
      renderSceneNow();
    });

    $("modeSelect").addEventListener("change", () => {
      const sc = AppState.scene_manifest?.scenes?.[AppState.ui.currentSceneIdx];
      if (!sc) return;
      sc.mode = $("modeSelect").value;
      setPreview(AppState.scene_manifest);
      localStorage.setItem(LOCAL_SCENE_DRAFT_KEY, JSON.stringify(AppState.scene_manifest));
      renderSceneNow();
    });

    $("sceneNote").addEventListener("input", () => {
      const sc = AppState.scene_manifest?.scenes?.[AppState.ui.currentSceneIdx];
      if (!sc) return;
      sc.note = $("sceneNote").value;
      setPreview(AppState.scene_manifest);
      localStorage.setItem(LOCAL_SCENE_DRAFT_KEY, JSON.stringify(AppState.scene_manifest));
    });

    $("frameNote").addEventListener("input", () => {
      const sc = AppState.scene_manifest?.scenes?.[AppState.ui.currentSceneIdx];
      if (!sc) return;
      const fr = sc.frames?.[AppState.ui.currentFrameIdx];
      if (!fr) return;
      fr.note = $("frameNote").value;
      setPreview(AppState.scene_manifest);
      localStorage.setItem(LOCAL_SCENE_DRAFT_KEY, JSON.stringify(AppState.scene_manifest));
    });

    $("prevSceneBtn").addEventListener("click", () => gotoScene(-1));
    $("nextSceneBtn").addEventListener("click", () => gotoScene(+1));
  }

  // ---------- Local save/load ----------
  function saveLocalStory() {
    if (!requireAtLeastOneParticipant()) return;

    const obj = {
      id: $("storyId").value.trim(),
      title: $("storyTitle").value.trim(),
      story: $("storyText").value || "",
      characters: AppState.story.characters || [],
      updatedAt: new Date().toISOString(),
      storyFile: AppState.story.storyFile || "",
    };
    localStorage.setItem(LOCAL_STORY_KEY, JSON.stringify(obj));
    alert("Đã lưu story vào local.");
  }

  function exportJSONStory() {
    if (!requireAtLeastOneParticipant()) return;

    const obj = {
      id: $("storyId").value.trim(),
      title: $("storyTitle").value.trim(),
      story: $("storyText").value || "",
      characters: AppState.story.characters || [],
      updatedAt: new Date().toISOString(),
      storyFile: AppState.story.storyFile || "",
    };
    setPreview(obj);
  }

  function exportDialogueJSON() {
    if (!AppState.scene_manifest) {
      alert("Chưa có scene manifest. Bấm “Tách Scene & Thoại” trước.");
      return;
    }
    // Flatten lines for Studio V19 TTS
    const out = [];
    for (const sc of AppState.scene_manifest.scenes || []) {
      for (const fr of sc.frames || []) {
        for (const ln of fr.lines || []) {
          out.push({
            scene_id: sc.id,
            frame_id: fr.id,
            order: ln.order,
            type: ln.type,
            char_id: ln.char_id || "",
            char_label: ln.char_label || "",
            text: ln.text || "",
          });
        }
      }
    }
    localStorage.setItem(LOCAL_DIALOGUE_KEY, JSON.stringify(out));
    setPreview(out);
    alert("Đã export JSON thoại (đang hiển thị trong preview và lưu local).");
  }

  async function copyDialogueJSON() {
    const raw = localStorage.getItem(LOCAL_DIALOGUE_KEY);
    if (!raw) {
      alert("Chưa có JSON thoại. Bấm “Export JSON thoại” trước.");
      return;
    }
    await navigator.clipboard.writeText(raw);
    alert("Đã copy JSON thoại.");
  }

  function clearPreview() {
    setPreview({});
    $("sceneHint").textContent = "";
  }

  // ---------- Events ----------
  function bindEvents() {
    $("reloadManifestBtn").addEventListener("click", loadManifest);
    $("loadStoryBtn").addEventListener("click", loadStoryFromSelected);

    $("participantsSearch").addEventListener("input", (e) => {
      renderParticipantsList(e.target.value);
    });
    $("participantsSelectAll").addEventListener("click", selectAllParticipants);
    $("participantsClear").addEventListener("click", clearParticipants);

    $("saveLocalBtn").addEventListener("click", saveLocalStory);
    $("exportStoryBtn").addEventListener("click", exportJSONStory);
    $("splitBtn").addEventListener("click", buildSceneManifest);
    $("exportDialogueBtn").addEventListener("click", exportDialogueJSON);
    $("copyDialogueBtn").addEventListener("click", copyDialogueJSON);
    $("clearPreviewBtn").addEventListener("click", clearPreview);

    bindSceneEditor();
  }

  // ---------- Init ----------
  async function init() {
    try {
      await loadCharacters();
      renderParticipantsList("");

      await loadManifest();

      // restore draft if exists
      const draft = safeJSONParse(localStorage.getItem(LOCAL_SCENE_DRAFT_KEY) || "");
      if (draft && draft.scenes) {
        AppState.scene_manifest = draft;
        setPreview(draft);
        renderSceneSelectors();
        renderSceneNow();
        $("sceneHint").textContent = "Đã khôi phục scene manifest draft từ local.";
      }

      console.log("[XNC] Init OK");
    } catch (e) {
      console.error("[XNC] init error:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
