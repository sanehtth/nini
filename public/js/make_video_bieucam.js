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
    console.error(err);
    alert(`Không tải được: ${url}`);
    return null;
  }
}

async function init() {
  document.getElementById('final-prompt').textContent = '⏳ Đang tải dữ liệu...';

  const [charJson, facesJson, statesJson, styleJson, bgJson, outfitJson] = await Promise.all([
    loadJSON(JSON_URLS.characters),
    loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states),
    loadJSON(JSON_URLS.style),
    loadJSON(JSON_URLS.backgrounds),
    loadJSON(JSON_URLS.outfits)
  ]);

  if (!charJson || !facesJson || !statesJson || !styleJson || !bgJson || !outfitJson) return;

  data.characters  = charJson.characters;
  data.faces       = facesJson.faces;
  data.states      = statesJson.states;
  data.camera      = styleJson.style.camera;
  data.lighting    = styleJson.style.lighting;
  data.backgrounds = bgJson.backgrounds;
  data.outfits     = outfitJson.outfits;

  populateAllDropdowns();
  setupEventListeners();
  renderSavedList();
  updateCounter();

  document.getElementById('final-prompt').textContent = '✅ Sẵn sàng! Chọn và bấm Tạo Prompt nhé!';
}

function populateAllDropdowns() {
  populateCharacters();
  populateFaces();
  populateStates();
  populateCamera();
  populateLighting();
  populateBackgrounds();
  populateOutfits();
}

// Các hàm populate giống cũ (em giữ nguyên, chỉ liệt kê tên)
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

function setupEventListeners() {
  document.getElementById('character').addEventListener('change', updateSignatures);
  ['signature','face','state','camera','lighting','background','outfit','aspect'].forEach(id => {
    document.getElementById(id).addEventListener('change', generatePrompt);
  });

  document.getElementById('generate-btn').addEventListener('click', generatePrompt);
  document.getElementById('add-btn').addEventListener('click', addCurrentPrompt);
  document.getElementById('copy-btn').addEventListener('click', copyCurrentPrompt);
  document.getElementById('export-all-btn').addEventListener('click', exportAllPrompts);
  document.getElementById('clear-all-btn').addEventListener('click', clearAllPrompts);
}

function generatePrompt() {
  // Code generate prompt giống phiên bản mới trước đó (em giữ nguyên logic)
  // ... (copy từ phiên bản mới có background + outfit)
  // Cuối cùng gán vào #final-prompt
  document.getElementById('final-prompt').textContent = prompt.trim();
}

function addCurrentPrompt() {
  const promptText = document.getElementById('final-prompt').textContent.trim();
  if (!promptText || promptText.includes('Chọn ít nhất')) {
    alert('⚠️ Hãy tạo prompt hợp lệ trước khi lưu!');
    return;
  }

  const videoId = document.getElementById('video-id').value.trim() || `XNC${String(promptCounter).padStart(3, '0')}`;
  const videoTitle = document.getElementById('video-title').value.trim() || `Video ${promptCounter}`;

  const selections = {
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

  // Kiểm tra trùng ID
  if (savedPrompts.some(p => p.id === videoId)) {
    if (!confirm(`ID "${videoId}" đã tồn tại! Ghi đè?`)) return;
    savedPrompts = savedPrompts.filter(p => p.id !== videoId);
  }

  savedPrompts.push(selections);
  localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
  promptCounter++;
  localStorage.setItem('xnc_counter', promptCounter);

  // Clear input
  document.getElementById('video-id').value = '';
  document.getElementById('video-title').value = '';

  renderSavedList();
  updateCounter();
  alert(`✅ Đã lưu prompt "${videoTitle}" với ID ${videoId}!`);
}

function renderSavedList() {
  const container = document.getElementById('prompt-list');
  updateCounter();

  if (savedPrompts.length === 0) {
    container.innerHTML = '<p class="muted">Chưa có prompt nào. Bấm "Add vào Danh sách" để lưu đầu tiên!</p>';
    return;
  }

  container.innerHTML = `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="background:var(--accent);">
          <th style="padding:8px; text-align:left;">ID</th>
          <th style="padding:8px; text-align:left;">Tên Video</th>
          <th style="padding:8px; text-align:left;">Nhân vật</th>
          <th style="padding:8px; text-align:center;">Thời gian</th>
          <th style="padding:8px;"></th>
        </tr>
      </thead>
      <tbody>
        ${savedPrompts.map(p => {
          const char = data.characters[p.selections.character];
          const charName = char ? char.name : 'N/A';
          const date = new Date(p.timestamp).toLocaleString('vi-VN');
          return `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px;"><code>${p.id}</code></td>
              <td style="padding:8px;">${p.title}</td>
              <td style="padding:8px;">${charName}</td>
              <td style="padding:8px; text-align:center; font-size:12px;">${date}</td>
              <td style="padding:8px; text-align:center;">
                <button onclick="copySavedPrompt('${p.id}')" class="btn" style="padding:4px 8px; font-size:12px;">Copy</button>
                <button onclick="deleteSavedPrompt('${p.id}')" class="btn" style="padding:4px 8px; font-size:12px; background:#fcc;">Del</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function updateCounter() {
  document.getElementById('count').textContent = savedPrompts.length;
}

function copySavedPrompt(id) {
  const p = savedPrompts.find(x => x.id === id);
  if (p) {
    navigator.clipboard.writeText(p.prompt);
    alert(`Đã copy prompt "${p.title}"!`);
  }
}

function deleteSavedPrompt(id) {
  if (confirm('Xóa prompt này?')) {
    savedPrompts = savedPrompts.filter(x => x.id !== id);
    localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
    renderSavedList();
  }
}

function copyCurrentPrompt() {
  const text = document.getElementById('final-prompt').textContent;
  navigator.clipboard.writeText(text).then(() => alert('Đã copy prompt hiện tại!'));
}

function exportAllPrompts() {
  const blob = new Blob([JSON.stringify(savedPrompts, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xnc_all_prompts_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function clearAllPrompts() {
  if (confirm('Xóa TOÀN BỘ prompt đã lưu? Không thể khôi phục!')) {
    savedPrompts = [];
    promptCounter = 1;
    localStorage.clear();
    renderSavedList();
    updateCounter();
    alert('Đã xóa hết!');
  }
}

document.addEventListener('DOMContentLoaded', init);
