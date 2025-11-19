// js/stats.js
// Đồng bộ XP / Coin / Badge từ Firebase lên các chỗ: header, quizEng, profile

(function applyStatsToDom(xp, coin, badge) {
  const globalXpEl = document.getElementById("globalXP");
  const globalCoinEl = document.getElementById("globalCoin");
  const globalBadgeEl = document.getElementById("globalBadge");

  if (globalXpEl) globalXpEl.textContent = xp;
  if (globalCoinEl) globalCoinEl.textContent = coin;
  if (globalBadgeEl) globalBadgeEl.textContent = badge;

  const profileXpEl = document.getElementById("profileXP");
  const profileCoinEl = document.getElementById("profileCoin");
  const profileBadgeEl = document.getElementById("profileBadge");

  if (profileXpEl) profileXpEl.textContent = xp;
  if (profileCoinEl) profileCoinEl.textContent = coin;
  if (profileBadgeEl) profileBadgeEl.textContent = badge;

  const quizXpEl = document.getElementById("quizXP");
  const quizCoinEl = document.getElementById("quizCoin");
  const quizBadgeEl = document.getElementById("quizBadge");

  if (quizXpEl) quizXpEl.textContent = xp;
  if (quizCoinEl) quizCoinEl.textContent = coin;
  if (quizBadgeEl) quizBadgeEl.textContent = badge;
}


    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
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

      if (!user) {
        // Chưa đăng nhập → để default
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

        console.log("[stats] raw snapshot:", stats);
        console.log("[stats] xp/coin/badge =", xp, coin, badge);

        applyStatsToDom(xp, coin, badge);
      });
    });
  }

  // Đợi DOM sẵn sàng rồi mới chạy
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStatsHeader);
  } else {
    initStatsHeader();
  }
})();

