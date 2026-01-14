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
  if (!appState.storyDraft) return alert('Chưa lưu story');

  appState.scenes = appState.storyDraft.story
    .split('\n')
    .filter(Boolean)
    .map((t,i)=>({ id:`S${i+1}`, text:t }));

  qs('tab1_previewBox').textContent =
    JSON.stringify(appState.scenes, null, 2);
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
