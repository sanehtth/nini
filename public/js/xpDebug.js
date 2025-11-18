// xpDebug – log lịch sử XP/Coin
window.XP_DEBUG = window.XP_DEBUG || [];

window.logXPChange = function (source, xp, coin) {
  const entry = {
    source,          // tên file + vị trí
    xp,
    coin,
    time: new Date().toISOString()
  };
  window.XP_DEBUG.push(entry);
  console.log("[XP-DEBUG]", entry);
};
