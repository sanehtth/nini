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

  if (!charKey) {
    generatePrompt();
    return;
  }

  const char = data.characters[charKey];
  if (!char) {
    sigSelect.innerHTML += '<option disabled>Không tìm thấy nhân vật</option>';
    generatePrompt();
    return;
  }

  // 1. Load signature_items (field mới bắt buộc)
  const actions = char.signature_items || char.signatures || []; // fallback nếu vẫn dùng tên cũ
  actions.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(); // Làm đẹp label
    sigSelect.appendChild(opt);
  });

  // 2. Thêm preferred_actions (ưu tiên)
  (char.preferred_actions || []).forEach(act => {
    if (!actions.includes(act)) {
      const opt = document.createElement('option');
      opt.value = act;
      opt.textContent = `${act} (ưu tiên)`;
      sigSelect.appendChild(opt);
    }
  });

  if (actions.length === 0 && !char.preferred_actions?.length) {
    sigSelect.innerHTML += '<option disabled>Nhân vật này chưa có hành động</option>';
  }

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
  if (!charKey) {
    document.getElementById('final-prompt').textContent = 'Chọn nhân vật trước nhé!';
    return;
  }

  const char = data.characters[charKey];
  const faceId = document.getElementById('face').value;
  const face = data.faces.find(f => f.id === faceId) || { label: 'default face' };

  const sigId = document.getElementById('signature').value;
  let action = sigId || char.preferred_actions?.[0] || 'natural standing pose';

  // Bổ sung signature_colors vào prompt
  const colors = char.signature_colors || [];
  const colorDesc = colors.length ? `dominant signature colors: ${colors.join(', ')}` : '';

  // Nếu có preferred_faces, ưu tiên gợi ý
  const preferredFace = char.preferred_faces?.[0] || null;
  const faceNote = preferredFace ? `(preferred: ${preferredFace})` : '';

    // Lấy background
  const bgId = document.getElementById('background').value;
  const bg = data.backgrounds?.find(b => b.id === bgId);
  const bgDesc = bg ? bg.desc_en : 'simple clean background, no distractions';

  // Lấy outfit
  const outfitId = document.getElementById('outfit').value;
  const outfit = data.outfits?.find(o => o.id === outfitId);
  let outfitDesc = '';
  if (outfit) {
    outfitDesc = outfit.variants?.male?.base_desc_en || outfit.variants?.female?.base_desc_en || outfit.name;
    outfitDesc = `wearing ${outfitDesc}, `;
  }

  const fullPrompt = `Create a short cute chibi anime video from XNC series.

Character: ${char.name} (${char.role || 'kid'}), ${outfitDesc}performing action: "${action}"

Facial expression: ${face.desc_en || face.desc_vi || face.label} ${faceNote}
Emotional state: ${state.desc_en || state.label}

Background: ${bgDesc}
Camera: ${cam}
Lighting: ${light}

${colorDesc ? colorDesc + '\n' : ''}

Style: vibrant pastel colors, exaggerated funny expressions, smooth animation, adorable and humorous.
Aspect ratio: ${aspect}. High quality, detailed, no text overlay.`;

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
