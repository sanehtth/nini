window.App = window.App || {};

(() => {
  let radarChart = null;

  function renderProfile(data) {
    const traits = data?.traits || {
      creativity:0, competitiveness:0, sociability:0,
      playfulness:0, self_improvement:0, perfectionism:0
    };
    const labels = ["Sáng tạo","Cạnh tranh","Xã hội","Vui vẻ","Tự cải thiện","Cầu toàn"];
    const values = [
      traits.creativity||0,
      traits.competitiveness||0,
      traits.sociability||0,
      traits.playfulness||0,
      traits.self_improvement||0,
      traits.perfectionism||0
    ];

    const canvas = document.getElementById("radarChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (radarChart && typeof radarChart.destroy === "function") radarChart.destroy();

    radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels,
        datasets: [{
          label: "Tính cách",
          data: values,
          backgroundColor: "rgba(225, 29, 72, 0.2)",
          borderColor: "#e11d48",
          pointBackgroundColor: "#e11d48",
          borderWidth: 2
        }]
      },
      options: { scales: { r: { min: 0, max: 12, ticks: { stepSize: 3 } } }, plugins: { legend: { display: false } } }
    });

    // thống kê cơ bản (nếu có)
    const progress = data.gameProgress || {};
    const totalXP = Object.values(progress).reduce((s,g)=>s+(g.xp||0),0);
    const totalCoin = Object.values(progress).reduce((s,g)=>s+(g.coin||0),0);
    const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

    const xpEl   = document.getElementById("profileXP");
    const coinEl = document.getElementById("profileCoin");
    const badgeEl= document.getElementById("profileBadge");
    if (xpEl)   xpEl.textContent   = totalXP;
    if (coinEl) coinEl.textContent = totalCoin;
    if (badgeEl)badgeEl.textContent= badge;
  }

  window.App.Profile = { renderProfile };
})();

//====== Đọc hồ sơ trực tiếp từ Firebase và render =========

window.addEventListener('DOMContentLoaded', () => {
  // Nếu chưa load SDK Firebase thì render rỗng/fallback
  if (!window.firebase) {
    // fallback LocalStorage (nếu muốn)
    try {
      const ls = localStorage.getItem('lq_traitScores');
      const traits = ls ? JSON.parse(ls) : null;
      const meta = JSON.parse(localStorage.getItem('lq_quiz_meta') || '{}');
      window.App.Profile.renderProfile(traits ? { traits, quizMeta: meta } : {});
    } catch {
      window.App.Profile.renderProfile({});
    }
    return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      // Chưa đăng nhập → fallback localStorage
      try {
        const ls = localStorage.getItem('lq_traitScores');
        const traits = ls ? JSON.parse(ls) : null;
        const meta = JSON.parse(localStorage.getItem('lq_quiz_meta') || '{}');
        window.App.Profile.renderProfile(traits ? { traits, quizMeta: meta } : {});
      } catch {
        window.App.Profile.renderProfile({});
      }
      return;
    }

    try {
      const ref = firebase.database().ref(`/profiles/${user.uid}`);
      const [profileSnap, statsSnap] = await Promise.all([
        ref.get(),
        ref.child('stats').get()
      ]);

      const data = profileSnap.val() || {};
      const stats = statsSnap.val() || {};

      // Chuẩn hóa shape đúng với renderProfile(data)
      const payload = {
        traits: data.traits || null,
        gameProgress: { __global: { xp: stats.xp || 0, coin: stats.coin || 0 } }
      };

      window.App.Profile.renderProfile(payload);
    } catch (e) {
      console.error('Load profile error', e);
      window.App.Profile.renderProfile({});
    }
  });
});
