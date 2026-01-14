// tab2.js
window.storyB = { id: null, frames: [] };

document.getElementById('btnLoadLocalA').onclick = () => {
  if (!window.storyA) return alert('Chưa có Story A');

  storyB.id = storyA.id;
  storyB.frames = storyA.dialogues.map((d, i) => ({
    index: i,
    scene_id: d.scene_id,
    character: d.character,
    dialogue: d.text
  }));

  console.log('[TAB2] Frames created', storyB.frames);
};

document.getElementById('btnSaveLocalB').onclick = () => {
  localStorage.setItem(
    'storyB_' + storyB.id,
    JSON.stringify(storyB)
  );
  alert('Đã lưu tạm Story B');
};

document.getElementById('btnExportB').onclick = () => {
  const blob = new Blob(
    [JSON.stringify(storyB, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = storyB.id + '_frames.json';
  a.click();
};
