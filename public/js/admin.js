// js/admin.js
// ================== ADMIN PAGE SCRIPT ==================
document.addEventListener("DOMContentLoaded", () => {
  // ---- Firebase refs (từ firebase.js) ----
  const auth = (window.firebase && firebase.auth) ? firebase.auth() : null;
  const db   = (window.firebase && firebase.database) ? firebase.database() : null;

  // ---- Cấu hình admin chính ----
  const ADMIN_EMAIL = "sane.htth@gmail.com";   // chỉnh lại nếu bạn đổi mail admin

  // ---- Element cơ bản ----
  const adminEmailSpan     = document.getElementById("adminEmail");
  const adminEmailTextSpan = document.getElementById("adminEmailText");
  const logoutBtnAdmin     = document.getElementById("logoutBtnAdmin");
  const manageUsersBtn     = document.getElementById("manageUsersBtn"); // nếu có

  // ================== 1. LOGIN CHECK ==================
  if (auth) {
    auth.onAuthStateChanged(user => {
      if (!user) {
        // chưa đăng nhập -> đá về trang chính
        window.location.href = "index.html";
        return;
      }

      const email = user.email || "(không rõ)";

      if (adminEmailSpan)     adminEmailSpan.textContent     = email;
      if (adminEmailTextSpan) adminEmailTextSpan.textContent = email;

      // Nếu KHÔNG phải email admin -> ẩn nút quản lý người dùng
      if (manageUsersBtn && email !== ADMIN_EMAIL) {
        manageUsersBtn.style.display = "none";
      }

      // Sau khi biết UID -> load API theo user từ Realtime DB
      if (db) {
        loadUserApiFromFirebase(db, user.uid);
      }
    });
  }

  // Nút Đăng xuất (admin)
  if (logoutBtnAdmin && auth) {
    logoutBtnAdmin.addEventListener("click", async () => {
      try {
        await auth.signOut();
        window.location.href = "index.html";
      } catch (err) {
        console.error("Lỗi signOut:", err);
        alert("Đăng xuất thất bại, thử lại.");
      }
    });
  }

  // ================== 2. TABS ADMIN (4 tab) ==================
  const adminTabs   = document.querySelectorAll(".admin-tab");
  const adminPanels = document.querySelectorAll(".admin-panel");

  adminTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // bỏ active ở tất cả tab
      adminTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      // ẩn/hiện panel
      const targetId = tab.dataset.target;  // vd: "panel-story"
      adminPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.remove("hidden");
        } else {
          panel.classList.add("hidden");
        }
      });
    });
  });

  // Khi mới vào trang: nếu có lưu tab lần trước, mở lại (không bắt buộc)
  const savedTab = localStorage.getItem("lq_admin_tab");
  if (savedTab) {
    const tabToClick = Array.from(adminTabs).find(t => t.dataset.target === savedTab);
    if (tabToClick) tabToClick.click();
  } else {
    // nếu chưa có -> giữ tab đầu (panel-api) là active
    const firstPanel = document.getElementById("panel-api");
    if (firstPanel) firstPanel.classList.remove("hidden");
  }

  // Lưu tab hiện tại mỗi khi click
  adminTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      localStorage.setItem("lq_admin_tab", tab.dataset.target || "");
    });
  });

  // ================== 3. API LOCAL THEO PROFILE ==================
  // A. API local theo Profile (lưu trong trình duyệt)
  const profileIdInput     = document.getElementById("profileIdInput");   // ô: ID / Tên Profile
  const apiProviderSelect  = document.getElementById("apiProvider");      // select: OpenAI / Gemini / Grok
  const apiKeyLocalInput   = document.getElementById("apiKeyInput");      // ô: API key
  const saveLocalBtn       = document.getElementById("saveApiBtn");       // nút "Lưu local"
  const clearLocalBtn      = document.getElementById("clearApiBtn");      // nút "Xoá local"
  const apiLocalStatusSpan = document.getElementById("apiStatus");        // span báo trạng thái

  function getLocalStorageKey() {
    const profileId = (profileIdInput && profileIdInput.value.trim()) || "default";
    const provider  = (apiProviderSelect && apiProviderSelect.value) || "openai";
    return `lq_api_${profileId}_${provider}`;
  }

  // Load sẵn nếu có
  if (apiKeyLocalInput) {
    try {
      const storedKey = localStorage.getItem(getLocalStorageKey());
      if (storedKey) apiKeyLocalInput.value = storedKey;
    } catch (e) {
      console.warn("Không thể đọc localStorage:", e);
    }
  }

  // Lưu local
  if (saveLocalBtn && apiKeyLocalInput) {
    saveLocalBtn.addEventListener("click", () => {
      const key = apiKeyLocalInput.value.trim();
      if (!key) {
        if (apiLocalStatusSpan) apiLocalStatusSpan.textContent = "Chưa nhập API key.";
        return;
      }
      try {
        localStorage.setItem(getLocalStorageKey(), key);
        if (apiLocalStatusSpan) apiLocalStatusSpan.textContent = "Đã lưu API key vào localStorage.";
      } catch (e) {
        console.error("Lỗi lưu localStorage:", e);
        if (apiLocalStatusSpan) apiLocalStatusSpan.textContent = "Lỗi: không lưu được localStorage.";
      }
    });
  }

  // Xoá local
  if (clearLocalBtn && apiKeyLocalInput) {
    clearLocalBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem(getLocalStorageKey());
        apiKeyLocalInput.value = "";
        if (apiLocalStatusSpan) apiLocalStatusSpan.textContent = "Đã xoá API key local.";
      } catch (e) {
        console.error("Lỗi xoá localStorage:", e);
      }
    });
  }

  // Nếu đổi profile ID hoặc provider thì load lại API tương ứng (nếu có)
  [profileIdInput, apiProviderSelect].forEach(el => {
    if (!el) return;
    el.addEventListener("change", () => {
      if (!apiKeyLocalInput) return;
      try {
        const storedKey = localStorage.getItem(getLocalStorageKey());
        apiKeyLocalInput.value = storedKey || "";
        if (apiLocalStatusSpan) apiLocalStatusSpan.textContent = storedKey
          ? "Đã load API key từ localStorage."
          : "Chưa có API cho profile này.";
      } catch (e) {
        console.error("Lỗi khi load localStorage:", e);
      }
    });
  });
  // ----- API đang dùng (active provider) -----
