// tab1.js
window.storyA = null;

async function loadManifest() {
  const res = await fetch('/public/substance/manifest.json');
  const manifest = await res.json();

  const sel = document.getElementById('manifestSelect');
  sel.innerHTML = '<option value="">-- chọn truyện --</option>';

  manifest.stories.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.file;
    opt.textContent = `${s.id} – ${s.title}`;
    sel.appendChild(opt);
  });
}

async function loadStoryA() {
  const file = document.getElementById('manifestSelect').value;
  if (!file) return alert('Chưa chọn truyện');

  const res = await fetch('./data/' + file);
  storyA = await res.json();

  document.getElementById('storyText').value =
    storyA.raw_text || '';

  console.log('[TAB1] Story A loaded', storyA);
}

document.getElementById('btnLoadStory').onclick = loadStoryA;
loadManifest();
