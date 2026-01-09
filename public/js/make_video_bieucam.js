// script.js - Phiên bản ĐA NHÂN VẬT & SỬA LỖI CAMERA
const JSON_URLS = {
  characters: '/adn/xomnganchuyen/XNC_characters.json',
  faces: '/adn/xomnganchuyen/XNC_faces.json',
  states: '/adn/xomnganchuyen/XNC_states.json',
  style: '/adn/xomnganchuyen/XNC_style.json',
  backgrounds: '/adn/xomnganchuyen/XNC_backgrounds.json',
  outfits: '/adn/xomnganchuyen/XNC_outfits.json'
};

let data = {};
let savedPrompts = JSON.parse(localStorage.getItem('xnc_saved_prompts') || '[]');
let promptCounter = parseInt(localStorage.getItem('xnc_counter') || '1');
let charSlotCount = 0;

async function loadJSON(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error("Lỗi tải file:", url);
    return null;
  }
}

async function init() {
  const [c, f, s, st, bg, ot] = await Promise.all([
    loadJSON(JSON_URLS.characters), loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states), loadJSON(JSON_URLS.style),
    loadJSON(JSON_URLS.backgrounds), loadJSON(JSON_URLS.outfits)
  ]);

  data = { 
    characters: c.characters, 
    faces: f.faces, 
    states: s.states, 
    camera: st.style.camera, 
    lighting: st.style.lighting, 
    backgrounds: bg.backgrounds, 
    outfits: ot.outfits 
  };

  // Điền dữ liệu vào các menu chung (Chỉ nạp Background & Lighting)
  populateSelect('lighting', Object.keys(data.lighting));
  populateSelect('background', data.backgrounds);

  // Thêm nhân vật đầu tiên mặc định
  addCharacterSlot();

  // Gán sự kiện cho các nút bấm
  document.getElementById('add-char-btn').onclick = addCharacterSlot;
  document.getElementById('generate-btn').onclick = generatePrompt;
  document.getElementById('add-btn').onclick = addCurrentPrompt;
  document.getElementById('copy-btn').onclick = copyCurrentPrompt;
  document.getElementById('export-all-btn').onclick = exportAllPrompts;
  document.getElementById('clear-all-btn').onclick = clearAllPrompts;
  
  renderSavedList();
}

function populateSelect(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = typeof item === 'string' ? item : item.id;
    opt.textContent = typeof item === 'string' ? item.replace(/_/g,' ').toUpperCase() : item.label;
    el.appendChild(opt);
  });
}

