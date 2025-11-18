// js/stats.js
// Đồng bộ XP / Coin / Badge từ Firebase lên header (index, quizEng, profile)

window.XP_DEBUG = function (info) {
  console.log("[XP-DEBUG]", info);
};

function initStatsHeader() {
  console.log("[stats] initStatsHeader called");

  if (!window.firebase || !firebase.auth) {
    console.warn("[stats] firebase chưa sẵn sàng.");
    return;
  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log("[stats] auth state =", user ? user.uid : "no user");

    // Lấy tất cả element có thể tồn tại trên các trang
    const nodes = {
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

    // Nếu chưa đăng nhập => reset hết về 0 / 1
    if (!user) {
      Object.entries(nodes).forEach(([key, el]) => {
        if (!el) return;
        if (key.toLowerCase().includes("badge")) {
          el.textContent = "1";
        } else {
          el.textContent = "0";
        }
      });

      XP_DEBUG({ source: "stats.js:noUser", xp: 0, coin: 0, badge: 1 });
      return;
    }

    // Người dùng đã đăng nhập => nghe stats trong /users/{uid}/stats
    const statsRef = firebase.database().ref(
      "users/" + user.uid + "/stats"
    );

    statsRef.on("value", (snap) => {
      const stats = snap.val() || {};
      const xp = stats.xp != null ? stats.xp : 0;
      const coin = stats.coin != null ? stats.coin : 0;
      const badge = stats.badge != null ? stats.badge : 1;

      console.log("[stats] xp/coin/badge:", xp, coin, badge);
      XP_DEBUG({ source: "stats.js:afterFirebase", xp, coin, badge });

      // Cập nhật header ở index.html
      if (nodes.globalXP) nodes.globalXP.textContent = xp;
      if (nodes.globalCoin) nodes.globalCoin.textContent = coin;
      if (nodes.globalBadge) nodes.globalBadge.textContent = badge;

      // Cập nhật header ở quizEng.html (nếu có)
      if (nodes.quizXP) nodes.quizXP.textContent = xp;
      if (nodes.quizCoin) nodes.quizCoin.textContent = coin;
      if (nodes.quizBadge) nodes.quizBadge.textContent = badge;

      // Cập nhật khối thống kê trong profile.html (nếu có)
      if (nodes.profileXP) nodes.profileXP.textContent = xp;
      if (nodes.profileCoin) nodes.profileCoin.textContent = coin;
      if (nodes.profileBadge) nodes.profileBadge.textContent = badge;
    });
  });
}

// Chờ DOM sẵn rồi mới chạy
document.addEventListener("DOMContentLoaded", initStatsHeader);
