// script.js - Phiên bản sửa lỗi mất giao diện khi thiếu file JSON
const JSON_URLS = {
  characters: '/adn/xomnganchuyen/XNC_characters.json',
  faces: '/adn/xomnganchuyen/XNC_faces.json',
  states: '/adn/xomnganchuyen/XNC_states.json',
  style: '/adn/xomnganchuyen/XNC_style.json',
  backgrounds: '/adn/xomnganchuyen/XNC_backgrounds.json',
  outfits: '/adn/xomnganchuyen/XNC_outfits.json'
};

// Global app state (for tabs / scene split / mapping)
const appState = window.appState || (window.appState = {});

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
let storyManifest = { stories: [] };
let storyManifestPath = '';

// --- Preview helpers ---
function setStoryJSONPreview(obj) {
  const pre = document.getElementById('story-json-output');
  if (!pre) return;
  try {
    pre.textContent = JSON.stringify(obj ?? {}, null, 2);
  } catch (e) {
    pre.textContent = String(obj);
  }
}


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

async function loadJSONFirstOk(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const j = await loadJSON(p);
      if (j) return { path: p, json: j };
      lastErr = `Not found: ${p}`;
    } catch (e) {
      lastErr = String(e);
    }
  }
  console.warn('[XNC] Cannot load JSON from any path.', lastErr);
  return null;
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
  appState.characters = data.characters;

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

  // Participants (Nhân vật tham gia)
  setupParticipantsUI();

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

  // Story tab
  setupTabs();
  initStoryTab();


  // ===== Scene/Frame navigator bindings =====
  const btnPrev = document.getElementById('btn-prev-scene');
  const btnNext = document.getElementById('btn-next-scene');
  const txScene = document.getElementById('current-scene-note');
  const txFrame = document.getElementById('current-frame-note');

  if (btnPrev) btnPrev.addEventListener('click', () => {
    const max = (appState?.scene_manifest?.scenes?.length || 1) - 1;
    const nextIdx = Math.max(0, (currentSceneIdx || 0) - 1);
    setCurrentSceneFrame(nextIdx, 0);
  });

  if (btnNext) btnNext.addEventListener('click', () => {
    const max = (appState?.scene_manifest?.scenes?.length || 1) - 1;
    const nextIdx = Math.min(max, (currentSceneIdx || 0) + 1);
    setCurrentSceneFrame(nextIdx, 0);
  });

  if (txScene) txScene.addEventListener('input', (e) => {
    const sc = appState?.scene_manifest?.scenes?.[currentSceneIdx];
    if (!sc) return;
    sc.scene_note = e.target.value || '';
    saveSceneDraftLocal();
  });

  if (txFrame) txFrame.addEventListener('input', (e) => {
    const sc = appState?.scene_manifest?.scenes?.[currentSceneIdx];
    if (!sc) return;
    sc.frames = Array.isArray(sc.frames) ? sc.frames : [];
    sc.frames[currentFrameIdx] = sc.frames[currentFrameIdx] || { frame_id: `F${String(currentFrameIdx+1).padStart(2,'0')}` };
    sc.frames[currentFrameIdx].frame_note = e.target.value || '';
    saveSceneDraftLocal();
  });

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



/* ---------------------------
   STORY TAB (Local storage)
----------------------------*/

let currentSceneIdx = 0;
let currentFrameIdx = 0;

const STORY_STORAGE_KEY = 'xnc_stories_v1';

const SCENE_DRAFT_KEY_PREFIX = 'xnc_scene_manifest_draft::';

function getDraftKey() {
  const sid = (document.getElementById('story-id')?.value || '').trim();
  return SCENE_DRAFT_KEY_PREFIX + (sid || 'unknown');
}

function saveSceneDraftLocal() {
  try {
    if (!appState?.scene_manifest) return;
    localStorage.setItem(getDraftKey(), JSON.stringify(appState.scene_manifest));
  } catch (e) {}
}

function loadSceneDraftLocal() {
  try {
    const raw = localStorage.getItem(getDraftKey());
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : null;
  } catch (e) { return null; }
}

function setCurrentSceneFrame(si=0, fi=0) {
  currentSceneIdx = Math.max(0, Number(si) || 0);
  currentFrameIdx = Math.max(0, Number(fi) || 0);
  updateCurrentScenePanel();
  // highlight
  const box = document.getElementById('scenes-output');
  if (box) {
    box.querySelectorAll('.scene-card').forEach(card => {
      const idx = Number(card.dataset.sceneIdx);
      card.classList.toggle('active', idx === currentSceneIdx);
    });
  }
}

