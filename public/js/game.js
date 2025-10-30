// js/game.js - GAME BOARD ĐỘC LẬP
class GameManager {
  constructor() {
    this.db = window.firebaseDB;
    this.currentUser = null;
    this.init();
  }

  init() {
    const auth = window.firebaseAuth;
    auth.onAuthStateChanged(user => {
      if (user) this.currentUser = user;
    });
  }

  // === HIỂN THỊ GAME BOARD ===
  show(data) {
    document.getElementById("quiz").classList.add("hidden");
    document.getElementById("gameBoard").classList.remove("hidden");

    const traits = data.traits || {};
    const highTrait = Object.keys(traits).reduce((a, b) => traits[a] > traits[b] ? a : b, "creativity");
    const traitToGame = {
      creativity: "art",
      competitiveness: "math",
      sociability: "english",
      playfulness: "game",
      self_improvement: "science",
      perfectionism: "puzzle"
    };
    const recommendedGame = traitToGame[highTrait] || "art";

    const vietnameseNames = {
      creativity: "Sáng tạo",
      competitiveness: "Cạnh tranh",
      sociability: "Xã hội",
      playfulness: "Vui vẻ",
      self_improvement: "Tự cải thiện",
      perfectionism: "Cầu toàn"
    };

    document.getElementById("welcomeMsg").innerHTML = `
      Dựa trên <strong>${vietnameseNames[highTrait]}</strong>, gợi ý: 
      <strong style="color:#e11d48">${recommendedGame.toUpperCase()}</strong>
    `;

    const grid = document.getElementById("gameGrid");
    grid.innerHTML = "";

    const games = [
      { id: "art", title: "Vẽ Tranh AI", icon: "Art", level: "Sáng tạo", rec: highTrait === "creativity" },
      { id: "math", title: "Toán Siêu Tốc", icon: "Math", level: "Cạnh tranh", rec: highTrait === "competitiveness" },
      { id: "english", title: "Học Từ Vựng", icon: "English", level: "Xã hội", rec: highTrait === "sociability" },
      { id: "science", title: "Thí Nghiệm", icon: "Science", level: "Tự cải thiện", rec: highTrait === "self_improvement" },
      { id: "puzzle", title: "Ghép Hình", icon: "Puzzle", level: "Cầu toàn", rec: highTrait === "perfectionism" },
      { id: "game", title: "Mini Game", icon: "Game", level: "Vui vẻ", rec: highTrait === "playfulness" }
    ];

    games.forEach(g => {
      const card = document.createElement("div");
      card.className = `game-card ${g.rec ? 'recommended' : ''}`;
      card.innerHTML = `
        <div class="game-icon">${g.icon}</div>
        <div class="game-title">${g.title}</div>
        <div class="game-level">${g.level}</div>
        ${g.rec ? '<div class="badge">GỢI Ý</div>' : ''}
      `;
      card.onclick = () => this.showToast(`Chơi ${g.title} (sắp có!)`);
      grid.appendChild(card);
    });
  }

  // === TOAST (có thể dùng chung) ===
  showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
}

// GỌI TỪ BÊN NGOÀI
const gameManager = new GameManager();
window.showGameBoard = (data) => gameManager.show(data);
