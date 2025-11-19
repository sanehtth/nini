// js/stats.js
// Đọc XP / Coin / Badge từ Firebase và đổ ra mọi chỗ (header, quiz, profile)

(function () {
  const XP_DEBUG = true; // đổi thành false nếu không muốn spam console

  // ===== Cập nhật tất cả chỗ hiển thị XP / Coin / Badge =====
  function applyStatsToDom(xp, coin, badge) {
    // Header
    const globalXPEl    = document.getElementById("globalXP");
    const globalCoinEl  = document.getElementById("globalCoin");
    const globalBadgeEl = document.getElementById("globalBadge");

    if (globalXPEl)    globalXPEl.textContent    = xp;
    if (globalCoinEl)  globalCoinEl.textContent  = coin;
    if (globalBadgeEl) globalBadgeEl.textContent = badge;

    // Quiz header (nếu có)
    const quizXPEl    = document.getElementById("quizXP");
    const quizCoinEl  = document.getElementById("quizCoin");
    const quizBadgeEl = document.getElementById("quizBadge");

    if (quizXPEl)    quizXPEl.textContent    = xp;
    if (quizCoinEl)  quizCoinEl.textContent  = coin;
    if (quizBadgeEl) quizBadgeEl.textContent = badge;

    // Hồ sơ (profile)
    const profileXPEl    = document.getElementById("profileXP");
    const profileCoinEl  = document.getElementById("profileCoin");
    const profileBadgeEl = document.getElementById("profileBadge");

    if (profileXPEl)    profileXPEl.textContent    = xp;
    if (profileCoinEl)  profileCoinEl.textContent  = coin;
    if (profileBadgeEl) profileBadgeEl.textContent = badge;

    if (XP_DEBUG) {
      console.log("[stats] applyStatsToDom:", { xp, coin, badge });
    }
  }

  // ===== Hàm main: lắng nghe Firebase và gọi applyStatsToDom =====
  function initStatsHeader() {
    console.log("[stats] initStatsHeader called");

    // Firebase chưa sẵn sàng
    if (!window.firebase || !firebase.auth || !firebase.database) {
      console.warn("[stats] Firebase chưa sẵn sàng.");
      return;
    }

    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        // Chưa đăng nhập -> reset stats về mặc định
        console.log("[stats] auth: no user, reset stats");
        applyStatsToDom(0, 0, 1);
        return;
      }

      const uid = user.uid;
      console.log("[stats] auth state =", uid);

      const statsRef = firebase
        .database()
        .ref("users/" + uid + "/stats");

      statsRef.on("value", (snap) => {
        const stats = snap.val() || {};

        const xp    = Number.isFinite(stats.xp)    ? stats.xp    : 0;
        const coin  = Number.isFinite(stats.coin)  ? stats.coin  : 0;
        const badge = Number.isFinite(stats.badge) ? stats.badge : 1;

        if (XP_DEBUG) {
          console.log("[stats] raw snapshot:", stats);
          console.log("[stats] xp/coin/badge =", xp, coin, badge);
        }

        applyStatsToDom(xp, coin, badge);
      });
    });
  }

  // Chờ DOM xong rồi mới chạy, tránh lỗi getElementById null
  document.addEventListener("DOMContentLoaded", initStatsHeader);
})();