function updateCurrentScenePanel() {
  const label = document.getElementById('current-scene-label');
  const sceneNote = document.getElementById('current-scene-note');
  const frameNote = document.getElementById('current-frame-note');
  const sc = appState?.scene_manifest?.scenes?.[currentSceneIdx];
  if (!label || !sceneNote || !frameNote) return;

  if (!sc) {
    label.textContent = 'Chưa có Scene';
    sceneNote.value = '';
    frameNote.value = '';
    return;
  }

  const sid = sc.scene_id || `S${String(currentSceneIdx+1).padStart(2,'0')}`;
  const fid = sc.frames?.[currentFrameIdx]?.frame_id || `F${String(currentFrameIdx+1).padStart(2,'0')}`;
  label.textContent = `${sid} • ${fid} • Mode: ${sc.mode || 'dialogue'}`;

  sceneNote.value = sc.scene_note || '';
  frameNote.value = (sc.frames?.[currentFrameIdx]?.frame_note) || '';
}



function setupTabs() {
  const storyBtn = document.getElementById('tab-story-btn');
  const promptBtn = document.getElementById('tab-prompt-btn');
  const storyTab = document.getElementById('tab-story');
  const promptTab = document.getElementById('tab-prompt');

  // If page doesn't have tabs (older HTML), do nothing
  if (!storyBtn || !promptBtn || !storyTab || !promptTab) return;

  const activate = (which) => {
    const isStory = which === 'story';
    storyBtn.classList.toggle('active', isStory);
    promptBtn.classList.toggle('active', !isStory);
    storyTab.classList.toggle('active', isStory);
    promptTab.classList.toggle('active', !isStory);
  };

  storyBtn.addEventListener('click', () => activate('story'));
  promptBtn.addEventListener('click', () => activate('prompt'));

  // Default: story first
  activate('story');
}

/* =========================
   Story Manifest (substance)
   ========================= */

function normalizeStoriesFromManifest(man) {
  if (!man) return [];
  if (Array.isArray(man)) return man;
  if (Array.isArray(man.stories)) return man.stories;
  if (Array.isArray(man.items)) return man.items;
  return [];
}

function pickStoryId(st) { return st.id || st.story_id || st.storyId || ''; }
function pickStoryTitle(st) { return st.title || st.story_title || st.storyTitle || ''; }
function pickStoryFile(st) { return st.file || st.path || st.url || ''; }

function normalizeStoryFilePath(st) {
  const f = pickStoryFile(st);
  const id = pickStoryId(st);
  if (f && typeof f === 'string') {
    if (f.startsWith('/')) return f;
    // relative
    if (f.startsWith('substance/')) return '/' + f;
    return '/substance/' + f;
  }
  if (id) return '/substance/' + id + '.json';
  return '';
}

