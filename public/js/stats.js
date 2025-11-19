// js/stats.js
// Đọc XP / Coin / Badge từ Firebase và đẩy vào các chỗ hiển thị.

(function () {
  const XP_DEBUG = true; // muốn tắt log thì đổi thành false

  // Hàm đẩy số vào tất cả element liên quan
  function applyStatsToDom(xp, coin, badge) {
    if (XP_DEBUG) {
      console.log("[stats] applyStatsToDom:", { xp, coin, badge });
    }

    // Map id -> value
    const ids = {
      globalXP: xp,
      globalCoin: coin,
      globalBadge: badge,

      profileXP: xp,
      profileCoin: coin,
      profileBadge: badge,

      quizXP: xp,
      quizCoin: coin,
      quizBadge: badge,
    };

    Object.entries(ids).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  function initStatsHeader() {
    console.log("[stats] initStatsHeader called");

    // Kiểm tra Firebase đã load chưa
    if (!window.firebase || !firebase.auth || !firebase.database) {
      console.warn("[stats] Firebase chưa sẵn sàng.");
      return;
    }

    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        // Chưa đăng nhập -> reset về mặc định
        applyStatsToDom(0, 0, 1);
        return;
      }

      const statsRef = firebase
        .database()
        .ref("users/" + user.uid + "/stats");

      statsRef.on("value", (snap) => {
        const stats = snap.val() || {};

        const xp = Number.isFinite(stats.xp) ? stats.xp : 0;
        const coin = Number.isFinite(stats.coin) ? stats.coin : 0;
        const badge = Number.isFinite(stats.badge) ? stats.badge : 1;

        if (XP_DEBUG) {
          console.log("[stats] raw snapshot:", stats);
          console.log("[stats] xp/coin/badge:", xp, coin, badge);
        }

        applyStatsToDom(xp, coin, badge);
      });
    });
  }

  // Chờ DOM ready rồi mới chạy
  document.addEventListener("DOMContentLoaded", initStatsHeader);
})();
