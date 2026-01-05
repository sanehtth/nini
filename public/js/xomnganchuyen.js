(function (window) {
  const DEFAULT_PROFILE = "xomnganchuyen";
  const BASE_PATH = "/adn";

  let state = {
    profileId: DEFAULT_PROFILE,
    loading: false,
    loaded: false,
    queue: [],
    data: {
      characters: [],
      style: {},
      audio: {},
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
      // Nạp đồng thời tất cả các file ADN
      const [
        chars, style, audio, 
        faces, bgs, outfits, 
        st, acts
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

      state.data.characters = Array.isArray(chars) ? chars : (chars.characters || []);
      state.data.style = style || {};
      state.data.audio = audio || {};
      state.data.faces = faces.faces || [];
      state.data.backgrounds = bgs.backgrounds || [];
      state.data.outfits = outfits.outfits || [];
      state.data.states = st.states || [];
      state.data.actions = acts.actions || [];

      state.loaded = true;
      state.loading = false;
      log("ADN Profile Loaded hoàn tất:", profileId);

      state.queue.forEach(cb => cb());
      state.queue = [];
    } catch (e) {
      log("Load profile lỗi:", e);
      state.loading = false;
    }
  }

  // --- PUBLIC API ---
  const XNC = {
    // 1. Quản lý Profile
    setProfile(id) {
      return loadProfile(id || DEFAULT_PROFILE);
    },
    ready(cb) {
      if (state.loaded) cb(); else state.queue.push(cb);
    },
    getCurrentProfileId: () => state.profileId,

    // 2. Getters cho Listbox (Dữ liệu mới và cũ)
    getCharacterList: () => state.data.characters,
    getFaces: () => state.data.faces,
    getBackgrounds: () => state.data.backgrounds,
    getOutfits: () => state.data.outfits,
    getStates: () => state.data.states,
    getActions: () => state.data.actions,
    getStyle: () => state.data.style,

    // 3. Logic lấy Signature theo nhân vật (Hàm cũ quan trọng)
    getSignaturesFor(characterId) {
      const char = state.data.characters.find(c => c.id === characterId);
      return char ? (char.signatures || []) : [];
    },

    // 4. Hàm xây dựng Prompt (Hàm xử lý chính từ file gốc của bạn)
    buildCharacterPrompt(options) {
      const {
        characterId, signatureId, actionText, emotionKey,
        contextText, cameraKey, lightingKey, extraMood
      } = options;

      const character = state.data.characters.find(c => c.id === characterId) || {};
      const signature = (character.signatures || []).find(s => s.id === signatureId) || null;
      const styleTags = state.data.style.tags || ["Vietnamese chibi 2D", "pastel"];

      const baseLines = [
        `Style: ${styleTags.join(", ")}.`,
        `Scene: ${contextText}. Action: ${actionText}.`,
        `Character: ${character.name || "Unknown"}.`
      ];

      if (signature && signature.prompt) baseLines.push(`Behavior: ${signature.prompt}.`);
      
      // Logic xử lý Camera
      if (cameraKey) {
        const camMap = { 
          closeup: "close-up shot", 
          medium: "medium shot", 
          dramatic_low: "low angle view" 
        };
        baseLines.push(camMap[cameraKey] || "");
      }

      // Logic xử lý Emotion (Mood)
      if (emotionKey) {
        const emoMap = {
          happy: "warm and happy mood",
          comedy: "comedic and light-hearted style",
          drama: "tense and dramatic atmosphere"
        };
        baseLines.push(emoMap[emotionKey] || "");
      }

      if (extraMood) baseLines.push(extraMood);
      return baseLines.filter(l => l).join(" ");
    }
  };

  window.XNC = XNC;
})(window);
