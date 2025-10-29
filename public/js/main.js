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
  auth.onAuthStateChanged(user=>{
    if (user) onSignedIn(user.uid);
  });
})();
