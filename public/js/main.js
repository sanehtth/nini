// js/main.js
const auth = window.firebaseAuth;
const db = window.firebaseDB;

let currentUser = null;
let answeredCount = 0;
const totalQuestions = 12;
let lastXP = 0, lastCoin = 0;
let radarChart = null;

// === DOM READY ===
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("signupBtn").onclick = () => handleAuth(signup, "signupBtn");
  document.getElementById("loginBtn").onclick = () => handleAuth(login, "loginBtn");
  document.getElementById("logoutBtn").onclick = () => auth.signOut().then(() => location.reload());
  document.getElementById("profileBtn").onclick = showProfile;
  document.getElementById("backBtn").onclick = backToGameBoard;

  setupQuiz();

  //======== HAM VA DATA KHI UI CHUA CO DU DATA=============
  async function ensureUserSchema(uid, emailIfMissing) {
  const userRef = db.ref("users/" + uid);
  const snap = await userRef.once("value");
  const data = snap.val() || {};

  data.profile = Object.assign(
    { email: emailIfMissing || "", joined: new Date().toISOString().split("T")[0], consent_insight: false },
    data.profile || {}
  );
  data.stats   = Object.assign({ xp: 0, coin: 0, badge: 1 }, data.stats || {});
  data.metrics = Object.assign({ pi: 0, fi: 0, pi_star: 0 }, data.metrics || {});
  data.skills  = Object.assign({ listening: 0, speaking: 0, reading: 0, writing: 0 }, data.skills || {});
  data.traits  = Object.assign({
    creativity: 0, competitiveness: 0, sociability: 0,
    playfulness: 0, self_improvement: 0, perfectionism: 0
  }, data.traits || {});
  if (typeof data.quizDone !== "boolean") data.quizDone = false;
  if (!data.weekly)       data.weekly = {};
  if (!data.gameProgress) data.gameProgress = {};

  await userRef.update(data); // chỉ bổ sung phần thiếu, không ghi đè giá trị đang có
}
// ===========  HET HAM VA DATA =========================
//==========HAM BAT LAI MAN HINH KHI CHUA CO USER ===========
  function showLoginFallback() {
  const a = document.getElementById("authScreen");
  const m = document.getElementById("mainApp") || document.getElementById("appScreen");
  const q = document.getElementById("quiz") || document.getElementById("quizScreen");
  a && a.classList.remove("hidden");
  m && m.classList.add("hidden");
  q && q.classList.add("hidden");
}
// ============= HET HAM ======================
  
  auth.onAuthStateChanged(async (user) => {
  try {
    if (!user) { 
      currentUser = null;
      showLoginFallback();           // hiện form đăng nhập
      return;
    }
    currentUser = user;

    // 👉 Mỗi lần vào app: vá schema cho đủ đúng cấu trúc bạn muốn
    await ensureUserSchema(user.uid, user.email);

    // (tuỳ chọn) nếu chưa có traits thì mở quiz trong index (SPA)
    // const t = (await db.ref("users/"+user.uid+"/traits").once("value")).val() || {};
    // const emptyTraits = Object.values(t).every(v => (Number(v)||0) === 0);
    // if (emptyTraits && location.hash !== "#quiz") location.hash = "#quiz";

    // Sau khi bảo đảm schema, tải dữ liệu & hiển thị app (hàm bạn đang có)
    loadUserDataAndShowApp();
  } catch (e) {
    console.error("[onAuthStateChanged]", e);
    showLoginFallback();
  }
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
// ===== ĐĂNG KÝ =====
function signup(email, pass) {
  const auth = firebase.auth();
  const db   = firebase.database();

  // Kiểm tra email đã dùng chưa bằng Auth (khớp với ảnh của bạn)
  return auth.fetchSignInMethodsForEmail(email).then((methods) => {
    if (methods.length > 0) throw new Error("Email đã được sử dụng!");
    return auth.createUserWithEmailAndPassword(email, pass);
  }).then(async (cred) => {
    const uid = cred.user.uid;
    const today = new Date().toISOString().split("T")[0];

    // weekId ISO (thứ 2..CN)
    const monday = new Date();
    const d = (monday.getDay() + 6) % 7; // Mon=0
    monday.setHours(0,0,0,0); monday.setDate(monday.getDate() - d);
    const weekId = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,"0")}-${String(monday.getDate()).padStart(2,"0")}`;

    // Tài liệu mặc định theo schema bạn yêu cầu
    const DEFAULT_DOC = {
      profile: { email, joined: today, consent_insight: false },

      stats:   { xp: 0, coin: 0, badge: 1 },                     // huy hiệu = badge
      metrics: { pi: 0, fi: 0, pi_star: 0 },

      // snapshots cho UI
      skills:  { listening: 0, speaking: 0, reading: 0, writing: 0 },
      traits:  { creativity: 0, competitiveness: 0, sociability: 0,
                 playfulness: 0, self_improvement: 0, perfectionism: 0 },

      // cờ tiện lợi
      quizDone: false,

      // vùng weekly
      weekly: {
        [weekId]: {
          raw: { listening: 0, speaking: 0, reading: 0, writing: 0 },
          pct: { listening: 0, speaking: 0, reading: 0, writing: 0 },
          traits_pct: { creativity: 0, competitiveness: 0, sociability: 0,
                        playfulness: 0, self_improvement: 0, perfectionism: 0 },
          pi: 0, fi: 0, pi_star: 0
        }
      },

      // phần game tuỳ bạn dùng
      gameProgress: {}
    };

    // Ghi một lần
    await db.ref("users/"+uid).set(DEFAULT_DOC);

    // chuyển sang quiz trong index (nếu dùng SPA #quiz)
    try { localStorage.setItem("justSignedUp", "1"); } catch(e){}
    location.href = "index.html#quiz";

    return cred;
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
    if (data.quizDone) showGameBoard(data);
    else document.getElementById("quiz").classList.remove("hidden");
  });

  db.ref('users/' + currentUser.uid).on('value', snap => {
    const data = snap.val() || {};
    updateGlobalStats(data);
    if (!document.getElementById("profile").classList.contains("hidden")) renderProfile(data);
  });
}

// === CẬP NHẬT XP, COIN ===
function updateGlobalStats(data) {
  const progress = data.gameProgress || {};
  let totalXP = 0, totalCoin = 0;
  Object.values(progress).forEach(g => { totalXP += g.xp || 0; totalCoin += g.coin || 0; });
  const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

  if (totalXP > lastXP) showToast(`+${totalXP - lastXP} XP!`);
  if (totalCoin > lastCoin) showToast(`+${totalCoin - lastCoin} Coin!`);
  lastXP = totalXP; lastCoin = totalCoin;

  document.getElementById("globalXP").textContent = totalXP;
  document.getElementById("globalCoin").textContent = totalCoin;
  document.getElementById("globalBadge").textContent = badge;
}

// === TRẮC NGHIỆM ===
function setupQuiz() {
  const questions = document.querySelectorAll(".question");
  const submitBtn = document.getElementById("submitBtn");
  const alert = document.getElementById("alert");
  const missingCount = document.getElementById("missingCount");

  questions.forEach(q => {
    const options = q.querySelectorAll(".option");
    const otherInput = q.querySelector(".other-input");

    options.forEach(opt => {
      opt.onclick = () => {
        options.forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        if (opt.classList.contains("other-trigger") && otherInput) {
          otherInput.style.display = "block";
        } else if (otherInput) {
          otherInput.style.display = "none";
        }
        checkAllAnswered();
      };
    });

    const input = otherInput?.querySelector("input");
    if (input) input.oninput = checkAllAnswered;
  });

  function checkAllAnswered() {
    answeredCount = 0;
    questions.forEach(q => {
      const selected = q.querySelector(".option.selected");
      const otherVal = q.querySelector(".other-input input")?.value.trim();
      if (selected || otherVal) answeredCount++;
    });
    missingCount.textContent = totalQuestions - answeredCount;
    alert.style.display = answeredCount === totalQuestions ? "none" : "block";
    submitBtn.disabled = answeredCount !== totalQuestions;
  }

  submitBtn.onclick = () => {
    const traits = { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
    questions.forEach(q => {
      const selected = q.querySelector(".option.selected");
      if (selected && selected.dataset.score) {
        const [trait, score] = selected.dataset.score.split(":");
        traits[trait] += parseInt(score);
      }
    });

    db.ref('users/' + currentUser.uid).update({
      traits,
      quizDone: true
    }).then(() => {
      showToast("Hoàn tất trắc nghiệm! Đang tải game...");
      loadUserDataAndShowApp();
    });
  };
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

// === HỒ SƠ ===
function showProfile() {
  document.getElementById("gameBoard").classList.add("hidden");
  document.getElementById("profile").classList.remove("hidden");
  db.ref('users/' + currentUser.uid).once('value').then(snap => renderProfile(snap.val()));
}

function backToGameBoard() {
  document.getElementById("profile").classList.add("hidden");
  document.getElementById("gameBoard").classList.remove("hidden");
}

function renderProfile(data) {
  const traits = data.traits || { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
  const labels = ["Sáng tạo", "Cạnh tranh", "Xã hội", "Vui vẻ", "Tự cải thiện", "Cầu toàn"];
  const values = Object.values(traits);

  const ctx = document.getElementById("radarChart").getContext("2d");
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: "radar",
    data: { labels, datasets: [{ label: "Tính cách", data: values, backgroundColor: "rgba(225, 29, 72, 0.2)", borderColor: "#e11d48", pointBackgroundColor: "#e11d48", borderWidth: 2 }] },
    options: { scales: { r: { min: 0, max: 12, ticks: { stepSize: 3 } } }, plugins: { legend: { display: false } } }
  });

  const traitList = document.getElementById("traitList");
  traitList.innerHTML = "";
  const names = { creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội", playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn" };
  Object.keys(traits).forEach(t => {
    const item = document.createElement("div");
    item.className = "trait-item";
    item.innerHTML = `<div class="trait-name">${names[t]}</div><div class="trait-bar"><div class="trait-fill" style="width:${(traits[t]/12)*100}%"></div></div><div style="font-size:12px; margin-top:5px;">${traits[t]}/12</div>`;
    traitList.appendChild(item);
  });

  const progress = data.gameProgress || {};
  let totalXP = 0, totalCoin = 0;
  Object.values(progress).forEach(g => { totalXP += g.xp || 0; totalCoin += g.coin || 0; });
  const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;
  document.getElementById("profileXP").textContent = totalXP;
  document.getElementById("profileCoin").textContent = totalCoin;
  document.getElementById("profileBadge").textContent = badge;
}

// === TOAST ===
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
});




