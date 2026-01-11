/* =========================================================
 * make_video_bieucam.js  (SAFE PATH VERSION)
 * Web root = /public in repo, so URLs MUST NOT include /public
 * ========================================================= */

"use strict";

/** -----------------------------
 *  Fixed paths (NO "/public")
 *  ----------------------------- */
const PATHS = {
  manifest: "/substance/manifest.json",
  characters: "/adn/xomnganchuyen/XNC_characters.json",
};

/** -----------------------------
 *  DOM helpers
 *  ----------------------------- */
const $ = (id) => document.getElementById(id);

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text ?? "";
}

function setValue(id, val) {
  const el = $(id);
  if (el) el.value = val ?? "";
}

/** -----------------------------
 *  Fetch helper (logs the exact path)
 *  ----------------------------- */
async function fetchJSON(path) {
  console.log("[XNC] fetchJSON:", path);
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

/** -----------------------------
 *  App state
 *  ----------------------------- */
const AppState = {
  manifestItems: [],
  charactersAll: [],     // [{id,label,gender,desc}]
  selectedParticipants: new Set(), // store character ids
  loadedStoryFile: "",   // currently loaded file path from manifest
  loadedStoryJson: null,
};

/** -----------------------------
 *  Manifest
 *  Expected format:
 *  {
 *    "version": 1,
 *    "items": [{ "id": "...", "title":"...", "file":"/substance/XXX.json" }]
 *  }
 *  ----------------------------- */
async function loadManifest() {
  try {
    const json = await fetchJSON(PATHS.manifest);
    const items = Array.isArray(json?.items) ? json.items : [];

    // Normalize items but DO NOT "fix" path by string concat.
    AppState.manifestItems = items
      .map((it) => ({
        id: (it.id || "").trim(),
        title: (it.title || "").trim(),
        file: (it.file || "").trim(), // must be absolute like "/substance/....json"
      }))
      .filter((it) => it.file && it.file.startsWith("/"));

    renderManifestSelect(AppState.manifestItems);
    setText(
      "manifestStatus",
      AppState.manifestItems.length
        ? `Manifest: OK (${AppState.manifestItems.length} truyện) • ${PATHS.manifest}`
        : "Manifest rỗng / sai format"
    );
    console.log("[XNC] Loaded manifest items:", AppState.manifestItems.length);
  } catch (e) {
    console.error("[XNC] loadManifest error:", e);
    AppState.manifestItems = [];
    renderManifestSelect([]);
    setText("manifestStatus", `Manifest lỗi: ${String(e.message || e)}`);
  }
}

function renderManifestSelect(items) {
  const sel = document.getElementById("storySelect");
  if (!sel) return;

  sel.innerHTML =
    `<option value="">-- Chọn truyện --</option>` +
    items.map(it => {
      // BẮT BUỘC: value hoặc data-file phải là "XNC-....json"
      const file = (it.file || `${it.id}.json`).replace(/^\/+/, "").split("/").pop();
      const label = `${it.id} • ${it.title || ""}`.trim();
      return `<option value="${file}" data-file="${file}">${label}</option>`;
    }).join("");
}


/** -----------------------------
 *  Characters (participants list)
 *  You said file is: public/adn/xomnganchuyen/XNC_characters.json
 *  Web URL MUST be: /adn/xomnganchuyen/XNC_characters.json
 *  ----------------------------- */
async function loadCharacters() {
  try {
    const json = await fetchJSON(PATHS.characters);

    // Allow flexible formats:
    // - array: [{id,label,gender,desc}]
    // - object: {characters:[...]}
    const arr = Array.isArray(json)
      ? json
      : Array.isArray(json?.characters)
      ? json.characters
      : [];

    AppState.charactersAll = arr
      .map((c) => ({
        id: (c.id || c.char_id || c.key || "").trim(),
        label: (c.label || c.name || c.title || c.id || "").trim(),
        gender: (c.gender || "").trim(),
        desc: (c.desc || c.bio || "").trim(),
      }))
      .filter((c) => c.id && c.label);

    renderParticipantsList();
    console.log("[XNC] Loaded characters:", AppState.charactersAll.length, "from", PATHS.characters);
  } catch (e) {
    console.error("[XNC] loadCharacters error:", e);
    AppState.charactersAll = [];
    renderParticipantsList();
  }
}

function renderParticipantsList() {
  const wrap = $("participantsList");
  if (!wrap) return;

  const q = ($("participantSearch")?.value || "").trim().toLowerCase();

  const list = AppState.charactersAll.filter((c) => {
    if (!q) return true;
    return (
      c.label.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.desc || "").toLowerCase().includes(q)
    );
  });

  wrap.innerHTML = list
    .map((c) => {
      const checked = AppState.selectedParticipants.has(c.id) ? "checked" : "";
      const sub = [c.gender, c.desc, c.id].filter(Boolean).join(" • ");
      return `
        <label class="xnc-char-row">
          <input type="checkbox" class="xnc-char-check" data-char-id="${escapeHtmlAttr(c.id)}" ${checked}/>
          <div class="xnc-char-meta">
            <div class="xnc-char-name">${escapeHtmlText(c.label)}</div>
            <div class="xnc-char-sub">${escapeHtmlText(sub)}</div>
          </div>
        </label>
      `;
    })
    .join("");

  // bind checkbox events
  wrap.querySelectorAll(".xnc-char-check").forEach((cb) => {
    cb.addEventListener("change", (ev) => {
      const id = ev.target.getAttribute("data-char-id");
      if (!id) return;
      if (ev.target.checked) AppState.selectedParticipants.add(id);
      else AppState.selectedParticipants.delete(id);
      updateSelectedCount();
    });
  });

  updateSelectedCount();
}

