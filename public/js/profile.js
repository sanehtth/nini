// public/js/profile.js
// Vẽ hồ sơ theo % (chuẩn hoá tổng 6 trait = 100%), radar 0–60 (ticks 0,20,40,60)

window.App = window.App || {};

(() => {
  let radarChart = null;

  function renderProfile(data) {
    const traitsRaw = (data && data.traits) || {
      creativity: 0,
      competitiveness: 0,
      sociability: 0,
      playfulness: 0,
      self_improvement: 0,
      perfectionism: 0,
    };

    // Khóa & nhãn
    const keys = [
      "creativity",
      "competitiveness",
      "sociability",
      "playfulness",
      "self_improvement",
      "perfectionism",
    ];
    const labelMap = {
      creativity: "Sáng tạo",
      competitiveness: "Cạnh tranh",
      sociability: "Xã hội",
      playfulness: "Vui vẻ",
      self_improvement: "Tự cải thiện",
      perfectionism: "Cầu toàn",
    };
    const labelsVi = keys.map((k) => labelMap[k]);

    // 1) Chuẩn hoá % 0..100
    const totalRaw = keys.reduce((s, k) => s + (Number(traitsRaw[k]) || 0), 0);
    const pct100 = {};
    keys.forEach((k) => {
      const raw = Number(traitsRaw[k]) || 0;
      pct100[k] = totalRaw > 0 ? (raw / totalRaw) * 100 : 0;
    });

    // 2) Dữ liệu cho radar: 0..60 (để hiện ticks 0–20–40–60)
    const values60 = keys.map((k) => Math.round(pct100[k] * 0.6));

    // --- Vẽ radar ---
    const canvas = document.getElementById("radarChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (radarChart && typeof radarChart.destroy === "function") {
        radarChart.destroy();
      }
      radarChart = new Chart(ctx, {
        type: "radar",
        data: {
          labels: labelsVi,
          datasets: [
            {
              label: "Tính cách (chuẩn hoá %)",
              data: values60,
              backgroundColor: "rgba(225, 29, 72, 0.2)",
              borderColor: "#e11d48",
              pointBackgroundColor: "#e11d48",
              borderWidth: 2,
            },
          ],
        },
        options: {
          scales: {
            r: {
              min: 0,
              max: 60,
              ticks: { stepSize: 20 }, // 0, 20, 40, 60
            },
          },
          plugins: { legend: { display: false } },
        },
      });
    }

    // --- Danh sách trait theo % (không còn x/12) ---
    const traitList = document.getElementById("traitList");
    if (traitList) {
      traitList.innerHTML = "";
      keys.forEach((k) => {
        const pct = Math.round(pct100[k]);
        const item = document.createElement("div");
        item.className = "trait-item";
        item.innerHTML = `
          <div class="trait-name">${labelMap[k]}</div>
          <div class="trait-bar">
            <div class="trait-fill" style="width:${pct}%;"></div>
          </div>
          <div style="font-size:12px; margin-top:5px;">${pct}%</div>
        `;
        traitList.appendChild(item);
      });
    }

    // --- Thống kê XP / Coin / Huy hiệu ---
    const progress = (data && data.gameProgress) || {};
    const totalXP = Object.values(progress).reduce((s, g) => s + (g?.xp || 0), 0);
    const totalCoin = Object.values(progress).reduce((s, g) => s + (g?.coin || 0), 0);
    const badge =
      totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

    const xpEl = document.getElementById("profileXP");
    const coinEl = document.getElementById("profileCoin");
    const badgeEl = document.getElementById("profileBadge");
    if (xpEl) xpEl.textContent = totalXP;
    if (coinEl) coinEl.textContent = totalCoin;
    if (badgeEl) badgeEl.textContent = badge;
  }

  // Export
  window.App.Profile = { renderProfile };
})();
