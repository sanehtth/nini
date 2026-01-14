/* =========================
   GLOBAL STATE – TAB 1
========================= */
const appState = {
  characters: [],
  manifest: [],
  currentStory: null,
  storyDraft: null,
  selectedCharacters: []
};

/* =========================
   HELPERS
========================= */
const qs = (id) => document.getElementById(id);

async function fetchJSON(url) {
  console.log('[XNC] fetchJSON:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* =========================
   LOAD CHARACTERS (GIỮ NGUYÊN)
========================= */
async function loadCharacters() {
  try {
    const data = await fetchJSON('/adn/xomnganchuyen/XNC_characters.json');
    appState.characters = data.characters || data;
    renderParticipants();
  } catch (e) {
    console.warn('[XNC] No characters loaded');
  }
}

function renderParticipants() {
  const box = qs('participantsList');
  if (!box) return;

  box.innerHTML = '';
  appState.characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'pitem';
    div.innerHTML = `
      <label>
        <input type="checkbox" value="${c.id}">
        <b>${c.name}</b>
      </label>
    `;
    box.appendChild(div);
  });

  box.querySelectorAll('input').forEach(cb => {
    cb.onchange = () => {
      appState.selectedCharacters = [...box.querySelectorAll('input:checked')]
        .map(i => i.value);
      qs('participantsSelectedCount').textContent =
        appState.selectedCharacters.length;
    };
  });
}

/* =========================
   MANIFEST → LISTBOX
========================= */
async function loadManifest() {
  const data = await fetchJSON('/substance/manifest.json');
  appState.manifest = data.items || [];
  renderStoryListbox();
}

function renderStoryListbox() {
  const list = qs('storyList');
  if (!list) {
    console.error('[XNC] storyList not found in HTML');
    return;
  }

  list.innerHTML = '<option value="">-- Chọn truyện --</option>';

  appState.manifest.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.file;
    opt.textContent = `${item.id} – ${item.title}`;
    list.appendChild(opt);
  });
}

/* =========================
   LOAD STORY FROM LISTBOX
========================= */
function bindStoryListbox() {
  const list = qs('storyList');
  if (!list) return;

  list.onchange = async () => {
    if (!list.value) return;

    const data = await fetchJSON(list.value);
    appState.currentStory = data;

    qs('storyId').value = data.id || '';
    qs('storyTitle').value = data.title || '';
    qs('storyText').value = data.story || data.idea || '';

    console.log('[XNC] Story loaded:', data.id);
  };
}

/* =========================
   SAVE / EXPORT STORY
========================= */
function saveStoryLocal() {
  appState.storyDraft = {
    id: qs('storyId').value,
    title: qs('storyTitle').value,
    story: qs('storyText').value,
    characters: appState.selectedCharacters
  };
  alert('Đã lưu story (local)');
}

function exportStoryJSON() {
  if (!appState.storyDraft) return alert('Chưa lưu story');
  downloadJSON(appState.storyDraft, `${appState.storyDraft.id}_story.json`);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* =========================
   BIND UI
========================= */
function bindUI() {
  qs('saveLocalBtn')?.addEventListener('click', saveStoryLocal);
  qs('exportStoryBtn')?.addEventListener('click', exportStoryJSON);
}

/* =========================
   INIT
========================= */
async function init() {
  await loadCharacters();
  await loadManifest();
  bindStoryListbox();
  bindUI();
  console.log('[XNC] TAB 1 READY');
}

document.addEventListener('DOMContentLoaded', init);
