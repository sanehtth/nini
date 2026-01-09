// script.js - Phiên bản QUẢN LÝ NHIỀU PROMPT (có ID, tên, add, lưu local)

const JSON_URLS = {
  characters: '/adn/xomnganchuyen/XNC_characters.json',
  faces: '/adn/xomnganchuyen/XNC_faces.json',
  states: '/adn/xomnganchuyen/XNC_states.json',
  style: '/adn/xomnganchuyen/XNC_style.json',
  backgrounds: '/adn/xomnganchuyen/XNC_backgrounds.json',  // Thêm mới
  outfits: '/adn/xomnganchuyen/XNC_outfits.json'               // Thêm mới
};

let data = {
  characters: null, faces: null, states: null,
  camera: null, lighting: null,
  backgrounds: null, outfits: null
};

let savedPrompts = JSON.parse(localStorage.getItem('xnc_saved_prompts') || '[]');
let promptCounter = parseInt(localStorage.getItem('xnc_counter') || '1');

async function loadJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Lỗi tải ${url}:`, err);
    alert(`Không tải được file: ${url}\nĐảm bảo file tồn tại trong thư mục và tên đúng chính tả!`);
    return null;
  }
}

async function init() {
  document.getElementById('final-prompt').textContent = 'Đang tải 6 file JSON...';

  const [charJson, facesJson, statesJson, styleJson, bgJson, outfitJson] = await Promise.all([
    loadJSON(JSON_URLS.characters),
    loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states),
    loadJSON(JSON_URLS.style),
    loadJSON(JSON_URLS.backgrounds),
    loadJSON(JSON_URLS.outfits)
  ]);

  if (!charJson || !facesJson || !statesJson || !styleJson || !bgJson || !outfitJson) {
    document.getElementById('final-prompt').textContent = 'Lỗi tải file JSON. Xem console (F12).';
    return;
  }

  data.characters  = charJson.characters;
  data.faces       = facesJson.faces;
  data.states      = statesJson.states;
  data.camera      = styleJson.style.camera;
  data.lighting    = styleJson.style.lighting;
  data.backgrounds = bgJson.backgrounds;
  data.outfits     = outfitJson.outfits;

  populateCharacters();
  populateFaces();
  populateStates();
  populateCamera();
  populateLighting();
  populateBackgrounds();
  populateOutfits();

  document.getElementById('character').addEventListener('change', updateSignatures);

  const changeElements = ['signature','face','state','camera','lighting','background','outfit','aspect'];
  changeElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', generatePrompt);
  });

  document.getElementById('generate-btn').addEventListener('click', generatePrompt);
  document.getElementById('add-btn').addEventListener('click', addCurrentPrompt);
  document.getElementById('copy-btn').addEventListener('click', copyCurrentPrompt);
  document.getElementById('export-all-btn').addEventListener('click', exportAllPrompts);
  document.getElementById('clear-all-btn').addEventListener('click', clearAllPrompts);

  renderSavedList();
  document.getElementById('final-prompt').textContent = 'Sẵn sàng! Chọn và bấm "Tạo Prompt" để bắt đầu.';
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
  if (!char || !char.signatures || char.signatures.length === 0) return;

  char.signatures.forEach(sig => {
    const opt = document.createElement('option');
    opt.value = sig.id;
    opt.textContent = sig.label;
    opt.dataset.desc = sig.desc || '';
    sigSelect.appendChild(opt);
  });
  generatePrompt();
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

function populateBackgrounds() {
  const select = document.getElementById('background');
  select.innerHTML = '<option value="">-- Không chọn nền --</option>';
  data.backgrounds.forEach(bg => {
    const opt = document.createElement('option');
    opt.value = bg.id;
    opt.textContent = bg.label;
    opt.dataset.desc = bg.desc_en;
    select.appendChild(opt);
  });
}

function populateOutfits() {
  const select = document.getElementById('outfit');
  select.innerHTML = '<option value="">-- Trang phục mặc định --</option>';
  data.outfits.forEach(out => {
    const opt = document.createElement('option');
    opt.value = out.id;
    opt.textContent = out.name;
    const desc = out.variants?.male?.base_desc_en || out.variants?.female?.base_desc_en || out.name;
    opt.dataset.desc = desc;
    select.appendChild(opt);
  });
}

function generatePrompt() {
  const charKey = document.getElementById('character').value;
  const sigId   = document.getElementById('signature').value;
  const faceId  = document.getElementById('face').value;
  const stateId = document.getElementById('state').value;
  const camId   = document.getElementById('camera').value || 'closeup';
  const lightId = document.getElementById('lighting').value || 'soft_pastel';
  const bgId    = document.getElementById('background').value;
  const outfitId= document.getElementById('outfit').value;
  const aspect  = document.getElementById('aspect').value || '16:9';

  if (!charKey || !faceId) {
    document.getElementById('final-prompt').textContent = 'Chọn ít nhất Nhân vật + Biểu cảm để tạo prompt!';
    return;
  }

  const char   = data.characters[charKey];
  const face   = data.faces.find(f => f.id === faceId);
  const state  = data.states.find(s => s.id === stateId) || { desc_en: 'neutral posture' };
  const cam    = data.camera[camId] || 'tight close-up, soft depth of field';
  const light  = data.lighting[lightId] || 'soft diffused pastel lighting';
  const bg     = data.backgrounds.find(b => b.id === bgId) || { desc_en: 'simple clean background' };
  const outfit = data.outfits.find(o => o.id === outfitId);

  let action = 'standing naturally with subtle movements';
  if (sigId) {
    const sig = char.signatures?.find(s => s.id === sigId);
    if (sig) action = sig.desc || sig.label;
  }

  let outfitDesc = '';
  if (outfit) {
    const desc = outfit.variants?.male?.base_desc_en || outfit.variants?.female?.base_desc_en || outfit.name;
    outfitDesc = `${desc}, `;
  }

  const fullPrompt = `Create a short cute chibi anime video from XNC series.

