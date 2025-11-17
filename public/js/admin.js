// js/admin.js

const ADMIN_EMAIL = "sane.htth@gmail.com";
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
  const profileInput  = document.getElementById("apiProfileId");
  const providerSelect = document.getElementById("apiProvider");
  const apiInput       = document.getElementById("apiKeyInput");
  const saveBtn        = document.getElementById("saveApiBtn");
  const clearBtn       = document.getElementById("clearApiBtn");
  const statusSpan     = document.getElementById("apiStatus");

  const STORAGE_KEY = "nini_api_profiles"; // { sane: { openai: '...', gemini:'...', grok:'...' }, ... }
   function loadProfiles() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      console.error("Parse profiles error", e);
      return {};
    }
  }

  function saveProfiles(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  function getCurrentProfileId() {
    const id = (profileInput.value || "").trim();
    // Nếu chưa nhập gì, coi như ID mặc định là "default"
    return id || "default";
  }

  // Cập nhật ô input API dựa trên ID + provider
  function refreshInput() {
    const profiles = loadProfiles();
    const profileId = getCurrentProfileId();
    const provider = providerSelect.value;

    const api = profiles[profileId]?.[provider] || "";
    apiInput.value = api;
    statusSpan.textContent = "";
  }
   profileInput.addEventListener("input", () => {
    // mỗi lần đổi ID → load API tương ứng (nếu có)
    refreshInput();
  });

  providerSelect.addEventListener("change", refreshInput);

  // Lưu local cho ID + provider hiện tại
  saveBtn.addEventListener("click", () => {
    const key = apiInput.value.trim();
    const profileId = getCurrentProfileId();
    const provider = providerSelect.value;

    if (!key) {
      statusSpan.textContent = "Chưa nhập API key...";
      statusSpan.style.color = "orange";
      return;
    }

    const profiles = loadProfiles();
    if (!profiles[profileId]) profiles[profileId] = {};
    profiles[profileId][provider] = key;
    saveProfiles(profiles);

    statusSpan.textContent = `Đã lưu API ${provider} cho ID "${profileId}" ở localStorage.`;
    statusSpan.style.color = "lightgreen";
  });
   // Xoá API cho ID + provider hiện tại
  clearBtn.addEventListener("click", () => {
    const profileId = getCurrentProfileId();
    const provider = providerSelect.value;
    const profiles = loadProfiles();

    if (profiles[profileId]) {
      delete profiles[profileId][provider];
      // nếu profile đó không còn API nào → xoá luôn profile
      if (Object.keys(profiles[profileId]).length === 0) {
        delete profiles[profileId];
      }
      saveProfiles(profiles);
    }

    apiInput.value = "";
    statusSpan.textContent = `Đã xoá API ${provider} cho ID "${profileId}" trên máy này.`;
    statusSpan.style.color = "orange";
  });
    // Lần đầu load admin: tự refresh theo ID hiện tại (nếu trống thì là "default")
  refreshInput();
  
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // chưa đăng nhập → đá về trang login
      window.location.href = "index.html";
      return;
    }

    if (user.email !== ADMIN_EMAIL) {
      // không phải admin → cũng đá về
      window.location.href = "index.html";
      return;
    }

    // đúng admin → cho ở lại trang và hiển thị email
    const span = document.getElementById("adminEmail");
    if (span) span.textContent = user.email;
  });
});
//========= Hàm tiện ích lấy API hiện hành (dùng cho chỗ khác nếu cần)=======
function getCurrentApiKeyWithProfile() {
  const STORAGE_KEY = "nini_api_profiles";
  const providerSelect = document.getElementById("apiProvider");
  const profileInput = document.getElementById("apiProfileId");

  const provider = providerSelect ? providerSelect.value : "openai";
  const profileId = (profileInput?.value || "").trim() || "default";

  try {
    const profiles = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const apiKey = profiles[profileId]?.[provider] || "";
    return { profileId, provider, apiKey };
  } catch {
    return { profileId, provider, apiKey: "" };
  }
}
window.getCurrentApiKeyWithProfile = getCurrentApiKeyWithProfile;
