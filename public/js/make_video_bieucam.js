// script.js - Phiên bản sửa lỗi mất giao diện khi thiếu file JSON
const JSON_URLS = {
  characters: '/adn/xomnganchuyen/XNC_characters.json',
  faces: '/adn/xomnganchuyen/XNC_faces.json',
  states: '/adn/xomnganchuyen/XNC_states.json',
  style: '/adn/xomnganchuyen/XNC_style.json',
  backgrounds: '/adn/xomnganchuyen/XNC_backgrounds.json',
  outfits: '/adn/xomnganchuyen/XNC_outfits.json'
};

let data = {
  characters: [],
  characterMap: {},
  faces: [],
  states: [],
  camera: {},
  lighting: {},
  backgrounds: [],
  outfits: [],
  outfitMap: {},
  backgroundMap: {},
  faceMap: {},
  stateMap: {}
};
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
  // Lưu ý: các JSON của bạn dùng mảng (characters/faces/states/outfits/backgrounds). Trước đó code đang hiểu sai dạng object.
  data.characters  = Array.isArray(charJson?.characters) ? charJson.characters : [];
  data.faces       = Array.isArray(facesJson?.faces) ? facesJson.faces : [];
  data.states      = Array.isArray(statesJson?.states) ? statesJson.states : [];
  data.camera      = styleJson?.style?.camera || {};
  data.lighting    = styleJson?.style?.lighting || {};
  data.backgrounds = Array.isArray(bgJson?.backgrounds) ? bgJson.backgrounds : [];
  data.outfits     = Array.isArray(outfitJson?.outfits) ? outfitJson.outfits : [];

  // Build quick lookup maps
  data.characterMap = Object.fromEntries(data.characters.map(c => [c.id, c]));
  data.outfitMap = Object.fromEntries(data.outfits.map(o => [o.id, o]));
  data.backgroundMap = Object.fromEntries(data.backgrounds.map(b => [b.id, b]));
  data.faceMap = Object.fromEntries(data.faces.map(f => [f.id, f]));
  data.stateMap = Object.fromEntries(data.states.map(s => [s.id, s]));

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

  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) exportBtn.onclick = exportSavedAsJSON;

  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) copyBtn.onclick = copyCurrentPrompt;

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
            ${data.characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
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
  const charId = slot.querySelector('.char-sel').value;
  const actionSel = slot.querySelector('.sig-sel');
  const outfitSel = slot.querySelector('.out-sel');
  const faceSel = slot.querySelector('.face-sel');

  actionSel.innerHTML = '<option value="">-- Select --</option>';

  const char = charId ? data.characterMap[charId] : null;
  if (!char) return;

  // Preferred actions (per character) are the correct source for “Hành động”
  const actions = Array.isArray(char.preferred_actions) ? char.preferred_actions : [];
  actions.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = toHumanText(a);
    actionSel.appendChild(opt);
  });

  // If the character has a default outfit, preselect it when user hasn't chosen any outfit yet.
  if (outfitSel && !outfitSel.value && char.default_outfit_id) {
    outfitSel.value = char.default_outfit_id;
  }

  // If character has preferred faces, put them on top (but keep full list).
  if (faceSel && Array.isArray(char.preferred_faces) && char.preferred_faces.length > 0) {
    const existing = new Set(Array.from(faceSel.options).map(o => o.value));
    // Rebuild: preferred first, then the rest.
    const allFaces = data.faces.map(f => ({ id: f.id, label: f.label }));
    const preferred = char.preferred_faces.filter(id => data.faceMap[id]);
    const rest = allFaces.filter(f => !preferred.includes(f.id));
    faceSel.innerHTML = '';
    [...preferred.map(id => ({ id, label: data.faceMap[id].label })), ...rest].forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.label;
      faceSel.appendChild(opt);
    });
    // Keep previous selection if still exists.
    if (!existing.has(faceSel.value)) faceSel.value = preferred[0] || faceSel.options[0]?.value || '';
  }
};

function toHumanText(s) {
  if (!s) return '';
  return String(s)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
}

function generatePrompt() {
  const promptObj = buildCurrentPromptObject();
  const promptText = buildRenderFriendlyPrompt(promptObj);
  document.getElementById('final-prompt').textContent = promptText;
  return promptObj;
}

