// =============== ĐƯỜNG DẪN 4 FILE JSON (SỬA Ở ĐÂY) ===============
const JSON_URLS = {
  characters: '/public/adn/xomnganchuyen/XNC_characters.json',          // hoặc link raw GitHub
  faces:      '/public/adn/xomnganchuyen/XNC_faces (1).json',           // chú ý tên file có dấu cách và (1)
  states:     '/public/adn/xomnganchuyen/XNC_states.json',
  style:      '/public/adn/xomnganchuyen/XNC_style.json'
};
// Nếu dùng online GitHub raw, ví dụ:
// 'https://raw.githubusercontent.com/username/repo/main/XNC_characters.json'

let data = {
  characters: null,
  faces: null,
  states: null,
  camera: null,
  lighting: null
};

async function loadJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Lỗi tải ${url}:`, err);
    alert(`Không tải được: ${url}\nKiểm tra tên file và đường dẫn!\n(XNC_faces (1).json có đúng tên không?)`);
    return null;
  }
}

async function init() {
  document.getElementById('final-prompt').textContent = '⏳ Đang tải 4 file JSON...';

  const [charJson, facesJson, statesJson, styleJson] = await Promise.all([
    loadJSON(JSON_URLS.characters),
    loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states),
    loadJSON(JSON_URLS.style)
  ]);

  // Kiểm tra dữ liệu
  if (!charJson || !facesJson || !statesJson || !styleJson) {
    document.getElementById('final-prompt').textContent = '❌ Lỗi tải một hoặc nhiều file JSON. Xem console (F12) để biết chi tiết.';
    return;
  }

  data.characters = charJson.characters || charJson;
  data.faces      = facesJson.faces || facesJson;
  data.states     = statesJson.states || statesJson;
  data.camera     = styleJson.style?.camera || {};
  data.lighting   = styleJson.style?.lighting || {};

  // Populate dropdowns
  populateCharacters();
  populateFaces();
  populateStates();
  populateCamera();
  populateLighting();

  // Bind events
  document.getElementById('character').addEventListener('change', updateSignatures);
  document.getElementById('signature').addEventListener('change', generatePrompt);
  ['face', 'state', 'camera', 'lighting', 'aspect'].forEach(id => {
    document.getElementById(id).addEventListener('change', generatePrompt);
  });

  document.getElementById('final-prompt').textContent = '✅ Tải thành công! Chọn nhân vật để bắt đầu tạo prompt nào 💚';
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

  if (charKey && data.characters[charKey].signatures) {
    data.characters[charKey].signatures.forEach(sig => {
      const opt = document.createElement('option');
      opt.value = sig.id;
      opt.textContent = sig.label;
      opt.dataset.desc = sig.desc || '';
      sigSelect.appendChild(opt);
    });
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

function generatePrompt() {
  const charKey = document.getElementById('character').value;
  const sigId   = document.getElementById('signature').value;
  const faceId  = document.getElementById('face').value;
  const stateId = document.getElementById('state').value;
  const camId   = document.getElementById('camera').value;
  const lightId = document.getElementById('lighting').value;
  const aspect  = document.getElementById('aspect').value || '16:9';

  if (!charKey || !sigId || !faceId || !stateId || !camId || !lightId) {
    document.getElementById('final-prompt').textContent = 
      '👆 Chọn đầy đủ các mục trên để tạo prompt hoàn chỉnh nhé!';
    return;
  }

  const char   = data.characters[charKey];
  const sig    = char.signatures.find(s => s.id === sigId);
  const face   = data.faces.find(f => f.id === faceId);
  const state  = data.states.find(s => s.id === stateId);
  const cam    = data.camera[camId];
  const light  = data.lighting[lightId];

  const prompt = `Tạo một video hoạt hình ngắn phong cách cute chibi anime series XNC.

Nhân vật: ${char.name} (${char.role})
Hành động đặc trưng: ${sig.desc}

Biểu cảm khuôn mặt: ${face.desc_en || face.desc_vi || face.label}
Trạng thái cảm xúc: ${state.desc_en || state.label}

Góc máy: ${cam}
Ánh sáng: ${light}

Màu sắc: pastel tươi sáng, dễ thương, năng lượng hài hước.
Chuyển động mượt mà, biểu cảm phóng đại vui nhộn.
Tỷ lệ khung hình: ${aspect}.

High quality animation, expressive, funny, adorable.`;

  document.getElementById('final-prompt').textContent = prompt.trim();
}

// Nút Copy Prompt
document.getElementById('copy-btn').addEventListener('click', () => {
  const text = document.getElementById('final-prompt').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    const old = btn.textContent;
    btn.textContent = '✅ Đã copy!';
    setTimeout(() => btn.textContent = old, 2000);
  }).catch(() => {
    alert('Copy không thành công, bạn chọn toàn bộ text rồi Ctrl+C nhé!');
  });
});

// Khởi động khi trang load xong
document.addEventListener('DOMContentLoaded', init);
