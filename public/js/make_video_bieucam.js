/* =========================
   GLOBAL STATE
========================= */
const appState = {
  characters: [],
  manifest: null,
  currentStory: null,
  scenes: [],
  currentSceneIndex: 0,
  currentFrameIndex: 0
};

/* =========================
   HELPERS
========================= */
async function fetchJSON(url) {
  console.log('[XNC] fetchJSON:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return await res.json();
}

/* =========================
   CHARACTERS
========================= */
async function loadCharacters() {
  const data = await fetchJSON('/adn/xomnganchuyen/XNC_characters.json');
  appState.characters = data.characters || data;
  renderCharacterList();
  console.log('[XNC] Loaded characters:', appState.characters.length);
}

function renderCharacterList() {
  const box = document.getElementById('characters-box');
  if (!box) {
    console.warn('[XNC] characters-box not found');
    return;
  }

  box.innerHTML = '';
  appState.characters.forEach(c => {
    const id = `char_${c.id}`;
    const div = document.createElement('div');
    div.innerHTML = `
      <label>
        <input type="checkbox" value="${c.id}" />
        <b>${c.name}</b> <i>${c.gender || ''}</i> – ${c.desc || ''}
      </label>
    `;
    box.appendChild(div);
  });
}

/* =========================
   MANIFEST & STORY
========================= */
async function loadManifest() {
  appState.manifest = await fetchJSON('/substance/manifest.json');
  renderStorySelect();
  console.log('[XNC] Loaded manifest');
}

function renderStorySelect() {
  const sel = document.getElementById('story-select');
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Chọn truyện --</option>';
  appState.manifest.stories.forEach(st => {
    const opt = document.createElement('option');
    opt.value = st.file;
    opt.textContent = `${st.id} – ${st.title}`;
    sel.appendChild(opt);
  });
}

async function loadStory(file) {
  appState.currentStory = await fetchJSON(`/substance/${file}`);
  document.getElementById('story-id').value = appState.currentStory.id || '';
  document.getElementById('story-title').value = appState.currentStory.title || '';
  document.getElementById('story-content').value = appState.currentStory.text || '';
  console.log('[XNC] Story loaded:', file);
}

/* =========================
   STORY TAB (FIX LỖI CHÍNH)
========================= */
function initStoryTab() {
  const btnReload = document.getElementById('reload-manifest');
  const btnLoad = document.getElementById('load-story');
  const sel = document.getElementById('story-select');

  if (btnReload) btnReload.onclick = loadManifest;
  if (btnLoad && sel) {
    btnLoad.onclick = () => {
      if (!sel.value) return alert('Chưa chọn truyện');
      loadStory(sel.value);
    };
  }
}

/* =========================
   INIT
========================= */
async function init() {
  try {
    await loadCharacters();
    await loadManifest();
    initStoryTab(); // <<< LỖI CŨ ĐÃ ĐƯỢC FIX Ở ĐÂY
    console.log('[XNC] INIT OK');
  } catch (e) {
    console.error('[XNC] INIT ERROR', e);
  }
}

document.addEventListener('DOMContentLoaded', init);
