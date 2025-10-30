/***********************************************************
 * main.js — LearnQuest AI (full)
 * - Auth (login/signup/signout)
 * - Điều phối UI sau đăng nhập (ép login)
 * - Ép làm trắc nghiệm lần đầu: nếu chưa có /users/{uid}/traits -> vào quiz
 * - Hồ sơ (profile) + Radar Chart (3 vòng 20/40/60, trần 60%)
 * - Thanh tiến độ hiển thị % thực 0..100
 ***********************************************************/

/* ========================================================
   0) GLOBALS & HELPERS
======================================================== */
window.App = window.App || {};
let currentUser = null;
let radarChart = null;                 // giữ instance chart để destroy khi re-render

const $ = (id) => document.getElementById(id);

// NOTE: Kiểm tra traits có hợp lệ (tổng điểm > 0) — START
function hasValidTraits(traits) {
  if (!traits || typeof traits !== "object") return false;
  const keys = ["creativity","competitiveness","sociability","playfulness","self_improvement","perfectionism"];
  let sum = 0;
  for (const k of keys) sum += Number(traits[k] || 0);
  return sum > 0;
}
// NOTE: Kiểm tra traits có hợp lệ — END

/* ========================================================
   1) AUTH + ROUTING
======================================================== */
(() => {
  const auth = window.App.auth;
  const db   = window.App.db;

  // Trợ giúp: gán nhanh vào App để dùng nơi khác
  window.App._auth = auth;
  window.App._db   = db;

  // ===== gan cho cac Nút auth =====
  // NOTE: bindAuthButtons — START
  function bindAuthButtons(){
    const bind = (id, fn) => {
      const el = $(id);
      if (!el) return;
      el.type = "button";
      el.addEventListener("click",(e)=>{
        e.preventDefault();
        handleAuth(fn, id);
      });
    };

    bind("loginBtn",  login);
    bind("signupBtn", signup);

    const lo = $("logoutBtn");
    if (lo) lo.onclick = () => auth.signOut().then(()=>location.reload());

    const pf = $("profileBtn");
    if (pf) pf.onclick = showProfile;

    const bk = $("backBtn");
    if (bk) bk.onclick = backToGameBoard;
  }
  // NOTE: bindAuthButtons — END

  // ===== ham handleAuth : lay data dau vao va kiem tra =============
  // NOTE: handleAuth — START
  function handleAuth(authFn, btnId){
    const email = $("email")?.value.trim() || "";
    const pass  = $("password")?.value || "";
    const msgEl = $("authMsg");
    const btn   = $(btnId);

    if (!email || !pass){
      if (msgEl){
        msgEl.textContent = "Vui lòng nhập email và mật khẩu!";
        msgEl.style.color = "red";
      }
      return;
    }

    if (btn){ btn.disabled = true; btn.classList.add("loading"); btn.textContent = ""; }
    if (msgEl){ msgEl.textContent = "Đang xử lý..."; msgEl.style.color = "#e11d48"; }

    authFn(email, pass).catch(err=>{
      if (msgEl){ msgEl.textContent = err.message; msgEl.style.color = "red"; }
      if (btn){
        btn.disabled = false;
        btn.classList.remove("loading");
        btn.textContent = (btnId==="signupBtn" ? "Đăng ký" : "Đăng nhập");
      }
    });
  }
  // NOTE: handleAuth — END

  //=========== ham kiem tra dang ky tai khoan va dang nhap =========
  // NOTE: signup — START
  function signup(email, pass){
    return auth.fetchSignInMethodsForEmail(email)
      .then(m=>{ if (m.length>0) throw new Error("Email đã được sử dụng!"); })
      .then(()=>auth.createUserWithEmailAndPassword(email, pass))
      .then(async (cred)=> {
        // Tạo skeleton ban đầu dưới /users/{uid}
        const uid = cred.user.uid;
        await db.ref(`users/${uid}/profile`).set({
          email,
          joined: new Date().toISOString().split("T")[0]
        });
        await db.ref(`users/${uid}/gameProgress`).set({});
        await db.ref(`users/${uid}/stats`).set({ xp: 0, coin: 0 });
      });
  }
  // NOTE: signup — END

  // NOTE: login — START
  function login(email, pass){
    return auth.signInWithEmailAndPassword(email, pass);
  }
  // NOTE: login — END

  // NOTE: ensureUserSkeleton — START
  // Bổ sung dữ liệu nền cho user nếu thiếu (idempotent)
  async function ensureUserSkeleton(uid) {
    const snap = await db.ref(`users/${uid}`).get();
    const data = snap.val() || {};
    const updates = {};
    const email = auth.currentUser?.email || "";
    const joined = new Date().toISOString().split("T")[0];

    if (!data.profile)       updates[`users/${uid}/profile`] = { email, joined };
    if (!data.gameProgress)  updates[`users/${uid}/gameProgress`] = {};
    if (!data.stats)         updates[`users/${uid}/stats`] = { xp: 0, coin: 0 };

    if (Object.keys(updates).length) await db.ref().update(updates);
  }
  // NOTE: ensureUserSkeleton — END

  /* ========================================================
     Sau đăng nhập: điều hướng theo trạng thái trắc nghiệm (strict: yêu cầu traits > 0)
     CHỈ kiểm tra /users/{uid}/traits; có kèm migrate 1 lần từ /profiles nếu trước đây đã lưu ở đó
  ======================================================== */ 
  // NOTE: routeAfterLogin — START
  async function routeAfterLogin(uid){
    try {
      // Đọc traits ở /users
      let userSnap = await db.ref(`/users/${uid}`).get();
      let userData = userSnap.val() || {};
      const userTraits = userData.traits || null;

      if (hasValidTraits(userTraits)) {
        // Có kết quả -> vào game
        $("gameBoard")?.classList.remove("hidden");
        $("profile")?.classList.add("hidden");
        $("quiz")?.classList.add("hidden");
        window.App.Game?.showGameBoard?.(userData, uid);
        return;
      }

      // Migrate 1 lần từ /profiles (nếu còn dữ liệu cũ)
      const profTraitsSnap = await db.ref(`/profiles/${uid}/traits`).get();
      if (hasValidTraits(profTraitsSnap.val())) {
        const profMetaSnap = await db.ref(`/profiles/${uid}/quizMeta`).get();
        const profMeta = profMetaSnap.val() || {};
        await db.ref(`/users/${uid}/traits`).set(profTraitsSnap.val());
        await db.ref(`/users/${uid}/quizMeta`).set({
          ...profMeta,
          migratedFrom: "profiles",
          migratedAt: Date.now(),
          ...(Array.isArray(profMeta.traits) ? { traitKeys: profMeta.traits } : {})
        });
        // đọc lại user để vào game
        userSnap = await db.ref(`/users/${uid}`).get();
        userData = userSnap.val() || {};
        $("gameBoard")?.classList.remove("hidden");
        $("profile")?.classList.add("hidden");
        $("quiz")?.classList.add("hidden");
        window.App.Game?.showGameBoard?.(userData, uid);
        return;
      }

      // Không có traits hợp lệ -> chuyển sang quiz
      window.location.replace("quiz.html");
    } catch (e) {
      console.warn("routeAfterLogin error", e);
      $("gameBoard")?.classList.remove("hidden"); // không khoá app nếu lỗi mạng
    }
  }
  // NOTE: routeAfterLogin — END

  // ===== Sau khi đăng nhập: điều phối UI + lắng nghe realtime =====
  // NOTE: onSignedIn — START
  function onSignedIn(uid){
    // 1) Điều phối UI cơ bản
    $("authScreen")?.classList.add("hidden");
    $("mainApp")?.classList.remove("hidden");
    if ($("userEmail")) $("userEmail").textContent = (auth.currentUser.email || "").split("@")[0];

    // 2) Bảo đảm có skeleton, rồi route theo trạng thái quiz
    ensureUserSkeleton(uid).then(()=> routeAfterLogin(uid));

    // 3) Lắng nghe realtime để cập nhật UI
    db.ref(`users/${uid}`).on("value", snap=>{
      const data = snap.val() || {};
      // Tab hồ sơ mở -> re-render
      if (!$("profile")?.classList.contains("hidden")){
        renderProfile(data);
      }
      // Tab game mở -> cập nhật
      if (!$("gameBoard")?.classList.contains("hidden")){
        window.App.Game?.showGameBoard?.(data, uid);
      }
    });
  }
  // NOTE: onSignedIn — END

  // ===== Gắn nút, theo dõi auth state =====
  bindAuthButtons();

  // NOTE: onAuthStateChanged (ép login) — START
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;

      // (Tuỳ chọn) logger hành vi
      if (window.Behavior && typeof window.Behavior.setUser === "function") {
        window.Behavior.setUser(user.uid);
      }

      onSignedIn(user.uid);
    } else {
      // Chưa đăng nhập -> chỉ hiện màn auth
      $("authScreen")?.classList.remove("hidden");
      $("mainApp")?.classList.add("hidden");
    }
  });
  // NOTE: onAuthStateChanged — END
})();

