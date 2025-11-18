
// /admin/tools/makeprompt.js
// Tool chia lyric / kịch bản thành cảnh 5s và sinh prompt chi tiết.
// Chạy 100% trên trình duyệt, không gọi API.
// Đọc API đang dùng (đã set từ admin)
function getActiveProvider() {
  return localStorage.getItem("nini_active_provider") || "openai";
}

/* ========= Helper ========= */
const $ = id => document.getElementById(id);
const val = (id, d = "") => {
  const el = $(id);
  return el && "value" in el ? el.value : d;
};

// Lưu lại kết quả lần cuối để export JSON/TSV
let _lastScenes = [];

/* ========= Preset phong cách ========= */
const STYLE_PRESETS = {
  "3d_cinematic_warm":
    "stylized 3D cinematic animation, warm color grading, volumetric lighting, soft depth of field, highly detailed, rendered in 4K",
  "anime_soft":
    "anime style, soft film look, gentle lighting, rich colors, expressive faces, clean line art, high detail",
  "pixar_like":
    "Pixar-like 3D animation, charming stylized characters, soft global illumination, bouncy and lively, high quality render",
  "disney_like":
    "Disney-like animation, vibrant colors, expressive characters, fairytale atmosphere, cinematic lighting",
  "real_photo":
    "realistic cinematic photography, natural lighting, shallow depth of field, detailed textures, 35mm lens look",
  "vintage_film":
    "vintage film look, grainy texture, slightly faded colors, soft contrast, 35mm film, nostalgic mood"
};

/* ========= Preset camera + cảm xúc ========= */
const COMBO_PRESETS = {
  mix: [
    "establishing wide shot, shows the environment clearly, slow dolly movement, hopeful mood",
    "medium shot focusing on the main character, subtle handheld motion, introspective emotion",
    "close-up on the character’s face, shallow depth of field, emotional expression",
    "dynamic tracking shot following the character, energetic and adventurous mood"
  ],
  closeup_tender: [
    "intimate close-up shot, soft focus on the character’s face, very gentle camera movement, tender and emotional mood"
  ],
  wide_hopeful: [
    "wide cinematic shot, environment-focused composition, slow forward dolly, bright and hopeful mood"
  ],
  handheld_romance: [
    "handheld camera, slightly shaky but warm and intimate, medium shot distance, romantic and heartfelt mood"
  ]
};
//============== ham cap nhat provider & label API active ===================
function setActiveProvider(provider) {
  localStorage.setItem("nini_active_provider", provider);
}

function updateTranslateLabel() {
  const el = document.getElementById("translateLabel");
  const select = document.getElementById("mpProvider");

  const mapLabel = {
    openai: "OpenAI",
    gemini: "Google AI (Gemini)",
    grok: "Grok (xAI)"
  };

  const p = getActiveProvider();
  const name = mapLabel[p] || p;

  if (el) {
    el.textContent =
      "Dịch lyric / kịch bản sang tiếng Anh bằng " +
      name +
      " trước khi tạo prompt (tốn token).";
  }

  // đồng bộ dropdown nếu có
  if (select && select.value !== p) {
    select.value = p;
  }
}

function initProviderSelect() {
  const select = document.getElementById("mpProvider");
  if (!select) {
    // nếu không có select vẫn cập nhật label
    updateTranslateLabel();
    return;
  }

  // set giá trị ban đầu từ localStorage
  const current = getActiveProvider();
  select.value = current;

  select.addEventListener("change", () => {
    const value = select.value || "openai";
    setActiveProvider(value);
    updateTranslateLabel();
  });

  updateTranslateLabel();
}

// Gọi 1 lần khi load trang
initProviderSelect();


/* ========= Helper: map aspect → text cho prompt ========= */
function aspectToText(aspect) {
  if (!aspect) return "1:1 square";

  const a = String(aspect).toLowerCase().trim();

  // Một loạt trường hợp có thể xảy ra
  if (
    a.includes("1792x1024") ||
    a.includes("16:9") ||
    a.includes("landscape") ||
    a.includes("widescreen")
  ) {
    return "16:9 widescreen";
  }

  if (
    a.includes("1024x1792") ||
    a.includes("9:16") ||
    a.includes("vertical") ||
    a.includes("portrait")
  ) {
    return "9:16 vertical";
  }

  if (
    a.includes("1:1") ||
    a.includes("square") ||
    a.includes("1024x1024")
  ) {
    return "1:1 square";
  }

  // fallback: trả lại raw
  return aspect;
}

