// js/main.js - SIÊU GỌN
const auth = window.firebaseAuth;
const db = window.firebaseDB;

let currentUser = null;
let lastXP = 0, lastCoin = 0;

// === DOM READY ===
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("signupBtn").onclick = () => handleAuth(signup, "signupBtn");
  document.getElementById("loginBtn").onclick = () => handleAuth(login, "loginBtn");
  document.getElementById("logoutBtn").onclick = () => auth.signOut().then(() => location.reload());

  // NÚT HỒ SƠ → GỌI profile.js
  document.getElementById("profileBtn").onclick = showProfile;
  document.getElementById("backBtn").onclick = backToGameBoard;

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      loadUserDataAndShowApp();
    }
  });
});

// === AUTH ===
function handleAuth(authFn, btnId) {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value;
  const msg = document.getElementById("authMsg");
  const button = document.getElementById(btnId);

  if (!email || !pass) {
    msg.textContent = "Vui lòng nhập email và mật khẩu!";
    msg.style.color = "red";
    return;
  }

  button.disabled = true;
  button.classList.add("loading");
  button.textContent = "";
  msg.textContent = "Đang xử lý...";
  msg.style.color = "#e11d48";

  authFn(email, pass)
    .then(() => {
      msg.textContent = "Thành công! Đang tải...";
      msg.style.color = "green";
    })
    .catch(err => {
      msg.textContent = err.message;
      msg.style.color = "red";
      button.disabled = false;
      button.classList.remove("loading");
      button.textContent = btnId === "signupBtn" ? "Đăng ký" : "Đăng nhập";
    });
}

function signup(email, pass) {
  return auth.fetchSignInMethodsForEmail(email)
    .then(methods => {
      if (methods.length > 0) throw new Error("Email đã được sử dụng!");
      return auth.createUserWithEmailAndPassword(email, pass);
    })
    .then(cred => {
      return db.ref('users/' + cred.user.uid + '/profile').set({
        email,
        joined: new Date().toISOString().split('T')[0]
      }).then(() => cred);
    });
}

function login(email, pass) {
  return auth.signInWithEmailAndPassword(email, pass);
}

// === TẢI APP ===
function loadUserDataAndShowApp() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  document.getElementById("userEmail").textContent = currentUser.email.split('@')[0];

  db.ref('users/' + currentUser.uid).once('value').then(snap => {
    const data = snap.val() || {};
    updateGlobalStats(data);
    if (data.quizDone) {
      showGameBoard(data);
    } else {
      document.getElementById("quiz").classList.remove("hidden");
      startQuiz();
    }
  });

  db.ref('users/' + currentUser.uid).on('value', snap => {
    const data = snap.val() || {};
    updateGlobalStats(data);
  });
}

// === CẬP NHẬT XP, COIN ===
function updateGlobalStats(data) {
  const progress = data.gameProgress || {};
  let totalXP = 0, totalCoin = 0;
  Object.values(progress).forEach(g => {
    totalXP += g.xp || 0;
    totalCoin += g.coin || 0;
  });
  const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

  if (totalXP > lastXP) showToast(`+${totalXP - lastXP} XP!`);
  if (totalCoin > lastCoin) showToast(`+${totalCoin - lastCoin} Coin!`);
  lastXP = totalXP;
  lastCoin = totalCoin;

  document.getElementById("globalXP").textContent = totalXP;
  document.getElementById("globalCoin").textContent = totalCoin;
  document.getElementById("globalBadge").textContent = badge;
}

// === GAME BOARD ===
function showGameBoard(data) {
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("gameBoard").classList.remove("hidden");

  const traits = data.traits || {};
  const highTrait = Object.keys(traits).reduce((a, b) => traits[a] > traits[b] ? a : b, "creativity");
  const traitToGame = { creativity: "art", competitiveness: "math", sociability: "english", playfulness: "game", self_improvement: "science", perfectionism: "puzzle" };
  const recommendedGame = traitToGame[highTrait] || "art";

  const vietnameseNames = { creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội", playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn" };
  document.getElementById("welcomeMsg").innerHTML = `Dựa trên <strong>${vietnameseNames[highTrait]}</strong>, gợi ý: <strong style="color:#e11d48">${recommendedGame.toUpperCase()}</strong>`;

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
    card.onclick = () => showToast(`Chơi ${g.title} (sắp có!)`);
    grid.appendChild(card);
  });
}

// === TOAST ===
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