async function loadStoryManifestIntoUI() {
  const manifestPaths = [
    '/substance/manifest.json',
    '/substance/stories_manifest.json',
    '/substance/story_manifest.json',
    '../substance/manifest.json',
    './substance/manifest.json'
  ];

  const out = await loadJSONFirstOk(manifestPaths);
  const select = document.getElementById('story-select');
  const pathEl = document.getElementById('manifest-path');
  if (!select) return;

  select.innerHTML = '<option value="">-- Chọn truyện --</option>';

  if (!out) {
    storyManifest = { stories: [] };
    storyManifestPath = '';
    if (pathEl) pathEl.textContent = 'không tìm thấy manifest.json';
    return;
  }

  storyManifestPath = out.path;
  if (pathEl) pathEl.textContent = out.path;

  const list = normalizeStoriesFromManifest(out.json);
  storyManifest = { stories: list };

  list
    .slice()
    .sort((a,b) => {
      const da = (a.updatedAt || a.updated_at || a.createdAt || a.created_at || '');
      const db = (b.updatedAt || b.updated_at || b.createdAt || b.created_at || '');
      return String(db).localeCompare(String(da));
    })
    .forEach(st => {
      const id = pickStoryId(st);
      const title = pickStoryTitle(st);
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${title || '(no title)'} — ${id || '(no id)'}`;
      select.appendChild(opt);
    });
}

async function loadSelectedStoryFromManifest() {
  const select = document.getElementById('story-select');
  if (!select || !select.value) {
    alert('Bạn chưa chọn truyện.');
    return;
  }
  const id = select.value;
  const st = (storyManifest?.stories || []).find(x => pickStoryId(x) === id);
  if (!st) {
    alert('Không tìm thấy truyện trong manifest.');
    return;
  }

  const filePath = normalizeStoryFilePath(st);
  if (!filePath) {
    alert('Manifest thiếu đường dẫn file story.');
    return;
  }

  const storyJson = await loadJSON(filePath);
  if (!storyJson) {
    alert('Không load được story JSON: ' + filePath);
    return;
  }

  // Fill form
  const idEl = document.getElementById('story-id');
  const titleEl = document.getElementById('story-title');
  const contentEl = document.getElementById('story-content');

  if (idEl) idEl.value = storyJson.id || storyJson.story_id || id;
  if (titleEl) titleEl.value = storyJson.title || storyJson.story_title || pickStoryTitle(st) || '';
  if (contentEl) contentEl.value = storyJson.story || storyJson.content || storyJson.text || '';

  // Auto select participating characters (if form supports it)
  const chars = storyJson.characters || storyJson.cast || [];
  // If checkbox-card UI exists (data-char-id), tick it
  if (Array.isArray(chars) && chars.length) {
    document.querySelectorAll('[data-char-id]').forEach(card => {
      const cid = card.getAttribute('data-char-id');
      const cb = card.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = chars.includes(cid) || chars.includes(card.getAttribute('data-char-name'));
    });
    const countEl = document.getElementById('selected-count');
    if (countEl) {
      const checked = document.querySelectorAll('[data-char-id] input[type="checkbox"]:checked').length;
      countEl.textContent = `Đã chọn: ${checked}`;
    }
  }

  // Hint: user can now click split to build scenes & dialogue
  console.log('[XNC] Story loaded. You can now split scenes & dialogue.');
}

function setupStoryManifestPicker() {
  const reloadBtn = document.getElementById('reload-manifest-btn');
  const loadBtn = document.getElementById('load-story-btn');

  if (reloadBtn) reloadBtn.onclick = loadStoryManifestIntoUI;
  if (loadBtn) loadBtn.onclick = loadSelectedStoryFromManifest;

  // Load once on init
  loadStoryManifestIntoUI();
}

function initStoryTab() {
  // Populate character multi-select
  const sel = document.getElementById('story-characters');
  if (sel) {
    sel.innerHTML = '';
    data.characters.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name || c.id} (${c.id})`;
      sel.appendChild(opt);
    });
  }

  const createBtn = document.getElementById('create-story-btn');
  if (createBtn) createBtn.onclick = createStory;

  const exportBtn = document.getElementById('export-story-json-btn');
  if (exportBtn) exportBtn.onclick = exportCurrentStoryJSON;

  const saveFileBtn = document.getElementById('save-story-file-btn');
  if (saveFileBtn) saveFileBtn.onclick = downloadCurrentStoryJSON;

  const loadBtn = document.getElementById('load-story-btn');
  if (loadBtn) loadBtn.onclick = loadSelectedStory;

  // --- Scene & Dialogue splitter (Tab: Story) ---
  const splitBtn = document.getElementById('split-scenes-btn');
  if (splitBtn) splitBtn.onclick = splitScenesFromStory;

  const exportDialogueBtn = document.getElementById('export-dialogue-json-btn');
  if (exportDialogueBtn) exportDialogueBtn.onclick = exportDialogueJSON;

  const copyDialogueBtn = document.getElementById('copy-dialogue-json-btn');
  if (copyDialogueBtn) copyDialogueBtn.onclick = copyDialogueJSON;

  const clearScenesBtn = document.getElementById('clear-scenes-btn');
  if (clearScenesBtn) clearScenesBtn.onclick = () => {
    appState.scene_manifest = { scenes: [] };
    renderSceneManifestUI();
    setStoryJSONPreview({});
  };

  const delBtn = document.getElementById('delete-story-btn');
  if (delBtn) delBtn.onclick = deleteSelectedStory;

  setupStoryManifestPicker();
  renderStoryList();
}

