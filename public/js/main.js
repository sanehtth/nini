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

// Vẽ hồ sơ từ dữ liệu user
function renderProfile(data) {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js chưa sẵn sàng");
    return;
  }
  const canvas = document.getElementById("radarChart");
  if (!canvas) return;

  // --- CHUẨN HOÁ VỀ 0..12 TRƯỚC KHI VẼ ---
  function norm(v, max) {
    if (!max) return 0;
    // đưa về 0..12 và kẹp biên
    return Math.max(0, Math.min(12, Math.round(((Number(v) || 0) / max) * 12)));
  }
  function pick(obj, keys) {
    for (const k of keys) {
      if (obj && k in obj) return Number(obj[k]) || 0;
    }
    return 0;
  }

  const labels = ["Sáng tạo","Cạnh tranh","Xã hội","Vui vẻ","Tự cải thiện","Cầu toàn"];
  const raw = (data && data.traits) || {};

  // Max theo tuần/nguồn điểm (bạn có thể đổi ở trait-config.js)
  const max = (window.TraitConfig && window.TraitConfig.max) || {
    creativity: 40,
    competitiveness: 10,
    sociability: 20,
    playfulness: 20,
    self_improvement: 10,
    perfectionism: 40,
  };

  // Chấp nhận cả key tiếng Việt/tiếng Anh
  const rawVals = {
    creativity:       pick(raw, ["creativity", "sáng tạo", "sang_tao"]),
    competitiveness:  pick(raw, ["competitiveness", "khả năng cạnh tranh", "kha_nang_canh_tranh"]),
    sociability:      pick(raw, ["sociability", "tính xã hội", "tinh_xa_hoi"]),
    playfulness:      pick(raw, ["playfulness", "vui tươi", "vui_tuoi"]),
    self_improvement: pick(raw, ["self_improvement", "tự cải thiện", "tu_cai_thien"]),
    perfectionism:    pick(raw, ["perfectionism", "cầu toàn", "cau_toan"]),
  };

  const values = [
    norm(rawVals.creativity,       max.creativity),
    norm(rawVals.competitiveness,  max.competitiveness),
    norm(rawVals.sociability,      max.sociability),
    norm(rawVals.playfulness,      max.playfulness),
    norm(rawVals.self_improvement, max.self_improvement),
    norm(rawVals.perfectionism,    max.perfectionism),
  ];

  // (tùy chọn) debug
  console.log("RAW:", rawVals, "MAX:", max);
  console.log("NORMALIZED (0..12):", values);

  const ctx = canvas.getContext("2d");
  if (radarChart && typeof radarChart.destroy === "function") radarChart.destroy();

  radarChart = new Chart(ctx, {
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
    options: { scales: { r: { min: 0, max: 12, ticks: { stepSize: 3 } } }, plugins: { legend: { display: false } } }
  });

  // Thống kê tổng
  const progress = (data && data.gameProgress) || {};
  const totalXP   = Object.values(progress).reduce((s,g)=>s+(g?.xp||0),0);
  const totalCoin = Object.values(progress).reduce((s,g)=>s+(g?.coin||0),0);
  const badge     = totalXP < 1000 ? 1 : totalXP < 5000 ? 2 : totalXP < 10000 ? 3 : totalXP < 20000 ? 4 : 5;

  const xpEl   = document.getElementById("profileXP");
  const coinEl = document.getElementById("profileCoin");
  const badgeEl= document.getElementById("profileBadge");
  if (xpEl)   xpEl.textContent   = totalXP;
  if (coinEl) coinEl.textContent = totalCoin;
  if (badgeEl)badgeEl.textContent= badge;
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
