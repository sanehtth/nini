(() => {
  const auth = window.App.auth;
  const db   = window.App.db;

  const $ = id => document.getElementById(id);

  // ===== AUTH BUTTONS =====
  function bindAuthButtons(){
    const bind = (id, fn) => {
      const el = $(id); if (!el) return;
      el.type = "button";
      el.addEventListener("click",(e)=>{
        e.preventDefault();
        handleAuth(fn, id);
      });
    };
    bind("loginBtn",  login);
    bind("signupBtn", signup);
    const lo = $("logoutBtn"); if (lo) lo.onclick = () => auth.signOut().then(()=>location.reload());
    const pf = $("profileBtn");if (pf) pf.onclick = showProfile;
    const bk = $("backBtn");  if (bk) bk.onclick = backToGameBoard;
  }

  function handleAuth(authFn, btnId){
    const email = $("email").value.trim();
    const pass  = $("password").value;
    const msgEl = $("authMsg");
    const btn   = $(btnId);
    if (!email || !pass){
      if (msgEl){ msgEl.textContent="Vui lòng nhập email và mật khẩu!"; msgEl.style.color="red"; }
      return;
    }
    if (btn){ btn.disabled=true; btn.classList.add("loading"); btn.textContent=""; }
    if (msgEl){ msgEl.textContent="Đang xử lý..."; msgEl.style.color="#e11d48"; }

    authFn(email, pass).catch(err=>{
      if (msgEl){ msgEl.textContent=err.message; msgEl.style.color="red"; }
      if (btn){ btn.disabled=false; btn.classList.remove("loading"); btn.textContent = (btnId==="signupBtn"?"Đăng ký":"Đăng nhập"); }
    });
  }

  function signup(email, pass){
    return auth.fetchSignInMethodsForEmail(email)
      .then(m=>{ if (m.length>0) throw new Error("Email đã được sử dụng!"); })
      .then(()=>auth.createUserWithEmailAndPassword(email, pass))
      .then(cred=> db.ref(`users/${cred.user.uid}/profile`).set({
        email, joined: new Date().toISOString().split("T")[0]
      }));
  }

  function login(email, pass){
    return auth.signInWithEmailAndPassword(email, pass);
  }

  // ===== PROFILE VIEW TOGGLE =====
  function showProfile(){
    $("gameBoard")?.classList.add("hidden");
    $("profile")?.classList.remove("hidden");
  }
  function backToGameBoard(){
    $("profile")?.classList.add("hidden");
    $("gameBoard")?.classList.remove("hidden");
  }

  // ===== AFTER SIGN-IN: ROUTE + REALTIME =====
  function onSignedIn(uid){
    // 1) Lấy snapshot 1 lần để điều phối UI
    db.ref(`users/${uid}`).once("value").then(snap=>{
      const data = snap.val() || {};
      // Có thể refresh traits theo tuần
      window.App.Analytics?.maybeRefreshWeekly(uid, data);

      // Hiển thị app
      $("authScreen")?.classList.add("hidden");
      $("mainApp")?.classList.remove("hidden");
      if ($("userEmail")) $("userEmail").textContent = (auth.currentUser.email||"").split("@")[0];

      // Nếu đã làm quiz thì vào board; chưa thì hiện quiz
      if (data.quizDone) {
        window.App.Game?.showGameBoard(data, uid);
      } else {
        $("quiz")?.classList.remove("hidden");
      }
    });

    // 2) Lắng nghe realtime để cập nhật UI tự động
    db.ref(`users/${uid}`).on("value", snap=>{
      const data = snap.val() || {};
      // Re-render profile nếu tab hồ sơ đang mở
      if (!$("profile")?.classList.contains("hidden")){
        window.App.Profile?.renderProfile(data);
      }
      // Cập nhật board nếu đang mở
      if (!$("gameBoard")?.classList.contains("hidden")){
        window.App.Game?.showGameBoard(data, uid);
      }
    });
  }

  // ===== AUTH STATE =====
  bindAuthButtons();

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;

      // ➜ NOTE: ghi UID cho behavior logger nếu bạn dùng behavior.js
      if (window.Behavior && typeof window.Behavior.setUser === "function") {
        window.Behavior.setUser(user.uid);
      }

      onSignedIn(user.uid);
    }
  });
})();

// ====== PROFILE + CHART (RADAR) ======
let radarChart = null;

