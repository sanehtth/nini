// public/js/stats.js
// Đồng bộ XP / Coin / Badge từ Firebase lên header (index, quizEng, profile)

(function () {
  console.log("[stats] file loaded");

  // Gán giá trị ra các span nếu tồn tại
  function applyStatsToDom(xp, coin, badge) {
    const groups = [
      // Header trên index.html
      ["globalXP", "globalCoin", "globalBadge"],
      // Header trên quizEng.html
      ["quizXP", "quizCoin", "quizBadge"],
      // Khung thống kê trong phần Hồ sơ (index)
      ["profileXP", "profileCoin", "profileBadge"],
    ];

    groups.forEach(([xpId, coinId, badgeId]) => {
      const xpEl = document.getElementById(xpId);
      const coinEl = document.getElementById(coinId);
      const badgeEl = document.getElementById(badgeId);

      if (xpEl) xpEl.textContent = xp;
      if (coinEl) coinEl.textContent = coin;
      if (badgeEl) badgeEl.textContent = badge;
    });
  }

  function initStatsHeader() {
    console.log("[stats] initStatsHeader called");

    if (!window.firebase || !firebase.auth || !firebase.database) {
      console.warn("[stats] firebase chưa sẵn sàng.");
      return;
    }

    firebase.auth().onAuthStateChanged((user) => {
      console.log("[stats] auth state =", user ? user.uid : "no user");
      if (!user) return;

      const statsRef = firebase
        .database()
        .ref("users/" + user.uid + "/stats");

      statsRef.on("value", (snap) => {
        const stats = snap.val() || {};

        let xp = Number.isFinite(stats.xp) ? stats.xp : 0;
        let coin = Number.isFinite(stats.coin) ? stats.coin : 0;
        let badge = Number.isFinite(stats.badge) ? stats.badge : 1;

        console.log("[stats] raw snapshot:", stats);
        console.log("[stats] xp/coin/badge =>", xp, coin, badge);

        applyStatsToDom(xp, coin, badge);
      });
    });
  }

  // Đảm bảo DOM đã sẵn sàng rồi mới chạy
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStatsHeader);
  } else {
    initStatsHeader();
  }
})();