function getBackgroundDescEn(bg) {
  if (!bg) return '';
  return bg.desc_en || bg.prompt || bg.description || bg.label || '';
}

function getOutfitDescEn(outfit, gender) {
  if (!outfit) return '';
  const g = (gender || 'unknown').toLowerCase();
  const variants = outfit.variants || {};
  const variant = variants[g] || variants.male || variants.female || null;
  return (
    variant?.base_desc_en ||
    outfit.base_desc_en ||
    outfit.desc_en ||
    outfit.name ||
    ''
  );
}

function buildCurrentPromptObject() {
  const slots = document.querySelectorAll('.character-slot');
  const videoId = (document.getElementById('video-id')?.value || '').trim();
  const videoTitle = (document.getElementById('video-title')?.value || '').trim();

  const bgId = document.getElementById('background')?.value || '';
  const lightingKey = document.getElementById('lighting')?.value || '';
  const aspect = document.getElementById('aspect')?.value || '16:9';
  const camEl = document.getElementById('camera');
  const cameraKey = camEl?.value || 'MEDIUM_SHOT';
  const cameraLabel = camEl?.options?.[camEl.selectedIndex]?.text || cameraKey;


  const wardrobeMode = document.getElementById('wardrobe-priority-mode')?.value || 'auto';

  const bg = bgId ? data.backgroundMap[bgId] : null;
  const lightingDesc = lightingKey ? (data.lighting[lightingKey] || toHumanText(lightingKey)) : '';

  const characters = [];
  slots.forEach((slot, index) => {
    const charId = slot.querySelector('.char-sel')?.value;
    if (!charId) return;
    const char = data.characterMap[charId];
    if (!char) return;

    const faceId = slot.querySelector('.face-sel')?.value || '';
    const stateId = slot.querySelector('.state-sel')?.value || '';
    const actionId = slot.querySelector('.sig-sel')?.value || '';

    const explicitOutfitId = slot.querySelector('.out-sel')?.value || '';
    const outfitId = resolveWardrobeId(explicitOutfitId, char, wardrobeMode);
    const outfit = outfitId ? data.outfitMap[outfitId] : null;

    const face = faceId ? data.faceMap[faceId] : null;
    const state = stateId ? data.stateMap[stateId] : null;

    characters.push({
      index: index + 1,
      id: char.id,
      name: char.name,
      type: char.type,
      gender: char.gender,
      role: char.role,
      age_role_vi: char.age_role_vi,
      base_desc_en: char.base_desc_en || '',
      prompt_en: char.prompt_en || '',
      signature_items: Array.isArray(char.signature_items) ? char.signature_items : [],
      signature_colors: Array.isArray(char.signature_colors) ? char.signature_colors : [],
      outfit: outfit ? {
        id: outfit.id,
        name: outfit.name,
        desc_en: getOutfitDescEn(outfit, char.gender)
      } : null,
      action: actionId ? { id: actionId, desc_en: toHumanText(actionId) } : null,
      face: face ? { id: face.id, label: face.label, desc_en: face.desc_en || '' } : null,
      state: state ? { id: state.id, label: state.label, desc_en: state.desc_en || '' } : null
    });
  });

  return {
    schema: 'xnc_video_prompt_v1',
    created_at: new Date().toISOString(),
    video: { id: videoId || null, title: videoTitle || null },
    scene: {
      aspect_ratio: aspect,
      wardrobe_priority_mode: wardrobeMode,
      camera: { id: cameraKey, label: cameraLabel },
      lighting: { id: lightingKey || null, desc_en: lightingDesc || null },
      background: bg ? { id: bg.id, label: bg.label || bg.name || bg.id, desc_en: getBackgroundDescEn(bg) } : null
    },
    characters
  };
}

