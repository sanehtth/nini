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

   // Chờ DOM ready rồi mới chạy
  document.addEventListener("DOMContentLoaded", initStatsHeader);
})();

