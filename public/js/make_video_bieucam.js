// script.js - Phiên bản sửa lỗi mất giao diện khi thiếu file JSON
const JSON_URLS = {
  characters: '/adn/xomnganchuyen/XNC_characters.json',
  faces: '/adn/xomnganchuyen/XNC_faces.json',
  states: '/adn/xomnganchuyen/XNC_states.json',
  style: '/adn/xomnganchuyen/XNC_style.json',
  backgrounds: '/adn/xomnganchuyen/XNC_backgrounds.json',
  outfits: '/adn/xomnganchuyen/XNC_outfits.json'
};

let data = { characters: {}, faces: [], states: [], camera: {}, lighting: {}, backgrounds: [], outfits: [] };
let savedPrompts = JSON.parse(localStorage.getItem('xnc_saved_prompts') || '[]');
let promptCounter = parseInt(localStorage.getItem('xnc_counter') || '1');
let charSlotCount = 0;

async function loadJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
        console.warn(`Cảnh báo: Không tìm thấy file tại ${url}`);
        return null; 
    }
    return await res.json();
  } catch (err) {
    console.error(`Lỗi hệ thống khi tải ${url}`);
    return null;
  }
}

async function init() {
  // Tải dữ liệu song song
  const [charJson, facesJson, statesJson, styleJson, bgJson, outfitJson] = await Promise.all([
    loadJSON(JSON_URLS.characters),
    loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states),
    loadJSON(JSON_URLS.style),
    loadJSON(JSON_URLS.backgrounds),
    loadJSON(JSON_URLS.outfits)
  ]);

  // Gán dữ liệu (dùng dấu ?. và || [] để nếu file lỗi trang web vẫn chạy tiếp)
  data.characters  = charJson?.characters || {};
  data.faces       = facesJson?.faces || [];
  data.states      = statesJson?.states || [];
  data.camera      = styleJson?.style?.camera || {};
  data.lighting    = styleJson?.style?.lighting || {};
  data.backgrounds = bgJson?.backgrounds || [];
  data.outfits     = outfitJson?.outfits || [];

  // Điền dữ liệu vào các menu chung (Camera, Ánh sáng, Nền)
  populateSelect('lighting', Object.keys(data.lighting));
  populateSelect('background', data.backgrounds);

  // MẶC ĐỊNH: Luôn thêm 1 nhân vật ngay khi trang vừa load xong
  addCharacterSlot();

  // Gán sự kiện cho các nút bấm cố định
  const addBtn = document.getElementById('add-char-btn');
  if (addBtn) addBtn.onclick = addCharacterSlot;

  const genBtn = document.getElementById('generate-btn');
  if (genBtn) genBtn.onclick = generatePrompt;

  const saveBtn = document.getElementById('add-btn');
  if (saveBtn) saveBtn.onclick = addCurrentPrompt;
  
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) clearBtn.onclick = clearAllPrompts;

  renderSavedList();
}

// Hàm nạp dữ liệu cho các SelectBox đơn giản
function populateSelect(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '<option value="">-- Chọn --</option>';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = typeof item === 'string' ? item : item.id;
    opt.textContent = typeof item === 'string' ? item.replace(/_/g,' ').toUpperCase() : item.label;
    el.appendChild(opt);
  });
}

