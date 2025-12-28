// public/js/character.js
(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    tab: "style",
    data: null,
    fileName: "",
  };

  function getBasePath() {
    const folder = $("seriesFolder").value.trim();
    const prefix = $("filePrefix").value.trim() || "XNC";
    return { folder, prefix, base: `/adn/${folder}` };
  }

  function fileForTab(tab) {
    const { prefix } = getBasePath();
    // đồng bộ naming số nhiều như repo của bạn
    switch (tab) {
      case "style": return `${prefix}_style.json`;
      case "backgrounds": return `${prefix}_backgrounds.json`;
      case "characters": return `${prefix}_characters.json`;
      case "outfits": return `${prefix}_outfits.json`;
      default: return `${prefix}_style.json`;
    }
  }

  function helperText(tab) {
    if (tab === "outfits") {
      return `
<b>Schema gợi ý cho Outfit</b><br/>
- <code>category</code>: "uniform" | "personal" | "event"<br/>
- <code>priority</code>: uniform=100, personal=10...<br/>
- <code>allow_signature_color</code>: uniform=false, personal=true<br/>
- <code>variants</code>: male/female (base_desc_vi hoặc base_desc_en)<br/>
- <code>fit_overrides</code>: chubby...<br/><br/>
<b>Rule ưu tiên</b>: nếu scene/state yêu cầu đi học → chọn outfit có <code>category="uniform"</code> và <code>priority</code> cao nhất.
      `.trim();
    }
    if (tab === "characters") {
      return `
<b>Character</b><br/>
Giữ signature trong character: kính / cuốn lô / nơ / body_type (chubby).<br/>
Màu signature để trong character; đồng phục thì không nhuộm theo màu cá nhân.
      `.trim();
    }
    if (tab === "backgrounds") {
      return `
<b>Backgrounds</b><br/>
Mỗi item nên có: id, name, tags, prompt_vi/prompt_en, notes.
      `.trim();
    }
    return `
<b>Style</b><br/>
Là bảng định nghĩa tone màu, nét vẽ, chất liệu, layout… dùng chung cho cả series.
    `.trim();
  }

  async function loadCurrent() {
    const { base } = getBasePath();
    const file = fileForTab(state.tab);
    const url = `${base}/${file}`;
    state.fileName = file;

    $("currentFile").textContent = url;
    $("status").innerHTML = `Đang load: <code>${url}</code>`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // pretty print nếu parse được
      try {
        const obj = JSON.parse(text);
        state.data = obj;
        $("jsonEditor").value = JSON.stringify(obj, null, 2);
      } catch {
        state.data = null;
        $("jsonEditor").value = text;
      }
      $("status").innerHTML = `<span class="ok">OK</span> Loaded <code>${file}</code>`;
      $("helper").innerHTML = helperText(state.tab);
      $("validateMsg").textContent = "";
    } catch (e) {
      $("status").innerHTML =
        `<span class="err">Lỗi load</span>: <code>${url}</code> (${String(e.message || e)})<br/>
         Kiểm tra: file có tồn tại trong <code>public/adn/${getBasePath().folder}/</code> không?`;
      $("jsonEditor").value = "";
      $("helper").innerHTML = helperText(state.tab);
    }
  }

  function validateJSON() {
    const raw = $("jsonEditor").value.trim();
    if (!raw) {
      $("validateMsg").innerHTML = `<span class="err">Editor đang trống</span>`;
      return false;
    }
    try {
      const obj = JSON.parse(raw);
      $("validateMsg").innerHTML = `<span class="ok">JSON hợp lệ</span>`;
      state.data = obj;
      return true;
    } catch (e) {
      $("validateMsg").innerHTML = `<span class="err">JSON lỗi</span>: ${String(e.message || e)}`;
      return false;
    }
  }

  function downloadJSON() {
    if (!validateJSON()) return;
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = state.fileName || "export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  function setActiveTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tabbtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    loadCurrent();
  }

  // events
  document.querySelectorAll(".tabbtn").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });
  $("btnReload").addEventListener("click", loadCurrent);
  $("btnValidate").addEventListener("click", validateJSON);
  $("btnDownload").addEventListener("click", downloadJSON);

  // init
  loadCurrent();
})();