function getStories() {
  try {
    const raw = localStorage.getItem(STORY_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function setStories(stories) {
  localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(stories, null, 2));
}

function renderStoryList() {
  const list = document.getElementById('story-list');
  if (!list) return;

  const stories = getStories();
  list.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = stories.length ? '— Chọn một câu chuyện —' : 'Chưa có câu chuyện nào (Local)';
  list.appendChild(placeholder);

  stories
    .slice()
    .sort((a,b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
    .forEach(st => {
      const opt = document.createElement('option');
      opt.value = st.story_id || '';
      opt.textContent = `${st.story_title || '(no title)'} — ${st.story_id || '(no id)'}`;
      list.appendChild(opt);
    });
}

function getSelectedMultiValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || []).map(o => o.value).filter(Boolean);
}

function buildStoryObjectFromForm() {
  const storyId = (document.getElementById('story-id')?.value || '').trim();
  const storyTitle = (document.getElementById('story-title')?.value || '').trim();
  const content = (document.getElementById('story-content')?.value || '').trim();
  const selectedIds = getSelectedMultiValues(document.getElementById('story-characters'));

  const characterSnapshots = selectedIds
    .map(id => data.characterMap?.[id])
    .filter(Boolean);

  const now = new Date().toISOString();

  // We keep a full snapshot for portability, while also storing ids for referential integrity.
  return {
    story_id: storyId,
    story_title: storyTitle,
    content: content,
    character_ids: selectedIds,
    characters: characterSnapshots,
    created_at: now,
    updated_at: now
  };
}

function writeStoryPreview(storyObj) {
  const out = document.getElementById('story-json-output');
  if (!out) return;
  out.value = JSON.stringify(storyObj, null, 2);
}

function createStory() {
  const storyObj = buildStoryObjectFromForm();
  if (!storyObj.story_id) {
    alert('Bạn cần nhập ID câu chuyện.');
    return;
  }
  if (!storyObj.story_title) {
    alert('Bạn cần nhập Tên câu chuyện.');
    return;
  }
  if (!storyObj.content) {
    alert('Bạn cần nhập Nội dung câu chuyện.');
    return;
  }
  if (!storyObj.character_ids.length) {
    alert('Bạn cần chọn ít nhất 1 nhân vật tham gia.');
    return;
  }

  const stories = getStories();
  const idx = stories.findIndex(s => s.story_id === storyObj.story_id);

  if (idx >= 0) {
    // Preserve created_at
    storyObj.created_at = stories[idx].created_at || storyObj.created_at;
    stories[idx] = { ...stories[idx], ...storyObj, updated_at: new Date().toISOString() };
  } else {
    stories.push(storyObj);
  }

  setStories(stories);
  writeStoryPreview(storyObj);
  setupStoryManifestPicker();
  renderStoryList();
}

function exportCurrentStoryJSON() {
  const out = document.getElementById('story-json-output');
  const jsonText = (out?.value || '').trim();
  if (!jsonText) {
    alert('Chưa có JSON để xuất. Hãy bấm "Tạo câu chuyện" trước.');
    return;
  }
  navigator.clipboard?.writeText(jsonText);
  alert('Đã copy JSON câu chuyện vào clipboard.');
}

function downloadCurrentStoryJSON() {
  const out = document.getElementById('story-json-output');
  const jsonText = (out?.value || '').trim();
  if (!jsonText) {
    alert('Chưa có JSON để lưu file. Hãy bấm "Tạo câu chuyện" trước.');
    return;
  }
  let storyId = 'story';
  try {
    const obj = JSON.parse(jsonText);
    storyId = obj.story_id || storyId;
  } catch {}
  downloadTextFile(`${storyId}.json`, jsonText);
}

function loadSelectedStory() {
  const list = document.getElementById('story-list');
  const selectedId = list?.value || '';
  if (!selectedId) return;

  const stories = getStories();
  const st = stories.find(s => s.story_id === selectedId);
  if (!st) return;

  const idEl = document.getElementById('story-id');
  const titleEl = document.getElementById('story-title');
  const contentEl = document.getElementById('story-content');
  const charsEl = document.getElementById('story-characters');

  if (idEl) idEl.value = st.story_id || '';
  if (titleEl) titleEl.value = st.story_title || '';
  if (contentEl) contentEl.value = st.content || '';

  if (charsEl) {
    const ids = new Set(st.character_ids || []);
    Array.from(charsEl.options).forEach(opt => { opt.selected = ids.has(opt.value); });
  }

  writeStoryPreview(st);
}

function deleteSelectedStory() {
  const list = document.getElementById('story-list');
  const selectedId = list?.value || '';
  if (!selectedId) return;

  const stories = getStories();
  const next = stories.filter(s => s.story_id !== selectedId);
  setStories(next);
  setupStoryManifestPicker();
  renderStoryList();

  // Clear preview if it was the deleted one
  const out = document.getElementById('story-json-output');
  if (out) out.value = '';
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


/* =========================
   Scene & Dialogue Splitter
   ========================= */

function stripAccents(str='') {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeKey(str='') {
  return stripAccents(String(str))
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9\-\s]/g, '')
    .trim();
}

function buildCharacterNameMap() {
  // Map both display names and ids -> char object
  const map = new Map();
  const chars = Array.isArray(appState.characters) ? appState.characters : [];

  for (const c of chars) {
    const id = c.id || c.character_id || c.key;
    const name = c.name || c.label || c.title || c.display_name || id;
    if (id) map.set(normalizeKey(id), c);
    if (name) map.set(normalizeKey(name), c);

    // common fields you said are important: keep all fields, but for mapping we also try aliases
    const aliases = []
      .concat(c.aliases || [])
      .concat(c.alt_names || [])
      .concat(c.nicknames || [])
      .concat(c.short_name || [])
      .concat(c.slug || []);
    for (const a of aliases) {
      if (a) map.set(normalizeKey(a), c);
    }
  }
  return map;
}

function parseSpeakerLine(line) {
  // Returns: {type:'dialogue'|'sfx'|'narration', speakerRaw?, text}
  const raw = line.trim();
  if (!raw) return null;

  // SFX patterns
  // **[SFX: ...]** or [SFX: ...]
  let m = raw.match(/^\*\*\s*\[\s*SFX\s*:\s*(.+?)\s*\]\s*\*\*\s*$/i)
       || raw.match(/^\[\s*SFX\s*:\s*(.+?)\s*\]$/i);
  if (m) return { type: 'sfx', text: m[1].trim() };

  // Bold speaker: **Name:** text
  m = raw.match(/^\*\*\s*([^*]+?)\s*\*\*\s*:\s*(.+)$/);
  if (m) return { type: 'dialogue', speakerRaw: m[1].trim(), text: m[2].trim() };

  // Plain speaker: Name: text  (avoid times like 12:30 by requiring some letters)
  m = raw.match(/^([^:]{1,40})\s*:\s*(.+)$/);
  if (m && /[A-Za-zÀ-ỹ]/.test(m[1])) return { type: 'dialogue', speakerRaw: m[1].trim(), text: m[2].trim() };

  // default narration
  return { type: 'narration', text: raw };
}

function splitScenesFromStory() {
  const storyTextEl = document.getElementById('story-content');
  const storyText = (storyTextEl?.value || '').trim();
  if (!storyText) {
    alert('Chưa có nội dung story để tách scene.');
    return;
  }

  const lines = storyText.split(/\r?\n/);

  // Scene boundary patterns: **[Scene: ...]**, [Scene: ...], **Scene ...**, Scene:
  const isSceneHeader = (s) => {
    const t = s.trim();
    if (!t) return false;
    return /^\*\*\s*\[\s*Scene\s*:/i.test(t)
        || /^\[\s*Scene\s*:/i.test(t)
        || /^\*\*\s*Scene\b/i.test(t)
        || /^Scene\s*:/i.test(t);
  };

  const scenes = [];
  let cur = null;

  const pushCur = () => {
    if (!cur) return;
    // trim empty tail lines
    while (cur.raw_lines.length && !cur.raw_lines[cur.raw_lines.length-1].trim()) cur.raw_lines.pop();
    if (cur.raw_lines.length === 0 && !cur.title) return;

    // Parse dialogue
    const charMap = buildCharacterNameMap();
    const dialogue = [];
    const extras = [];
    let order = 0;

    for (const ln of cur.raw_lines) {
      const parsed = parseSpeakerLine(ln);
      if (!parsed) continue;
      if (parsed.type === 'dialogue') {
        order += 1;
        const key = normalizeKey(parsed.speakerRaw);
        const charObj = charMap.get(key);
        const charId = (charObj && (charObj.id || charObj.character_id || charObj.key)) || null;
        const charLabel = (charObj && (charObj.name || charObj.label || charObj.title)) || parsed.speakerRaw;

        dialogue.push({
          line_id: `${cur.scene_id}_L${String(order).padStart(2,'0')}`,
          order,
          char_id: charId || key,       // fallback: normalized speaker
          char_label: charLabel,
          text: parsed.text
        });
      } else if (parsed.type === 'sfx') {
        extras.push({ type: 'sfx', text: parsed.text });
      } else {
        extras.push({ type: 'narration', text: parsed.text });
      }
    }

    cur.dialogue = dialogue;
    cur.extras = extras;
    cur.raw_text = cur.raw_lines.join('\n').trim();
    delete cur.raw_lines;
    scenes.push(cur);
  };

  let sceneIndex = 0;
  for (const ln of lines) {
    if (isSceneHeader(ln)) {
      pushCur();
      sceneIndex += 1;
      const sceneId = `S${String(sceneIndex).padStart(2,'0')}`;
      // title from header
      const header = ln.trim().replace(/^\*\*\s*/, '').replace(/\s*\*\*\s*$/, '');
      cur = { scene_id: sceneId, title: header, raw_lines: [] };
    } else {
      if (!cur) {
        // if no explicit scene header, start S01
        sceneIndex = 1;
        cur = { scene_id: 'S01', title: '', raw_lines: [] };
      }
      cur.raw_lines.push(ln);
    }
  }
  pushCur();

  // Build scene_manifest in appState
  appState.scene_manifest = {
    project_style: (document.getElementById('style')?.value || 'default'),
    aspect: (document.getElementById('aspect')?.value || '9:16'),
    scenes: scenes.map(s => ({
      scene_id: s.scene_id,
      title: s.title || '',
      mode: 'dialogue', // default, user can change later
      
      scene_note: '',
      frames: [{ frame_id: 'F01', frame_note: '' }],
characters: Array.from(new Set(s.dialogue.map(d => d.char_label))).filter(Boolean),
      dialogue: s.dialogue,
      extras: s.extras,
      raw_text: s.raw_text
    }))
  };

  renderSceneManifestUI();
  setStoryJSONPreview(appState.scene_manifest);
}


function autoSceneNote(sc) {
  // Simple heuristic: use first 2 dialogues + first SFX/Narration line.
  const dlg = Array.isArray(sc.dialogue) ? sc.dialogue : [];
  const firstLines = dlg.slice(0, 2).map(d => `${d.char_label || d.char_id || 'NV'}: ${d.text}`.trim());
  const extras = Array.isArray(sc.extras) ? sc.extras : [];
  const sfx = extras.find(x => x.type === 'sfx');
  const narr = extras.find(x => x.type === 'narration');
  const parts = [];
  if (sc.background_label || sc.background_id) parts.push(`Setting: ${sc.background_label || sc.background_id}.`);
  if (narr?.text) parts.push(`Context: ${narr.text}`);
  if (sfx?.text) parts.push(`SFX: ${sfx.text}`);
  if (firstLines.length) parts.push(`Key lines: ${firstLines.join(' | ')}`);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function autoFrameNote(sc, frameIdx=0) {
  const f = sc?.frames?.[frameIdx] || {};
  const actors = Array.isArray(f.actors) ? f.actors : [];
  const focus = actors[0]?.char_label || actors[0]?.char_id;
  const action = actors[0]?.action_label || actors[0]?.action_id;
  const face = actors[0]?.face_label || actors[0]?.face_id;
  const parts = [];
  if (focus) parts.push(`Shot focuses on ${focus}.`);
  if (action) parts.push(`Action: ${action}.`);
  if (face) parts.push(`Expression: ${face}.`);
  // attach first dialogue line in this scene as hint
  const dlg = Array.isArray(sc.dialogue) ? sc.dialogue : [];
  if (dlg[0]?.text) parts.push(`Dialogue hint: "${dlg[0].text}"`);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function renderSceneManifestUI() {
  const box = document.getElementById('scenes-output');
  if (!box) return;
  const manifest = appState.scene_manifest || { scenes: [] };
  const scenes = Array.isArray(manifest.scenes) ? manifest.scenes : [];

  if (!scenes.length) {
    box.innerHTML = '<div class="muted">Chưa có scene. Bấm “Tách Scene & Thoại”.</div>';
    return;
  }

  box.innerHTML = scenes.map((sc, idx) => {
    const chars = (sc.characters || []).join(', ');
    const lines = (sc.dialogue || []).map(d => `<div class="dlg-line"><span class="dlg-speaker">${escapeHtml(d.char_label)}:</span> ${escapeHtml(d.text)}</div>`).join('');
    const sfx = (sc.extras || []).filter(x => x.type === 'sfx').map(x => `<div class="sfx-line">[SFX: ${escapeHtml(x.text)}]</div>`).join('');
    const narr = (sc.extras || []).filter(x => x.type === 'narration').slice(0,3).map(x => `<div class="nar-line">${escapeHtml(x.text)}</div>`).join('');

    return `
      <div class="scene-card ${idx===currentSceneIdx?'active':''}" data-scene-idx="${idx}">
        <div class="scene-head">
          <div>
            <div class="scene-title">${escapeHtml(sc.scene_id)} ${sc.title ? '— ' + escapeHtml(sc.title) : ''}</div>
            <div class="scene-meta">Nhân vật: ${escapeHtml(chars || '—')}</div>
          </div>
          <div class="scene-actions">
            <label>Mode
              <select data-scene-idx="${idx}" class="scene-mode">
                <option value="dialogue" ${sc.mode==='dialogue'?'selected':''}>Dialogue (2 người/1 khung)</option>
                <option value="closeup" ${sc.mode==='closeup'?'selected':''}>Close-up (mỗi người/1 khung)</option>
                <option value="hybrid" ${sc.mode==='hybrid'?'selected':''}>Hybrid</option>
              </select>
            </label>
          </div>
        </div>

        <details>
          <summary>Xem thoại (${(sc.dialogue||[]).length})</summary>
          <div class="dlg-box">${lines || '<div class="muted">Không tìm thấy dòng thoại dạng “Tên: …”</div>'}</div>
          ${sfx ? `<div class="dlg-box">${sfx}</div>`:''}
          ${narr ? `<div class="dlg-box muted">${narr}</div>`:''}
        </details>

        <details>
          <summary>Raw text</summary>
          <textarea class="scene-raw" data-scene-idx="${idx}" rows="6">${escapeHtml(sc.raw_text||'')}
</textarea>

          <div class="row" style="gap:10px; margin-top:10px; align-items:flex-start;">
            <div style="flex:1; min-width:260px;">
              <div class="label">Scene Note (tóm tắt nội dung cảnh)</div>
              <textarea class="scene-note" data-scene-idx="${idx}" rows="3" placeholder="VD: Bối cảnh + mục tiêu cảnh + cảm xúc chính...">${escapeHtml(sc.scene_note || '')}</textarea>
              <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" class="btn small btn-auto-scene-note" data-scene-idx="${idx}">Auto-gợi ý</button>
                <button type="button" class="btn small btn-clear-scene-note" data-scene-idx="${idx}">Xóa</button>
              </div>
            </div>

            <div style="flex:1; min-width:260px;">
              <div class="label">Frame Note (tóm tắt shot hiện tại)</div>
              <textarea class="frame-note" data-scene-idx="${idx}" data-frame-idx="0" rows="3" placeholder="VD: Cận mặt ai? hành động nhỏ? cảm xúc?">${escapeHtml((sc.frames?.[0]?.frame_note) || '')}</textarea>
              <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" class="btn small btn-auto-frame-note" data-scene-idx="${idx}" data-frame-idx="0">Auto-gợi ý</button>
                <button type="button" class="btn small btn-copy-scene-to-frame" data-scene-idx="${idx}" data-frame-idx="0">Copy từ Scene Note</button>
                <button type="button" class="btn small btn-clear-frame-note" data-scene-idx="${idx}" data-frame-idx="0">Xóa</button>
              </div>
            </div>
          </div>

          <div class="muted">Bạn có thể sửa raw text rồi bấm “Tách lại thoại từ raw” (ở nút export) nếu cần.</div>
        </details>
      </div>
    `;
  }).join('');

  // bind mode selects + raw editors
  box.querySelectorAll('.scene-mode').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const i = Number(e.target.dataset.sceneIdx);
      const v = e.target.value;
      if (appState.scene_manifest?.scenes?.[i]) {
        appState.scene_manifest.scenes[i].mode = v;
      }
      setStoryJSONPreview(appState.scene_manifest);
    });
  });

  box.querySelectorAll('.scene-raw').forEach(tx => {
    tx.addEventListener('change', (e) => {
      const i = Number(e.target.dataset.sceneIdx);
      const v = e.target.value || '';
      if (appState.scene_manifest?.scenes?.[i]) {
        appState.scene_manifest.scenes[i].raw_text = v;
      }
      setStoryJSONPreview(appState.scene_manifest);
    });
  });

  // click scene card to select current
  box.querySelectorAll('.scene-card').forEach(card => {
    card.addEventListener('click', () => {
      const i = Number(card.dataset.sceneIdx || 0);
      setCurrentSceneFrame(i, 0);
      saveSceneDraftLocal();
    });
  });

  updateCurrentScenePanel();
}

function buildDialogueExport() {
  const manifest = appState.scene_manifest || { scenes: [] };
  const scenes = Array.isArray(manifest.scenes) ? manifest.scenes : [];

  const flat = [];
  const byCharacter = {};

  for (const sc of scenes) {
    const dlg = Array.isArray(sc.dialogue) ? sc.dialogue : [];
    for (const d of dlg) {
      flat.push({
        scene_id: sc.scene_id,
        line_id: d.line_id,
        order: d.order,
        character: d.char_label,
        character_id: d.char_id,
        text: d.text
      });
      const k = d.char_id || d.char_label || 'unknown';
      if (!byCharacter[k]) byCharacter[k] = { character: d.char_label, character_id: d.char_id, lines: [] };
      byCharacter[k].lines.push({ scene_id: sc.scene_id, line_id: d.line_id, order: d.order, text: d.text });
    }
  }

  return {
    version: 1,
    project_style: manifest.project_style || 'default',
    aspect: manifest.aspect || '9:16',
    scenes: scenes.map(sc => ({
      scene_id: sc.scene_id,
      title: sc.title || '',
      mode: sc.mode || 'dialogue',
      characters: sc.characters || [],
      dialogue: sc.dialogue || [],
      extras: sc.extras || []
    })),
    tts: {
      flat,
      byCharacter
    }
  };
}

function exportDialogueJSON() {
  const data = buildDialogueExport();
  const filename = `xnc_dialogue_${nowISO().replace(/[:.]/g,'-')}.json`;
  downloadJSON(data, filename);
}

async function copyDialogueJSON() {
  const data = buildDialogueExport();
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert('Đã copy JSON thoại/scene vào clipboard.');
  } catch (e) {
    alert('Copy thất bại. Hãy dùng nút Export JSON để tải file.');
  }
}
/* =====================
   Participants (Nhân vật tham gia)
   - Dùng để map thoại cho đúng nhân vật
   - KHÁC với "Nhân vật #1" (actor slot) phía dưới
===================== */

function normalizeCharId(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/đ/g,'d')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}

