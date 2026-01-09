// Đường dẫn 6 file JSON (thêm backgrounds và outfits)
const JSON_URLS = {
  characters: '/adn/xomnganchuyen/XNC_characters.json',
  faces: '/adn/xomnganchuyen/XNC_faces.json',
  states: '/adn/xomnganchuyen/XNC_states.json',
  style: '/adn/xomnganchuyen/XNC_style.json',
  backgrounds: '/adn/xomnganchuyen/XNC_backgrounds.json',  // Thêm mới
  outfits: '/adn/xomnganchuyen/XNC_outfits.json'               // Thêm mới
};

let data = {
  characters: null,
  faces: null,
  states: null,
  camera: null,
  lighting: null,
  backgrounds: null,  // Thêm
  outfits: null       // Thêm
};

async function loadJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Lỗi tải ${url}: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(err);
    alert(`Không tải được ${url}. Kiểm tra đường dẫn hoặc tên file!`);
    return null;
  }
}

async function init() {
  document.getElementById('final-prompt').textContent = '⏳ Đang tải dữ liệu JSON...';

  const [charData, faceData, stateData, styleData, bgData, outfitData] = await Promise.all([
    loadJSON(JSON_URLS.characters),
    loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states),
    loadJSON(JSON_URLS.style),
    loadJSON(JSON_URLS.backgrounds),  // Thêm
    loadJSON(JSON_URLS.outfits)       // Thêm
  ]);

  if (!charData || !faceData || !stateData || !styleData || !bgData || !outfitData) return;

  data.characters = charData.characters || charData;
  data.faces = faceData.faces || faceData;
  data.states = stateData.states || stateData;
  data.camera = styleData.style.camera || {};
  data.lighting = styleData.style.lighting || {};
  data.backgrounds = bgData.backgrounds || bgData;  // Thêm
  data.outfits = outfitData.outfits || outfitData;  // Thêm

  populateCharacters();
  populateFaces();
  populateStates();
  populateCamera();
  populateLighting();
  populateBackgrounds();  // Thêm hàm mới
  populateOutfits();     // Thêm hàm mới

  document.getElementById('character').addEventListener('change', updateSignatures);
  document.getElementById('signature').addEventListener('change', () => { /* optional auto generate */ });
  ['face', 'state', 'camera', 'lighting', 'background', 'outfit', 'aspect'].forEach(id => {  // Thêm background & outfit
    document.getElementById(id).addEventListener('change', () => { /* optional auto generate */ });
  });

  document.getElementById('generate-btn').addEventListener('click', generatePrompt);
  document.getElementById('copy-btn').addEventListener('click', copyPrompt);
  document.getElementById('export-json').addEventListener('click', exportJSON);

  document.getElementById('final-prompt').textContent = '✅ Tải xong! Chọn và bấm "Tạo Prompt".';
}

