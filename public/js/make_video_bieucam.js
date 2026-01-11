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
  // State (Tab 1)
  // =========================
  const StoryState = {
    charactersAll: [],          // [{id,label,gender,role, ...}]
    charactersById: new Map(),  // id -> char
    charactersByLabel: new Map(), // normalized label -> char
    selectedCharIds: new Set(),
    story: null,               // loaded story json
    storyText: '',             // story raw text
    manifestItems: [],         // [{id,title,file,...}]
    scenes: [],                // derived scenes
  };

  // =========================
  // Utilities
  // =========================
  const norm = (s) =>
    (s ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  function $(root, sel) {
    return root ? root.querySelector(sel) : null;
  }
  function $all(root, sel) {
    return root ? Array.from(root.querySelectorAll(sel)) : [];
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);
    return res.json();
  }

  function toSubstancePath(fileValue) {
    // Accept:
    // - "XNC-....json"
    // - "/substance/XNC-....json"
    // - "/XNC-....json"   (bad legacy)
    // Always return "/substance/<name>.json"
    let v = (fileValue ?? '').toString().trim();
    if (!v) return '';
    v = v.replace(/^https?:\/\/[^/]+/i, ''); // strip origin if someone stored absolute url
    if (v.startsWith(PATHS.substanceBase)) return v;
    v = v.replace(/^\/+/, ''); // remove leading slashes
    return PATHS.substanceBase + v;
  }

  function safeSetText(el, text) {
    if (!el) return;
    el.value = text ?? '';
  }

  function setStatus(root, msg) {
    const el = $(root, '#manifest-status');
    if (el) el.textContent = msg;
  }

  // =========================
  // DOM Roots (Tabs)
  // =========================
  const tabStory = document.getElementById('tab-story') || document.body;
  const tabPrompt = document.getElementById('tab-prompt') || null;

  // =========================
  // Participants UI (Tab 1)
  // =========================
  function renderParticipantsList() {
    const container = $(tabStory, '#characters-container');
    const countEl = $(tabStory, '#count');
    if (!container) return;

    const q = norm(($(tabStory, '#story-search')?.value ?? ''));
    const chars = StoryState.charactersAll.filter((c) => {
      if (!q) return true;
      return norm(c.label).includes(q) || norm(c.id).includes(q) || norm(c.role).includes(q);
    });

    container.innerHTML = chars
      .map((c) => {
        const checked = StoryState.selectedCharIds.has(c.id) ? 'checked' : '';
        const gender = c.gender ? `${c.gender}` : '';
        const role = c.role ? ` • ${c.role}` : '';
        return `
          <label class="character-row" style="display:flex;gap:8px;align-items:center;padding:6px 8px;border:1px solid #e7e7e7;border-radius:10px;margin:6px 0;background:#fff">
            <input type="checkbox" data-char-id="${c.id}" ${checked} />
            <div style="line-height:1.25">
              <div style="font-weight:700">${c.label}</div>
              <div style="font-size:12px;opacity:.75">${gender}${role} • ${c.id}</div>
            </div>
          </label>
        `;
      })
      .join('');

    // bind checkbox change (scoped)
    $all(container, 'input[type="checkbox"][data-char-id]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-char-id');
        if (!id) return;
        if (cb.checked) StoryState.selectedCharIds.add(id);
        else StoryState.selectedCharIds.delete(id);
        if (countEl) countEl.textContent = `Đã chọn: ${StoryState.selectedCharIds.size}`;
      });
    });

    if (countEl) countEl.textContent = `Đã chọn: ${StoryState.selectedCharIds.size}`;
  }

  function setupParticipantsEvents() {
    const search = $(tabStory, '#story-search');
    const btnAll = $(tabStory, '#select-all-btn');
    const btnClear = $(tabStory, '#clear-all-btn');

    search?.addEventListener('input', renderParticipantsList);

    btnAll?.addEventListener('click', () => {
      StoryState.charactersAll.forEach((c) => StoryState.selectedCharIds.add(c.id));
      renderParticipantsList();
    });

    btnClear?.addEventListener('click', () => {
      StoryState.selectedCharIds.clear();
      renderParticipantsList();
    });

    // Also: if container exists, delegate checkbox events (already bound per render)
  }

  // =========================
  // Load characters
  // =========================
  async function loadCharacters() {
    const json = await fetchJSON(PATHS.characters);
    const arr = Array.isArray(json) ? json : (Array.isArray(json.characters) ? json.characters : []);
    StoryState.charactersAll = arr
      .map((c) => ({
        id: (c.id ?? c.char_id ?? c.code ?? '').toString().trim(),
        label: (c.label ?? c.name ?? c.title ?? '').toString().trim(),
        gender: (c.gender ?? '').toString().trim(),
        role: (c.role ?? c.desc ?? '').toString().trim(),
        raw: c,
      }))
      .filter((c) => c.id && c.label);

    StoryState.charactersById.clear();
    StoryState.charactersByLabel.clear();
    for (const c of StoryState.charactersAll) {
      StoryState.charactersById.set(c.id, c);
      StoryState.charactersByLabel.set(norm(c.label), c);
    }

    renderParticipantsList();
  }

  // =========================
  // Manifest (Tab 1)
  // =========================
  function renderManifestSelect() {
    const sel = $(tabStory, '#story-select');
    if (!sel) return;

    const options = [
      `<option value="">-- Chọn truyện --</option>`,
      ...StoryState.manifestItems.map((it) => {
        // IMPORTANT: value must be FILE (not id) so Load uses correct file
        const file = it.file || it.path || it.href || '';
        const label = `${it.id || ''}${it.title ? ` • ${it.title}` : ''}`.trim();
        return `<option value="${String(file).replace(/\"/g, '&quot;')}">${label || file}</option>`;
      }),
    ];

    sel.innerHTML = options.join('');
  }

  async function loadManifest() {
    try {
      setStatus(tabStory, 'Manifest: đang tải...');
      const json = await fetchJSON(PATHS.manifest);

      const items = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : []);
      StoryState.manifestItems = items.map((it) => ({
        id: it.id ?? it.storyId ?? it.code ?? '',
        title: it.title ?? it.name ?? '',
        file: it.file ?? it.path ?? it.href ?? it.url ?? '',
        raw: it,
      }));

      renderManifestSelect();
      setStatus(tabStory, `Manifest: OK (${StoryState.manifestItems.length} truyện)`);
    } catch (e) {
      console.error('[XNC] loadManifest error', e);
      setStatus(tabStory, `Manifest: lỗi (${e.message})`);
    }
  }

  // =========================
  // Load story from manifest selection
  // =========================
  async function loadStoryFromSelected() {
    const sel = $(tabStory, '#story-select');
    const fileValue = sel?.value ?? '';
    if (!fileValue) {
      alert('Bạn chưa chọn truyện trong dropdown.');
      return;
    }

    const storyPath = toSubstancePath(fileValue);

    try {
      const story = await fetchJSON(storyPath);

      // Accept both formats:
      // A) { id,title,story,characters:[...] }
      // B) { storyId,title,content,characters:[...] }
      const id = (story.id ?? story.storyId ?? story.code ?? '').toString().trim();
      const title = (story.title ?? story.name ?? '').toString().trim();
      const rawText =
        (story.story ?? story.content ?? story.story_text ?? story.storyText ?? '').toString();

      StoryState.story = story;
      StoryState.storyText = rawText;

      safeSetText($(tabStory, '#story-id'), id);
      safeSetText($(tabStory, '#story-title'), title);
      safeSetText($(tabStory, '#story-content'), rawText);

      // Apply character selection from story.characters if present
      StoryState.selectedCharIds.clear();
      const chars = Array.isArray(story.characters) ? story.characters : [];
      if (chars.length) {
        // Support either ids or labels
        for (const x of chars) {
          const s = (x ?? '').toString().trim();
          if (!s) continue;
          if (StoryState.charactersById.has(s)) {
            StoryState.selectedCharIds.add(s);
            continue;
          }
          const byLabel = StoryState.charactersByLabel.get(norm(s));
          if (byLabel) StoryState.selectedCharIds.add(byLabel.id);
        }
      }

      // If story has no characters list, keep current UI selection as-is
      renderParticipantsList();

      // preview
      const preview = $(tabStory, '#story-json-output');
      if (preview) {
        preview.textContent = JSON.stringify(
          { loadedFrom: storyPath, storyId: id, title },
          null,
          2
        );
      }

      console.log('[XNC] Story loaded OK from:', storyPath, { id, title, textLen: rawText.length });
    } catch (e) {
      console.error('[XNC] loadStoryFromSelected error', e);
      alert(`Load truyện lỗi: ${e.message}`);
    }
  }

  // =========================
  // Scene splitting (simple, robust)
  // =========================
  function parseStoryToScenes(text) {
    const lines = (text ?? '').split(/\r?\n/);
    const scenes = [];
    let cur = null;

    const pushCur = () => {
      if (cur && (cur.rawLines.length || cur.title)) scenes.push(cur);
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const mScene = line.match(/^\*?\*?\[Scene:\s*(.+?)\]\*?\*?$/i);
      if (mScene) {
        pushCur();
        cur = {
          id: `S${String(scenes.length + 1).padStart(2, '0')}`,
          title: mScene[1].trim(),
          rawLines: [],
        };
        continue;
      }

      if (!cur) {
        // Anything before first scene becomes S00 Intro
        cur = { id: 'S00', title: 'Intro', rawLines: [] };
      }

      cur.rawLines.push(line);
    }

    pushCur();

    // convert each scene to frames/lines
    return scenes.map((s) => {
      const frames = [];
      let order = 1;

      for (const raw of s.rawLines) {
        // SFX
        const mSfx = raw.match(/^\*?\*?\[SFX:\s*(.+?)\]\*?\*?$/i);
        if (mSfx) {
          frames.push({
            type: 'sfx',
            order: order++,
            text: mSfx[1].trim(),
          });
          continue;
        }

        // Dialogue: **Name:** text  OR  Name: text
        const mDlg = raw.match(/^\*?\*?([^:*]+?)\*?\*?\s*:\s*(.+)$/);
        if (mDlg) {
          const speakerLabel = mDlg[1].trim();
          const text = mDlg[2].trim();

          // map speaker to id if possible
          const byLabel = StoryState.charactersByLabel.get(norm(speakerLabel));
          const charId = byLabel?.id ?? '';
          frames.push({
            type: 'dialogue',
            order: order++,
            charId,
            charLabel: speakerLabel,
            text,
          });
          continue;
        }

        // Fallback narration
        frames.push({
          type: 'narration',
          order: order++,
          text: raw,
        });
      }

      return {
        id: s.id,
        title: s.title,
        frames,
      };
    });
  }

  function splitScenesFromStory() {
    const content = ($(tabStory, '#story-content')?.value ?? '').toString();
    if (!content.trim()) {
      alert('Bạn chưa có nội dung truyện.');
      return;
    }

    const scenes = parseStoryToScenes(content);
    StoryState.scenes = scenes;

    // Show preview JSON
    const preview = $(tabStory, '#story-json-output');
    if (preview) {
      preview.textContent = JSON.stringify(
        {
          storyId: ($(tabStory, '#story-id')?.value ?? '').toString().trim(),
          title: ($(tabStory, '#story-title')?.value ?? '').toString().trim(),
          charactersSelected: Array.from(StoryState.selectedCharIds),
          scenes,
        },
        null,
        2
      );
    }

    // Render a simple manifest UI list if present
    const scenesOut = $(tabStory, '#scenes-output');
    if (scenesOut) {
      scenesOut.innerHTML = scenes
        .map((s) => {
          return `
            <div style=\"border:1px solid #e7e7e7;border-radius:12px;padding:10px;margin:10px 0;background:#fff\">
              <div style=\"display:flex;justify-content:space-between;gap:12px;align-items:flex-start\">
                <div>
                  <div style=\"font-weight:800\">${s.id} — ${escapeHtml(s.title)}</div>
                  <div style=\"font-size:12px;opacity:.75\">Frames: ${s.frames.length}</div>
                </div>
              </div>
              <details style=\"margin-top:8px\">\n<summary style=\"cursor:pointer\">Xem frames (${s.frames.length})</summary>\n
                <div style=\"margin-top:8px;display:flex;flex-direction:column;gap:6px\">\n
                  ${s.frames
                    .map((f) => {
                      if (f.type === 'dialogue') {
                        return `<div style=\"font-size:13px\"><b>${escapeHtml(f.charLabel)}</b>: ${escapeHtml(f.text)}</div>`;
                      }
                      if (f.type === 'sfx') {
                        return `<div style=\"font-size:13px\"><i>[SFX]</i> ${escapeHtml(f.text)}</div>`;
                      }
                      return `<div style=\"font-size:13px\">${escapeHtml(f.text)}</div>`;
                    })
                    .join('')}\n
                </div>\n
              </details>\n
            </div>
          `;
        })
        .join('');
    }

    console.log('[XNC] Scenes created:', scenes.length);
  }

  function escapeHtml(s) {
    return (s ?? '').toString()
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('\"', '&quot;')
      .replaceAll(\"'\", '&#39;');
  }

  // =========================
  // Bind events (Tab 1 only)
  // =========================
  function bindStoryTabEvents() {
    // manifest buttons
    $(tabStory, '#reload-manifest-btn')?.addEventListener('click', loadManifest);
    $(tabStory, '#load-story-btn')?.addEventListener('click', loadStoryFromSelected);

    // local story save/load (if your HTML has them)
    $(tabStory, '#split-scenes-btn')?.addEventListener('click', splitScenesFromStory);

    setupParticipantsEvents();
  }

  // =========================
  // Init
  // =========================
  async function init() {
    try {
      bindStoryTabEvents();
      await loadCharacters();
      await loadManifest();
      console.log('[XNC] Init OK');
    } catch (e) {
      console.error('[XNC] Init error', e);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
