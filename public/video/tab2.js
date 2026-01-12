/* =====================================================
   XNC – FRAME EDITOR CORE (STABLE)
   Mục tiêu:
   - Chỉnh từng frame
   - Next / Prev frame
   - Save local
   - Export / Import JSON nguồn
===================================================== */

/* =========================
   GLOBAL STATE
========================= */
const appState = {
  project: null,
  currentSceneIndex: 0,
  currentFrameIndex: 0
};

/* =========================
   HELPERS
========================= */
const qs = (id) => document.getElementById(id);

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* =========================
   PROJECT INIT (MẪU)
========================= */
function createEmptyProject() {
  return {
    id: `xnc_${Date.now()}`,
    name: 'Untitled Project',
    updatedAt: Date.now(),

    video: {
      ratio: '9:16',
      fps: 24,
      globalStyle: 'cinematic cartoon vietnam'
    },

    scenes: [
      {
        id: 'S1',
        frames: [
          createEmptyFrame(1)
        ]
      }
    ]
  };
}

function createEmptyFrame(index) {
  return {
    id: `F${index}`,
    duration: 3,
    characters: [],
    background: '',
    camera: '',
    emotion: '',
    action: '',
    style: '',
    notes: ''
  };
}

/* =========================
   LOAD / SAVE PROJECT
========================= */
function saveProjectLocal() {
  if (!appState.project) return;

  appState.project.updatedAt = Date.now();
  localStorage.setItem(
    `xnc_project_${appState.project.id}`,
    JSON.stringify(appState.project)
  );

  alert('Đã lưu project (local)');
}

function exportProjectJSON() {
  if (!appState.project) return;

  downloadJSON(
    {
      version: '1.0',
      project: appState.project
    },
    `${appState.project.id}.json`
  );
}

function importProjectJSON(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.project || !data.project.scenes) {
        alert('JSON không đúng định dạng project');
        return;
      }

      appState.project = data.project;
      appState.currentSceneIndex = 0;
      appState.currentFrameIndex = 0;

      renderFrame();
      alert('Import project thành công');
    } catch (e) {
      alert('Không đọc được file JSON');
    }
  };

  reader.readAsText(file);
}

/* =========================
   FRAME NAVIGATION
========================= */
function getCurrentScene() {
  return appState.project.scenes[appState.currentSceneIndex];
}

function getCurrentFrame() {
  const scene = getCurrentScene();
  return scene.frames[appState.currentFrameIndex];
}

function nextFrame() {
  const scene = getCurrentScene();
  if (appState.currentFrameIndex < scene.frames.length - 1) {
    appState.currentFrameIndex++;
    renderFrame();
  }
}

function prevFrame() {
  if (appState.currentFrameIndex > 0) {
    appState.currentFrameIndex--;
    renderFrame();
  }
}

function addFrame() {
  const scene = getCurrentScene();
  const idx = scene.frames.length + 1;
  scene.frames.push(createEmptyFrame(idx));
  appState.currentFrameIndex = scene.frames.length - 1;
  renderFrame();
}

/* =========================
   FRAME EDITOR
========================= */
function renderFrame() {
  if (!appState.project) return;

  const frame = getCurrentFrame();

  qs('frameIndexLabel').textContent =
    `Frame ${appState.currentFrameIndex + 1}`;

  qs('frameDuration').value = frame.duration;
  qs('frameBackground').value = frame.background;
  qs('frameCamera').value = frame.camera;
  qs('frameEmotion').value = frame.emotion;
  qs('frameAction').value = frame.action;
  qs('frameStyle').value = frame.style;
  qs('frameNotes').value = frame.notes;
}

function bindFrameEditor() {
  const frame = getCurrentFrame();
  if (!frame) return;

  frame.duration = Number(qs('frameDuration').value);
  frame.background = qs('frameBackground').value;
  frame.camera = qs('frameCamera').value;
  frame.emotion = qs('frameEmotion').value;
  frame.action = qs('frameAction').value;
  frame.style = qs('frameStyle').value;
  frame.notes = qs('frameNotes').value;
}

/* =========================
   UI BINDING
========================= */
function bindUI() {
  qs('saveLocalBtn').onclick = saveProjectLocal;
  qs('exportJsonBtn').onclick = exportProjectJSON;

  qs('importJsonBtn').onclick = () => {
    qs('importJsonInput').click();
  };

  qs('importJsonInput').onchange = (e) => {
    if (e.target.files[0]) {
      importProjectJSON(e.target.files[0]);
    }
  };

  qs('nextFrameBtn').onclick = nextFrame;
  qs('prevFrameBtn').onclick = prevFrame;
  qs('addFrameBtn').onclick = addFrame;

  [
    'frameDuration',
    'frameBackground',
    'frameCamera',
    'frameEmotion',
    'frameAction',
    'frameStyle',
    'frameNotes'
  ].forEach(id => {
    qs(id).oninput = bindFrameEditor;
  });
}

/* =========================
   INIT
========================= */
function init() {
  appState.project = createEmptyProject();
  bindUI();
  renderFrame();
  console.log('[XNC] Frame editor ready');
}

document.addEventListener('DOMContentLoaded', init);
