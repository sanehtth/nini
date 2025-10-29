window.App = window.App || {};

(() => {
  const TraitToGame = {
    creativity: "art",
    competitiveness: "math",
    sociability: "english",
    playfulness: "game",
    self_improvement: "science",
    perfectionism: "puzzle"
  };

  function showGameBoard(data, uid) {
    const grid = document.getElementById("gameGrid");
    if (!grid) return;

    const traits = data?.traits || {};
    const highTrait = Object.keys(traits).reduce((a,b)=> (traits[a]||0)>(traits[b]||0)?a:b, "creativity");
    const recommended = TraitToGame[highTrait] || "art";

    const vi = { creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội", playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn" };
    const msg = document.getElementById("welcomeMsg");
    if (msg) msg.innerHTML = `Dựa trên <strong>${vi[highTrait]}</strong>, gợi ý: <strong style="color:#e11d48">${(recommended||"ART").toUpperCase()}</strong>`;

    const games = [
      { id:"art", title:"Vẽ Tranh AI",  icon:"Art",     level:"Sáng tạo" },
      { id:"math", title:"Toán Siêu Tốc", icon:"Math",  level:"Cạnh tranh" },
      { id:"english", title:"Học Từ Vựng", icon:"English", level:"Xã hội" },
      { id:"science", title:"Thí Nghiệm",  icon:"Science", level:"Tự cải thiện" },
      { id:"puzzle", title:"Ghép Hình",    icon:"Puzzle",  level:"Cầu toàn" },
      { id:"game", title:"Mini Game",      icon:"Game",    level:"Vui vẻ" }
    ];

    grid.innerHTML = "";
    games.forEach(g=>{
      const card = document.createElement("div");
      card.className = `game-card ${g.id===recommended?'recommended':''}`;
      card.innerHTML = `
        <div class="game-icon">${g.icon}</div>
        <div class="game-title">${g.title}</div>
        <div class="game-level">${g.level}</div>
        ${g.id===recommended ? '<div class="badge">GỢI Ý</div>' : ''}`;
      card.addEventListener("click", ()=>{
        if (window.App.Analytics) window.App.Analytics.logActivity(uid, g.id);
        showToast(`Chơi ${g.title} (sắp có!)`);
      });
      grid.appendChild(card);
    });
  }

  function showToast(msg){
    const t=document.createElement("div");
    t.className="toast"; t.textContent=msg;
    document.body.appendChild(t); setTimeout(()=>t.remove(),3000);
  }

  window.App.Game = { showGameBoard };
})();