Character: ${char.name} (${char.role}), ${outfitDesc}performing action: "${action}"

Facial expression: ${face.desc_en || face.desc_vi || face.label}
Emotional state: ${state.desc_en || state.label}

Background: ${bg.desc_en}
Camera: ${cam}
Lighting: ${light}

Style: vibrant pastel colors, exaggerated funny expressions, smooth animation, adorable and humorous.
Aspect ratio: ${aspect}. High quality.`;

  document.getElementById('final-prompt').textContent = fullPrompt.trim();
}

function addCurrentPrompt() {
  generatePrompt(); // Đảm bảo prompt mới nhất
  const promptText = document.getElementById('final-prompt').textContent.trim();

  if (!promptText || promptText.includes('Chọn ít nhất')) {
    alert('Hãy tạo prompt hợp lệ trước!');
    return;
  }

  const videoId = document.getElementById('video-id').value.trim() || `XNC${String(promptCounter).padStart(3, '0')}`;
  const videoTitle = document.getElementById('video-title').value.trim() || `Video XNC ${promptCounter}`;

  const entry = {
    id: videoId,
    title: videoTitle,
    timestamp: new Date().toISOString(),
    selections: {
      character: document.getElementById('character').value,
      signature: document.getElementById('signature').value || null,
      face: document.getElementById('face').value,
      state: document.getElementById('state').value || null,
      camera: document.getElementById('camera').value,
      lighting: document.getElementById('lighting').value,
      background: document.getElementById('background').value || null,
      outfit: document.getElementById('outfit').value || null,
      aspect: document.getElementById('aspect').value
    },
    prompt: promptText
  };

  if (savedPrompts.some(p => p.id === videoId)) {
    if (!confirm(`ID ${videoId} đã tồn tại. Ghi đè?`)) return;
    savedPrompts = savedPrompts.filter(p => p.id !== videoId);
  }

  savedPrompts.push(entry);
  localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
  promptCounter++;
  localStorage.setItem('xnc_counter', promptCounter);

  document.getElementById('video-id').value = '';
  document.getElementById('video-title').value = '';

  renderSavedList();
  alert(`Đã lưu "${videoTitle}" (ID: ${videoId})`);
}

function renderSavedList() {
  const container = document.getElementById('prompt-list');
  document.getElementById('count').textContent = savedPrompts.length;

  if (savedPrompts.length === 0) {
    container.innerHTML = '<p class="muted">Chưa có prompt nào.</p>';
    return;
  }

  container.innerHTML = '<table style="width:100%; border-collapse:collapse;"><thead><tr style="background:var(--accent);"><th>ID</th><th>Tên</th><th>Nhân vật</th><th>Thời gian</th><th></th></tr></thead><tbody>' +
    savedPrompts.map(p => {
      const char = data.characters[p.selections.character]?.name || 'N/A';
      const date = new Date(p.timestamp).toLocaleString('vi-VN');
      return `<tr><td><code>${p.id}</code></td><td>${p.title}</td><td>${char}</td><td>${date}</td><td><button onclick="copySaved('${p.id}')">Copy</button> <button onclick="delSaved('${p.id}')">Del</button></td></tr>`;
    }).join('') + '</tbody></table>';
}

window.copySaved = function(id) {
  const p = savedPrompts.find(x => x.id === id);
  navigator.clipboard.writeText(p.prompt);
  alert('Đã copy!');
};

window.delSaved = function(id) {
  if (confirm('Xóa prompt này?')) {
    savedPrompts = savedPrompts.filter(x => x.id !== id);
    localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
    renderSavedList();
  }
};

function copyCurrentPrompt() {
  const text = document.getElementById('final-prompt').textContent;
  navigator.clipboard.writeText(text).then(() => alert('Đã copy prompt hiện tại!'));
}

function exportAllPrompts() {
  const blob = new Blob([JSON.stringify(savedPrompts, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'xnc_all_prompts.json';
  a.click();
}

function clearAllPrompts() {
  if (confirm('Xóa toàn bộ? Không khôi phục được!')) {
    savedPrompts = [];
    promptCounter = 1;
    localStorage.removeItem('xnc_saved_prompts');
    localStorage.removeItem('xnc_counter');
    renderSavedList();
  }
}

document.addEventListener('DOMContentLoaded', init);
