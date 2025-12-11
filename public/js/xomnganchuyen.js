// js/xomnganchuyen.js
// ADN Xóm Ngàn Chuyện – loader + helper dùng chung cho mọi tool

(function (window) {
  const XNC = {
    // Dữ liệu ADN
    characters: null,
    style: null,
    audio: null,

    // Trạng thái load
    _loaded: false,
    _loadingPromise: null,
    _queue: [],

    // Đường dẫn base tới JSON (tính từ /public/)
    _basePath: "adn/xomnganchuyen/",

    // Khởi động load (chỉ gọi 1 lần, tự động nếu dùng XNC.ready)
    load() {
      if (this._loadingPromise) return this._loadingPromise;

      const base = this._basePath;

      this._loadingPromise = Promise.all([
        fetch(base + "XNC_characters.json").then(r => r.json()),
        fetch(base + "XNC_style.json").then(r => r.json()),
        fetch(base + "XNC_audio.json").then(r => r.json())
      ])
        .then(([c, s, a]) => {
          this.characters = c.characters || {};
          this.style = s.style || {};
          this.audio = a.audio || {};
          this._loaded = true;

          // chạy các callback đã đăng ký trước khi load xong
          this._queue.forEach(fn => {
            try { fn(); } catch (e) { console.error(e); }
          });
          this._queue = [];
        })
        .catch(err => {
          console.error("[XNC] Lỗi load ADN Xóm Ngàn Chuyện:", err);
        });

      return this._loadingPromise;
    },

    /**
     * XNC.ready(fn)
     * Dùng ở HTML: đảm bảo ADN đã load trước khi thao tác UI.
     */
    ready(fn) {
      if (this._loaded) {
        fn();
      } else {
        this._queue.push(fn);
        this.load();
      }
    },

    // =========================
    //  GETTER CƠ BẢN
    // =========================

    getCharacters() {
      return this.characters || {};
    },

    getCharacter(id) {
      return (this.characters && this.characters[id]) || null;
    }

    ,
    getStyle() {
      return this.style || {};
    },

    getAudio() {
      return this.audio || {};
    },

    // =========================
    //  CHARACTER & SIGNATURES
    // =========================

    /**
     * Lấy danh sách nhân vật dạng:
     * [{ id: "bolo", name: "Bô-lô", role: "Thánh soi" }, ...]
     */
    getCharacterList() {
      const list = [];
      const chars = this.getCharacters();
      Object.keys(chars).forEach(id => {
        const c = chars[id];
        list.push({
          id,
          name: c.name || id,
          role: c.role || ""
        });
      });
      return list;
    },

    /**
     * Lấy danh sách biểu cảm / hành vi đặc trưng cho 1 nhân vật:
     * [{ id, label, desc }, ...]
     */
    getSignaturesFor(characterId) {
      const c = this.getCharacter(characterId);
      if (!c || !Array.isArray(c.signatures)) return [];
      return c.signatures;
    },

    /**
     * Lấy mô tả (desc) cho 1 signature cụ thể.
     */
    getSignatureDesc(characterId, signatureId) {
      const list = this.getSignaturesFor(characterId);
      const found = list.find(s => s.id === signatureId);
      return found ? found.desc : "";
    },

    // =========================
    //  STYLE – COLOR / CAMERA / LIGHT
    // =========================

    /**
     * Lấy màu theo emotion key, fallback về brand green.
     */
    getEmotionColor(emotionKey) {
      const style = this.getStyle();
      if (!style || !style.emotion_tone_map) {
        return "#8CCB7A"; // fallback
      }
      return (
        style.emotion_tone_map[emotionKey] ||
        (style.brand_palette && style.brand_palette.green_primary) ||
        "#8CCB7A"
      );
    },

    /**
     * Lấy preset camera (text mô tả).
     */
    getCameraPreset(key) {
      const style = this.getStyle();
      if (!style || !style.camera) return "";
      return style.camera[key] || "";
    },

    /**
     * Lấy preset lighting (text mô tả).
     */
    getLightingPreset(key) {
      const style = this.getStyle();
      if (!style || !style.lighting) return "";
      return style.lighting[key] || "";
    },

    // =========================
    //  AUDIO – BGM / SFX
    // =========================

    /**
     * Lấy BGM theo key.
     * Trả về object { desc, ideal_for } hoặc {}.
     */
    getBgm(key) {
      const audio = this.getAudio();
      if (!audio || !audio.bgm) return {};
      return audio.bgm[key] || {};
    },

    /**
     * Lấy mô tả SFX theo key.
     */
    getSfx(key) {
      const audio = this.getAudio();
      if (!audio || !audio.sfx) return "";
      return audio.sfx[key] || "";
    },

    // =========================
    //  HELPER TẠO PROMPT
    // =========================

    /**
     * buildCharacterPrompt(options)
     *   options = {
     *      characterId,
     *      signatureId,
     *      actionText,    // hành động thêm bạn mô tả
     *      emotionKey,    // happy / drama / comedy...
     *      contextText,   // bối cảnh
     *      cameraKey,     // closeup / medium / dramatic_low...
     *      lightingKey,   // soft_pastel / school_daylight...
     *      extraMood     // mô tả mood chi tiết thêm
     *   }
     *
     * Trả về 1 string prompt tiếng Anh, đúng ADN XNC.
     */
    buildCharacterPrompt(options = {}) {
      const {
        characterId,
        signatureId,
        actionText = "",
        emotionKey = "happy",
        contextText = "",
        cameraKey = "",
        lightingKey = "",
        extraMood = ""
      } = options;

      const character = this.getCharacter(characterId) || {};
      const charName = character.name || "a Vietnamese primary school kid";

      const signatureDesc = signatureId
        ? this.getSignatureDesc(characterId, signatureId)
        : "";

      const emotionColor = this.getEmotionColor(emotionKey);
      const cameraDesc = cameraKey ? this.getCameraPreset(cameraKey) : "";
      const lightDesc = lightingKey ? this.getLightingPreset(lightingKey) : "";

      const actionBlock = [actionText, signatureDesc]
        .filter(Boolean)
        .join(" ");

      const moodBlock = [extraMood, `dominant color tint ${emotionColor}`]
        .filter(Boolean)
        .join(", ");

      // Prompt chung cho hình XNC (chibi 2D)
      let prompt = `Chibi 2D illustration in the Xóm Ngàn Chuyện Vietnamese style, pastel colors, green & brown brand palette.`;

      if (contextText) {
        prompt += ` Scene: ${contextText}.`;
      }

      prompt += ` Main character: ${charName}.`;

      if (actionBlock) {
        prompt += ` Expression & action: ${actionBlock}.`;
      }

      if (cameraDesc) {
        prompt += ` Camera: ${cameraDesc}.`;
      }

      if (lightDesc || moodBlock) {
        prompt += ` Lighting & mood: ${[lightDesc, moodBlock].filter(Boolean).join(", ")}.`;
      }

      return prompt.trim();
    }
  };

  // Gắn vào window để HTML dùng
  window.XNC = XNC;
})(window);