// === HỒ SƠ (vẽ theo %) ===
// Thay THÊM MỚI toàn bộ hàm này
function renderProfile(data) {
  // 1) Lấy điểm thô (raw) từ DB
  const raw = data.traits || {
    creativity: 0, competitiveness: 0, sociability: 0,
    playfulness: 0, self_improvement: 0, perfectionism: 0,
  };

  // 2) Tính % thực theo tổng điểm (không ép về bội số 12)
  const rawList = [
    Number(raw.creativity)       || 0,
    Number(raw.competitiveness)  || 0,
    Number(raw.sociability)      || 0,
    Number(raw.playfulness)      || 0,
    Number(raw.self_improvement) || 0,
    Number(raw.perfectionism)    || 0,
  ];
  const sum = rawList.reduce((a, b) => a + b, 0);
  const valuesPct = sum > 0 ? rawList.map(v => (v / sum) * 100) : [0, 0, 0, 0, 0, 0];

  // 3) Vẽ radar 0–100
  const labels = ["Sáng tạo", "Cạnh tranh", "Xã hội", "Vui vẻ", "Tự cải thiện", "Cầu toàn"];
  const canvas = document.getElementById("radarChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (window.radarChart && typeof window.radarChart.destroy === "function") {
    window.radarChart.destroy();
  }

  window.radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label: "Tính cách",
        data: valuesPct,                        // dùng % thực
        backgroundColor: "rgba(225, 29, 72, 0.2)",
        borderColor: "#e11d48",
        pointBackgroundColor: "#e11d48",
        borderWidth: 2,
      }],
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 100,                              // thang chuẩn 0–100%
          ticks: {
            callback: (v) => `${v}%`,
            stepSize: 20
          },
          angleLines: { display: true },
          grid: { circular: true },
        },
      },
      plugins: { legend: { display: false } }
    },
  });

  // 4) Thanh tiến độ % (hiện 1 chữ số thập phân)
  const traitList = document.getElementById("traitList");
  if (traitList) {
    const keys = ["creativity","competitiveness","sociability",
                  "playfulness","self_improvement","perfectionism"];
    const names = {
      creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội",
      playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn"
    };

    traitList.innerHTML = "";
    keys.forEach((k, i) => {
      const pct = valuesPct[i]; // % thực
      const item = document.createElement("div");
      item.className = "trait-item";
      item.innerHTML = `
        <div class="trait-name">${names[k]}</div>
        <div class="trait-bar">
          <div class="trait-fill" style="width:${pct}%;"></div>
        </div>
        <div style="font-size:12px; margin-top:5px;">${pct.toFixed(1)}%</div>
      `;
      traitList.appendChild(item);
    });
  }

  // (Tuỳ chọn) Cập nhật thống kê XP/Coin/Huy hiệu nếu bạn đang làm ở chỗ khác thì giữ nguyên
  // document.getElementById("profileXP").textContent = ...
  // document.getElementById("profileCoin").textContent = ...
  // document.getElementById("profileBadge").textContent = ...
}


  // 6) Thống kê tổng (giữ nguyên logic hiện có)
  const progress = (data && data.gameProgress) || {};
  let totalXP = 0, totalCoin = 0;
  Object.values(progress).forEach(g => { totalXP += g.xp || 0; totalCoin += g.coin || 0; });
  const badge = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText("profileXP", totalXP);
  setText("profileCoin", totalCoin);
  setText("profileBadge", badge);
}


// ===== HIỂN/ẨN HỒ SƠ + NẠP DỮ LIỆU VẼ =====
function showProfile() {
  const prof  = document.getElementById("profile");
  const board = document.getElementById("gameBoard");
  if (board) board.classList.add("hidden");
  if (prof)  prof.classList.remove("hidden");

  const uid = window.App?.auth?.currentUser?.uid;
  if (!uid) return;
  window.App.db.ref("users/" + uid).once("value").then(snap=>{
    renderProfile(snap.val() || {});
  });
}

function backToGameBoard() {
  const prof  = document.getElementById("profile");
  const board = document.getElementById("gameBoard");
  if (prof)  prof.classList.add("hidden");
  if (board) board.classList.remove("hidden");
}

// ===== GẮN NÚT HỒ SƠ/QUAY LẠI =====
(function bindProfileButtons(){
  const pf = document.getElementById("profileBtn");
  const bk = document.getElementById("backBtn");
  if (pf) pf.addEventListener("click", (e)=>{ e.preventDefault(); showProfile(); });
  if (bk) bk.addEventListener("click", (e)=>{ e.preventDefault(); backToGameBoard(); });
})();

// ===== LISTEN REALTIME CHO TAB HỒ SƠ (nếu đang mở) =====
(function listenRealtimeForProfile(){
  window.App?.auth?.onAuthStateChanged(user=>{
    if (!user) return;
    window.App.db.ref("users/" + user.uid).on("value", (snap)=>{
      const data = snap.val() || {};
      const profileVisible = !document.getElementById("profile")?.classList.contains("hidden");
      if (profileVisible) renderProfile(data);
    });
  });
})();