/* ========= Build scene list từ dữ liệu form ========= */
function buildScenesFromLyrics(data) {
  const rawText = (data.text || "").trim();
  const total = isNaN(data.total) || data.total <= 0 ? 60 : data.total;
  const step = isNaN(data.step) || data.step <= 0 ? 5 : data.step;

  // Tách lyric thành từng dòng có nội dung
  const lines = rawText
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  // Nếu không có lyric -> tạo 1 cảnh mô tả chung
  if (!lines.length) {
    return [
      {
        index: 1,
        start: 0,
        end: total,
        lyric: "(no lyric, general mood shot)",
        prompt: buildPromptForScene({
          idx: 1,
          lyric: "general wide shot that introduces the world and main character",
          styleKey: data.preset,
          comboKey: data.combo,
          aspect: data.aspect
        }),
        preset: data.preset,
        combo: data.combo,
        aspect: data.aspect
      }
    ];
  }

  const maxScenes = Math.max(1, Math.floor(total / step));
  // Số cảnh thực tế không cần nhiều hơn số line, nhưng cũng không ít hơn 1
  const sceneCount = Math.max(1, Math.min(maxScenes, lines.length));

  // Phân phối line vào từng cảnh cho tương đối đều
  const base = Math.floor(lines.length / sceneCount);
  let extra = lines.length % sceneCount;

  const scenes = [];
  let cursor = 0;

  for (let i = 0; i < sceneCount; i++) {
    let take = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;

    const part = lines.slice(cursor, cursor + take);
    cursor += take;

    const lyricChunk = part.join(" / ");

    const start = i * step;
    const end = Math.min(total, (i + 1) * step);

    const prompt = buildPromptForScene({
      idx: i + 1,
      lyric: lyricChunk,
      styleKey: data.preset,
      comboKey: data.combo,
      aspect: data.aspect
    });

    scenes.push({
      index: i + 1,
      start,
      end,
      lyric: lyricChunk,
      prompt,
      preset: data.preset,
      combo: data.combo,
      aspect: data.aspect
    });
  }

  return scenes;
}

/* ========= Build prompt cho 1 cảnh ========= */
function buildPromptForScene({ idx, lyric, styleKey, comboKey, aspect }) {
  const style = STYLE_PRESETS[styleKey] || "";
  const comboList = COMBO_PRESETS[comboKey] || COMBO_PRESETS.mix;
  const cameraMood = comboList[(idx - 1) % comboList.length];

  // *** ĐÃ SỬA: dùng helper aspectToText() thay vì so sánh cứng ***
  const ratioText = aspectToText(aspect);

  // Prompt cuối cùng – bạn có thể chỉnh template này theo Sora / Flow / v.v.
  const prompt = [
    `scene ${idx}, ${ratioText}`,
    lyric ? `visualize: ${lyric}` : "",
    cameraMood,
    style,
    "no text, no subtitles, no UI, high quality, detailed, coherent with previous shots"
  ]
    .filter(Boolean)
    .join(". ");

  return prompt;
}

/* ========= Hiển thị kết quả dạng text dễ copy ========= */
function renderScenesText(scenes) {
  if (!scenes.length) {
    $("output").textContent = "Chưa có dữ liệu cảnh.";
    return;
  }

  const lines = scenes.map(scene => {
    const t = `[${scene.start.toString().padStart(3, "0")}–${scene.end
      .toString()
      .padStart(3, "0")}s]  ${scene.prompt}`;
    return t;
  });

  $("output").textContent = lines.join("\n\n");
}