function setupParticipantsUI() {
  const grid = document.getElementById('participants-grid');
  const search = document.getElementById('char-search');
  const btnAll = document.getElementById('btn-select-all');
  const btnClear = document.getElementById('btn-clear');
  const count = document.getElementById('selected-count');

  if (!grid || !search || !btnAll || !btnClear || !count) {
    console.warn('[XNC] Participants UI missing in HTML.');
    return;
  }

  const render = () => {
    const q = (search.value || '').trim().toLowerCase();
    const list = Array.isArray(data.characters) ? data.characters : [];

    const filtered = !q ? list : list.filter(c => {
      const label = (c.label || c.name || '').toLowerCase();
      const role = (c.role || '').toLowerCase();
      return label.includes(q) || role.includes(q);
    });

    grid.innerHTML = filtered.map(c => {
      const id = c.id || normalizeCharId(c.label || c.name);
      const label = c.label || c.name || id;
      const meta = [c.gender, c.role].filter(Boolean).join(' • ');
      const isOn = selectedCharacterIds.has(id);
      return `
        <div class="char-card ${isOn ? 'selected' : ''}" data-char-id="${escapeHtml(id)}">
          <input type="checkbox" ${isOn ? 'checked' : ''} tabindex="-1" />
          <div style="min-width:0">
            <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(label)}</div>
            <div style="font-size:12px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(meta)}</div>
          </div>
        </div>`;
    }).join('');

    count.textContent = String(selectedCharacterIds.size);

    // Bind click
    grid.querySelectorAll('.char-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-char-id');
        if (!id) return;
        if (selectedCharacterIds.has(id)) selectedCharacterIds.delete(id);
        else selectedCharacterIds.add(id);
        render();
      });
    });
  };

  search.addEventListener('input', render);

  btnAll.addEventListener('click', () => {
    const list = Array.isArray(data.characters) ? data.characters : [];
    list.forEach(c => {
      const id = c.id || normalizeCharId(c.label || c.name);
      if (id) selectedCharacterIds.add(id);
    });
    render();
  });

  btnClear.addEventListener('click', () => {
    selectedCharacterIds.clear();
    render();
  });

  // Lần đầu
  render();
}