function buildRenderFriendlyPrompt(p) {
  const cameraLine = p.scene.camera?.label ? `${p.scene.camera.label}` : 'MEDIUM SHOT';
  const lightingLine = p.scene.lighting?.desc_en ? p.scene.lighting.desc_en : 'natural soft daylight';
  const backgroundLine = p.scene.background?.desc_en ? p.scene.background.desc_en : 'Vietnamese countryside street, pastel 2D chibi background, no text';

  const styleLines = [
    'STYLE: pastel 2D chibi animation, Vietnamese everyday vibe, clean lineart, soft shading, stable design turnarounds.',
    'REFERENCE SAFETY: Do NOT change the character identity when changing wardrobe. Identity means: face shape, hairstyle, skin tone, body proportions, signature items (e.g., glasses), and overall silhouette.',
    'WARDROBE SWAPS: You may change outfits/uniforms, but keep the same person. Do not reinterpret the character as a different age, different ethnicity, different haircut, or different accessories unless explicitly specified.',
    'COLOR RULE: Signature colors are part of the character identity. If the selected wardrobe item says "do NOT recolor", keep its original uniform colors and only use signature colors for allowed accents.',
    'QUALITY: consistent character identity across frames (same face features, same signature items, same palette discipline).',
    'RULES: no captions, no logos, no watermarks, no readable text.'
  ];

  const header = [
    'VIDEO PROMPT (XNC)',
    p.video?.title ? `Title: ${p.video.title}` : null,
    p.video?.id ? `Video ID: ${p.video.id}` : null,
    `Aspect ratio: ${p.scene.aspect_ratio}`,
    `Camera: ${cameraLine}`,
    `Lighting: ${lightingLine}`,
    `Background: ${backgroundLine}`,
    ...styleLines,
    ''
  ].filter(Boolean);

  const charLines = (p.characters || []).length
    ? p.characters.flatMap((c) => {
        const profile = c.profile || {};
        const base = (profile.prompt_en || profile.base_desc_en || c.prompt_en || c.base_desc_en || '').trim();

        const sigItems = Array.isArray(profile.signature_items) && profile.signature_items.length
          ? profile.signature_items.join(', ')
          : (Array.isArray(c.signature_items) && c.signature_items.length ? c.signature_items.join(', ') : 'none');

        const sigColors = Array.isArray(profile.signature_colors) && profile.signature_colors.length
          ? profile.signature_colors.join(', ')
          : (Array.isArray(c.signature_colors) && c.signature_colors.length ? c.signature_colors.join(', ') : 'none');

        const outfitLine = buildOutfitLine(c.outfit ? data.outfitMap[c.outfit.id] || c.outfit : null, profile.gender || c.gender, (profile.signature_colors || c.signature_colors || []));
        const action = c.action?.desc_en ? c.action.desc_en : 'idle / natural standing';
        const face = c.face?.desc_en ? c.face.desc_en : 'neutral expression';
        const state = c.state?.desc_en ? c.state.desc_en : 'neutral posture';

        // Include ALL character profile fields in a render-friendly way, while keeping the PROMPT in English:
        // - Skip Vietnamese-only fields (*_vi) in the text output (they remain in JSON export).
        // - Prefer stable identity locks (name, gender, base_desc_en, signature items/colors).
        const profileLines = [];
        Object.keys(profile).forEach((k) => {
          if (/_vi$/i.test(k)) return; // keep prompt English-only
          const v = profile[k];
          if (v === null || typeof v === 'undefined') return;
          if (typeof v === 'string' && !v.trim()) return;

          if (Array.isArray(v)) {
            profileLines.push(`  - ${k}: ${v.join(', ')}`);
            return;
          }
          if (typeof v === 'object') {
            profileLines.push(`  - ${k}: ${JSON.stringify(v)}`);
            return;
          }
          profileLines.push(`  - ${k}: ${String(v)}`);
        });

        return [
          `CHARACTER ${c.index}: ${c.name} (${c.id})`,
          `IDENTITY LOCK (do not change across shots):`,
          `- Base description: ${base || 'N/A'}`,
          `- Signature items (keep visible): ${sigItems}`,
          `- Signature colors (keep consistent): ${sigColors}`,
          `WARDROBE (may be swapped without changing identity):`,
          `- Outfit / uniform: ${outfitLine}`,
          `PERFORMANCE:`,
          `- Action: ${action}`,
          `- Face (facial expression): ${face}`,
          `- Body state / pose: ${state}`,
          `PROFILE FIELDS (English-only view; *_vi fields are stored in JSON export):`,
          ...(profileLines.length ? profileLines : [`  - (none)`])
        ];
      })
    : ['CHARACTERS: (none selected)'];

  return [...header, ...charLines].join('\n');
}

