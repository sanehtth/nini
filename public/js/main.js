(() => {
  const auth = window.App.auth;
  const db   = window.App.db;

  const $ = id => document.getElementById(id);

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

  function showProfile(){
    $("gameBoard")?.classList.add("hidden");
    $("profile")?.classList.remove("hidden");
  }
  function backToGameBoard(){
    $("profile")?.classList.add("hidden");
    $("gameBoard")?.classList.remove("hidden");
  }

  function onSignedIn(uid){
    // 1) lấy snapshot 1 lần để điều phối
    db.ref(`users/${uid}`).once("value").then(snap=>{
      const data = snap.val() || {};
      // có thể refresh traits theo tuần
      window.App.Analytics?.maybeRefreshWeekly(uid, data);

      // hiển thị app
      $("authScreen")?.classList.add("hidden");
      $("mainApp")?.classList.remove("hidden");
      if ($("userEmail")) $("userEmail").textContent = (auth.currentUser.email||"").split("@")[0];

      // nếu đã làm quiz thì vào board; chưa thì hiện quiz của bạn
      if (data.quizDone) {
        window.App.Game?.showGameBoard(data, uid);
      } else {
        $("quiz")?.classList.remove("hidden");
      }
    });

    // 2) lắng nghe realtime để cập nhật UI tự động
    db.ref(`users/${uid}`).on("value", snap=>{
      const data = snap.val() || {};
      // Update board/gợi ý dựa trên traits hiện tại
      if (!$("profile")?.classList.contains("hidden")){
        window.App.Profile?.renderProfile(data);
      }
      // Khi traits đổi (do refresh tuần hoặc quiz), board tự cập nhật
      if (!$("gameBoard")?.classList.contains("hidden")){
        window.App.Game?.showGameBoard(data, uid);
      }
    });
  }

  // Auth state
  bindAuthButtons();
auth.onAuthStateChanged(user => {
  if (user) {
    // nếu bạn có biến currentUser thì cập nhật luôn (không bắt buộc)
    currentUser = user;

    // QUAN TRỌNG: báo Behavior để ghi điểm hành vi theo đúng UID
    if (window.Behavior) Behavior.setUser(user.uid);

    // logic cũ của bạn: vào app như bình thường
    onSignedIn(user.uid);
  }
});
})();

// ====== PATCH HỒ SƠ & CHART ======
let radarChart = null;

// Vẽ hồ sơ từ dữ liệu user
function renderProfile(data) {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js chưa sẵn sàng");
    return;
  }
  const canvas = document.getElementById("radarChart");
  if (!canvas) return;

  const traits = (data && data.traits) || {
    creativity:0, competitiveness:0, sociability:0,
    playfulness:0, self_improvement:0, perfectionism:0
  };

  const labels = ["Sáng tạo","Cạnh tranh","Xã hội","Vui vẻ","Tự cải thiện","Cầu toàn"];
  const values = [
    traits.creativity||0,
    traits.competitiveness||0,
    traits.sociability||0,
    traits.playfulness||0,
    traits.self_improvement||0,
    traits.perfectionism||0
  ];

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

  // cập nhật thống kê
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

// Hiện hồ sơ rồi mới vẽ (tránh vẽ khi đang hidden)
function showProfile() {
  const prof  = document.getElementById("profile");
  const board = document.getElementById("gameBoard");
  if (board) board.classList.add("hidden");
  if (prof)  prof.classList.remove("hidden");

  // lấy dữ liệu và vẽ
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

// Gắn nút
(function bindProfileButtons(){
  const pf = document.getElementById("profileBtn");
  const bk = document.getElementById("backBtn");
  if (pf) pf.addEventListener("click", (e)=>{ e.preventDefault(); showProfile(); });
  if (bk) bk.addEventListener("click", (e)=>{ e.preventDefault(); backToGameBoard(); });
})();

// Lắng nghe realtime: chỉ re-render khi tab hồ sơ đang mở
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


