/***********************************************************
 * main.js — LearnQuest AI (full)
 * - Auth (login/signup/signout)
 * - Điều phối UI sau đăng nhập
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

/* ========================================================
   1) AUTH + ROUTING
======================================================== */
(() => {
  const auth = window.App.auth;
  const db   = window.App.db;

  // Trợ giúp: gán nhanh vào App để dùng nơi khác
  window.App._auth = auth;
  window.App._db   = db;

  // ===== Nút auth =====
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

  function signup(email, pass){
    return auth.fetchSignInMethodsForEmail(email)
      .then(m=>{ if (m.length>0) throw new Error("Email đã được sử dụng!"); })
      .then(()=>auth.createUserWithEmailAndPassword(email, pass))
      .then(cred=> db.ref(`users/${cred.user.uid}/profile`).set({
        email,
        joined: new Date().toISOString().split("T")[0]
      }));
  }

  function login(email, pass){
    return auth.signInWithEmailAndPassword(email, pass);
  }

  // ===== Sau khi đăng nhập: điều phối UI + lắng nghe realtime =====
  function onSignedIn(uid){
    // 1) Điều phối UI ban đầu
    window.App._db.ref(`users/${uid}`).once("value").then(snap=>{
      const data = snap.val() || {};

      // (Tuỳ chọn) Nếu có cơ chế refresh traits theo tuần
      window.App.Analytics?.maybeRefreshWeekly?.(uid, data);

      $("authScreen")?.classList.add("hidden");
      $("mainApp")?.classList.remove("hidden");
      if ($("userEmail")) $("userEmail").textContent = (window.App._auth.currentUser.email || "").split("@")[0];

      if (data.quizDone) {
        window.App.Game?.showGameBoard?.(data, uid);
      } else {
        $("quiz")?.classList.remove("hidden");
      }
    });

    // 2) Lắng nghe realtime để cập nhật UI
    window.App._db.ref(`users/${uid}`).on("value", snap=>{
      const data = snap.val() || {};

      // Nếu tab hồ sơ đang mở -> re-render
      if (!$("profile")?.classList.contains("hidden")){
        renderProfile(data);
      }

      // Nếu tab game đang mở -> cập nhật
      if (!$("gameBoard")?.classList.contains("hidden")){
        window.App.Game?.showGameBoard?.(data, uid);
      }
    });
  }

  // ===== Gắn nút, theo dõi auth state =====
  bindAuthButtons();

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;

      // (Tuỳ chọn) logger hành vi
      if (window.Behavior && typeof window.Behavior.setUser === "function") {
        window.Behavior.setUser(user.uid);
      }

      onSignedIn(user.uid);
    }
  });
})();

// ===== Gating: bắt buộc có kết quả quiz trước khi chơi =====
function readLocalQuiz() {
  try {
    const scores = JSON.parse(localStorage.getItem("lq_traitScores") || "null");
    const meta   = JSON.parse(localStorage.getItem("lq_quiz_meta") || "null");
    return scores ? { scores, meta } : null;
  } catch { return null; }
}

async function ensureQuizOrRedirect() {
  // Đừng chặn nếu đang ở trang quiz
  if (location.pathname.endsWith("/quiz.html")) return true;

  // Nếu vừa làm xong (?quiz=done) thì cho vào luôn
  if (new URL(location.href).searchParams.get("quiz") === "done") return true;

  const goQuiz = () => {
    // dùng đường dẫn tương đối để tránh sai subpath (/public/..)
    window.location.replace("quiz.html");
    return false;
  };

  // Ưu tiên dữ liệu tài khoản (Firebase)
  try {
    if (window.firebase && firebase.auth) {
      const user = firebase.auth().currentUser;
      if (user) {
        const ref = firebase.database().ref(`/profiles/${user.uid}`);
        const traitsSnap = await ref.child("traits").get();

        if (traitsSnap.exists()) {
          // đã có quiz trên DB → ok
          return true;
        }

        // Chưa có trên DB → thử migrate từ localStorage (nếu có)
        const local = readLocalQuiz();
        if (local) {
          try {
            await ref.child("traits").set(local.scores);
            await ref.child("quizMeta").set({
              ...(local.meta || {}),
              migratedFromLocal: true,
              migratedAt: Date.now(),
            });
            // Xoá local để tránh lặp lại
            localStorage.removeItem("lq_traitScores");
            localStorage.removeItem("lq_quiz_meta");
            localStorage.setItem("lq_quizDone", "true");
            return true;
          } catch (e) {
            console.warn("Migrate local → Firebase failed", e);
            // vẫn cho vào nếu có local
            return true;
          }
        }

        // Không có gì cả → bắt đi làm quiz
        return goQuiz();
      }
    }
  } catch (e) {
    console.warn("ensureQuizOrRedirect error (firebase)", e);
  }

  // Khách/ngoại tuyến → xem localStorage
  if (readLocalQuiz()) return true;
  return goQuiz();
}

// Gọi khi app sẵn sàng
window.addEventListener("DOMContentLoaded", () => {
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async () => {
      await ensureQuizOrRedirect();
      // ... sau đó mới khởi tạo app/game của bạn ...
    });
  } else {
    ensureQuizOrRedirect().then(() => {
      // ... khởi tạo app/game khi không dùng auth ...
    });
  }
});

/* ========================================================
    TRAC NGHIEM 
======================================================== */

function checkQuizStatusAndShowCallout() {
  const callout = document.getElementById('quizCallout');
  const quizDone = localStorage.getItem('lq_quizDone') === 'true';
  if (!quizDone) {
    callout?.classList.remove('hidden');
  } else {
    callout?.classList.add('hidden');
  }
}

window.addEventListener('load', () => {
  checkQuizStatusAndShowCallout();
});

/* ========================================================
   2) PROFILE VIEW (HIỆN/ẨN)
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
}

function backToGameBoard() {
  const prof  = $("profile");
  const board = $("gameBoard");
  if (prof)  prof.classList.add("hidden");
  if (board) board.classList.remove("hidden");
}

// Gắn nhanh 2 nút hồ sơ/quay lại khi DOM sẵn sàng
(function bindProfileButtons(){
  const pf = $("profileBtn");
  const bk = $("backBtn");
  if (pf) pf.addEventListener("click", (e)=>{ e.preventDefault(); showProfile(); });
  if (bk) bk.addEventListener("click", (e)=>{ e.preventDefault(); backToGameBoard(); });
})();

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
})();

/* ========================================================
   3) PROFILE RENDER (RADAR + % BARS)
   - Radar: 3 vòng 20/40/60, giới hạn trần 60% (vòng ngoài cùng)
   - Thanh tiến độ: dùng % thật 0..100% để theo dõi tuần
======================================================== */
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

// Expose để nơi khác có thể gọi
window.App.Profile = { renderProfile };





