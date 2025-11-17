// js/admin.js
// ================== CẤU HÌNH CHUNG ==================
const ADMIN_EMAIL = "sane.htth@gmail.com"; // email admin thật của bạn
const auth = firebase.auth();
const db   = firebase.database();

// ================== PHẦN 1: XỬ LÝ SAU KHI DOM LOAD ==================
document.addEventListener("DOMContentLoaded", () => {
  // ---- A. API LOCAL PROFILES (localStorage) ----
  const profileInput   = document.getElementById("apiProfileId");
  const providerSelect = document.getElementById("apiProvider");
  const apiInput       = document.getElementById("apiKeyInput");
  const saveBtn        = document.getElementById("saveApiBtn");
  const clearBtn       = document.getElementById("clearApiBtn");
  const statusSpan     = document.getElementById("apiStatus");

  const STORAGE_KEY = "nini_api_profiles"; 
  // Cấu trúc: { sane: { openai: '...', gemini:'...', grok:'...' }, ... }

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
    // Nếu chưa nhập gì → dùng ID "default"
    return id || "default";
  }

  // Cập nhật ô input API dựa trên ID + provider hiện tại
  function refreshInput() {
    const profiles  = loadProfiles();
    const profileId = getCurrentProfileId();
    const provider  = providerSelect.value;

    const api = profiles[profileId]?.[provider] || "";
    apiInput.value = api;
    statusSpan.textContent = "";
  }

  if (profileInput) {
    profileInput.addEventListener("input", refreshInput);
  }
  if (providerSelect) {
    providerSelect.addEventListener("change", refreshInput);
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const key       = apiInput.value.trim();
      const profileId = getCurrentProfileId();
      const provider  = providerSelect.value;

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
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const profileId = getCurrentProfileId();
      const provider  = providerSelect.value;
      const profiles  = loadProfiles();

      if (profiles[profileId]) {
        delete profiles[profileId][provider];
        // Nếu profile không còn provider nào → xoá luôn profile
        if (Object.keys(profiles[profileId]).length === 0) {
          delete profiles[profileId];
        }
        saveProfiles(profiles);
      }

      apiInput.value = "";
      statusSpan.textContent = `Đã xoá API ${provider} cho ID "${profileId}" trên máy này.`;
      statusSpan.style.color = "orange";
    });
  }

  // Lần đầu load admin: tự refresh input local
  if (profileInput && providerSelect) {
    refreshInput();
  }

  // ---- B. API THEO USER TRÊN FIREBASE (/users/<uid>/api) ----
  const userOpenaiInput = document.getElementById("userOpenaiApi");
  const userGeminiInput = document.getElementById("userGeminiApi");
  const userGrokInput   = document.getElementById("userGrokApi");
  const saveUserApiBtn  = document.getElementById("saveUserApiBtn");
  const loadUserApiBtn  = document.getElementById("loadUserApiBtn");
  const userApiStatus   = document.getElementById("userApiStatus");

  function setUserApiStatus(msg, color = "inherit") {
    if (!userApiStatus) return;
    userApiStatus.textContent = msg;
    userApiStatus.style.color = color;
  }

  // Lưu API theo user (lên Firebase)
  function saveUserApi() {
    const user = auth.currentUser;
    if (!user) {
      setUserApiStatus("Chưa đăng nhập Firebase.", "orange");
      return;
    }

    const uid    = user.uid;
    const openai = userOpenaiInput?.value.trim() || "";
    const gemini = userGeminiInput?.value.trim() || "";
    const grok   = userGrokInput?.value.trim()   || "";

    db.ref("users/" + uid + "/api")
      .set({ openai, gemini, grok })
      .then(() => setUserApiStatus("Đã lưu API theo user lên Firebase.", "lightgreen"))
      .catch(err => {
        console.error(err);
        setUserApiStatus("Lỗi khi lưu API user: " + err.message, "red");
      });
  }

  // Tải API theo user từ Firebase
  function loadUserApi() {
    const user = auth.currentUser;
    if (!user) {
      setUserApiStatus("Chưa đăng nhập Firebase.", "orange");
      return;
    }
    const uid = user.uid;

    db.ref("users/" + uid + "/api")
      .once("value")
      .then(snap => {
        const api = snap.val();
        if (!api) {
          setUserApiStatus("Chưa có API nào lưu cho user này.", "orange");
          return;
        }
        if (userOpenaiInput) userOpenaiInput.value = api.openai || "";
        if (userGeminiInput) userGeminiInput.value = api.gemini || "";
        if (userGrokInput)   userGrokInput.value   = api.grok   || "";

        setUserApiStatus("Đã tải API user từ Firebase.", "lightgreen");
      })
      .catch(err => {
        console.error(err);
        setUserApiStatus("Lỗi khi tải API user: " + err.message, "red");
      });
  }

  if (saveUserApiBtn) {
    saveUserApiBtn.addEventListener("click", saveUserApi);
  }
  if (loadUserApiBtn) {
    loadUserApiBtn.addEventListener("click", loadUserApi);
  }

  // ---- C. XỬ LÝ AUTH: CHỈ ADMIN ĐƯỢC VÀO TRANG NÀY ----
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // Chưa login → quay về index
      window.location.href = "index.html";
      return;
    }

    if (user.email !== ADMIN_EMAIL) {
      // Đúng là user đã login nhưng không phải admin → cũng đuổi về index
      window.location.href = "index.html";
      return;
    }

    // Đúng admin → hiển thị email
    const span = document.getElementById("adminEmail");
    const spanText = document.getElementById("adminEmailText");
    if (span) span.textContent = user.email;
    if (spanText) spanText.textContent = user.email;
  });

  // ---- D. NÚT ĐĂNG XUẤT ADMIN ----
  const logoutBtn = document.getElementById("logoutBtnAdmin");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "index.html";
      });
    });
  }
});

// ================== PHẦN 2: HÀM TIỆN ÍCH DÙNG CHUNG ==================
// Hàm lấy API local theo profile (nếu bạn muốn dùng ở chỗ khác)
function getCurrentApiKeyWithProfile() {
  const STORAGE_KEY     = "nini_api_profiles";
  const providerSelect  = document.getElementById("apiProvider");
  const profileInput    = document.getElementById("apiProfileId");

  const provider  = providerSelect ? providerSelect.value : "openai";
  const profileId = (profileInput?.value || "").trim() || "default";

  try {
    const profiles = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const apiKey   = profiles[profileId]?.[provider] || "";
    return { profileId, provider, apiKey };
  } catch {
    return { profileId, provider, apiKey: "" };
  }
}
// Xuất ra global để file khác có thể dùng
window.getCurrentApiKeyWithProfile = getCurrentApiKeyWithProfile;