// Khi load story từ JSON (substance), pre-select nhân vật đã có trong story.characters
function applyStoryCharacterSelection(storyObj) {
  try {
    const arr = Array.isArray(storyObj?.characters) ? storyObj.characters : [];
    if (!arr.length) return;

    const lookup = new Map();
    (Array.isArray(data.characters) ? data.characters : []).forEach(c => {
      const id = c.id || normalizeCharId(c.label || c.name);
      const label = (c.label || c.name || '').trim();
      if (id) lookup.set(label.toLowerCase(), id);
      if (id) lookup.set(id.toLowerCase(), id);
    });

    arr.forEach(nameOrId => {
      const key = String(nameOrId || '').trim().toLowerCase();
      const id = lookup.get(key) || normalizeCharId(nameOrId);
      if (id) selectedCharacterIds.add(id);
    });

    const count = document.getElementById('selected-count');
    if (count) count.textContent = String(selectedCharacterIds.size);

    // Re-render UI if present
    const grid = document.getElementById('participants-grid');
    if (grid) {
      // trigger render by dispatching input event
      const search = document.getElementById('char-search');
      if (search) search.dispatchEvent(new Event('input'));
    }
  } catch (e) {
    console.warn('[XNC] applyStoryCharacterSelection failed', e);
  }
}