function persistSavedList() {
  localStorage.setItem('xnc_saved_prompts', JSON.stringify(savedPrompts));
  localStorage.setItem('xnc_counter', String(promptCounter));
}

function addCurrentPrompt() {
  const obj = generatePrompt();
  const promptText = document.getElementById('final-prompt')?.textContent || '';
  const videoId = obj.video?.id || `xnc_${promptCounter}`;
  const videoTitle = obj.video?.title || `XNC Prompt #${promptCounter}`;

  const entry = {
    saved_at: new Date().toISOString(),
    seq: promptCounter,
    video_id: videoId,
    video_title: videoTitle,
    prompt_text: promptText,
    data: obj
  };

  savedPrompts.unshift(entry);
  promptCounter += 1;
  persistSavedList();
  renderSavedList();
}

function renderSavedList() {
  const countEl = document.getElementById('count');
  if (countEl) countEl.textContent = savedPrompts.length;

  const listEl = document.getElementById('prompt-list');
  if (!listEl) return;

  if (!savedPrompts.length) {
    listEl.innerHTML = '<p class="muted">No saved prompts yet.</p>';
    return;
  }

  listEl.innerHTML = savedPrompts
    .map((p, idx) => {
      const title = escapeHtml(p.video_title || 'Untitled');
      const vid = escapeHtml(p.video_id || '');
      const dt = escapeHtml(new Date(p.saved_at).toLocaleString());
      return `
        <div class="card" style="margin: 12px 0;">
          <div style="display:flex; gap:10px; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
            <div style="min-width:240px;">
              <div style="font-weight:700;">${title}</div>
              <div class="muted" style="font-size: 13px;">ID: ${vid} • Saved: ${dt}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-primary" onclick="copySavedPrompt(${idx})">Copy</button>
              <button class="btn btn-secondary" onclick="exportOneAsJSON(${idx})">Export JSON</button>
              <button class="btn btn-secondary" onclick="removeSavedPrompt(${idx})" style="background:#ff4d4d; color:#fff;">Delete</button>
            </div>
          </div>
          <div style="margin-top:10px; background:#1e1e1e; color:#e0e0e0; padding:12px; border-radius:10px; font-family:monospace; white-space:pre-wrap; max-height: 220px; overflow:auto;">${escapeHtml(p.prompt_text || '')}</div>
        </div>
      `;
    })
    .join('');
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportSavedAsJSON() {
  const payload = {
    schema: 'xnc_saved_prompts_v1',
    exported_at: new Date().toISOString(),
    count: savedPrompts.length,
    saved_prompts: savedPrompts
  };
  downloadJSON('xnc_saved_prompts.json', payload);
}

function exportOneAsJSON(index) {
  const item = savedPrompts[index];
  if (!item) return;
  const safeId = (item.video_id || `xnc_${item.seq || index + 1}`)
    .toString()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadJSON(`xnc_prompt_${safeId}.json`, item);
}

function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return;
  }
  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

function copyCurrentPrompt() {
  const text = document.getElementById('final-prompt')?.textContent || '';
  copyToClipboard(text);
}

function copySavedPrompt(index) {
  const item = savedPrompts[index];
  if (!item) return;
  copyToClipboard(item.prompt_text || '');
}

function removeSavedPrompt(index) {
  if (!Number.isInteger(index)) return;
  savedPrompts.splice(index, 1);
  persistSavedList();
  renderSavedList();
}

// Expose to inline onclick handlers
window.copySavedPrompt = copySavedPrompt;
window.exportOneAsJSON = exportOneAsJSON;
window.removeSavedPrompt = removeSavedPrompt;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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



