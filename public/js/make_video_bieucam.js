// /public/js/make_video_bieucam.js
// FIXED (Jan 2026)
// - Use absolute paths (no string-join surprises)
// - Scope DOM queries to the current tab root to avoid duplicated IDs clobbering each other
// - Keep participants list visible and in-sync after loading a story from manifest

(function () {
  'use strict';

  // =========================
  // Config
  // =========================
  const PATHS = {
    characters: '/adn/xomnganchuyen/XNC_characters.json',
    manifest: '/substance/manifest.json',
    substanceBase: '/substance/',
  };

  // =========================
  // Small helpers
  // =========================
  const $ = (root, sel) => (root || document).querySelector(sel);
  const $$ = (root, sel) => Array.from((root || document).querySelectorAll(sel));

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${path} -> ${res.status}`);
    return res.json();
  }

  function normalizeStoryPath(fileOrPath) {
    // Manifest may store:
    //  - "XNC-....json"
    //  - "/substance/XNC-....json"
    //  - "substance/XNC-....json"
    if (!fileOrPath) return null;
    let p = String(fileOrPath).trim();
    if (!p) return null;

    // Strip leading "public/" if someone put repo path
    if (p.startsWith('public/')) p = '/' + p.slice('public/'.length);
    if (!p.startsWith('/')) p = '/' + p;

    // If it already includes /substance/, keep it. Otherwise prefix.
    if (p.includes('/substance/')) return p;

    // Remove possible leading "/" now and prefix
    p = p.replace(/^\/+/, '');
    return PATHS.substanceBase + p;
  }

  function normalizeText(s) {
    return (s || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  // =========================
  // State
  // =========================
  const App = {
    characters: [], // {id,label,gender,desc}
    characterById: new Map(),
    characterByLabelNorm: new Map(),

    manifestItems: [],

    // Tab 1 selections
    selectedCharacterIds: new Set(),

    // Parsed scenes (Tab 1)
    scenes: [],
  };

  // =========================
  // DOM Roots (IMPORTANT: avoid duplicated IDs)
  // =========================
  // Your HTML already has duplicated IDs between Tab1/Tab2 in some versions.
  // NEVER use document.getElementById for shared IDs; always scope to tab root.
  const storyRoot = document.getElementById('tab-story') || document; // fallback
  const promptRoot = document.getElementById('tab-prompt') || document; // fallback

  // =========================
  // Loaders
  // =========================
  async function loadCharacters() {
    const json = await fetchJSON(PATHS.characters);

    // Support several shapes:
    // - {characters:[...]}
    // - {items:[...]}
    // - [...]
    const arr = Array.isArray(json)
      ? json
      : Array.isArray(json.characters)
        ? json.characters
        : Array.isArray(json.items)
          ? json.items
          : [];

    const chars = arr
      .map((c, idx) => {
        const id = c.id || c.char_id || c.code || `char_${idx}`;
        const label = c.label || c.name || c.title || id;
        const gender = c.gender || c.sex || '';
        const desc = c.desc || c.role || '';
        return { id, label, gender, desc };
      })
      .filter(Boolean);

    App.characters = chars;
    App.characterById = new Map(chars.map((c) => [c.id, c]));
    App.characterByLabelNorm = new Map(chars.map((c) => [normalizeText(c.label), c]));

    console.log('[XNC] Loaded characters:', chars.length, 'from', PATHS.characters);
  }

  async function loadManifest() {
    const json = await fetchJSON(PATHS.manifest);

    // Support:
    // - {items:[{id,title,file}, ...]}
    // - [{id,title,file}, ...]
    const items = Array.isArray(json)
      ? json
      : Array.isArray(json.items)
        ? json.items
        : [];

    // Normalize item fields
    App.manifestItems = items
      .map((it, idx) => {
        const id = it.id || it.storyId || it.story_id || `story_${idx}`;
        const title = it.title || it.name || '';
        const file = it.file || it.path || it.url || it.href || '';
        return { id, title, file };
      })
      .filter((it) => it.id && it.file);

    console.log('[XNC] Loaded manifest items:', App.manifestItems.length, 'from', PATHS.manifest);

    renderManifestSelect();
  }

  // =========================
  // Tab 1: Manifest select + load story
  // =========================
  function renderManifestSelect() {
    const sel = $(storyRoot, '#story-select');
    const status = $(storyRoot, '#manifest-status');
    const manifestLink = $(storyRoot, '#manifest-link');

    if (!sel) {
      // Some HTML versions may not have manifest select; no-op.
      return;
    }

    const opts = ['<option value="">-- Chá»n truyá»‡n --</option>']
      .concat(
        App.manifestItems.map((it) => {
          const label = `${it.id}${it.title ? ' â€¢ ' + it.title : ''}`;
          // Store RAW file/path in value to avoid ambiguity.
          // We will normalize into /substance/... when loading.
          return `<option value="${escapeHtml(it.file)}" data-id="${escapeHtml(it.id)}" data-title="${escapeHtml(it.title || '')}">${escapeHtml(label)}</option>`;
        }),
      )
      .join('');

    sel.innerHTML = opts;

    if (status) status.textContent = `Manifest: OK (${App.manifestItems.length} truyá»‡n)`;
    if (manifestLink) manifestLink.textContent = PATHS.manifest;
  }

  async function loadSelectedStory() {
    const sel = $(storyRoot, '#story-select');
    if (!sel) return;

    const rawFile = sel.value;
    if (!rawFile) {
      alert('Báº¡n chÆ°a chá»n truyá»‡n trong dropdown.');
      return;
    }

    // Pull extra metadata from selected option
    const opt = sel.options[sel.selectedIndex];
    const storyId = opt?.dataset?.id || '';
    const storyTitle = opt?.dataset?.title || '';

    const path = normalizeStoryPath(rawFile);
    if (!path) {
      alert('File truyá»‡n khÃ´ng há»£p lá»‡ trong manifest.');
      return;
    }

    console.log('[XNC] Loading story from:', path);

    let storyJson;
    try {
      storyJson = await fetchJSON(path);
    } catch (e) {
      console.error('[XNC] loadSelectedStory error:', e);
      alert(`Load truyá»‡n lá»—i: ${e.message}`);
      return;
    }

    // Support multiple schema variants
    const id = storyJson.id || storyJson.storyId || storyId || '';
    const title = storyJson.title || storyJson.name || storyTitle || '';
    const rawText = storyJson.story || storyJson.text || storyJson.content || storyJson.rawText || '';

    // Characters may be:
    // - ["Bá»‘-LÃ´", "Ba-La"] (labels)
    // - [{id,label}, ...]
    // - [{char_id}, ...]
    // - ["bolo", "bala"] (ids)
    const storyChars = Array.isArray(storyJson.characters) ? storyJson.characters : [];

    // Fill UI
    const idEl = $(storyRoot, '#story-id');
    const titleEl = $(storyRoot, '#story-title');
    const contentEl = $(storyRoot, '#story-content');

    if (idEl) idEl.value = id;
    if (titleEl) titleEl.value = title;
    if (contentEl) contentEl.value = rawText;

    // Apply participants selection (do NOT destroy the UI)
    applyStoryCharacterSelection(storyChars);

    // Preview
    setStoryJSONPreview({ loadedFrom: path, storyId: id, title });

    console.log('[XNC] Story loaded OK:', { id, title, textLen: rawText?.length || 0 });
  }

  function applyStoryCharacterSelection(storyChars) {
    // Build a set of ids to select
    const ids = new Set();

    for (const item of storyChars || []) {
      if (!item) continue;

      if (typeof item === 'string') {
        // could be label or id
        const byId = App.characterById.get(item);
        if (byId) {
          ids.add(byId.id);
          continue;
        }
        const byLabel = App.characterByLabelNorm.get(normalizeText(item));
        if (byLabel) {
          ids.add(byLabel.id);
          continue;
        }
      }

      if (typeof item === 'object') {
        const maybeId = item.id || item.char_id || item.code;
        if (maybeId && App.characterById.has(maybeId)) {
          ids.add(maybeId);
          continue;
        }
        const maybeLabel = item.label || item.name || item.title;
        if (maybeLabel) {
          const byLabel = App.characterByLabelNorm.get(normalizeText(maybeLabel));
          if (byLabel) ids.add(byLabel.id);
        }
      }
    }

    App.selectedCharacterIds = ids;

    // Update checkboxes if rendered
    syncParticipantsCheckboxes();
    updateSelectedCount();

    console.log('[XNC] Auto-selected characters:', ids.size, Array.from(ids));
  }

  // =========================
  // Tab 1: Participants UI
  // =========================
  function renderParticipantsList() {
    const container = $(storyRoot, '#characters-container');
    if (!container) {
      console.warn('[XNC] #characters-container not found in Tab 1');
      return;
    }

    // IMPORTANT: only render inside TAB 1 container
    // This prevents Tab 2 from clobbering Tab 1 even if IDs repeat.
    const listHtml = App.characters
      .map((c) => {
        const checked = App.selectedCharacterIds.has(c.id) ? 'checked' : '';
        return `
          <label class="char-item" style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(0,0,0,0.08);border-radius:10px;margin:8px 0;background:#fff;">
            <input type="checkbox" class="char-checkbox" data-char-id="${escapeHtml(c.id)}" ${checked} />
            <div style="display:flex;flex-direction:column;line-height:1.2">
              <div style="font-weight:700">${escapeHtml(c.label)}</div>
              <div style="font-size:12px;opacity:.75">${escapeHtml(c.gender || '')}${c.desc ? ' â€¢ ' + escapeHtml(c.desc) : ''} â€¢ ${escapeHtml(c.id)}</div>
            </div>
          </label>
        `;
      })
      .join('');

    container.innerHTML = listHtml;

    // Bind checkbox change
    $$(container, 'input.char-checkbox').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-char-id');
        if (!id) return;
        if (cb.checked) App.selectedCharacterIds.add(id);
        else App.selectedCharacterIds.delete(id);
        updateSelectedCount();
      });
    });

    updateSelectedCount();
  }

  function syncParticipantsCheckboxes() {
    const container = $(storyRoot, '#characters-container');
    if (!container) return;

    $$(container, 'input.char-checkbox').forEach((cb) => {
      const id = cb.getAttribute('data-char-id');
      cb.checked = !!id && App.selectedCharacterIds.has(id);
    });
  }

  function updateSelectedCount() {
    const countEl = $(storyRoot, '#count');
    if (countEl) countEl.textContent = String(App.selectedCharacterIds.size);
  }

  function bindParticipantsControls() {
    const searchInput = $(storyRoot, '#story-search');
    const selectAllBtn = $(storyRoot, '#select-all-btn');
    const clearAllBtn = $(storyRoot, '#clear-all-btn');
    const container = $(storyRoot, '#characters-container');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = normalizeText(searchInput.value);
        if (!container) return;

        $$(container, 'label.char-item').forEach((row) => {
          const text = normalizeText(row.textContent);
          row.style.display = !q || text.includes(q) ? 'flex' : 'none';
        });
      });
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        App.characters.forEach((c) => App.selectedCharacterIds.add(c.id));
        syncParticipantsCheckboxes();
        updateSelectedCount();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        App.selectedCharacterIds.clear();
        syncParticipantsCheckboxes();
        updateSelectedCount();
      });
    }
  }

  // =========================
  // Tab 1: Preview JSON output
  // =========================
  function setStoryJSONPreview(obj) {
    const pre = $(storyRoot, '#story-json-output');
    if (!pre) return;
    pre.textContent = JSON.stringify(obj ?? {}, null, 2);
  }

  // =========================
  // Tab 1: Split Scenes & Dialogue
  // =========================
  function parseStoryToScenes(rawText) {
    const text = (rawText || '').toString();
    const lines = text.split(/\r?\n/);

    const scenes = [];
    let current = null;

    const pushScene = () => {
      if (current && current.rawLines.length) scenes.push(current);
      current = null;
    };

    for (const lineRaw of lines) {
      const line = lineRaw.trimEnd();

      const sceneMatch = line.match(/\*\*\[Scene\s*:\s*(.+?)\]\*\*/i) || line.match(/\[Scene\s*:\s*(.+?)\]/i);
      if (sceneMatch) {
        pushScene();
        current = {
          title: sceneMatch[1].trim(),
          rawLines: [],
        };
        continue;
      }

      if (!current) {
        // Create implicit intro scene if content before first [Scene]
        if (line.trim()) {
          current = { title: 'Intro', rawLines: [] };
        } else {
          continue;
        }
      }

      current.rawLines.push(line);
    }

    pushScene();

    // Convert to output schema used by your tool
    const out = scenes.map((s, idx) => {
      const id = `S${String(idx + 1).padStart(2, '0')}`;
      const frames = [{
        id: `${id}_F01`,
        duration: 1,
        lines: toDialogueLines(s.rawLines),
      }];
      return {
        id,
        title: s.title,
        rawBlock: s.rawLines.join('\n'),
        mode: 'dialogue',
        frames,
      };
    });

    return out;
  }

  function toDialogueLines(rawLines) {
    const lines = [];
    let order = 1;

    for (const l of rawLines) {
      const t = (l || '').trim();
      if (!t) continue;

      // SFX
      const sfxMatch = t.match(/\*\*\[SFX\s*:\s*(.+?)\]\*\*/i) || t.match(/\[SFX\s*:\s*(.+?)\]/i);
      if (sfxMatch) {
        lines.push({ order: order++, type: 'sfx', text: sfxMatch[1].trim() });
        continue;
      }

      // Narration: **Title:**, **Note:**, or lines without speaker.
      const speakerMatch = t.match(/^\*\*(.+?)\*\*\s*:\s*(.+)$/) || t.match(/^([^:]{2,30})\s*:\s*(.+)$/);
      if (speakerMatch) {
        const speakerLabel = speakerMatch[1].trim();
        const text = speakerMatch[2].trim();

        const char = App.characterByLabelNorm.get(normalizeText(speakerLabel)) || App.characterById.get(speakerLabel);
        lines.push({
          order: order++,
          type: 'dialogue',
          char_id: char?.id || null,
          char_label: char?.label || speakerLabel,
          text,
        });
      } else {
        lines.push({ order: order++, type: 'narration', text: t });
      }
    }

    return lines;
  }

  function splitScenesFromStory() {
    const contentEl = $(storyRoot, '#story-content');
    const raw = contentEl ? contentEl.value : '';

    if (!raw || !raw.trim()) {
      alert('Báº¡n chÆ°a cÃ³ ná»™i dung truyá»‡n.');
      return;
    }

    if (App.selectedCharacterIds.size < 1) {
      alert('Báº¡n cáº§n chá»n Ã­t nháº¥t 1 nhÃ¢n váº­t tham gia.');
      return;
    }

    const scenes = parseStoryToScenes(raw);
    App.scenes = scenes;

    const storyId = ($(storyRoot, '#story-id')?.value || '').trim();
    const title = ($(storyRoot, '#story-title')?.value || '').trim();

    const payload = {
      storyId,
      title,
      characters: Array.from(App.selectedCharacterIds),
      scenes,
    };

    setStoryJSONPreview(payload);

    // Render simple manifest list if container exists
    renderScenesOutput();
  }

  function renderScenesOutput() {
    const out = $(storyRoot, '#scenes-output');
    if (!out) return;

    const html = App.scenes
      .map((s) => {
        const lineCount = s.frames?.[0]?.lines?.length || 0;
        return `
          <div style="border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:10px;margin:10px 0;background:#fff">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div style="font-weight:800">${escapeHtml(s.id)} â€” ${escapeHtml(s.title)}</div>
              <div style="font-size:12px;opacity:.75">${lineCount} lines</div>
            </div>
            <details style="margin-top:8px">
              <summary>Xem raw block</summary>
              <pre style="white-space:pre-wrap;margin:8px 0 0">${escapeHtml(s.rawBlock || '')}</pre>
            </details>
          </div>
        `;
      })
      .join('');

    out.innerHTML = html || '<div style="opacity:.7">ChÆ°a cÃ³ scene.</div>';
  }

  // =========================
  // Local save/load (optional)
  // =========================
  const LOCAL_KEY = 'XNC_LOCAL_STORIES_V1';

  function saveLocalStory() {
    const storyId = ($(storyRoot, '#story-id')?.value || '').trim();
    const title = ($(storyRoot, '#story-title')?.value || '').trim();
    const content = ($(storyRoot, '#story-content')?.value || '').trim();

    if (!storyId) {
      alert('Báº¡n chÆ°a nháº­p ID cÃ¢u chuyá»‡n.');
      return;
    }
    if (!content) {
      alert('Báº¡n chÆ°a cÃ³ ná»™i dung truyá»‡n.');
      return;
    }

    const store = safeJsonParse(localStorage.getItem(LOCAL_KEY) || '[]', []);
    const idx = store.findIndex((x) => x && x.storyId === storyId);
    const record = {
      storyId,
      title,
      content,
      characters: Array.from(App.selectedCharacterIds),
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) store[idx] = record;
    else store.push(record);

    localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
    alert('ÄÃ£ lÆ°u story (local).');

    renderLocalStoriesSelect();
  }

  function renderLocalStoriesSelect() {
    const sel = $(storyRoot, '#saved-stories');
    if (!sel) return;

    const store = safeJsonParse(localStorage.getItem(LOCAL_KEY) || '[]', []);

    sel.innerHTML = ['<option value="">ChÆ°a cÃ³ cÃ¢u chuyá»‡n nÃ o (Local)</option>']
      .concat(
        store.map((s) => `<option value="${escapeHtml(s.storyId)}">${escapeHtml(s.storyId)}${s.title ? ' â€¢ ' + escapeHtml(s.title) : ''}</option>`),
      )
      .join('');
  }

  function loadLocalStory() {
    const sel = $(storyRoot, '#saved-stories');
    if (!sel) return;

    const storyId = sel.value;
    if (!storyId) return;

    const store = safeJsonParse(localStorage.getItem(LOCAL_KEY) || '[]', []);
    const rec = store.find((x) => x && x.storyId === storyId);
    if (!rec) return;

    $(storyRoot, '#story-id') && ($(storyRoot, '#story-id').value = rec.storyId || '');
    $(storyRoot, '#story-title') && ($(storyRoot, '#story-title').value = rec.title || '');
    $(storyRoot, '#story-content') && ($(storyRoot, '#story-content').value = rec.content || '');

    App.selectedCharacterIds = new Set(Array.isArray(rec.characters) ? rec.characters : []);
    syncParticipantsCheckboxes();
    updateSelectedCount();

    setStoryJSONPreview({ loadedFrom: 'localStorage', storyId: rec.storyId, title: rec.title });
  }

  function clearPreview() {
    App.scenes = [];
    setStoryJSONPreview({});
    renderScenesOutput();
  }

  // =========================
  // Event binding (Tab 1)
  // =========================
  function bindStoryTabEvents() {
    // Manifest reload
    const reloadBtn = $(storyRoot, '#reload-manifest-btn');
    if (reloadBtn) reloadBtn.addEventListener('click', () => loadManifest().catch((e) => alert(e.message)));

    // Load story (from manifest)
    const loadBtn = $(storyRoot, '#load-story-btn');
    if (loadBtn) loadBtn.addEventListener('click', () => loadSelectedStory());

    // Split scenes
    const splitBtn = $(storyRoot, '#split-scenes-btn');
    if (splitBtn) splitBtn.addEventListener('click', () => splitScenesFromStory());

    // Save local
    const saveBtn = $(storyRoot, '#save-local-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => saveLocalStory());

    // Load local
    const localLoadBtn = $(storyRoot, '#load-local-btn');
    if (localLoadBtn) localLoadBtn.addEventListener('click', () => loadLocalStory());

    // Clear preview
    const clearBtn = $(storyRoot, '#clear-preview-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => clearPreview());

    bindParticipantsControls();
  }

  // =========================
  // Tabs (optional)
  // =========================
  function bindTabSwitcher() {
    const btnStory = document.getElementById('btn-tab-story');
    const btnPrompt = document.getElementById('btn-tab-prompt');
    const tabStory = document.getElementById('tab-story');
    const tabPrompt = document.getElementById('tab-prompt');

    if (!btnStory || !btnPrompt || !tabStory || !tabPrompt) return;

    const showStory = () => {
      tabStory.style.display = 'block';
      tabPrompt.style.display = 'none';
      btnStory.classList.add('active');
      btnPrompt.classList.remove('active');
    };
    const showPrompt = () => {
      tabStory.style.display = 'none';
      tabPrompt.style.display = 'block';
      btnStory.classList.remove('active');
      btnPrompt.classList.add('active');
    };

    btnStory.addEventListener('click', showStory);
    btnPrompt.addEventListener('click', showPrompt);
  }

  // =========================
  // HTML escaping
  // =========================
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================
  // Init
  // =========================
  async function init() {
    try {
      await loadCharacters();

      // Render Tab 1 participants list once (and keep it stable)
      renderParticipantsList();
      bindStoryTabEvents();
      renderLocalStoriesSelect();

      // Load manifest to populate dropdown
      await loadManifest();

      bindTabSwitcher();

      console.log('[XNC] Init OK');
    } catch (e) {
      console.error('[XNC] Init error:', e);
      alert(e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
