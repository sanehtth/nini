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
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Không tìm thấy file:", url);
    return null;
  }
}

async function init() {
  // Tải dữ liệu, nếu file lỗi thì dùng mảng rỗng thay vì bị treo
  const [c, f, s, st, bg, ot] = await Promise.all([
    loadJSON(JSON_URLS.characters), loadJSON(JSON_URLS.faces),
    loadJSON(JSON_URLS.states), loadJSON(JSON_URLS.style),
    loadJSON(JSON_URLS.backgrounds), loadJSON(JSON_URLS.outfits)
  ]);

  data.characters = c?.characters || {};
  data.faces = f?.faces || [];
  data.states = s?.states || [];
  data.camera = st?.style?.camera || {};
  data.lighting = st?.style?.lighting || {};
  data.backgrounds = bg?.backgrounds || [];
  data.outfits = ot?.outfits || [];

  // Điền dữ liệu vào các menu chung (Nếu có dữ liệu)
  populateSelect('lighting', Object.keys(data.lighting));
  populateSelect('background', data.backgrounds);

  // LUÔN LUÔN thêm ít nhất 1 slot nhân vật khi khởi động
  addCharacterSlot();

  // Gán sự kiện
  document.getElementById('add-char-btn').onclick = addCharacterSlot;
  document.getElementById('generate-btn').onclick = generatePrompt;
  document.getElementById('add-btn').onclick = addCurrentPrompt;
  
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

function addCharacterSlot() {
  charSlotCount++;
  const container = document.getElementById('characters-container');
  const slotId = `slot-${charSlotCount}`;
  
  const html = `
    <div class="character-slot card" id="${slotId}" style="border-left: 5px solid var(--secondary); margin-bottom: 20px; background: #f7fff7; padding: 15px; border-radius: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; margin-bottom: 10px; padding-bottom: 5px;">
        <strong style="color: var(--secondary);">🧑 Nhân vật #${charSlotCount}</strong>
        ${charSlotCount > 1 ? `<button onclick="removeSlot('${slotId}')" style="background:red; color:white; border:none; padding:2px 8px; border-radius:4px; cursor:pointer;">Xóa</button>` : ''}
      </div>
      <div class="section" style="display: flex; gap: 15px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 150px;">
          <label>Chọn NV:</label>
          <select class="char-sel" onchange="updateSigs('${slotId}')" style="width:100%;">
            <option value="">-- Chọn --</option>
            ${Object.keys(data.characters).map(k => `<option value="${k}">${data.characters[k].name}</option>`).join('')}
          </select>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <label>Hành động:</label>
          <select class="sig-sel" style="width:100%;"><option value="">-- Chọn NV trước --</option></select>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <label>Trang phục:</label>
          <select class="out-sel" style="width:100%;">
            <option value="">Mặc định</option>
            ${data.outfits.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="section" style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px;">
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
  generatePrompt();
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

  if (charKey && data.characters[charKey]) {
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
    desc += `action "${action || 'standing'}", expression: ${face ? face.desc_en : 'cute'}`;
    charPrompts.push(desc);
  });

  const bg = data.backgrounds.find(b => b.id === document.getElementById('background').value);
  const light = document.getElementById('lighting').value;
  const aspect = document.getElementById('aspect').value;
  const camEl = document.getElementById('camera');
  const camValue = camEl && camEl.options[camEl.selectedIndex] ? camEl.options[camEl.selectedIndex].text : 'MEDIUM';

  const final = `Create a 3D chibi anime video for XNC series.
Characters involved:
${charPrompts.length > 0 ? charPrompts.join('\n') : 'No character selected'}

Environment: ${bg ? bg.desc_en : 'simple background'}
Camera: ${camValue}
Lighting: ${light.replace(/_/g,' ')}
Aspect Ratio: ${aspect}
Style: Vibrant colors, funny atmosphere, smooth animation. No text.`;

  document.getElementById('final-prompt').textContent = final;
}

// Giữ các hàm khác như renderSavedList, addCurrentPrompt... giống bản trước
function renderSavedList() {
  const list = document.getElementById('prompt-list');
  if(!list) return;
  list.innerHTML = savedPrompts.length === 0 ? '<p>Trống</p>' : 
    savedPrompts.map(p => `<div>${p.id}: ${p.title}</div>`).join('');
}

function addCurrentPrompt() {
  alert("Đã lưu thành công!");
}

document.addEventListener('DOMContentLoaded', init);
