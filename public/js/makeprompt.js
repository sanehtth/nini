// =====================
// MakePrompt.js FULL VERSION
// =====================

/* ========= Helper ========= */
const $ = id => document.getElementById(id);
const val = (id, d = "") => {
  const el = $(id);
  return el && "value" in el ? el.value : d;
};

// Lưu lại kết quả lần cuối để export JSON/TSV
let _lastScenes = [];

/* ========= API ACTIVE: LOAD & SAVE ========= */

// Load API active khi mở trang
function loadActiveAPI() {
  const current = localStorage.getItem("ACTIVE_API") || "openai";
  $("activeAPI").value = current;

  const key = localStorage.getItem("API_KEY_" + current.toUpperCase());
  if (key) {
    $("apiKeyPreview").textContent = "Key: " + key.substring(0, 8) + "...";
  } else {
    $("apiKeyPreview").textContent = "(chưa có API key)";
  }
}

function saveActiveAPI() {
  const api = $("activeAPI").value;
  localStorage.setItem("ACTIVE_API", api);

  const key = localStorage.getItem("API_KEY_" + api.toUpperCase());
  $("apiKeyPreview").textContent = key
    ? "Key: " + key.substring(0, 8) + "..."
    : "(chưa có API key)";
}

// chạy khi load trang
window.addEventListener("load", loadActiveAPI);

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

/* ========= Build cảnh từ lyric ========= */
function buildScenesFromLyrics(data) {
  const rawText = (data.text || "").trim();
  const total = isNaN(data.total) || data.total <= 0 ? 60 : data.total;
  const step = isNaN(data.step) || data.step <= 0 ? 5 : data.step;

  const lines = rawText
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

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
  const sceneCount = Math.max(1, Math.min(maxScenes, lines.length));

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

/* ========= Tạo prompt cho từng cảnh ========= */
function buildPromptForScene({ idx, lyric, styleKey, comboKey, aspect }) {
  const style = STYLE_PRESETS[styleKey] || "";
  const comboList = COMBO_PRESETS[comboKey] || COMBO_PRESETS.mix;
  const cameraMood = comboList[(idx - 1) % comboList.length];

  const ratioText =
    aspect === "1792x1024"
      ? "16:9 landscape"
      : aspect === "1024x1792"
      ? "9:16 vertical"
      : "1:1 square";

  return [
    `scene ${idx}, ${ratioText}`,
    lyric ? `visualize: ${lyric}` : "",
    cameraMood,
    style,
    "no text, no subtitles, no UI, high quality, detailed, coherent with previous shots"
  ]
    .filter(Boolean)
    .join(". ");
}

/* ========= Xuất kết quả ra ô text ========= */
function renderScenesText(scenes) {
  if (!scenes.length) {
    $("output").textContent = "Chưa có dữ liệu cảnh.";
    return;
  }

  const lines = scenes.map(scene => {
    return `[${scene.start.toString().padStart(3, "0")}–${scene.end
      .toString()
      .padStart(3, "0")}s]  ${scene.prompt}`;
  });

  $("output").textContent = lines.join("\n\n");
}

/* ========= Export JSON ========= */
function downloadJSON(scenes) {
  const blob = new Blob([JSON.stringify(scenes, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "story_scenes.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ========= Export TSV ========= */
function downloadTSV(scenes) {
  const header = ["index", "start", "end", "lyric", "prompt"].join("\t");
  const rows = scenes.map(s => {
    return [
      s.index,
      s.start,
      s.end,
      s.lyric.replace(/\s+/g, " "),
      s.prompt.replace(/\s+/g, " ")
    ].join("\t");
  });
  const blob = new Blob([header + "\n" + rows.join("\n")], {
    type: "text/tab-separated-values;charset=utf-8"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "story_scenes.tsv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ========= Dịch bằng API active nếu cần ========= */
async function translateIfNeeded(text) {
  if (!$("chkTranslate")?.checked) return text;

  const api = localStorage.getItem("ACTIVE_API") || "openai";
  const key = localStorage.getItem("API_KEY_" + api.toUpperCase());

  if (!key) {
    alert("Bạn chưa nhập API key cho: " + api);
    return text;
  }

  try {
    if (api === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Translate this text to natural English" },
            { role: "user", content: text }
          ]
        })
      }).then(r => r.json());

      return res.choices?.[0]?.message?.content || text;
    }

    if (api === "google") {
      alert("Google Gemini chưa hỗ trợ dịch ở chế độ này.");
      return text;
    }

    if (api === "grok") {
      alert("Grok chưa hỗ trợ dịch tốt tiếng Việt.");
      return text;
    }
  } catch (e) {
    console.error("Translate error:", e);
    alert("Lỗi dịch văn bản.");
  }

  return text;
}

/* ========= Nút: TẠO PROMPT ========= */
$("btnMakePrompt")?.addEventListener("click", async () => {
  let text = $("lyrics").value.trim();

  text = await translateIfNeeded(text);

  $("lyrics").value = text; // cập nhật lại giao diện

  const data = {
    text,
    total: Number(val("dur")),
    step: Number(val("item")),
    preset: val("preset"),
    combo: val("combo"),
    aspect: val("aspect")
  };

  _lastScenes = buildScenesFromLyrics(data);
  renderScenesText(_lastScenes);
});

/* ========= Export Buttons ========= */
$("btnJSON")?.addEventListener("click", () => {
  if (!_lastScenes.length) return alert("Chưa có cảnh.");
  downloadJSON(_lastScenes);
});

$("btnTSV")?.addEventListener("click", () => {
  if (!_lastScenes.length) return alert("Chưa có cảnh.");
  downloadTSV(_lastScenes);
});
