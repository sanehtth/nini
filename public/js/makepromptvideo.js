document.addEventListener("DOMContentLoaded", () => {
  // 1. Khai báo các phần tử UI
  const providerSelect = document.getElementById("mpProvider");
  const apiKeyInput = document.getElementById("mpApiKey");
  const adnSelect = document.getElementById("xncAdnProfile");

  const idInput = document.getElementById("xncVideoId");
  const actionInput = document.getElementById("xncAction");
  const contextInput = document.getElementById("xncContext");
  const characterSelect = document.getElementById("xncCharacter");
  const signatureSelect = document.getElementById("xncSignature");
  const cameraSelect = document.getElementById("xncCamera");
  const emotionSelect = document.getElementById("xncEmotion");
  const extraMoodInput = document.getElementById("xncExtraMood");
  const motionInput = document.getElementById("xncMotion");
  const durationInput = document.getElementById("xncDuration");

  const sampleVidInput = document.getElementById("xncSamplePrompt_vid");
  const videoPromptOutput = document.getElementById("xncVideoPrompt");
  const framesPromptOutput = document.getElementById("xncFramesPrompt");
  const jsonOutput = document.getElementById("xncJsonOutput");

  const btnNormalizeVideo = document.getElementById("btnNormalizeVideo");
  const btnGenVideo = document.getElementById("btnGenVideo");
  const btnCopyVideo = document.getElementById("btnCopyVideo");
  const btnGenFrames = document.getElementById("btnGenFrames");
  const btnCopyFrames = document.getElementById("btnCopyFrames");
  const btnGenJson = document.getElementById("btnGenJson");
  const btnCopyJson = document.getElementById("btnCopyJson");

  let lastFrameData = null;

  // 2. Khởi tạo dữ liệu từ XNC (Giả định XNC global từ xomnganchuyen.js)
  function init() {
    if (typeof XNC === "undefined") {
      console.error("XNC SDK chưa được load!");
      return;
    }
    
    const characters = XNC.getCharacters();
    characterSelect.innerHTML = '<option value="">-- Chọn nhân vật --</option>' +
      characters.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

    characterSelect.addEventListener("change", () => {
      const charId = characterSelect.value;
      const sigs = XNC.getSignaturesByCharacter(charId);
      signatureSelect.innerHTML = '<option value="">-- Mặc định --</option>' +
        sigs.map(s => `<option value="${s.id}">${s.label}</option>`).join("");
    });
  }

  // 3. Xử lý logic AI & Normalize
  btnNormalizeVideo.addEventListener("click", async () => {
    const raw = sampleVidInput.value.trim();
    if (!raw) return alert("Vui lòng dán prompt mẫu.");

    btnNormalizeVideo.disabled = true;
    btnNormalizeVideo.innerText = "⏳ Đang xử lý...";

    try {
      const result = await XNC.normalizeVideoPrompt({
        provider: providerSelect.value,
        apiKey: apiKeyInput.value,
        prompt: raw
      });
      videoPromptOutput.value = result;
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      btnNormalizeVideo.disabled = false;
      btnNormalizeVideo.innerText = "🪄 Chuẩn hóa";
    }
  });

  // 4. Logic tạo Keyframes & JSON
  btnGenFrames.addEventListener("click", async () => {
    const videoPrompt = videoPromptOutput.value.trim();
    if (!videoPrompt) return alert("Cần có Video Prompt trước.");

    btnGenFrames.disabled = true;
    try {
      const frames = await XNC.generateKeyframes(videoPrompt);
      lastFrameData = frames;
      framesPromptOutput.value = JSON.stringify(frames, null, 2);
    } catch (err) {
      alert(err.message);
    } finally {
      btnGenFrames.disabled = false;
    }
  });

  btnGenJson.addEventListener("click", () => {
    const id = idInput.value.trim() || "temp_id";
    const characterId = characterSelect.value;
    const signatureId = signatureSelect.value;
    const actionText = actionInput.value.trim();
    const contextText = contextInput.value.trim();
    const videoPrompt = videoPromptOutput.value.trim();

    if (!characterId || !actionText || !contextText) {
      alert("Thiếu thông tin bắt buộc.");
      return;
    }

    const obj = {
      id,
      type: "video",
      series: adnSelect.value,
      characterId,
      signatureId: signatureId || null,
      action: actionText,
      context: contextText,
      motion: motionInput.value.trim() || null,
      durationSeconds: Number(durationInput.value) || 2,
      videoPrompt,
      keyframes: lastFrameData,
      createdAt: new Date().toISOString()
    };

    jsonOutput.value = JSON.stringify(obj, null, 2);
  });

  // 5. Logic Copy
  const setupCopy = (btn, output) => {
    btn.addEventListener("click", () => {
      output.select();
      document.execCommand("copy");
      const oldText = btn.innerText;
      btn.innerText = "✅ Đã Copy";
      setTimeout(() => btn.innerText = oldText, 2000);
    });
  };

  setupCopy(btnCopyVideo, videoPromptOutput);
  setupCopy(btnCopyFrames, framesPromptOutput);
  setupCopy(btnCopyJson, jsonOutput);

  init();
});