function resolveWardrobeId(explicitOutfitId, charProfile, wardrobeMode) {
  // If user explicitly chose an outfit/uniform, honor it.
  if (explicitOutfitId) return explicitOutfitId;

  const defaultOutfitId = charProfile?.default_outfit_id || '';
  const defaultUniformId = charProfile?.default_uniform_id || '';

  // If only one exists, use it.
  if (defaultOutfitId && !defaultUniformId) return defaultOutfitId;
  if (defaultUniformId && !defaultOutfitId) return defaultUniformId;

  // Both exist: apply priority mode.
  const outfitObj = defaultOutfitId ? data.outfitMap[defaultOutfitId] : null;
  const uniformObj = defaultUniformId ? data.outfitMap[defaultUniformId] : null;

  const outfitPr = typeof outfitObj?.priority === 'number' ? outfitObj.priority : 0;
  const uniformPr = typeof uniformObj?.priority === 'number' ? uniformObj.priority : 0;

  if (wardrobeMode === 'prefer_uniform') return defaultUniformId || defaultOutfitId || '';
  if (wardrobeMode === 'prefer_outfit') return defaultOutfitId || defaultUniformId || '';

  // auto: choose the higher priority; tie-breaker prefers uniform (safer for "reference" consistency).
  if (uniformPr > outfitPr) return defaultUniformId;
  if (outfitPr > uniformPr) return defaultOutfitId;
  return defaultUniformId || defaultOutfitId || '';
}

// --- Signature colorway helpers (for wardrobe recolor without identity drift) ---
const COLOR_TOKEN_MAP = {
  xnc_blue: 'royal blue',
  xnc_yellow: 'sunny yellow',
  xnc_red: 'bright red',
  xnc_black: 'black',
  xnc_white: 'white',
  xnc_brown: 'warm brown',
  xnc_warm_brown: 'warm brown',
  xnc_pastel: 'soft pastel tones',
  xnc_pastel_green: 'pastel green',
  xnc_pastel_yellow: 'pastel yellow',
  xnc_rice_yellow: 'rice-yellow',
  xnc_pink: 'pink',
  xnc_purple: 'purple',
  xnc_orange: 'orange',
  xnc_green: 'green',
};

function colorTokenToEnglish(token) {
  if (!token) return '';
  const key = String(token).trim();
  const normalized = key.replace(/^xnc_/, 'xnc_');
  const bare = normalized.replace(/^xnc_/, '');
  if (COLOR_TOKEN_MAP[normalized]) return COLOR_TOKEN_MAP[normalized];
  if (COLOR_TOKEN_MAP[bare]) return COLOR_TOKEN_MAP[bare];
  // fallback: turn tokens into readable English
  return bare.replace(/_/g, ' ').trim();
}

function formatSignatureColorway(signatureColors) {
  const list = (signatureColors || []).map(colorTokenToEnglish).filter(Boolean);
  if (!list.length) return null;
  const primary = list[0];
  const accents = list.slice(1);
  const accentsText = accents.length ? accents.join(', ') : primary;
  return { primary, accentsText, listText: list.join(', ') };
}

function containsColorWords(text) {
  const t = String(text || '').toLowerCase();
  return /\b(black|white|red|blue|yellow|green|purple|pink|orange|brown|gray|grey|beige|gold|silver)\b/.test(t);
}

function buildOutfitLine(outfit, gender, signatureColors) {
  if (!outfit) return 'default outfit';
  const desc = getOutfitDescEn(outfit, gender) || outfit.name || 'outfit';
  const allowSig = outfit.allow_signature_color === true;

  const colorway = formatSignatureColorway(signatureColors);
  if (!colorway) return desc;

  // If this wardrobe allows signature recolor, explicitly lock identity and recolor clothing only.
  if (allowSig) {
    // Enforce character recognition through a stable primary-color TOP (shirt/jacket),
    // while allowing the rest of the outfit (pants/skirt/shoes/accessories) to vary
    // within accents/neutrals for group harmony.
    const overrideNote = containsColorWords(desc)
      ? 'Override any garment colors mentioned above using the signature color policy below.'
      : 'Apply the signature color policy below to the clothing.';

    return `${desc}. ${overrideNote} Signature color policy: TOP (shirt/jacket) must be primarily ${colorway.primary} (this is the character\'s signature/recognition color). Bottoms (pants/shorts/skirt) may use ${colorway.accentsText} or neutral tones as long as the overall palette remains harmonious. Keep the garment cut/material/pattern details intact; recolor CLOTHING ONLY; do not change skin, hair, face, or body identity.`;
  }

  // Otherwise, keep the wardrobe colors fixed to protect reference consistency.
  return `${desc} (do NOT recolor this wardrobe item using signature colors; keep its original colors)`;
}
