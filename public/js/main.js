/***********************************************************
 * main.js — LearnQuest AI (full)
 * - Auth (login/signup/signout)
 * - Điều phối UI sau đăng nhập (ép đăng nhập trước)
 * - Gating quiz: chưa có traits → vào quiz; có rồi → hỏi Làm lại/Bỏ qua
 * - Hồ sơ (profile) + radar (3 vòng 20/40/60) + bars 0..100%
 ***********************************************************/

/* ========================================================
   0) GLOBALS & HELPERS
======================================================== */
window.App = window.App || {};
let currentUser = null;
let radarChart = null;                 // giữ instance chart để destroy khi re-render

const $ = (id) => document.getElementById(id);

// Kiểm tra traits có hợp lệ (tổng điểm > 0)
function hasValidTraits(traits) {
  if (!traits || typeof traits !== "object") return false;
  const keys = [
    "creativity","competitiveness","sociability",
    "playfulness","self_improvement","perfectionism"
  ];
  let sum = 0;
  for (const k of keys) sum += Number(traits[k] || 0);
  return sum > 0;
} // ===== HẾT HÀM =====


/* ========================================================
   1) AUTH + ROUTING
======================================================== */
(() => {
  const auth = window.App.auth;         // từ firebase.js
  const db   = window.App.db;           // từ firebase.js

  // Trợ giúp: gán nhanh vào App để dùng nơi khác
  window.App._auth = auth;
  window.App._db   = db;

  // ===== 1.1 Gắn các nút auth/UI =====
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
  } // ===== HẾT HÀM =====

  // ===== 1.2 Xử lý click Đăng nhập/Đăng ký (UI + gọi auth) =====
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
  } // ===== HẾT HÀM =====

  // ===== 1.3 Đăng ký (tạo skeleton DB) =====
  function signup(email, pass){
    return auth.fetchSignInMethodsForEmail(email)
      .then(m=>{ if (m.length>0) throw new Error("Email đã được sử dụng!"); })
      .then(()=>auth.createUserWithEmailAndPassword(email, pass))
      .then(async (cred) => {
        const uid = cred.user.uid;
        const joined = new Date().toISOString().split("T")[0];
        const baseProfile = { email, joined };

        // Khởi tạo lần đầu /users/{uid}
        await Promise.all([
          db.ref(`users/${uid}/profile`).set(baseProfile),
          db.ref(`users/${uid}/gameProgress`).set({}),
          db.ref(`users/${uid}/stats`).set({ xp: 0, coin: 0 })
          // KHÔNG tạo traits ở đây → để ép người dùng làm quiz lần đầu
        ]);
        return cred;
      });
  } // ===== HẾT HÀM =====

  // ===== 1.4 Đăng nhập =====
  function login(email, pass){
    return auth.signInWithEmailAndPassword(email, pass);
  } // ===== HẾT HÀM =====

  // ===== 1.5 Bổ sung: đảm bảo skeleton nếu thiếu (user cũ) =====
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
  } // ===== HẾT HÀM =====

  // ===== 1.6 Sau đăng nhập: quyết định vào quiz hay game =====
  async function routeAfterLogin(uid){
    const snap = await db.ref(`/users/${uid}`).get();
    const userData = snap.val() || {};
    const traits = userData.traits || null;

    // Có traits → hỏi “Làm lại hay Bỏ qua?”
    if (hasValidTraits(traits)) {
      const modal = $("quizGateModal");
      const text  = $("quizGateText");
      const redo  = $("redoQuizBtn");
      const skip  = $("skipQuizBtn");

      if (text)  text.innerHTML = `Bạn đã có kết quả trắc nghiệm. Muốn <b>làm lại</b> hay <b>bỏ qua</b>?`;
      if (modal) modal.classList.remove("hidden");

      if (redo) redo.onclick = () => { window.location.href = "quiz.html"; };
      if (skip) skip.onclick = () => {
        modal?.classList.add("hidden");
        $("quiz")?.classList.add("hidden");
        $("profile")?.classList.add("hidden");
        $("gameBoard")?.classList.remove("hidden");
        window.App.Game?.showGameBoard?.(userData, uid);
      };
      return;
    }

    // Chưa có traits → đi quiz
    window.location.replace("quiz.html");
  } // ===== HẾT HÀM =====

  // ===== 1.7 Theo dõi trạng thái đăng nhập (ép login trước) =====
  function startAuthFlow(){
    bindAuthButtons();

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // Chưa đăng nhập: chỉ hiện màn login
        $("authScreen")?.classList.remove("hidden");
        $("mainApp")?.classList.add("hidden");
        return;
      }

      // Đã đăng nhập
      currentUser = user;
      $("authScreen")?.classList.add("hidden");
      $("mainApp")?.classList.remove("hidden");
      if ($("userEmail")) $("userEmail").textContent = (user.email || "").split("@")[0];

      // (Tuỳ chọn) logger hành vi
      if (window.Behavior && typeof window.Behavior.setUser === "function") {
        window.Behavior.setUser(user.uid);
      }

      await ensureUserSkeleton(user.uid);
      await routeAfterLogin(user.uid);

      // Lắng nghe realtime để cập nhật UI (game/profile)
      db.ref(`users/${user.uid}`).on("value", snap=>{
        const data = snap.val() || {};
        if (!$("profile")?.classList.contains("hidden")){
          renderProfile(data);
        }
        if (!$("gameBoard")?.classList.contains("hidden")){
          window.App.Game?.showGameBoard?.(data, user.uid);
        }
      });
    });
  } // ===== HẾT HÀM =====

  // Khởi động auth flow
  startAuthFlow();
})();  // ===== HẾT KHỐI IIFE AUTH + ROUTING =====


