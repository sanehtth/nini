// js/profile.js - AN TOÀN, KHÔNG LỖI CHART
class ProfileManager {
  constructor() {
    this.db = window.firebaseDB;
    this.currentUser = null;
    this.radarChart = null;
    this.init();
  }

  init() {
    const auth = window.firebaseAuth;
    auth.onAuthStateChanged(user => {
      if (user) this.currentUser = user;
    });

    // ĐỢI DOM + CHART.JS TẢI XONG
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof Chart === "undefined") {
        console.error("Chart.js chưa tải!");
        return;
      }
      this.checkChartReady();
    });
  }

  checkChartReady() {
    if (document.getElementById("radarChart") && typeof Chart !== "undefined") {
      // OK → có thể vẽ
    } else {
      setTimeout(() => this.checkChartReady(), 100);
    }
  }

  // === HIỂN THỊ HỒ SƠ ===
  show() {
    document.getElementById("gameBoard").classList.add("hidden");
    document.getElementById("profile").classList.remove("hidden");

    if (!this.currentUser) return;

    this.db.ref('users/' + this.currentUser.uid).once('value').then(snap => {
      this.render(snap.val() || {});
    });
  }

  // === VẼ HỒ SƠ ===
  render(data) {
    const traits = data.traits || { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
    const labels = ["Sáng tạo", "Cạnh tranh", "Xã hội", "Vui vẻ", "Tự cải thiện", "Cầu toàn"];
    const values = Object.values(traits);

    const ctx = document.getElementById("radarChart")?.getContext("2d");
    if (!ctx) return;

    if (this.radarChart) this.radarChart.destroy();

    this.radarChart = new Chart(ctx, {
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
      options: {
        scales: { r: { min: 0, max: 12, ticks: { stepSize: 3 } } },
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // === VẼ THANH TIẾN TRÌNH ===
    const traitList = document.getElementById("traitList");
    if (!traitList) return;
    traitList.innerHTML = "";
    const names = { creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội", playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn" };
    Object.keys(traits).forEach(t => {
      const item = document.createElement("div");
      item.className = "trait-item";
      item.innerHTML = `
        <div class="trait-name">${names[t]}</div>
        <div class="trait-bar"><div class="trait-fill" style="width:${(traits[t]/12)*100}%"></div></div>
        <div style="font-size:12px; margin-top:5px;">${traits[t]}/12</div>
      `;
      traitList.appendChild(item);
    });

    // === THỐNG KÊ ===
    const progress = data.gameProgress || {};
    let totalXP = 0, totalCoin = 0;
    Object.values(progress).forEach(g => { totalXP += g.xp || 0; totalCoin += g.coin || 0; });
    const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;
    const xpEl = document.getElementById("profileXP");
    const coinEl = document.getElementById("profileCoin");
    const badgeEl = document.getElementById("profileBadge");
    if (xpEl) xpEl.textContent = totalXP;
    if (coinEl) coinEl.textContent = totalCoin;
    if (badgeEl) badgeEl.textContent = badge;
  }

  back() {
    document.getElementById("profile").classList.add("hidden");
    document.getElementById("gameBoard").classList.remove("hidden");
  }
}

const profileManager = new ProfileManager();
window.showProfile = () => profileManager.show();
window.backToGameBoard = () => profileManager.back();