/* ========================================================
   1.5) GATING BỔ SUNG (tuỳ chọn): nếu trang index muốn tự kiểm tra
   => Với luồng ép login + routeAfterLogin ở trên, khối dưới có thể giữ để an toàn.
======================================================== */

// NOTE: readLocalQuiz (fallback – có thể bỏ nếu không muốn) — START
function readLocalQuiz() {
  try {
    const scores = JSON.parse(localStorage.getItem("lq_traitScores") || "null");
    const meta   = JSON.parse(localStorage.getItem("lq_quiz_meta") || "null");
    return scores ? { scores, meta } : null;
  } catch { return null; }
}
// NOTE: readLocalQuiz — END

// NOTE: ensureQuizOrRedirect (an toàn, chỉ chạy khi đã login) — START
async function ensureQuizOrRedirect() {
  if (location.pathname.endsWith("/quiz.html")) return true;
  if (new URL(location.href).searchParams.get("quiz") === "done") return true;

  const user = (window.firebase && firebase.auth && firebase.auth().currentUser) || null;
  if (!user) return true; // chưa đăng nhập -> không gate ở đây (đã ép login ở trên)

  const goQuiz = () => { window.location.replace("quiz.html"); return false; };

  try {
    const db = firebase.database();
    const userTraitsSnap = await db.ref(`/users/${user.uid}/traits`).get();
    if (hasValidTraits(userTraitsSnap.val())) return true;

    // migrate từ localStorage (nếu từng cho phép làm khi chưa login)
    const local = JSON.parse(localStorage.getItem("lq_traitScores") || "null");
    const meta  = JSON.parse(localStorage.getItem("lq_quiz_meta") || "null");
    if (hasValidTraits(local)) {
      await db.ref(`/users/${user.uid}/traits`).set(local);
      await db.ref(`/users/${user.uid}/quizMeta`).set({ ...(meta||{}), migratedFromLocal:true, migratedAt: Date.now() });
      localStorage.removeItem("lq_traitScores");
      localStorage.removeItem("lq_quiz_meta");
      localStorage.setItem("lq_quizDone","true");
      return true;
    }

    return goQuiz();
  } catch (e) {
    console.warn("ensureQuizOrRedirect error", e);
    return true;
  }
}
// NOTE: ensureQuizOrRedirect — END

