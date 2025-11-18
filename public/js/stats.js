// js/stats.js
// Đồng bộ XP / Coin / Badge từ Firebase lên header (index, quizEng) và phần Hồ sơ.

function initStatsHeader() {
  if (!window.firebase || !firebase.auth) {
    console.warn("Firebase chưa sẵn sàng, không init stats header được.");
    return;
  }

  firebase.auth().onAuthStateChanged((user) => {
    // Lấy các element có thể có trên trang hiện tại
    const ids = {
      globalXP: document.getElementById("globalXP"),
      globalCoin: document.getElementById("globalCoin"),
      globalBadge: document.getElementById("globalBadge"),

      quizXP: document.getElementById("quizXP"),
      quizCoin: document.getElementById("quizCoin"),
      quizBadge: document.getElementById("quizBadge"),

      profileXP: document.getElementById("profileXP"),
      profileCoin: document.getElementById("profileCoin"),
      profileBadge: document.getElementById("profileBadge"),
    };

    // Nếu chưa đăng nhập → reset hết về 0 / 1
    if (!user) {
      Object.entries(ids).forEach(([key, el]) => {
        if (!el) return;
        if (key.toLowerCase().includes("badge")) {
          el.textContent = "1";
        } else {
          el.textContent = "0";
        }
      });
      return;
    }

    const statsRef = firebase
      .database()
      .ref("users/" + user.uid + "/stats");

    // Lắng nghe realtime stats
    statsRef.on("value", (snap) => {
      const stats = snap.val() || {};
      const xp = stats.xp != null ? stats.xp : 0;
      const coin = stats.coin != null ? stats.coin : 0;
      const badge = stats.badge != null ? stats.badge : 1;

      if (ids.globalXP) ids.globalXP.textContent = xp;
      if (ids.globalCoin) ids.globalCoin.textContent = coin;
      if (ids.globalBadge) ids.globalBadge.textContent = badge;

      if (ids.quizXP) ids.quizXP.textContent = xp;
      if (ids.quizCoin) ids.quizCoin.textContent = coin;
      if (ids.quizBadge) ids.quizBadge.textContent = badge;

      if (ids.profileXP) ids.profileXP.textContent = xp;
      if (ids.profileCoin) ids.profileCoin.textContent = coin;
      if (ids.profileBadge) ids.profileBadge.textContent = badge;
    });
  });
}

document.addEventListener("DOMContentLoaded", initStatsHeader);
