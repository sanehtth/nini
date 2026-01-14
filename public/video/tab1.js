// tab1.js – ONLY Story / Manifest
console.log('[TAB1] init');

window.storyA = null;

const MANIFEST_URL = '/public/substance/manifest.json';
const STORY_BASE   = '/public/substance/';

async function loadManifest() {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error('Manifest not found');

    const manifest = await res.json();

    if (!Array.isArray(manifest.stories)) {
      alert('Manifest sai cấu trúc: thiếu stories[]');
      return;
    }

    const sel = document.getElementById('manifestSelect');
    sel.innerHTML = '<option value="">-- chọn truyện --</option>';

    manifest.stories.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.file;        // ví dụ: XNC-20260110-0005.json
      opt.textContent = `${s.id} – ${s.title}`;
      sel.appendChild(opt);
    });

    console.log('[TAB1] Manifest loaded', manifest.stories.length);
  } catch (err) {
    console.error('[TAB1] loadManifest error', err);
    alert('Không load được manifest.json');
  }
}

async function loadStoryA() {
  const file = document.getElementById('manifestSelect').value;
  if (!file) {
    alert('Chưa chọn truyện');
    return;
  }

  try {
    const res = await fetch(STORY_BASE + file);
    if (!res.ok) throw new Error('Story not found');

    storyA = await res.json();

    document.getElementById('storyId').value    = storyA.id || '';
    document.getElementById('storyTitle').value = storyA.title || '';
    document.getElementById('storyText').value  = storyA.raw_text || '';

    document.getElementById('previewJsonA').textContent =
      JSON.stringify(storyA, null, 2);

    console.log('[TAB1] Story A loaded', storyA);
  } catch (err) {
    console.error('[TAB1] loadStoryA error', err);
    alert('Không load được story JSON');
  }
}

document.getElementById('btnLoadStory').onclick = loadStoryA;
loadManifest();
