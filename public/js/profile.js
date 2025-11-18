<!-- public/js/profile.js -->
/**
 * Vẽ hồ sơ: chuẩn hoá 6 trait thành phần trăm (0..100),
 * radar hiển thị theo mốc 0–60 (tương ứng 0–100% ≈ 0–60).
 */
window.App = window.App || {};

(() => {
  let radarChart = null;

  // Map tên ⇒ label tiếng Việt
  const LABEL_VI = {
    creativity:        "Sáng tạo",
    competitiveness:   "Cạnh tranh",
    sociability:       "Xã hội",
    playfulness:       "Vui vẻ",
    self_improvement:  "Tự cải thiện",
    perfectionism:     "Cầu toàn",
  };
  const KEYS = Object.keys(LABEL_VI); // 6 keys cố định

  /** Chuẩn hoá 6 trait -> % và điểm radar 0..60 */
  function normalizeTraits(traitsRaw) {
    const vals = KEYS.map(k => Number(traitsRaw?.[k] || 0));
    const total = vals.reduce((s,v)=>s+v,0);
    // Nếu total = 0 => trả mảng 0
    if (!total) return { pct: KEYS.map(_=>0), radar: KEYS.map(_=>0) };

    const pct   = vals.map(v => (v * 100) / total);  // %
    const radar = pct.map(p => (p * 60) / 100);      // map 0..100% -> 0..60

    return { pct, radar };
  }

  /** Vẽ UI hồ sơ */
  function renderProfile(data) {
    const traitsRaw = data?.traits || {};
    const { pct, radar } = normalizeTraits(traitsRaw);

    // Vẽ radar
    const canvas = document.getElementById("radarChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (radarChart && typeof radarChart.destroy === "function") radarChart.destroy();

      radarChart = new Chart(ctx, {
        type: "radar",
        data: {
          labels: KEYS.map(k => LABEL_VI[k]),
          datasets: [{
            label: "Tính cách (0–60)",
            data: radar,
            backgroundColor: "rgba(225,29,72,0.20)",
            borderColor: "#e11d48",
            pointBackgroundColor: "#e11d48",
            borderWidth: 2
          }]
        },
        options: {
          scales: {
            r: {
              min: 0,
              max: 60,
              ticks: { stepSize: 20 },
              grid: { circular: true }
            }
          },
          plugins: { legend: { display: false } },
          animation: false
        }
      });
    }

    // Thanh tiến độ từng trait (hiển thị 20–40–60%)
    const list = document.getElementById("traitList");
    if (list) {
      list.innerHTML = "";
      KEYS.forEach((k, i) => {
        const percent = pct[i];             // 0..100
        const w       = Math.round((percent / 100) * 60); // đổi sang 0..60 để khớp UI "20-40-60%"
        const item = document.createElement("div");
        item.className = "trait-item";
        item.innerHTML = `
          <div class="trait-name">${LABEL_VI[k]}</div>
          <div class="trait-bar">
            <div class="trait-fill" style="width:${(w/60)*100}%"></div>
          </div>
          <div class="trait-note">${w}/60</div>
        `;
        list.appendChild(item);
      });
    }

    /* Thống kê XP/Coin/Huy hiệu (nếu có)
    const progress = data?.gameProgress || {};
    const totalXP   = Object.values(progress).reduce((s,g)=>s + (g?.xp||0), 0);
    const totalCoin = Object.values(progress).reduce((s,g)=>s + (g?.coin||0), 0);
    const badge     = totalXP < 1000 ? 1
                    : totalXP < 5000 ? 2
                    : totalXP < 10000 ? 3
                    : totalXP < 20000 ? 4 : 5;

    const xpEl    = document.getElementById("profileXP");
    const coinEl  = document.getElementById("profileCoin");
    const badgeEl = document.getElementById("profileBadge");
    if (xpEl)   xpEl.textContent = totalXP;
    if (coinEl) coinEl.textContent = totalCoin;
    if (badgeEl)badgeEl.textContent = badge;*/
  }
  // Xuất ra window để main.js gọi
  window.App.Profile = { renderProfile };
})();