// Hàm thêm khung nhân vật mới
function addCharacterSlot() {
  charSlotCount++;
  const container = document.getElementById('characters-container');
  const slotId = `slot-${charSlotCount}`;
  
  const html = `
    <div class="character-slot card" id="${slotId}" style="border-left: 5px solid var(--secondary); margin-bottom: 20px; background: #f7fff7;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; margin-bottom: 10px; padding-bottom: 5px;">
        <strong style="color: var(--secondary);">🧑 Nhân vật #${charSlotCount}</strong>
        ${charSlotCount > 1 ? `<button onclick="removeSlot('${slotId}')" style="background:red; color:white; border:none; padding:2px 8px; border-radius:4px; cursor:pointer;">Xóa</button>` : ''}
      </div>
      <div class="section">
        <div>
          <label>Chọn NV:</label>
          <select class="char-sel" onchange="updateSigs('${slotId}')">
            <option value="">-- Chọn --</option>
            ${Object.keys(data.characters).map(k => `<option value="${k}">${data.characters[k].name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Hành động:</label>
          <select class="sig-sel"><option value="">-- Chọn NV trước --</option></select>
        </div>
        <div>
          <label>Trang phục:</label>
          <select class="out-sel">
            <option value="">Mặc định</option>
            ${data.outfits.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="section" style="margin-top:10px;">
        <div>
          <label>Biểu cảm:</label>
          <select class="face-sel">
            ${data.faces.map(f => `<option value="${f.id}">${f.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Trạng thái:</label>
          <select class="state-sel">
            ${data.states.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

window.removeSlot = (id) => {
  document.getElementById(id).remove();
  generatePrompt();
};

window.updateSigs = (slotId) => {
  const slot = document.getElementById(slotId);
  const charKey = slot.querySelector('.char-sel').value;
  const sigSel = slot.querySelector('.sig-sel');
  sigSel.innerHTML = '';

  if (charKey) {
    const char = data.characters[charKey];
    const actions = char.signature_items || char.signatures || [];
    actions.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a; opt.textContent = a.replace(/_/g,' ');
      sigSel.appendChild(opt);
    });
  }
  generatePrompt();
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

    let desc = `- Character ${index+1} (${char.name}): ${outfit ? 'wearing ' + outfit.name : 'original outfit'}, `;
    desc += `performing action "${action || 'standing'}", expression: ${face ? face.desc_en : 'cute'}`;
    charPrompts.push(desc);
  });

  const bg = data.backgrounds.find(b => b.id === document.getElementById('background').value);
  const light = document.getElementById('lighting').value;
  const aspect = document.getElementById('aspect').value;
  
  // FIX LỖI CAMERA: Lấy trực tiếp chữ trong listbox (MEDIUM, CLOSE UP...)
  const camEl = document.getElementById('camera');
  const camValue = camEl.options[camEl.selectedIndex].text;

  const final = `Create a chibi anime video for XNC series.
Characters involved:
${charPrompts.join('\n')}

Environment: ${bg ? bg.desc_en : 'simple background'}
Camera: ${camValue}
Lighting: ${light.replace(/_/g,' ')}
Aspect Ratio: ${aspect}
Style: Vibrant colors, funny atmosphere, smooth animation, high quality. No text.`;

  document.getElementById('final-prompt').textContent = final;
}

// QUẢN LÝ DANH SÁCH LƯU TRỮ
function addCurrentPrompt() {
  generatePrompt();
  const text = document.getElementById('final-prompt').textContent;
  const videoId = document.getElementById('video-id').value || `XNC${String(promptCounter).padStart(3, '0')}`;
  const videoTitle = document.getElementById('video-title').value || `Video ${promptCounter}`;

  savedPrompts.push({ id: videoId, title: videoTitle, prompt: text, timestamp: new Date() });
  localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
  promptCounter++;
  localStorage.setItem('xnc_counter', promptCounter);
  
  renderSavedList();
  alert("Đã lưu vào danh sách!");
}

function renderSavedList() {
  const list = document.getElementById('prompt-list');
  const countEl = document.getElementById('count');
  if(countEl) countEl.textContent = savedPrompts.length;
  
  if (savedPrompts.length === 0) {
    list.innerHTML = '<p class="muted">Chưa có prompt nào được lưu.</p>';
    return;
  }

  list.innerHTML = `<table style="width:100%; border-collapse:collapse; margin-top:10px;">
    <tr style="background:#eee;"><th>ID</th><th>Tên</th><th>Thao tác</th></tr>
    ${savedPrompts.map(p => `
      <tr>
        <td style="padding:5px; border-bottom:1px solid #ddd;"><code>${p.id}</code></td>
        <td style="padding:5px; border-bottom:1px solid #ddd;">${p.title}</td>
        <td style="padding:5px; border-bottom:1px solid #ddd;">
          <button onclick="copySaved('${p.id}')">Copy</button>
          <button onclick="delSaved('${p.id}')" style="color:red;">Xóa</button>
        </td>
      </tr>
    `).join('')}
  </table>`;
}

window.copySaved = (id) => {
  const p = savedPrompts.find(x => x.id === id);
  navigator.clipboard.writeText(p.prompt);
  alert("Đã copy prompt!");
};

window.delSaved = (id) => {
  if (confirm("Bạn muốn xóa prompt này?")) {
    savedPrompts = savedPrompts.filter(x => x.id !== id);
    localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
    renderSavedList();
  }
};

function copyCurrentPrompt() {
  const text = document.getElementById('final-prompt').textContent;
  navigator.clipboard.writeText(text);
  alert("Đã copy prompt hiện tại!");
}

function exportAllPrompts() {
  const blob = new Blob([JSON.stringify(savedPrompts, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'xnc_prompts.json';
  a.click();
}

function clearAllPrompts() {
  if (confirm("Xóa toàn bộ danh sách đã lưu?")) {
    savedPrompts = [];
    localStorage.removeItem('xnc_saved_prompts');
    renderSavedList();
  }
}

document.addEventListener('DOMContentLoaded', init);
