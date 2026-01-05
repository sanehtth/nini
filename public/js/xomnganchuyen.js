// public/js/xomnganchuyen.js

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
      const [chars, style, audio, faces, bgs, outfits, st, acts] = await Promise.all([
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
      state.queue.forEach(cb => cb());
      state.queue = [];
    } catch (e) {
      console.error("[XNC] Load failed:", e);
      state.loading = false;
    }
  }

  window.XNC = {
    setProfile: (id) => loadProfile(id || DEFAULT_PROFILE),
    ready: (cb) => { if (state.loaded) cb(); else state.queue.push(cb); },
    
    // TÊN HÀM PHẢI CHÍNH XÁC NHƯ SAU:
    getCharacters: () => state.data.characters, // Khớp với HTML đang gọi
    getCharacterList: () => state.data.characters, // Dự phòng cho trang khác
    
    getFaces: () => state.data.faces,
    getBackgrounds: () => state.data.backgrounds,
    getOutfits: () => state.data.outfits,
    getStates: () => state.data.states,
    getActions: () => state.data.actions,
    
    getSignaturesFor: (id) => {
      const c = state.data.characters.find(item => item.id === id);
      return c ? (c.signatures || []) : [];
    },
    getCurrentProfileId: () => state.profileId,
    buildCharacterPrompt: (opt) => { /* Giữ nguyên logic cũ của bạn */ }
  };
})(window);
