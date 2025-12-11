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
      audio: {}
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
    const [charactersRaw, styleRaw, audioRaw] = await Promise.all([
      fetchJson(`${base}/XNC_characters.json`),
      fetchJson(`${base}/XNC_style.json`),
      fetchJson(`${base}/XNC_audio.json`).catch(() => ({}))
    ]);

    // Chấp nhận cả dạng array thuần hoặc {characters:[...]}
    const characters = Array.isArray(charactersRaw)
      ? charactersRaw
      : charactersRaw.characters || [];

    const style = styleRaw || {};
    const audio = audioRaw || {};

    state.data.characters = characters;
    state.data.style = style;
    state.data.audio = audio;

    state.loaded = true;
    state.loading = false;

    // chạy các callback đã xếp hàng
    state.queue.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
    state.queue = [];
    log("Profile loaded:", profileId);
  }

  // =========== PUBLIC API ===========

  const XNC = {
    /**
     * Đặt / đổi profile ADN (vd: "xomnganchuyen", "series2", ...)
     * return Promise khi load xong
     */
    setProfile(profileId) {
      if (!profileId) profileId = DEFAULT_PROFILE;
      // nếu trùng profile hiện tại và đã load rồi thì thôi
      if (state.loaded && state.profileId === profileId) {
        return Promise.resolve();
      }
      return loadProfile(profileId);
    },

    /**
     * Đảm bảo profile đã load rồi mới chạy callback
     */
    ready(cb) {
      if (state.loaded && !state.loading) {
        cb();
      } else {
        state.queue.push(cb);
        if (!state.loading) {
          // chưa từng load => load profile mặc định
          loadProfile(state.profileId).catch((e) =>
            console.error("Load default profile failed:", e)
          );
        }
      }
    },

    getCurrentProfileId() {
      return state.profileId;
    },

    getCharacterList() {
      return state.data.characters || [];
    },

    getSignaturesFor(characterId) {
      const chars = state.data.characters || [];
      const c = chars.find((c) => c.id === characterId);
      if (!c) return [];
      return c.signatures || [];
    },

    /**
     * Xây prompt mô tả cảnh nhân vật, đã cài sẵn vibe/style của ADN
     * options:
     *   - characterId
     *   - signatureId?
     *   - actionText
     *   - emotionKey
     *   - contextText
     *   - cameraKey?
     *   - lightingKey?
     *   - extraMood?
     */
    buildCharacterPrompt(options) {
      const {
        characterId,
        signatureId,
        actionText,
        emotionKey,
        contextText,
        cameraKey,
        lightingKey,
        extraMood
      } = options;

      const chars = state.data.characters || [];
      const style = state.data.style || {};

      const character = chars.find((c) => c.id === characterId) || {};
      const signature =
        (character.signatures || []).find((s) => s.id === signatureId) || null;

      const styleTags = style.tags || [
        "Vietnamese primary school",
        "chibi 2D",
        "pastel colors",
        "green and brown palette"
      ];

      const cameraDesc =
        cameraKey === "closeup"
          ? "close-up shot of the character"
          : cameraKey === "medium"
          ? "medium shot showing the character and some background"
          : cameraKey === "dramatic_low"
          ? "slightly low angle for a dramatic feel"
          : cameraKey === "comedy_zoom"
          ? "slight zoom-in for comedic timing"
          : "";

      const lightingDesc =
        lightingKey === "school_daylight"
          ? "soft daylight coming from classroom windows"
          : "";

      const baseLines = [];

      baseLines.push(
        `Chibi 2D illustration in the ${state.profileId} Vietnamese style, ${styleTags.join(
          ", "
        )}.`
      );

      baseLines.push(
        `Scene: ${contextText}. The main action: ${actionText}.`
      );

      if (character.name) {
        baseLines.push(
          `Main character: ${character.name} (${character.role ||
            "student"}).`
        );
      }

      if (signature && signature.prompt) {
        baseLines.push(`Signature behavior: ${signature.prompt}.`);
      }

      if (emotionKey) {
        let emoText = "";
        switch (emotionKey) {
          case "happy":
            emoText = "overall mood is happy and warm";
            break;
          case "comedy":
            emoText =
              "overall mood is comedic and light-hearted, expressions slightly exaggerated but still cute";
            break;
          case "warm":
            emoText = "overall mood is cozy and heartwarming";
            break;
          case "drama":
            emoText = "overall mood is dramatic and slightly tense";
            break;
          case "twist":
            emoText = "overall mood is surprising, with a twist reveal";
            break;
          case "embarrassed":
            emoText =
              "overall mood is shy and embarrassed, blushing cheeks, awkward expression";
            break;
        }
        if (emoText) baseLines.push(emoText + ".");
      }

      if (cameraDesc) baseLines.push(cameraDesc + ".");
      if (lightingDesc) baseLines.push(lightingDesc + ".");
      if (extraMood) baseLines.push(extraMood);

      return baseLines.join(" ");
    }
  };

  window.XNC = XNC;
})(window);
