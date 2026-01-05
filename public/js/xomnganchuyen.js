// public/js/xomnganchuyen.js

(function (window) {
  const DEFAULT_PROFILE = "xomnganchuyen";
  const BASE_PATH = "/adn"; // thư mục chứa các profile

  let state = {
    profileId: DEFAULT_PROFILE,
    loading: false,
    loaded: false,
    queue: [],
    data: {
      characters: [],
      style: {},
      audio: {},
      // Mở rộng thêm các ngăn chứa mới
      faces: [],
      backgrounds: [],
      outfits: [],
      states: [],
      actions: []
    }
  };

  function log(...args) {
    console.log("[XNC]", ...args);
  }

  async function fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error("Fetch failed: " + path);
    return res.json();
  }

  async function loadProfile(profileId) {
    state.loading = true;
    state.loaded = false;
    state.profileId = profileId;

    const base = `${BASE_PATH}/${profileId}`;
    
    try {
      // Nạp tất cả các file cùng lúc. Các file mới có .catch để trang cũ không bị lỗi nếu thiếu file.
      const [
        charactersRaw, styleRaw, audioRaw,
        facesRaw, backgroundsRaw, outfitsRaw,
        statesRaw, actionsRaw
      ] = await Promise.all([
        fetchJson(`${base}/XNC_characters.json`),
        fetchJson(`${base}/XNC_style.json`),
        fetchJson(`${base}/XNC_audio.json`).catch(() => ({})),
        fetchJson(`${base}/XNC_faces.json`).catch(() => ({ faces: [] })),
        fetchJson(`${base}/XNC_backgrounds.json`).catch(() => ({ backgrounds: [] })),
        fetchJson(`${base}/XNC_outfits.json`).catch(() => ({ outfits: [] })),
        fetchJson(`${base}/XNC_states.json`).catch(() => ({ states: [] })),
        fetchJson(`${base}/XNC_actions.json`).catch(() => ({ actions: [] }))
      ]);

      // Xử lý dữ liệu gốc (đảm bảo tính tương thích ngược)
      state.data.characters = Array.isArray(charactersRaw) ? charactersRaw : (charactersRaw.characters || []);
      state.data.style = styleRaw || {};
      state.data.audio = audioRaw || {};

      // Cập nhật dữ liệu mới cho trang Prompt Video
      state.data.faces = facesRaw.faces || [];
      state.data.backgrounds = backgroundsRaw.backgrounds || [];
      state.data.outfits = outfitsRaw.outfits || [];
      state.data.states = statesRaw.states || [];
      state.data.actions = actionsRaw.actions || [];

      state.loaded = true;
      state.loading = false;

      // Chạy các callback đang đợi
      state.queue.forEach((cb) => {
        try { cb(); } catch (e) { console.error(e); }
      });
      state.queue = [];
      log("Profile loaded với đầy đủ dữ liệu ADN:", profileId);
    } catch (e) {
      console.error("[XNC] Load profile failed:", e);
      state.loading = false;
    }
  }

  // =========== PUBLIC API (XNC) ===========
  const XNC = {
    setProfile(profileId) {
      if (!profileId) profileId = DEFAULT_PROFILE;
      if (state.loaded && state.profileId === profileId) return Promise.resolve();
      return loadProfile(profileId);
    },

    ready(cb) {
      if (state.loaded && !state.loading) {
        cb();
      } else {
        state.queue.push(cb);
        if (!state.loading) {
          loadProfile(state.profileId).catch((e) => log("Load default failed:", e));
        }
      }
    },

    // --- CÁC HÀM GETTERS CŨ (Giữ để không hỏng trang khác) ---
    getCurrentProfileId: () => state.profileId,
    getCharacterList: () => state.data.characters || [],
    getSignaturesFor(characterId) {
      const c = (state.data.characters || []).find((c) => c.id === characterId);
      return c ? (c.signatures || []) : [];
    },
    getStyle: () => state.data.style,

    // --- CÁC HÀM GETTERS MỚI (Cho trang Prompt Video của bạn) ---
    getFaces: () => state.data.faces || [],
    getBackgrounds: () => state.data.backgrounds || [],
    getOutfits: () => state.data.outfits || [],
    getStates: () => state.data.states || [],
    getActions: () => state.data.actions || [],

    // --- HÀM BUILD PROMPT GỐC (Giữ nguyên logic cũ) ---
    buildCharacterPrompt(options) {
      const { characterId, signatureId, actionText, emotionKey, contextText, cameraKey, lightingKey, extraMood } = options;
      const character = (state.data.characters || []).find((c) => c.id === characterId) || {};
      const signature = (character.signatures || []).find((s) => s.id === signatureId) || null;
      const styleTags = state.data.style.tags || ["Vietnamese primary school", "chibi 2D", "pastel colors"];

      const cameraDesc = cameraKey === "closeup" ? "close-up shot" : cameraKey === "medium" ? "medium shot" : "";
      const baseLines = [
        `Chibi 2D in ${state.profileId} style, ${styleTags.join(", ")}.`,
        `Scene: ${contextText}. Action: ${actionText}.`,
        character.name ? `Character: ${character.name} (${character.role}).` : ""
      ];

      if (signature && signature.prompt) baseLines.push(`Signature: ${signature.prompt}.`);
      if (emotionKey) baseLines.push(`Mood: ${emotionKey}.`);
      if (cameraDesc) baseLines.push(cameraDesc + ".");
      if (extraMood) baseLines.push(extraMood);

      return baseLines.filter(l => l).join(" ");
    }
  };

  window.XNC = XNC;
})(window);