// NOTE: App ready (tuỳ chọn) — START
window.addEventListener("DOMContentLoaded", () => {
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) return;           // ép login ở trên rồi
      await ensureQuizOrRedirect();
      // ... khởi tạo app/game tiếp nếu cần ...
    });
  }
});
// NOTE: App ready — END

/* ========================================================
    TRAC NGHIEM (Callout nhỏ trên index nếu muốn nhắc)
======================================================== */

// NOTE: checkQuizStatusAndShowCallout — START
function checkQuizStatusAndShowCallout() {
  const callout = document.getElementById('quizCallout');
  const quizDone = localStorage.getItem('lq_quizDone') === 'true';
  if (!quizDone) {
    callout?.classList.remove('hidden');
  } else {
    callout?.classList.add('hidden');
  }
}
// NOTE: checkQuizStatusAndShowCallout — END

window.addEventListener('load', () => {
  checkQuizStatusAndShowCallout();
});

/* ========================================================
   2) PROFILE VIEW (HIỆN/ẨN)
======================================================== */

// NOTE: showProfile — START
function showProfile() {
  const prof  = $("profile");
  const board = $("gameBoard");
  if (board) board.classList.add("hidden");
  if (prof)  prof.classList.remove("hidden");

  const uid = window.App?._auth?.currentUser?.uid;
  if (!uid) return;

  window.App._db.ref("users/" + uid).once("value").then(snap=>{
    renderProfile(snap.val() || {});
  });
}
// NOTE: showProfile — END

// NOTE: backToGameBoard — START
function backToGameBoard() {
  const prof  = $("profile");
  const board = $("gameBoard");
  if (prof)  prof.classList.add("hidden");
  if (board) board.classList.remove("hidden");
}
// NOTE: backToGameBoard — END

// NOTE: bindProfileButtons — START
(function bindProfileButtons(){
  const pf = $("profileBtn");
  const bk = $("backBtn");
  if (pf) pf.addEventListener("click", (e)=>{ e.preventDefault(); showProfile(); });
  if (bk) bk.addEventListener("click", (e)=>{ e.preventDefault(); backToGameBoard(); });
})();
// NOTE: bindProfileButtons — END

