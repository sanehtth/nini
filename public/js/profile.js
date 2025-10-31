// js/profile.js
window.App = window.App || {};

(() => {
  let radarChart = null;

  function renderProfile(data) {
    const traitsRaw = (data && data.traits) || {
      creativity: 0, competitiveness: 0, sociability: 0,
      playfulness: 0, self_improvement: 0, perfectionism: 0
    };

    // 1) Chuẩn hoá % (0..100)
    const keys = ["creativity","competitiveness","sociability","playfulness","self_improvement","perfectionism"];
    const totalRaw = keys.reduce((s,k)=> s + (Number(traitsRaw[k])||0), 0);

    const traitsPct100 = {};
    keys.forEach(k => {
      const raw = Number(traitsRaw[k]) || 0;
      traitsPct100[k] = totalRaw > 0 ? (raw / totalRaw * 100) : 0;
    });

    // 2) Dữ liệu cho radar: 0..60 (để trục hiển thị 0-20-40-60)
    const values60 = keys.map(k => Math.round(traitsPct100[k] * 0.6));

    const labelsVi = ["Sáng tạo","Cạnh tranh","Xã hội","Vui vẻ","Tự cải thiện","Cầu toàn"];

    // --- Chart ---
    const canvas = document.getElementById("radarChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (radarChart && typeof radarChart.destroy === "function") radarChart.destroy();

      radarChart = new Chart(ctx, {
        type: "radar",
        data: {
          labels: labelsVi,
          datasets: [{
            label: "Tính cách (chuẩn hoá %)",
            data: values60,
            backgroundColor: "rgba(225, 29, 72, 0.2)",
            borderColor: "#e11d48",
            pointBackgroundColor: "#e11d48",
            borderWidth: 2
          }]
        },
        options: {
          scales: {
            r: {
              min: 0,
              max: 60,               // trục 0..60
              ticks: { stepSize: 20 } // 0, 20, 40, 60
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    // --- Trait list (thanh % 0..100)—dễ đọc cho người dùng ---
    const traitList = document.getElementById("traitList");
    if (traitList) {
      traitList.innerHTML = "";
      const names = {
        creativity: "Sáng tạo",
        competitiveness: "Cạnh tranh",
        sociability: "Xã hội",
        playfulness: "Vui vẻ",
        self_improvement: "Tự cải thiện",
        perfectionism: "Cầu toàn"
      };
      keys.forEach(k => {
        const pct = Math.round(traitsPct100[k]); // làm tròn %
        const item = document.createElement("div");
        item.className = "trait-item";
        item.innerHTML = `
          <div class="trait-name">${names[k]}</div>
          <div class="trait-bar">
            <div class="trait-fill" style="width:${pct}%;"></div>
          </div>
          <div style="font-size:12px; margin-top:5px;">${pct}%</div>
        `;
        traitList.appendChild(item);
      });
    }

    // --- Thống kê cơ bản (XP, Coin, Huy hiệu) ---
    const progress  = data?.gameProgress || {};
    const totalXP   = Object.values(progress).reduce((s,g)=> s + (g?.xp   || 0), 0);
    const totalCoin = Object.values(progress).reduce((s,g)=> s + (g?.coin || 0), 0);
    const badge     = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

    const xpEl    = document.getElementById("profileXP");
    const coinEl  = document.getElementById("profileCoin");
    const badgeEl = document.getElementById("profileBadge");
    if (xpEl)    xpEl.textContent    = totalXP;
    if (coinEl)  coinEl.textContent  = totalCoin;
    if (badgeEl) badgeEl.textContent = badge;
  }

  window.App.Profile = { renderProfile };
})();