/* ========================================================
   2) QUIZ CALLOUT (tuỳ chọn – dựa theo local flag)
======================================================== */
function checkQuizStatusAndShowCallout() {
  const callout = document.getElementById('quizCallout');
  const quizDone = localStorage.getItem('lq_quizDone') === 'true';
  if (!callout) return;
  if (!quizDone) callout.classList.remove('hidden');
  else callout.classList.add('hidden');
} // ===== HẾT HÀM =====

window.addEventListener('load', checkQuizStatusAndShowCallout);


/* ========================================================
   3) PROFILE VIEW (HIỆN/ẨN)
======================================================== */
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
} // ===== HẾT HÀM =====

function backToGameBoard() {
  const prof  = $("profile");
  const board = $("gameBoard");
  if (prof)  prof.classList.add("hidden");
  if (board) board.classList.remove("hidden");
} // ===== HẾT HÀM =====

// Gắn nhanh 2 nút hồ sơ/quay lại khi DOM sẵn sàng
(function bindProfileButtons(){
  const pf = $("profileBtn");
  const bk = $("backBtn");
  if (pf) pf.addEventListener("click", (e)=>{ e.preventDefault(); showProfile(); });
  if (bk) bk.addEventListener("click", (e)=>{ e.preventDefault(); backToGameBoard(); });
})(); // ===== HẾT IIFE =====

// Lắng nghe realtime riêng cho tab hồ sơ (nếu đang mở)
(function listenRealtimeForProfile(){
  window.App?._auth?.onAuthStateChanged(user=>{
    if (!user) return;
    window.App._db.ref("users/" + user.uid).on("value", (snap)=>{
      const data = snap.val() || {};
      const visible = !$("profile")?.classList.contains("hidden");
      if (visible) renderProfile(data);
    });
  });
})(); // ===== HẾT IIFE =====


/* ========================================================
   4) PROFILE RENDER (RADAR + % BARS)
   - Radar: 3 vòng 20/40/60, giới hạn trần 60% (vòng ngoài cùng)
   - Thanh tiến độ: dùng % thật 0..100% để theo dõi tuần
======================================================== */
function renderProfile(data) {
  /* ---------- 4.1 Lấy điểm thô và tính % ---------- */
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

  /* ---------- 4.2 Thanh tiến độ (0..100%) ---------- */
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

  /* ---------- 4.3 Vẽ Radar (0..60, step 20/40/60) ---------- */
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

  /* ---------- 4.4 Thống kê XP/Coin/Huy hiệu ---------- */
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
} // ===== HẾT HÀM =====

// Expose để nơi khác có thể gọi
window.App.Profile = { renderProfile };