function updateSelectedCount() {
  setText("selectedCount", `Đã chọn: ${AppState.selectedParticipants.size}`);
}

/** -----------------------------
 *  Load story from manifest selection
 *  Key rule: fetch EXACTLY sel.value (which is item.file)
 *  ----------------------------- */
async function loadSelectedStory() {
  // ===== helpers: find element by multiple possible ids =====
  const pickEl = (...ids) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  };

  // ===== UI refs (tự bắt theo nhiều tên id để khỏi lệch) =====
  const sel = pickEl("storySelect", "storySelectEl", "storyDropdown");
  const btn = pickEl("loadStoryBtn", "btnLoadStory", "loadStoryButton");
  const storyIdEl = pickEl("storyId", "storyIdInput", "story_id");
  const storyTitleEl = pickEl("storyTitle", "storyTitleInput", "story_title");
  const storyTextEl = pickEl("storyRawText", "storyText", "storyContent", "storyTextarea");

  if (!sel) {
    alert("Không tìm thấy dropdown #storySelect");
    return;
  }

  // ===== lấy file từ option (ưu tiên data-file) =====
  const opt = sel.options[sel.selectedIndex];
  const rawFile = (opt && (opt.dataset.file || opt.getAttribute("data-file") || opt.value)) || "";

  if (!rawFile || rawFile === "--" || rawFile.includes("Chọn truyện")) {
    alert("Bạn chưa chọn truyện trong dropdown.");
    return;
  }

  // ===== chuẩn hoá file name: chỉ lấy tên file, không cho phép path lạ =====
  // Ví dụ hợp lệ: "XNC-20260110-0005.json"
  const fileName = rawFile.split("/").pop().trim();

  if (!fileName.toLowerCase().endsWith(".json")) {
    alert(`File truyện không hợp lệ (phải .json): ${fileName}`);
    return;
  }

  // ===== đường dẫn cố định theo yêu cầu của bạn =====
  const url = `/substance/${fileName}`;

  // ===== disable nút khi load =====
  if (btn) btn.disabled = true;

  try {
    console.log("[XNC] Loading story from:", url);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);

    const j = await res.json();

    // ===== map đúng structure bạn đang có =====
    const sid = j.storyId || j.id || "";
    const stitle = j.title || j.name || "";
    const stext = j.story || j.content || j.rawText || j.text || "";

    if (storyIdEl) storyIdEl.value = sid;
    if (storyTitleEl) storyTitleEl.value = stitle;

    if (storyTextEl) {
      storyTextEl.value = stext;
      storyTextEl.dispatchEvent(new Event("input", { bubbles: true }));
      storyTextEl.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      console.warn("[XNC] Không tìm thấy textarea nội dung. Hãy kiểm tra id của ô 'Nội dung'.");
    }

    // ===== auto tick nhân vật nếu file truyện có characters =====
    // characters có thể: ["bolo","bala"] hoặc [{id:"bolo"}...]
    const chars = Array.isArray(j.characters) ? j.characters : [];
    if (chars.length) {
      const selectedIds = new Set(
        chars.map(c => (typeof c === "string" ? c : (c.id || c.char_id || c.charId || ""))).filter(Boolean)
      );

      // checkbox phải có data-char-id="bolo" (hoặc value="bolo")
      const checkboxes = document.querySelectorAll('input[type="checkbox"][data-char-id], input[type="checkbox"][name="participant"], input[type="checkbox"].participant');
      let hit = 0;

      checkboxes.forEach(cb => {
        const cid = cb.dataset.charId || cb.getAttribute("data-char-id") || cb.value || "";
        if (!cid) return;
        const on = selectedIds.has(cid);
        cb.checked = on;
        if (on) hit++;
      });

      // nếu bạn có hàm update counter, gọi thử
      if (typeof updateSelectedCount === "function") updateSelectedCount();

      console.log("[XNC] Auto-selected characters:", hit, Array.from(selectedIds));
    }

    // ===== debug preview =====
    if (typeof setStoryJSONPreview === "function") {
      setStoryJSONPreview({
        loadedFrom: url,
        storyId: sid,
        title: stitle,
        hasText: !!stext,
        characters: j.characters || []
      });
    } else {
      // fallback: nếu bạn có vùng preview <pre id="previewBox">
      const pre = document.getElementById("previewBox") || document.getElementById("jsonPreview");
      if (pre) pre.textContent = JSON.stringify({ loadedFrom: url, storyId: sid, title: stitle }, null, 2);
    }

    console.log("[XNC] Story loaded OK:", { sid, stitle, textLen: (stext || "").length });
  } catch (err) {
    console.error("[XNC] loadSelectedStory error:", err);
    alert(`Load truyện lỗi: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

//=========================================
function applyParticipantsFromStory(charactersField) {
  // charactersField can be:
  // - ["Bô-Lô","Ba-La"...] (labels)
  // - [{id,label}...] or [{char_id,name}...]
  const ids = new Set();

  if (typeof charactersField[0] === "string") {
    const wantedLabels = new Set(charactersField.map((s) => String(s).trim()));
    // map labels -> ids from charactersAll
    AppState.charactersAll.forEach((c) => {
      if (wantedLabels.has(c.label)) ids.add(c.id);
    });
  } else {
    charactersField.forEach((x) => {
      const id = (x.id || x.char_id || "").trim();
      if (id) ids.add(id);
      else {
        const label = (x.label || x.name || "").trim();
        if (label) {
          const found = AppState.charactersAll.find((c) => c.label === label);
          if (found) ids.add(found.id);
        }
      }
    });
  }

  AppState.selectedParticipants = ids;
  renderParticipantsList();
}

/** -----------------------------
 *  Buttons
 *  ----------------------------- */
function bindEvents() {
  $("reloadManifestBtn")?.addEventListener("click", loadManifest);
  $("loadStoryBtn")?.addEventListener("click", loadSelectedStory);

  $("participantSearch")?.addEventListener("input", renderParticipantsList);

  $("btnSelectAll")?.addEventListener("click", () => {
    AppState.charactersAll.forEach((c) => AppState.selectedParticipants.add(c.id));
    renderParticipantsList();
  });

  $("btnClearAll")?.addEventListener("click", () => {
    AppState.selectedParticipants.clear();
    renderParticipantsList();
  });

  // Your existing buttons (if present)
  $("splitBtn")?.addEventListener("click", () => {
    splitScenesFromStory();
  });

  $("clearPreviewBtn")?.addEventListener("click", () => {
    setPreviewJSON({});
  });
}

/** -----------------------------
 *  Split scenes stub (hook)
 *  Replace this with your current splitting logic.
 *  IMPORTANT: participants check uses AppState.selectedParticipants.size
 *  ----------------------------- */
function splitScenesFromStory() {
  const raw = ($("storyRaw")?.value || "").trim();
  if (!raw) {
    alert("Bạn chưa có nội dung truyện.");
    return;
  }
  if (AppState.selectedParticipants.size < 1) {
    alert("Bạn cần chọn ít nhất 1 nhân vật tham gia.");
    return;
  }

  // TODO: plug your scene splitting engine here.
  // For now just show a small structure so UI doesn't feel broken.
  const result = {
    storyId: $("storyId")?.value || "",
    title: $("storyTitle")?.value || "",
    loadedFrom: AppState.loadedStoryFile || "(manual)",
    participants: Array.from(AppState.selectedParticipants),
    note: "TODO: gắn logic tách scene hiện tại vào splitScenesFromStory()",
    rawPreview: raw.slice(0, 250),
  };

  setPreviewJSON(result);
  console.log("[XNC] splitScenesFromStory result:", result);
}

function setPreviewJSON(obj) {
  const pre = $("previewBox");
  if (!pre) return;
  try {
    pre.textContent = JSON.stringify(obj ?? {}, null, 2);
  } catch {
    pre.textContent = "{}";
  }
}

/** -----------------------------
 *  HTML escaping helpers
 *  ----------------------------- */
function escapeHtmlText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeHtmlAttr(s) {
  return escapeHtmlText(s).replaceAll('"', "&quot;");
}

/** -----------------------------
 *  Init
 *  ----------------------------- */
async function init() {
  bindEvents();
  await loadCharacters();
  await loadManifest();
  console.log("[XNC] Init OK");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
