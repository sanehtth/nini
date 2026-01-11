/* =========================
   GLOBAL STATE
========================= */
const appState = {
  characters: [],
  manifest: null,
  currentStory: null
};

/* =========================
   HELPERS
========================= */
async function fetchJSON(url) {
  console.log('[XNC] fetchJSON:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* =========================
   CHARACTERS
========================= */
async function loadCharacters() {
  const data = await fetchJSON('/adn/xomnganchuyen/XNC_characters.json');
  appState.characters = data.characters || data;
  renderParticipants();
  console.log('[XNC] Loaded characters:', appState.characters.length);
}

function renderParticipants() {
  const box = document.getElementById('participantsList');
  if (!box) {
    console.warn('[XNC] participantsList not found');
    return;
  }

  box.innerHTML = '';
  appState.characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'pitem';
    div.innerHTML = `
      <input type="checkbox" value="${c.id}">
      <div>
        <div class="pname">${c.name}</div>
        <div class="ptag">${c.gender || ''} • ${c.desc || ''}</div>
      </div>
    `;
    box.appendChild(div);
  });
}

/* =========================
   MANIFEST & STORY
========================= */
async function loadManifest() {
  appState.manifest = await fetchJSON('/substance/manifest.json');

  const sel = document.getElementById('storySelect');
  sel.innerHTML = '<option value="">-- Chọn truyện --</option>';

  appState.manifest.stories.forEach(st => {
    const opt = document.createElement('option');
    opt.value = st.file;
    opt.textContent = `${st.id} – ${st.title}`;
    sel.appendChild(opt);
  });

  document.getElementById('manifestStatus').textContent = 'Manifest: đã load';
  console.log('[XNC] Manifest loaded');
}

async function loadStory() {
  const sel = document.getElementById('storySelect');
  if (!sel.value) return alert('Chưa chọn truyện');

  const story = await fetchJSON(`/substance/${sel.value}`);
  appState.currentStory = story;

  document.getElementById('storyId').value = story.id || '';
  document.getElementById('storyTitle').value = story.title || '';
  document.getElementById('storyText').value = story.text || '';

  console.log('[XNC] Story loaded:', sel.value);
}

/* =========================
   INIT
========================= */
function bindUI() {
  document.getElementById('reloadManifestBtn').onclick = loadManifest;
  document.getElementById('loadStoryBtn').onclick = loadStory;
}

async function init() {
  try {
    await loadCharacters();
    await loadManifest();
    bindUI();
    console.log('[XNC] INIT OK');
  } catch (e) {
    console.error('[XNC] INIT ERROR', e);
  }
}

document.addEventListener('DOMContentLoaded', init);
