async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

async function tab1_loadManifest() {
  const data = await fetchJSON('/substance/manifest.json');
  appState.manifest = data.items || [];

  const sel = qs('tab1_storySelect');
  sel.innerHTML = '<option value="">-- chọn --</option>';

  appState.manifest.forEach(it => {
    const o = document.createElement('option');
    o.value = it.file;
    o.textContent = `${it.id} – ${it.title}`;
    sel.appendChild(o);
  });
}

async function tab1_loadStory(file) {
  const data = await fetchJSON(file);
  qs('tab1_storyId').value = data.id || '';
  qs('tab1_storyTitle').value = data.title || '';
  qs('tab1_storyText').value = data.story || '';
}

function tab1_saveLocal() {
  appState.storyDraft = {
    id: qs('tab1_storyId').value,
    title: qs('tab1_storyTitle').value,
    story: qs('tab1_storyText').value
  };
}

function tab1_split() {
  if (!appState.storyDraft) {
    alert('Chưa lưu story');
    return;
  }

  const lines = appState.storyDraft.story
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const scenes = [];
  let sceneIndex = 0;
  let currentScene = null;

  lines.forEach(line => {

    // ===== SCENE / SETTING =====
    if (line.startsWith('**Setting') || line.startsWith('**Scene')) {
      sceneIndex++;
      currentScene = {
        id: `S${sceneIndex}`,
        narration: line.replace(/\*\*/g, ''),
        dialogues: [],
        sfx: []
      };
      scenes.push(currentScene);
      return;
    }

    if (!currentScene) return;

    // ===== SFX =====
    if (line.includes('[SFX]')) {
      currentScene.sfx.push(
        line.replace('[SFX]', '').replace(/\*\*/g, '').trim()
      );
      return;
    }

    // ===== DIALOGUE =====
    if (line.includes(':')) {
      const [char, ...rest] = line.split(':');
      currentScene.dialogues.push({
        character: char.replace(/\*/g, '').trim(),
        text: rest.join(':').replace(/\*\*/g, '').trim()
      });
      return;
    }

    // ===== NARRATION CONTINUE =====
    currentScene.narration += ' ' + line.replace(/\*\*/g, '');
  });

  appState.scenes = scenes;

  qs('tab1_previewBox').textContent =
    JSON.stringify(scenes, null, 2);

  console.log('[TAB1] Split OK:', scenes.length);
}


function initTab1() {
  qs('tab1_reloadManifestBtn').onclick = tab1_loadManifest;
  qs('tab1_loadStoryBtn').onclick = () => {
    const v = qs('tab1_storySelect').value;
    if (v) tab1_loadStory(v);
  };
  qs('tab1_saveLocalBtn').onclick = tab1_saveLocal;
  qs('tab1_splitBtn').onclick = tab1_split;

  tab1_loadManifest();
  console.log('[TAB1] READY');
}

document.addEventListener('DOMContentLoaded', initTab1);
