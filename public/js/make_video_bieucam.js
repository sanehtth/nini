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

  data = { characters: c.characters, faces: f.faces, states: s.states, 
           camera: st.style.camera, lighting: st.style.lighting, 
           backgrounds: bg.backgrounds, outfits: ot.outfits };

  // Điền dữ liệu vào các menu chung
  populateSelect('camera', Object.keys(data.camera));
  populateSelect('lighting', Object.keys(data.lighting));
  populateSelect('background', data.backgrounds);

  // Thêm nhân vật đầu tiên mặc định
  addCharacterSlot();

  // Sự kiện nút bấm
  document.getElementById('add-char-btn').onclick = addCharacterSlot;
  document.getElementById('generate-btn').onclick = generatePrompt;
  document.getElementById('add-btn').onclick = savePrompt;
  document.getElementById('copy-btn').onclick = () => {
    navigator.clipboard.writeText(document.getElementById('final-prompt').textContent);
    alert("Đã copy!");
  };
  
  renderSavedList();
}

function populateSelect(id, items) {
  const el = document.getElementById(id);
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
    <div class="character-slot" id="${slotId}">
      <div class="slot-header">
        <strong>Nhân vật #${charSlotCount}</strong>
        ${charSlotCount > 1 ? `<button class="btn-remove" onclick="removeSlot('${slotId}')">Xóa</button>` : ''}
      </div>
      <div class="section">
        <div>
          <label>🧑 Chọn NV:</label>
          <select class="char-sel" onchange="updateSigs('${slotId}')">
            <option value="">-- Chọn --</option>
            ${Object.keys(data.characters).map(k => `<option value="${k}">${data.characters[k].name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>✨ Hành động:</label>
          <select class="sig-sel"><option value="">-- Chọn nhân vật trước --</option></select>
        </div>
        <div>
          <label>👗 Trang phục:</label>
          <select class="out-sel">
            <option value="">Mặc định</option>
            ${data.outfits.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="section">
        <div>
          <label>😊 Biểu cảm:</label>
          <select class="face-sel">
            ${data.faces.map(f => `<option value="${f.id}">${f.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>🌟 Trạng thái:</label>
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
};

function generatePrompt() {
  const slots = document.querySelectorAll('.character-slot');
  let charPrompts = [];

  slots.forEach(slot => {
    const charKey = slot.querySelector('.char-sel').value;
    if (!charKey) return;

    const char = data.characters[charKey];
    const face = data.faces.find(f => f.id === slot.querySelector('.face-sel').value);
    const outfit = data.outfits.find(o => o.id === slot.querySelector('.out-sel').value);
    const action = slot.querySelector('.sig-sel').value;

    let desc = `- ${char.name}: ${outfit ? 'wearing ' + outfit.name : 'original outfit'}, `;
    desc += `action "${action}", expression: ${face ? face.desc_en : 'cute'}`;
    charPrompts.push(desc);
  });

  const bg = data.backgrounds.find(b => b.id === document.getElementById('background').value);
  const cam = document.getElementById('camera').value;
  const aspect = document.getElementById('aspect').value;

  const final = `Create a 3D chibi anime video for XNC series.
Characters involved:
${charPrompts.join('\n')}

Environment: ${bg ? bg.desc_en : 'simple background'}
Camera: ${data.camera[cam] || 'medium shot'}
Lighting: ${data.lighting[document.getElementById('lighting').value] || 'soft'}
Aspect Ratio: ${aspect}
Style: Vibrant colors, funny atmosphere, smooth animation. No text.`;

  document.getElementById('final-prompt').textContent = final;
}

// Các hàm quản lý danh sách (giữ nguyên logic cũ của bạn)
function savePrompt() {
  generatePrompt();
  const text = document.getElementById('final-prompt').textContent;
  const id = document.getElementById('video-id').value || `XNC${promptCounter++}`;
  savedPrompts.push({ id, prompt: text, title: document.getElementById('video-title').value, timestamp: new Date() });
  localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
  localStorage.setItem('xnc_counter', promptCounter);
  renderSavedList();
}

function renderSavedList() {
  const list = document.getElementById('prompt-list');
  document.getElementById('count').textContent = savedPrompts.length;
  list.innerHTML = savedPrompts.map(p => `
    <div style="border-bottom:1px solid #ddd; padding:5px;">
      <strong>${p.id}</strong>: ${p.title || 'No title'} 
      <button onclick="copySaved('${p.id}')">Copy</button>
    </div>
  `).join('');
}

window.copySaved = (id) => {
  const p = savedPrompts.find(x => x.id === id);
  navigator.clipboard.writeText(p.prompt);
  alert("Copied!");
}

document.addEventListener('DOMContentLoaded', init);
