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

//===============

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
//==========================
function splitScenesFromStory() {
  console.log('[XNC] splitScenesFromStory START');

  const textInput = document.getElementById('storyText');
  if (!textInput || !textInput.value.trim()) {
    alert('Chưa có nội dung câu chuyện');
    return;
  }

  // ===============================
  // 1️⃣ LẤY NHÂN VẬT ĐÃ CHỌN
  // ===============================
  const checked = Array.from(
    document.querySelectorAll('#participantsList input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  if (!checked.length) {
    alert('Chưa chọn nhân vật tham gia');
    return;
  }

  // map id -> full character object
  const characterMap = {};
  appState.characters.forEach(c => {
    characterMap[c.id] = c;
  });

  const selectedCharacters = checked
    .map(id => characterMap[id])
    .filter(Boolean);

  console.log('[XNC] Selected characters:', selectedCharacters.map(c => c.id));

  // ===============================
  // 2️⃣ CHUẨN HÓA TEXT
  // ===============================
  const lines = textInput.value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // ===============================
  // 3️⃣ KHỞI TẠO OUTPUT
  // ===============================
  const scenes = [];
  const dialogues = [];
  const sfx = [];

  let sceneIndex = 1;
  let currentSceneId = `S${sceneIndex.toString().padStart(2, '0')}`;

  // ===============================
  // 4️⃣ TẠO SCENE ĐẦU TIÊN
  // ===============================
  scenes.push({
    scene_id: currentSceneId,
    summary: '',
    characters: selectedCharacters.map(c => ({
      ...c,
      // gắn default asset (để UI chỉnh sau)
      outfit: c.default_outfit_id || null,
      face: c.preferred_faces?.[0] || null,
      state: null
    })),
    background: null,
    raw_lines: []
  });

  // ===============================
  // 5️⃣ PARSE TỪNG DÒNG
  // ===============================
  lines.forEach(line => {
    // --- SFX ---
    if (line.startsWith('**[SFX:') || line.startsWith('[SFX:')) {
      sfx.push({
        scene_id: currentSceneId,
        type: 'sfx',
        text: line
          .replace('**', '')
          .replace('[SFX:', '')
          .replace(']', '')
          .trim()
      });
      return;
    }

    // --- Dialogue ---
    const match = line.match(/^\*\*(.+?):\s*(.+)\*\*$/);
    if (match) {
      const speakerRaw = match[1].trim();
      const text = match[2].trim();

      // tìm character theo name (fallback)
      const char =
        selectedCharacters.find(c => c.name === speakerRaw) ||
        selectedCharacters.find(c =>
          speakerRaw.toLowerCase().includes(c.name.toLowerCase())
        );

      dialogues.push({
        scene_id: currentSceneId,
        character_id: char ? char.id : null,
        character_name: speakerRaw,
        text
      });

      scenes[scenes.length - 1].raw_lines.push(line);
      return;
    }

    // --- Narrative / description ---
    scenes[scenes.length - 1].summary +=
      (scenes[scenes.length - 1].summary ? ' ' : '') + line;
    scenes[scenes.length - 1].raw_lines.push(line);
  });

  // ===============================
  // 6️⃣ LƯU VÀO STATE + PREVIEW
  // ===============================
  appState.videoScenes = scenes;
  appState.dialogues = dialogues;
  appState.sfx = sfx;

  const preview = document.getElementById('jsonPreview');
  if (preview) {
    preview.textContent = JSON.stringify(
      {
        scenes,
        dialogues,
        sfx
      },
      null,
      2
    );
  }

  console.log('[XNC] splitScenesFromStory DONE', {
    scenes: scenes.length,
    dialogues: dialogues.length,
    sfx: sfx.length
  });
}


/* =========================
   INIT
========================= */
function bindUI() {
  // Reload manifest
  const reloadBtn = document.getElementById('reloadManifestBtn');
  if (reloadBtn) reloadBtn.onclick = loadManifest;

  // Load story
  const loadBtn = document.getElementById('loadStoryBtn');
  if (loadBtn) {
    loadBtn.onclick = () => {
      const sel = document.getElementById('storySelect');
      if (!sel || !sel.value) {
        alert('Chưa chọn truyện');
        return;
      }
      loadStory(sel.value);
    };
  }

  // 👉 TÁCH SCENE & THOẠI
  const splitBtn = document.getElementById('splitBtn');
  if (splitBtn) {
    splitBtn.onclick = () => {
      if (!appState.currentStory) {
        alert('Chưa load truyện để tách scene');
        return;
      }
      splitScenesFromStory(); // gọi hàm tách
    };
  }
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
