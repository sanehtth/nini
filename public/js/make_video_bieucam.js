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
  const data = await fetchJSON('/substance/manifest.json');

  if (!data || !Array.isArray(data.items)) {
    console.error('[XNC] Manifest sai format', data);
    alert('Manifest.json không đúng format');
    return;
  }

  appState.manifest = {
    stories: data.items
  };

  renderStorySelect();

  console.log('[XNC] Loaded manifest:', data.items.length);
}


function renderStorySelect() {
  const sel = document.getElementById('storySelect');
  if (!sel || !appState.manifest) return;

  sel.innerHTML = '<option value="">-- Chọn truyện --</option>';

  appState.manifest.stories.forEach(st => {
    const opt = document.createElement('option');
    opt.value = st.file;
    opt.textContent = `${st.id} – ${st.title}`;
    sel.appendChild(opt);
  });
}

//========================
function initStoryTab() {
  const btnReload = document.getElementById('reloadManifestBtn');
  const btnLoad = document.getElementById('loadStoryBtn');
  const sel = document.getElementById('storySelect');

  if (btnReload) btnReload.onclick = loadManifest;

  if (btnLoad && sel) {
    btnLoad.onclick = () => {
      if (!sel.value) {
        alert('Chưa chọn truyện');
        return;
      }
      renderStorySelect(sel.value);
    };
  }
}
//===============
function renderCharacterList() {
  const box = document.getElementById('participantsList');
  if (!box) return;

  box.innerHTML = '';
  appState.characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'pitem';
    div.innerHTML = `
      <input type="checkbox" value="${c.id}">
      <div>
        <div class="pname">${c.name}</div>
        <div class="ptag">${c.gender || ''}</div>
      </div>
    `;
    box.appendChild(div);
  });
}
//-------------loadstory--------------
async function loadStory(file) {
  try {
    console.log('[XNC] loadStory:', file);

    const data = await fetchJSON(file);

    appState.currentStory = data;

    // Đổ dữ liệu vào form
    const idInput = document.getElementById('storyId');
    const titleInput = document.getElementById('storyTitle');
    const textInput = document.getElementById('storyText');

    if (idInput) idInput.value = data.id || '';
    if (titleInput) titleInput.value = data.title || '';
    if (textInput) {
      // ưu tiên field "story", fallback "idea"
      textInput.value = data.story || data.idea || '';
    }

    console.log('[XNC] Story loaded OK:', data.id);
  } catch (err) {
    console.error('[XNC] loadStory ERROR', err);
    alert('Không load được file truyện');
  }
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
