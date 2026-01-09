// Hard-code đường dẫn JSON (bạn thay đổi link này nếu cần)
const JSON_URLS = {
  characters: '/public/adn/xomnganchuyen/XNC_characters.json',   // Thay bằng link raw GitHub của bạn
  faces:      '/public/adn/xomnganchuyenXNC_faces.json',
  states:     '/public/adn/xomnganchuyenXNC_style_states.json' 
  style:      '/public/adn/xomnganchuyenXNC_style_style.json'  // Gộp states + style vào 1 file
};

let data = {
  characters: null,
  faces: null,
  states: null,
  style: null,
  camera: null,
  lighting: null
};

async function loadJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Lỗi tải ${url}: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(err);
    alert(`Không tải được file JSON: ${url}\nKiểm tra link hoặc mạng nhé!`);
    return null;
  }
}

async function init() {
  // Tải đồng thời 3 file
  const [charData, faceData, statesData, styleData] = await Promise.all([
    loadJSON(JSON_URLS.characters),
    loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states),
    loadJSON(JSON_URLS.style)
  ]);

  if (!charData || !faceData|| !statesData  || !styleData) return;

  // Gán dữ liệu
  data.characters = charData.characters || charData;
  data.faces      = faceData.faces || faceData;
  data.states     = statesData.states || [];
  data.style     = styleData.style || [];
  data.camera     = styleData.style?.camera || {};
  data.lighting   = styleData.style?.lighting || {};

  // Populate dropdowns
  populateCharacters();
  populateFaces();
  populateStates();
  populateStyle();
  populateCamera();
  populateLighting();

  // Bind events
  document.getElementById('character').addEventListener('change', updateSignatures);
  document.getElementById('signature').addEventListener('change', generatePrompt);
  ['face', 'state', 'camera', 'lighting', 'aspect'].forEach(id => {
    document.getElementById(id).addEventListener('change', generatePrompt);
  });

  // Tự generate lần đầu nếu muốn
  generatePrompt();
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
  const key = document.getElementById('character').value;
  const sigSelect = document.getElementById('signature');
  sigSelect.innerHTML = '<option value="">-- Chọn hành động --</option>';

  if (key && data.characters[key]?.signatures) {
    data.characters[key].signatures.forEach(sig => {
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
  const aspect  = document.getElementById('aspect').value;

  if (!charKey || !sigId || !faceId || !stateId || !camId || !lightId) {
    document.getElementById('final-prompt').textContent = 
      "Chọn đầy đủ các mục để tạo prompt siêu xịn nhé! 💚✨";
    return;
  }

  const char = data.characters[charKey];
  const sig  = char.signatures.find(s => s.id === sigId);
  const face = data.faces.find(f => f.id === faceId);
  const state= data.states.find(s => s.id === stateId);
  const camDesc  = data.camera[camId];
  const lightDesc= data.lighting[lightId];

  const prompt = `Tạo video hoạt hình ngắn cute chibi anime về nhân vật "${char.name}" (${char.role}) đang thực hiện hành động: "${sig.desc}"

Biểu cảm khuôn mặt: "${face.desc_en || face.label}"
Trạng thái cảm xúc: "${state.desc_en || state.label}"
Góc máy: ${camDesc}
Ánh sáng: ${lightDesc}

Phong cách: màu pastel tươi sáng, chuyển động mượt mà, biểu cảm phóng đại hài hước, nhân vật XNC series.
Tỷ lệ khung hình: ${aspect}.`;

  document.getElementById('final-prompt').textContent = prompt.trim();
}

// Copy button
document.getElementById('copy-btn').addEventListener('click', () => {
  const text = document.getElementById('final-prompt').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    const oldText = btn.textContent;
    btn.textContent = 'Đã copy! 🎉';
    setTimeout(() => btn.textContent = oldText, 2000);
  });
});

// Khởi động
init();
