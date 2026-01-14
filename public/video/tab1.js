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

  const clean = (s) => s.replace(/\*\*/g, '').trim();

  function startScene(narration = '') {
    sceneIndex++;
    currentScene = {
      id: `S${sceneIndex}`,
      narration: narration,
      dialogues: [],
      sfx: []
    };
    scenes.push(currentScene);
  }

  lines.forEach(rawLine => {
    const line = clean(rawLine);

    // ===== TITLE → bỏ =====
    if (line.startsWith('Title:')) return;

    // ===== SCENE BREAK =====
    if (line === '---' || line.includes('[END SCENE]')) {
      currentScene = null;
      return;
    }

    // ===== SETTING / SCENE START =====
    if (line.startsWith('Setting:') || line.startsWith('Scene:')) {
      startScene(line.replace(/^Setting:|^Scene:/, '').trim());
      return;
    }

    // Nếu chưa có scene → tạo scene đầu
    if (!currentScene) {
      startScene('');
    }

    // ===== SFX (CHECK RẤT SỚM & RẤT CHẶT) =====
    if (/^\[SFX[\]:]/i.test(line)) {
      const sfxText = line
        .replace(/^\[SFX[\]:]*/i, '')
        .replace(/[\[\]]/g, '')
        .trim();

      currentScene.sfx.push(sfxText);
      return;
    }

    // ===== DIALOGUE (CHARACTER: TEXT) =====
    const dialogueMatch = line.match(/^([^:]{1,30}):\s*(.+)$/);
    if (dialogueMatch) {
      const character = dialogueMatch[1].trim();

      // chặn SFX giả
      if (character.toUpperCase() === 'SFX') return;

      currentScene.dialogues.push({
        character,
        text: dialogueMatch[2].trim()
      });
      return;
    }

    // ===== NARRATION =====
    currentScene.narration +=
      (currentScene.narration ? ' ' : '') + line;
  });

  appState.scenes = scenes;

  qs('tab1_previewBox').textContent =
    JSON.stringify(scenes, null, 2);

  console.log('[TAB1] Split OK', scenes.length);
}

function tab1_exportJsonA() {
  if (!appState.scenes || !appState.scenes.length) {
    alert('Chưa có scene để export');
    return;
  }

  const data = {
    type: 'STORY_STRUCT',
    storyId: appState.storyDraft?.id || '',
    title: appState.storyDraft?.title || '',
    scenes: appState.scenes
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${data.storyId || 'story'}_story_struct.json`;
  a.click();

  URL.revokeObjectURL(a.href);
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
