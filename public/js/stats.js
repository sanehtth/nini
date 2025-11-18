// js/stats.js
// Đồng bộ XP / Coin / Badge từ Firebase lên mọi chỗ trong UI

console.log("[stats] file loaded");

function applyStatsToDom(xp, coin, badge) {
  // Map id -> value
  const values = {
    // Header trên index
    globalXP: xp,
    globalCoin: coin,
    globalBadge: badge,

    // Header trên quizEng (nếu có)
    quizXP: xp,
    quizCoin: coin,
    quizBadge: badge,

    // Khối Thống Kê trong profile
    profileXP: xp,
    profileCoin: coin,
    profileBadge: badge,
  };

  Object.entries(values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
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

    // Chưa login: reset hiển thị
    if (!user) {
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

// Đảm bảo chạy sau khi DOM load xong
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStatsHeader);
} else {
  initStatsHeader();
}
