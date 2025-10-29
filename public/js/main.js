// === js/main.js (fixed) ===
(() => {
  // Lấy instance từ js/firebase.js
  const auth = window.firebaseAuth;
  const db   = window.firebaseDB;

  if (!auth || !db) {
    console.error("Firebase chưa sẵn sàng (firebaseAuth/firebaseDB undefined). Kiểm tra thứ tự load script!");
    return;
  }

  let currentUser = null;
  let answeredCount = 0;
  const totalQuestions = 12;
  let lastXP = 0, lastCoin = 0;
  let radarChart = null;

  // === DOM READY ===
  window.addEventListener("DOMContentLoaded", () => {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`${id} not found`);
        return;
      }
      el.type = "button"; // tránh submit/reload nếu nằm trong <form>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        handleAuth(fn, id);
      });
    };

    // Đăng nhập / Đăng ký
    bind("loginBtn",  login);
    bind("signupBtn", signup);

    // Các nút khác trong app
    const logoutBtn  = document.getElementById("logoutBtn");
    const profileBtn = document.getElementById("profileBtn");
    const backBtn    = document.getElementById("backBtn");

    if (logoutBtn)  logoutBtn.addEventListener("click", () => auth.signOut().then(() => location.reload()));
    if (profileBtn) profileBtn.addEventListener("click", showProfile);
    if (backBtn)    backBtn.addEventListener("click", backToGameBoard);

    // Khởi tạo quiz
    setupQuiz();

    // Lắng nghe trạng thái auth
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        loadUserDataAndShowApp();
      }
    });
  });

  // === AUTH ===
  function handleAuth(authFn, btnId) {
    const email  = document.getElementById("email")?.value.trim();
    const pass   = document.getElementById("password")?.value;
    const msgEl  = document.getElementById("authMsg");
    const button = document.getElementById(btnId);

    if (!email || !pass) {
      if (msgEl) {
        msgEl.textContent = "Vui lòng nhập email và mật khẩu!";
        msgEl.style.color = "red";
      }
      return;
    }

    if (button) {
      button.disabled = true;
      button.classList.add("loading");
      button.textContent = "";
    }
    if (msgEl) {
      msgEl.textContent = "Đang xử lý...";
      msgEl.style.color = "#e11d48";
    }

    authFn(email, pass)
      .then(() => {
        if (msgEl) {
          msgEl.textContent = "Thành công! Đang tải...";
          msgEl.style.color = "green";
        }
      })
      .catch(err => {
        console.error(err.code, err.message);
        if (msgEl) {
          msgEl.textContent = err.message;
          msgEl.style.color = "red";
        }
        if (button) {
          button.disabled = false;
          button.classList.remove("loading");
          button.textContent = btnId === "signupBtn" ? "Đăng ký" : "Đăng nhập";
        }
      });
  }

  function signup(email, pass) {
    return auth.fetchSignInMethodsForEmail(email)
      .then(methods => {
        if (methods.length > 0) throw new Error("Email đã được sử dụng!");
        return auth.createUserWithEmailAndPassword(email, pass);
      })
      .then(cred =>
        db.ref("users/" + cred.user.uid + "/profile").set({
          email,
          joined: new Date().toISOString().split("T")[0]
        }).catch(e => {
          // Không làm fail signup nếu ghi DB lỗi
          console.warn("DB write failed:", e);
        }).then(() => cred)
      );
  }

  function login(email, pass) {
    return auth.signInWithEmailAndPassword(email, pass);
  }

  // === TẢI APP ===
  function loadUserDataAndShowApp() {
    const authScreen = document.getElementById("authScreen");
    const mainApp    = document.getElementById("mainApp");
    const userEmail  = document.getElementById("userEmail");

    if (authScreen) authScreen.classList.add("hidden");
    if (mainApp)    mainApp.classList.remove("hidden");
    if (userEmail && currentUser?.email) userEmail.textContent = currentUser.email.split("@")[0];

    // Lần đầu: lấy dữ liệu & hiển thị
    db.ref("users/" + currentUser.uid).once("value").then(snap => {
      const data = snap.val() || {};
      updateGlobalStats(data);
      if (data.quizDone) showGameBoard(data);
      else document.getElementById("quiz")?.classList.remove("hidden");
    });

    // Realtime cập nhật
    db.ref("users/" + currentUser.uid).on("value", snap => {
      const data = snap.val() || {};
      updateGlobalStats(data);
      if (!document.getElementById("profile")?.classList.contains("hidden")) {
        renderProfile(data);
      }
    });
  }

  // === CẬP NHẬT XP, COIN ===
  function updateGlobalStats(data) {
    const progress = data.gameProgress || {};
    let totalXP = 0, totalCoin = 0;
    Object.values(progress).forEach(g => { totalXP += g?.xp || 0; totalCoin += g?.coin || 0; });
    const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

    if (totalXP > lastXP)   showToast(`+${totalXP - lastXP} XP!`);
    if (totalCoin > lastCoin) showToast(`+${totalCoin - lastCoin} Coin!`);
    lastXP = totalXP; lastCoin = totalCoin;

    const xpEl    = document.getElementById("globalXP");
    const coinEl  = document.getElementById("globalCoin");
    const badgeEl = document.getElementById("globalBadge");
    if (xpEl)    xpEl.textContent = totalXP;
    if (coinEl)  coinEl.textContent = totalCoin;
    if (badgeEl) badgeEl.textContent = badge;
  }

  // === TRẮC NGHIỆM ===
  function setupQuiz() {
    const questions    = document.querySelectorAll(".question");
    const submitBtn    = document.getElementById("submitBtn");
    const alertBox     = document.getElementById("alert");
    const missingCount = document.getElementById("missingCount");

    if (!questions?.length || !submitBtn) return;

    questions.forEach(q => {
      const options    = q.querySelectorAll(".option");
      const otherInput = q.querySelector(".other-input");

      options.forEach(opt => {
        opt.addEventListener("click", () => {
          options.forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
          if (opt.classList.contains("other-trigger") && otherInput) {
            otherInput.style.display = "block";
          } else if (otherInput) {
            otherInput.style.display = "none";
          }
          checkAllAnswered();
        });
      });

      const input = otherInput?.querySelector("input");
      if (input) input.addEventListener("input", checkAllAnswered);
    });

    function checkAllAnswered() {
      answeredCount = 0;
      questions.forEach(q => {
        const selected = q.querySelector(".option.selected");
        const otherVal = q.querySelector(".other-input input")?.value.trim();
        if (selected || otherVal) answeredCount++;
      });
      if (missingCount) missingCount.textContent = totalQuestions - answeredCount;
      if (alertBox)     alertBox.style.display = answeredCount === totalQuestions ? "none" : "block";
      submitBtn.disabled = answeredCount !== totalQuestions;
    }

    submitBtn.addEventListener("click", () => {
      const traits = { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
      questions.forEach(q => {
        const selected = q.querySelector(".option.selected");
        if (selected?.dataset?.score) {
          const [trait, score] = selected.dataset.score.split(":");
          traits[trait] += parseInt(score, 10);
        }
      });

      db.ref("users/" + currentUser.uid).update({
        traits,
        quizDone: true
      }).then(() => {
        showToast("Hoàn tất trắc nghiệm! Đang tải game...");
        loadUserDataAndShowApp();
      });
    });
  }

  // === GAME BOARD ===
  function showGameBoard(data) {
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("gameBoard")?.classList.remove("hidden");

    const traits    = data.traits || {};
    const highTrait = Object.keys(traits).reduce((a, b) => (traits[a] > traits[b] ? a : b), "creativity");
    const traitToGame = { creativity:"art", competitiveness:"math", sociability:"english", playfulness:"game", self_improvement:"science", perfectionism:"puzzle" };
    const recommendedGame = traitToGame[highTrait] || "art";

    const vnNames = { creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội", playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn" };
    const welcome = document.getElementById("welcomeMsg");
    if (welcome) {
      welcome.innerHTML = `Dựa trên <strong>${vnNames[highTrait]}</strong>, gợi ý: <strong style="color:#e11d48">${recommendedGame.toUpperCase()}</strong>`;
    }

    const grid = document.getElementById("gameGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const games = [
      { id:"art",     title:"Vẽ Tranh AI",  icon:"Art",     level:"Sáng tạo",       rec: highTrait === "creativity" },
      { id:"math",    title:"Toán Siêu Tốc",icon:"Math",    level:"Cạnh tranh",      rec: highTrait === "competitiveness" },
      { id:"english", title:"Học Từ Vựng", icon:"English", level:"Xã hội",          rec: highTrait === "sociability" },
      { id:"science", title:"Thí Nghiệm",  icon:"Science", level:"Tự cải thiện",    rec: highTrait === "self_improvement" },
      { id:"puzzle",  title:"Ghép Hình",   icon:"Puzzle",  level:"Cầu toàn",        rec: highTrait === "perfectionism" },
      { id:"game",    title:"Mini Game",   icon:"Game",    level:"Vui vẻ",          rec: highTrait === "playfulness" }
    ];

    games.forEach(g => {
      const card = document.createElement("div");
      card.className = `game-card ${g.rec ? "recommended" : ""}`;
      card.innerHTML = `
        <div class="game-icon">${g.icon}</div>
        <div class="game-title">${g.title}</div>
        <div class="game-level">${g.level}</div>
        ${g.rec ? '<div class="badge">GỢI Ý</div>' : ""}
      `;
      card.addEventListener("click", () => showToast(`Chơi ${g.title} (sắp có!)`));
      grid.appendChild(card);
    });
  }

  // === HỒ SƠ ===
  function showProfile() {
    document.getElementById("gameBoard")?.classList.add("hidden");
    document.getElementById("profile")?.classList.remove("hidden");
    db.ref("users/" + currentUser.uid).once("value").then(snap => renderProfile(snap.val() || {}));
  }

  function backToGameBoard() {
    document.getElementById("profile")?.classList.add("hidden");
    document.getElementById("gameBoard")?.classList.remove("hidden");
  }

  function renderProfile(data) {
    const traits = data.traits || { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
    const labels = ["Sáng tạo","Cạnh tranh","Xã hội","Vui vẻ","Tự cải thiện","Cầu toàn"];
    const values = Object.values(traits);

    const canvas = document.getElementById("radarChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (window.radarChart) window.radarChart.destroy();
      window.radarChart = new Chart(ctx, {
        type: "radar",
        data: { labels, datasets: [{ label: "Tính cách", data: values, backgroundColor: "rgba(225, 29, 72, 0.2)", borderColor: "#e11d48", pointBackgroundColor: "#e11d48", borderWidth: 2 }] },
        options: { scales: { r: { min: 0, max: 12, ticks: { stepSize: 3 } } }, plugins: { legend: { display: false } } }
      });
    }

    const traitList = document.getElementById("traitList");
    if (traitList) {
      traitList.innerHTML = "";
      const names = { creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội", playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn" };
      Object.keys(traits).forEach(t => {
        const item = document.createElement("div");
        item.className = "trait-item";
        item.innerHTML = `
          <div class="trait-name">${names[t]}</div>
          <div class="trait-bar"><div class="trait-fill" style="width:${(traits[t]/12)*100}%"></div></div>
          <div style="font-size:12px; margin-top:5px;">${traits[t]}/12</div>`;
        traitList.appendChild(item);
      });
    }

    const progress = data.gameProgress || {};
    let totalXP = 0, totalCoin = 0;
    Object.values(progress).forEach(g => { totalXP += g?.xp || 0; totalCoin += g?.coin || 0; });
    const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

    const xp = document.getElementById("profileXP");
    const coin = document.getElementById("profileCoin");
    const badgeEl = document.getElementById("profileBadge");
    if (xp) xp.textContent = totalXP;
    if (coin) coin.textContent = totalCoin;
    if (badgeEl) badgeEl.textContent = badge;
  }

  // === TOAST ===
  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
})();