function populateCharacters() {
  const select = document.getElementById('character');
  select.innerHTML = '<option value="">-- Chọn nhân vật --</option>';
  Object.keys(data.characters).forEach(key => {
    const char = data.characters[key];
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${char.name} (${char.role})`;
    select.appendChild(opt);
  });
}

function updateSignatures() {
  const charKey = document.getElementById('character').value;
  const sigSelect = document.getElementById('signature');
  sigSelect.innerHTML = '<option value="">-- Chọn hành động đặc trưng --</option>';

  if (!charKey) return;

  const char = data.characters[charKey];
  if (!char?.signatures?.length) return;

  char.signatures.forEach(sig => {
    const opt = document.createElement('option');
    opt.value = sig.id;
    opt.textContent = sig.label;
    opt.dataset.desc = sig.desc || '';
    sigSelect.appendChild(opt);
  });
}

function populateFaces() {
  const select = document.getElementById('face');
  select.innerHTML = '<option value="">-- Chọn biểu cảm --</option>';
  data.faces.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.label;
    opt.dataset.desc = f.desc_en || f.desc_vi || f.label;
    select.appendChild(opt);
  });
}

function populateStates() {
  const select = document.getElementById('state');
  select.innerHTML = '<option value="">-- Chọn trạng thái --</option>';
  data.states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    opt.dataset.desc = s.desc_en || s.label;
    select.appendChild(opt);
  });
}

function populateCamera() {
  const select = document.getElementById('camera');
  select.innerHTML = '<option value="">-- Chọn góc máy --</option>';
  Object.keys(data.camera).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key.replace(/_/g, ' ').toUpperCase();
    opt.dataset.desc = data.camera[key];
    select.appendChild(opt);
  });
}

function populateLighting() {
  const select = document.getElementById('lighting');
  select.innerHTML = '<option value="">-- Chọn ánh sáng --</option>';
  Object.keys(data.lighting).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key.replace(/_/g, ' ').toUpperCase();
    opt.dataset.desc = data.lighting[key];
    select.appendChild(opt);
  });
}

function populateBackgrounds() {  // Hàm mới
  const select = document.getElementById('background');
  select.innerHTML = '<option value="">-- Chọn nền cảnh --</option>';
  data.backgrounds.forEach(bg => {
    const opt = document.createElement('option');
    opt.value = bg.id;
    opt.textContent = bg.label;
    opt.dataset.desc = bg.desc_en || bg.label;
    select.appendChild(opt);
  });
}

function populateOutfits() {  // Hàm mới
  const select = document.getElementById('outfit');
  select.innerHTML = '<option value="">-- Chọn trang phục --</option>';
  data.outfits.forEach(out => {
    const opt = document.createElement('option');
    opt.value = out.id;
    opt.textContent = out.name;
    opt.dataset.desc = out.variants?.male?.base_desc_en || out.variants?.female?.base_desc_en || out.name;
    select.appendChild(opt);
  });
}

function generatePrompt() {
  // Lấy giá trị (thêm backgroundId và outfitId)
  const charKey = document.getElementById('character').value;
  const sigId = document.getElementById('signature').value;
  const faceId = document.getElementById('face').value;
  const stateId = document.getElementById('state').value;
  const cameraId = document.getElementById('camera').value;
  const lightingId = document.getElementById('lighting').value;
  const backgroundId = document.getElementById('background').value;  // Thêm
  const outfitId = document.getElementById('outfit').value;  // Thêm
  const aspect = document.getElementById('aspect').value;

  if (!charKey || !faceId) {
    document.getElementById('final-prompt').textContent = 'Vui lòng chọn ít nhất Nhân vật và Biểu cảm!';
    return;
  }

  const char = data.characters[charKey];
  const face = data.faces.find(f => f.id === faceId);
  const state = data.states.find(s => s.id === stateId) || { desc_en: 'neutral posture' };
  const cameraDesc = data.camera[cameraId] || 'tight close-up';
  const lightingDesc = data.lighting[lightingId] || 'soft diffused pastel lighting';
  const background = data.backgrounds.find(b => b.id === backgroundId) || { desc_en: 'simple classroom background' };  // Fallback
  const outfit = data.outfits.find(o => o.id === outfitId) || { variants: { base_desc_en: 'default uniform' } };  // Fallback

  let sigDesc = 'performing a natural action';
  if (sigId && char.signatures) {
    const sig = char.signatures.find(s => s.id === sigId);
    if (sig) sigDesc = sig.desc;
  }

  const prompt = `Create a short chibi anime video of character ${char.name} in outfit "${outfit.variants?.male?.base_desc_en || outfit.variants?.female?.base_desc_en || outfit.name}" performing "${sigDesc}" with facial expression "${face.desc_en || face.label}", in state "${state.desc_en || state.label}", background "${background.desc_en || background.label}", camera "${cameraDesc}", lighting "${lightingDesc}", aspect ratio ${aspect}.`;

  document.getElementById('final-prompt').textContent = prompt;
}

function copyPrompt() {
  const text = document.getElementById('final-prompt').textContent;
  navigator.clipboard.writeText(text).then(() => alert('Đã copy!'));
}

function exportJSON() {
  const selections = {
    character: document.getElementById('character').value,
    signature: document.getElementById('signature').value,
    face: document.getElementById('face').value,
    state: document.getElementById('state').value,
    camera: document.getElementById('camera').value,
    lighting: document.getElementById('lighting').value,
    background: document.getElementById('background').value,  // Thêm
    outfit: document.getElementById('outfit').value,  // Thêm
    aspect: document.getElementById('aspect').value
  };
  const json = JSON.stringify(selections, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'xnc_selections.json';
  a.click();
}

document.addEventListener('DOMContentLoaded', init);