const ACTIVE_PROVIDER_KEY = "nini_active_provider";

function getActiveProvider() {
  // Mặc định là "openai" nếu chưa set
  return localStorage.getItem(ACTIVE_PROVIDER_KEY) || "openai";
}

function setActiveProvider(provider) {
  localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
  renderActiveProviderUI();
}

function renderActiveProviderUI() {
  const mapLabel = {
    openai: "OpenAI",
    gemini: "Google AI (Gemini)",
    grok: "Grok (xAI)"
  };

  const active = getActiveProvider();

  // Cập nhật label
  const label = document.getElementById("activeProviderLabel");
  if (label) {
    label.textContent = mapLabel[active] || active;
  }

  // Cập nhật trạng thái radio
  document
    .querySelectorAll(".active-provider-radio")
    .forEach(radio => {
      radio.checked = radio.value === active;
    });
}

  // ================== 4. API THEO USER (LƯU TRÊN FIREBASE) ==================
  const userOpenAiInput   = document.getElementById("userOpenAiKey");
  const userGeminiInput   = document.getElementById("userGeminiKey");
  const userGrokInput     = document.getElementById("userGrokKey");
  const saveUserApiBtn    = document.getElementById("saveUserApiBtn");
  const clearUserApiBtn   = document.getElementById("clearUserApiBtn");
  const userApiStatusSpan = document.getElementById("userApiStatus");

  function loadUserApiFromFirebase(db, uid) {
    if (!db || !uid) return;
    const ref = db.ref(`users/${uid}/api`);
    ref.once("value")
      .then(snap => {
        const val = snap.val() || {};
        if (userOpenAiInput) userOpenAiInput.value = val.openai || "";
        if (userGeminiInput) userGeminiInput.value = val.gemini || "";
        if (userGrokInput)   userGrokInput.value   = val.grok   || "";
      })
      .catch(err => {
        console.error("Lỗi load API user từ Firebase:", err);
      });
  }

  function saveUserApiToFirebase() {
    if (!auth || !db) return;
    const user = auth.currentUser;
    if (!user) {
      alert("Chưa đăng nhập.");
      return;
    }

    const ref = db.ref(`users/${user.uid}/api`);
    const payload = {
      openai: userOpenAiInput ? userOpenAiInput.value.trim() : "",
      gemini: userGeminiInput ? userGeminiInput.value.trim() : "",
      grok:   userGrokInput   ? userGrokInput.value.trim()   : "",
      updatedAt: Date.now()
    };

    ref.set(payload)
      .then(() => {
        if (userApiStatusSpan) userApiStatusSpan.textContent = "Đã lưu API user lên Firebase.";
      })
      .catch(err => {
        console.error("Lỗi lưu API user:", err);
        if (userApiStatusSpan) userApiStatusSpan.textContent = "Lỗi khi lưu API user.";
      });
  }

  if (saveUserApiBtn) {
    saveUserApiBtn.addEventListener("click", saveUserApiToFirebase);
  }

  if (clearUserApiBtn) {
    clearUserApiBtn.addEventListener("click", () => {
      if (!auth || !db) return;
      const user = auth.currentUser;
      if (!user) return;

      const ref = db.ref(`users/${user.uid}/api`);
      ref.remove()
        .then(() => {
          if (userOpenAiInput) userOpenAiInput.value = "";
          if (userGeminiInput) userGeminiInput.value = "";
          if (userGrokInput)   userGrokInput.value   = "";
          if (userApiStatusSpan) userApiStatusSpan.textContent = "Đã xoá API user trên Firebase.";
        })
        .catch(err => {
          console.error("Lỗi xoá API user:", err);
        });
    });
  }
// Lắng nghe chọn API đang dùng
document
  .querySelectorAll(".active-provider-radio")
  .forEach(radio => {
    radio.addEventListener("change", e => {
      if (e.target.checked) {
        setActiveProvider(e.target.value);
      }
    });
  });

// Khi load trang admin -> hiển thị API active hiện tại
window.addEventListener("load", () => {
  renderActiveProviderUI();
});

  // ================== 5. CÁC TOOL PROMPT (CHAR / OUTFIT / STORYBOARD) ==================
  // Mấy panel prompt nhân vật / outfit bạn đã có sẵn HTML.
  // Ở đây không bắt buộc, nhưng nếu sau này muốn thêm JS xử lý thì
  // cứ viết tiếp phía dưới, nhớ luôn luôn:
  //  - kiểm tra element có tồn tại mới addEventListener
  //  - bọc trong DOMContentLoaded như file này để tránh lỗi null.
});