// NOTE: listenRealtimeForProfile — START
(function listenRealtimeForProfile(){
  window.App?._auth?.onAuthStateChanged(user=>{
    if (!user) return;
    window.App._db.ref("users/" + user.uid).on("value", (snap)=>{
      const data = snap.val() || {};
      const visible = !$("profile")?.classList.contains("hidden");
      if (visible) renderProfile(data);
    });
  });
})();
// NOTE: listenRealtimeForProfile — END

/* ========================================================
   3) PROFILE RENDER (RADAR + % BARS)
   - Radar: 3 vòng 20/40/60, giới hạn trần 60% (vòng ngoài cùng)
   - Thanh tiến độ: dùng % thật 0..100% để theo dõi tuần
======================================================== */

// NOTE: renderProfile — START
function renderProfile(data) {
  /* ---------- 3.1 Lấy điểm thô và tính % ---------- */
  const raw = (data && data.traits) || {
    creativity: 0,
    competitiveness: 0,
    sociability: 0,
    playfulness: 0,
    self_improvement: 0,
    perfectionism: 0,
  };

  const rawList = [
    Number(raw.creativity)       || 0,
    Number(raw.competitiveness)  || 0,
    Number(raw.sociability)      || 0,
    Number(raw.playfulness)      || 0,
    Number(raw.self_improvement) || 0,
    Number(raw.perfectionism)    || 0,
  ];
  const sum = rawList.reduce((a, b) => a + b, 0) || 1;

  // % thật 0..100 để hiển thị thanh tiến độ
  const pctVals = rawList.map(v => (v / sum) * 100);

  // Giá trị vẽ trên radar: cắt trần 60 với 3 vòng 20/40/60
  const RADAR_MAX  = 60;
  const RADAR_STEP = 20;
  const radarVals  = pctVals.map(v => Math.min(v, RADAR_MAX));

  /* ---------- 3.2 Thanh tiến độ (0..100%) ---------- */
  const traitList = $("traitList");
  if (traitList) {
    const keys  = ["creativity","competitiveness","sociability","playfulness","self_improvement","perfectionism"];
    const names = {
      creativity:"Sáng tạo", competitiveness:"Cạnh tranh", sociability:"Xã hội",
      playfulness:"Vui vẻ", self_improvement:"Tự cải thiện", perfectionism:"Cầu toàn"
    };
    traitList.innerHTML = "";
    keys.forEach((k, i) => {
      const pct = pctVals[i]; // 0..100
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

  /* ---------- 3.3 Vẽ Radar (0..60, step 20/40/60) ---------- */
  const labels = ["Sáng tạo","Cạnh tranh","Xã hội","Vui vẻ","Tự cải thiện","Cầu toàn"];
  const canvas = $("radarChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  // Hủy chart cũ nếu có
  if (window.radarChart && typeof window.radarChart.destroy === "function") {
    window.radarChart.destroy();
  }

  window.radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label: "Tính cách",
        data: radarVals,                           // 0..60 (đã cắt trần)
        backgroundColor: "rgba(225, 29, 72, 0.18)",
        borderColor: "#e11d48",
        pointBackgroundColor: "#e11d48",
        borderWidth: 2,
        pointRadius: 2.5,
        pointHoverRadius: 4
      }]
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: RADAR_MAX,
          ticks: {
            stepSize: RADAR_STEP,                  // 20/40/60
            callback: (v) => `${v}%`
          },
          grid: { circular: true },
          angleLines: { color: "rgba(0,0,0,0.06)" },
          pointLabels: { font: { size: 12 } }
        }
      },
      plugins: { legend: { display: false } },
      elements: { line: { tension: 0.25 } }
    }
  });

  /* ---------- 3.4 Thống kê XP/Coin/Huy hiệu ---------- */
  const progress = (data && data.gameProgress) || {};
  let totalXP = 0, totalCoin = 0;
  Object.values(progress).forEach(g => { totalXP += g.xp || 0; totalCoin += g.coin || 0; });

  const badge = totalXP < 1000 ? 1
              : totalXP < 5000 ? 2
              : totalXP < 10000 ? 3
              : totalXP < 20000 ? 4
              : 5;

  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  setText("profileXP", totalXP);
  setText("profileCoin", totalCoin);
  setText("profileBadge", badge);
}
// NOTE: renderProfile — END

// Expose để nơi khác có thể gọi
window.App.Profile = { renderProfile };
