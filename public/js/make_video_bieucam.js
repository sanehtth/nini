/* =========================================================
 * make_video_bieucam.js  (SAFE PATH VERSION)
 * Web root = /public in repo, so URLs MUST NOT include /public
 * ========================================================= */

"use strict";

/* =========================
   FIX MANIFEST + LOAD STORY
   Paths chuẩn theo bạn:
   js: /public/js/make_video_bieucam.js
   manifest: /public/substance/manifest.json  -> URL chạy là /substance/manifest.json
   story: /public/substance/<file>.json       -> URL chạy là /substance/<file>.json
========================= */

const PATHS = {
  manifest: "/substance/manifest.json",
  // giữ nguyên characters theo dự án bạn đang dùng:
  characters: "/adn/xomnganchuyen/XNC_characters.json",
};

// Helper: lấy element theo nhiều id (để không bị lệch id HTML)
function $id(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

// Helper: fetch JSON (có báo lỗi rõ)
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);
  return await res.json();
}

// Chuẩn hoá đường dẫn public/substance -> /substance
function normalizeSubstancePath(input) {
  if (!input) return "";

  let p = String(input).trim();

  // bỏ origin nếu có (https://domain/xxx)
  p = p.replace(/^https?:\/\/[^/]+/i, "");

  // nếu manifest ghi "public/substance/..." hoặc "/public/substance/..."
  p = p.replace(/^\/?public\//i, "/");

  // nếu chỉ ghi "XNC-....json" hoặc "/XNC-....json"
  p = p.replace(/^\//, "");
  if (!p.includes("/")) {
    return `/substance/${p}`;
  }

  // nếu đã có substance nhưng thiếu dấu /
  if (p.startsWith("substance/")) return `/${p}`;

  // nếu đang là "/substance/..."
  if (p.startsWith("/substance/")) return p;

  // nếu là "substance/..." hoặc "XNC/..." lạ thì cứ trả về có dấu /
  return `/${p}`;
}
/* =========================
   LOAD MANIFEST -> render dropdown
========================= */
async function loadManifest() {
  const statusEl = $id("manifestStatus", "manifest-status");
  const selectEl = $id("storySelect", "story-select", "storySelector", "story-select-el");

  try {
    if (statusEl) statusEl.textContent = "Manifest: đang load...";
    const json = await fetchJSON(PATHS.manifest);

    // hỗ trợ cả 2 kiểu: {items:[...]} hoặc [...]
    const items = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : []);
    renderManifestSelect(items);

    if (statusEl) statusEl.textContent = `Manifest: OK (${items.length} truyện) • ${PATHS.manifest}`;
  } catch (err) {
    console.error("[XNC] loadManifest error:", err);
    if (statusEl) statusEl.textContent = `Manifest lỗi: ${String(err.message || err)}`;
    // vẫn để dropdown rỗng
    if (selectEl) selectEl.innerHTML = `<option value="">-- Chọn truyện --</option>`;
  }
}

function renderManifestSelect(items) {
  const selectEl = $id("storySelect", "story-select", "storySelector", "story-select-el");
  if (!selectEl) return;

  const opts = [];
  opts.push(`<option value="">-- Chọn truyện --</option>`);

  items.forEach((it) => {
    // ưu tiên file/path trong manifest; fallback từ id
    const rawFile = it.file || it.path || it.filename || (it.id ? `${it.id}.json` : "");
    const filePath = normalizeSubstancePath(rawFile);

    // label dropdown
    const labelId = it.id || "";
    const labelTitle = it.title || it.name || "";
    const label = `${labelId}${labelTitle ? " • " + labelTitle : ""}`.trim();

    // IMPORTANT: value phải là FILE PATH, không phải id
    opts.push(`<option value="${filePath}">${label}</option>`);
  });

  selectEl.innerHTML = opts.join("");
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
/* =========================
   LOAD SELECTED STORY -> đổ vào form, textarea
========================= */
async function loadStoryFromSelected() {
  const selectEl = $id("storySelect", "story-select", "storySelector", "story-select-el");
  if (!selectEl) {
    alert("Không tìm thấy dropdown truyện (storySelect).");
    return;
  }

  const selectedPath = selectEl.value;
  if (!selectedPath) {
    alert("Bạn chưa chọn truyện trong dropdown.");
    return;
  }

  const storyPath = normalizeSubstancePath(selectedPath);

  try {
    // disable nút để tránh double click
    const btn = $id("loadStoryBtn", "loadStoryButton", "btnLoadStory");
    if (btn) btn.disabled = true;

    console.log("[XNC] Loading story from:", storyPath);
    const storyJson = await fetchJSON(storyPath);

    // Map field: nội dung nằm ở story (đúng như bạn đã thấy)
    const storyId = storyJson.id || storyJson.storyId || storyJson.story_id || "";
    const storyTitle = storyJson.title || storyJson.name || "";
    const rawText =
      storyJson.story ||
      storyJson.content ||
      storyJson.text ||
      storyJson.rawText ||
      storyJson.raw ||
      "";

    // Đổ vào UI
    const idEl = $id("storyId", "storyID", "story-id", "txtStoryId");
    const titleEl = $id("storyTitle", "storyName", "story-title", "txtStoryTitle");
    const textEl = $id("rawText", "storyText", "storyRawText", "storyContent", "story-content", "txtStoryText");

    if (idEl) idEl.value = storyId;
    if (titleEl) titleEl.value = storyTitle;
    if (textEl) textEl.value = rawText;

    // Lưu để các hàm split / export dùng lại (phòng trường hợp code cũ đọc biến khác)
    window.__XNC_LOADED_STORY__ = {
      loadedFrom: storyPath,
      storyId,
      title: storyTitle,
      rawText,
      json: storyJson,
    };

    // Nếu code cũ dùng một state object nào đó, cố gắng bơm vào cho tương thích
    // (không gây lỗi nếu không tồn tại)
    try {
      if (window.AppState?.story) {
        window.AppState.story.id = storyId;
        window.AppState.story.title = storyTitle;
        window.AppState.story.rawText = rawText;
      }
      if (window.appState?.story) {
        window.appState.story.id = storyId;
        window.appState.story.title = storyTitle;
        window.appState.story.rawText = rawText;
      }
    } catch (_) {}

    // Preview nhỏ để bạn nhìn nhanh
    const previewEl = $id("jsonPreview", "preview", "previewJson", "preview-json");
    if (previewEl) {
      previewEl.textContent = JSON.stringify(
        { loadedFrom: storyPath, storyId, title: storyTitle, textLen: rawText.length },
        null,
        2
      );
    }

    console.log("[XNC] Story loaded OK:", { storyId, title: storyTitle, textLen: rawText.length });
  } catch (err) {
    console.error("[XNC] loadStoryFromSelected error:", err);
    alert(`Load truyện lỗi: ${String(err.message || err)}`);
  } finally {
    const btn = $id("loadStoryBtn", "loadStoryButton", "btnLoadStory");
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

/* =========================
   BIND EVENTS (gọi 1 lần khi init)
========================= */
function bindManifestUI() {
  const btnReload = $id("reloadManifestBtn", "btnReloadManifest");
  const btnLoad = $id("loadStoryBtn", "loadStoryButton", "btnLoadStory");

  if (btnReload) btnReload.addEventListener("click", loadManifest);
  if (btnLoad) btnLoad.addEventListener("click", loadStoryFromSelected);
}

// Nếu file bạn đã có DOMContentLoaded init rồi thì gọi 2 dòng này trong init của bạn.
// Nếu chưa có, cứ để block này:
document.addEventListener("DOMContentLoaded", () => {
  bindManifestUI();
  loadManifest();
});

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