// Hàm thêm khung nhân vật (Quan trọng nhất)
function addCharacterSlot() {
  charSlotCount++;
  const container = document.getElementById('characters-container');
  if (!container) return;

  const slotId = `slot-${charSlotCount}`;
  
  const html = `
    <div class="character-slot card" id="${slotId}" style="border-left: 5px solid var(--secondary); margin-bottom: 20px; background: #f7fff7; padding: 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; margin-bottom: 10px; padding-bottom: 5px;">
        <strong style="color: var(--secondary);">🧑 Nhân vật #${charSlotCount}</strong>
        ${charSlotCount > 1 ? `<button onclick="removeSlot('${slotId}')" style="background:#ff4d4d; color:white; border:none; padding:2px 8px; border-radius:4px; cursor:pointer;">Xóa</button>` : ''}
      </div>
      <div class="section" style="display: flex; gap: 10px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 150px;">
          <label>Chọn NV:</label>
          <select class="char-sel" onchange="updateSigs('${slotId}')" style="width:100%;">
            <option value="">-- Chọn --</option>
            ${Object.keys(data.characters).map(k => `<option value="${k}">${data.characters[k].name}</option>`).join('')}
          </select>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <label>Hành động:</label>
          <select class="sig-sel" style="width:100%;"><option value="">-- Chọn nhân vật trước --</option></select>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <label>Trang phục:</label>
          <select class="out-sel" style="width:100%;">
            <option value="">Mặc định</option>
            ${data.outfits.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="section" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
        <div style="flex: 1; min-width: 150px;">
          <label>Biểu cảm:</label>
          <select class="face-sel" style="width:100%;">
            ${data.faces.map(f => `<option value="${f.id}">${f.label}</option>`).join('')}
          </select>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <label>Trạng thái:</label>
          <select class="state-sel" style="width:100%;">
            ${data.states.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

window.removeSlot = (id) => {
  const el = document.getElementById(id);
  if (el) el.remove();
};

window.updateSigs = (slotId) => {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const charKey = slot.querySelector('.char-sel').value;
  const sigSel = slot.querySelector('.sig-sel');
  sigSel.innerHTML = '<option value="">-- Chọn --</option>';

  if (charKey && data.characters[charKey]) {
    const char = data.characters[charKey];
    const actions = char.signature_items || char.signatures || [];
    actions.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a; 
      opt.textContent = a.replace(/_/g,' ').replace(/([A-Z])/g, ' $1').trim();
      sigSel.appendChild(opt);
    });
  }
};

function generatePrompt() {
  const slots = document.querySelectorAll('.character-slot');
  let charPrompts = [];

  slots.forEach((slot, index) => {
    const charKey = slot.querySelector('.char-sel').value;
    if (!charKey) return;

    const char = data.characters[charKey];
    const face = data.faces.find(f => f.id === slot.querySelector('.face-sel').value);
    const outfit = data.outfits.find(o => o.id === slot.querySelector('.out-sel').value);
    const action = slot.querySelector('.sig-sel').value;

    let desc = `- Nhân vật ${index+1} (${char.name}): ${outfit ? 'mặc ' + outfit.name : 'trang phục gốc'}, `;
    desc += `hành động "${action || 'đứng tự nhiên'}", biểu cảm: ${face ? face.desc_en : 'cute'}`;
    charPrompts.push(desc);
  });

  const bg = data.backgrounds.find(b => b.id === document.getElementById('background').value);
  const light = document.getElementById('lighting').value;
  const aspect = document.getElementById('aspect').value;
  const camEl = document.getElementById('camera');
  const camValue = (camEl && camEl.options[camEl.selectedIndex]) ? camEl.options[camEl.selectedIndex].text : 'MEDIUM';

  const final = `Create a chibi anime video for XNC series.
character:
${charPrompts.length > 0 ? charPrompts.join('\n') : 'Chưa chọn nhân vật'}

background: ${bg ? bg.desc_en : 'Sân trường hoặc xóm dừa'}
camera: ${camValue}
Lighting: ${light ? light.replace(/_/g,' ') : 'tự nhiên'}
Aspect Ratio: ${aspect}
style: Vibrant colors, funny atmosphere, smooth animation. No text.`;

  document.getElementById('final-prompt').textContent = final;
}

// Hàm lưu và hiển thị danh sách (Giữ cơ bản để trang không lỗi)
function addCurrentPrompt() {
  alert("Tính năng lưu đang được khởi tạo!");
}

function renderSavedList() {
  const countEl = document.getElementById('count');
  if (countEl) countEl.textContent = savedPrompts.length;
}

function clearAllPrompts() {
  if (confirm("Xóa hết danh sách?")) {
    savedPrompts = [];
    localStorage.removeItem('xnc_saved_prompts');
    renderSavedList();
  }
}

// Khởi chạy khi trang sẵn sàng
document.addEventListener('DOMContentLoaded', init);