/* ========= Export JSON ========= */
function downloadJSON(scenes) {
  if (!scenes.length) return;
  const blob = new Blob([JSON.stringify(scenes, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "story_scenes.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ========= Export TSV (dễ import Excel / Google Sheets) ========= */
function downloadTSV(scenes) {
  if (!scenes.length) return;
  const header = ["index", "start", "end", "lyric", "prompt"].join("\t");
  const rows = scenes.map(s => {
    const lyricClean = (s.lyric || "").replace(/\s+/g, " ");
    const promptClean = (s.prompt || "").replace(/\s+/g, " ");
    return [s.index, s.start, s.end, lyricClean, promptClean].join("\t");
  });
  const tsv = [header, ...rows].join("\n");

  const blob = new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "story_scenes.tsv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =============  ham lay API openAI dich van ban =============

// ========= Ưu tiên lấy key từ input trên trang, nếu trống thì thử lấy từ localStorage
function getOpenAIKeyForMakePrompt() {
  const input = $("mpApiKey");
  if (input && input.value.trim()) return input.value.trim();

  // Thử lấy từ localStorage theo format bên Admin (đoán tên key)
  try {
    const raw =
      localStorage.getItem("apiProfiles") ||
      localStorage.getItem("api_profiles") ||
      "";
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const found = parsed.find(
          p =>
            p &&
            (p.provider === "openai" || p.provider === "OpenAI") &&
            p.apiKey
        );
        if (found) return found.apiKey;
      } else if (typeof parsed === "object") {
        for (const k in parsed) {
          const p = parsed[k];
          if (
            p &&
            (p.provider === "openai" || p.provider === "OpenAI") &&
            p.apiKey
          ) {
            return p.apiKey;
          }
        }
      }
    }
  } catch (e) {
    console.warn("Không đọc được apiProfiles từ localStorage:", e);
  }
  return "";
}
// =========Dịch 1 đoạn lyric / kịch bản từ VI -> EN bằng OpenAI ==============

async function translateLyricViToEn(text, apiKey) {
  const cleaned = (text || "").trim();
  if (!cleaned) return text;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a translator. Translate Vietnamese song lyrics or story fragments " +
              "into short, natural English descriptions that are suitable as prompts for " +
              "video scenes. Do NOT add explanation or numbering."
          },
          { role: "user", content: cleaned }
        ],
        max_tokens: 150,
        temperature: 0.3
      })
    });

    if (!res.ok) {
      console.error("OpenAI error:", await res.text());
      return text; // lỗi thì trả về bản gốc tiếng Việt
    }

    const data = await res.json();
    const out =
      data.choices?.[0]?.message?.content?.trim() ||
      text;

    return out;
  } catch (err) {
    console.error("Lỗi gọi OpenAI:", err);
    return text;
  }
}

// ==========  Bản async: nếu useTranslate = true thì dịch lyric từng cảnh sang EN  =======
//=========================================================================================
async function buildScenesFromLyricsAsync(data, { useTranslate, apiKey } = {}) {
  // Dùng logic cũ để chia line + tính thời gian
  const baseScenes = buildScenesFromLyrics(data);

  if (!useTranslate || !apiKey) {
    return baseScenes; // giữ nguyên (lyric có thể là tiếng Việt)
  }

  const out = [];
  for (const scene of baseScenes) {
    const lyricVi = scene.lyric || "";
    const lyricEn = await translateLyricViToEn(lyricVi, apiKey);

    // build lại prompt với lyricEn
    const promptEn = buildPromptForScene({
      idx: scene.index,
      lyric: lyricEn,
      styleKey: scene.preset,
      comboKey: scene.combo,
      aspect: scene.aspect
    });

    out.push({
      ...scene,
      lyric_en: lyricEn,
      prompt: promptEn
    });
  }
  return out;
}
//=================het phan lay API va dich van ban ================

/* ========= Gắn event ========= */
$("btnMakePrompt")?.addEventListener("click", async () => {
  const btn = $("btnMakePrompt");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Đang tạo...";
  }

  const data = {
    text: val("lyrics", ""),
    total: Number(val("dur", 180)),
    step: Number(val("item", 5)),
    preset: val("preset", "3d_cinematic_warm"),
    combo: val("combo", "mix"),
    aspect: val("aspect", "1792x1024")
  };

  const useTranslate = $("useTranslate")?.checked;
  let apiKey = "";
  if (useTranslate) {
    apiKey = getOpenAIKeyForMakePrompt();
    if (!apiKey) {
      alert(
        "Chưa có OpenAI API key.\n" +
          "- Vào trang Admin > Nhập API để lưu key, HOẶC\n" +
          "- Nhập key trực tiếp vào ô OpenAI API Key bên dưới."
      );
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Tạo prompt";
      }
      return;
    }
  }

  try {
    _lastScenes = await buildScenesFromLyricsAsync(data, {
      useTranslate,
      apiKey
    });
    renderScenesText(_lastScenes);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Tạo prompt";
    }
  }
});


$("btnJSON")?.addEventListener("click", () => {
  if (!_lastScenes.length) {
    alert("Chưa có cảnh nào. Hãy bấm 'Tạo prompt' trước.");
    return;
  }
  downloadJSON(_lastScenes);
});

$("btnTSV")?.addEventListener("click", () => {
  if (!_lastScenes.length) {
    alert("Chưa có cảnh nào. Hãy bấm 'Tạo prompt' trước.");
    return;
  }
  downloadTSV(_lastScenes);
});

