// public/js/main.js — FULL
(function () {
  const auth = firebase.auth();
  const db   = firebase.database();

  // ==== helpers ====
  const $ = (id) => document.getElementById(id);

  function showLogin(){
    $("authScreen")?.classList.remove("hidden");
    $("appScreen")?.classList.add("hidden");
  }
  function showApp(user){
    $("authScreen")?.classList.add("hidden");
    $("appScreen")?.classList.remove("hidden");
    // hiển thị email (nếu bạn có span#whoami trong header)
    const who = $("whoami"); if (who) who.textContent = user?.email ? `Đang đăng nhập: ${user.email}` : "";
  }

  // ==== Tabs đăng nhập / đăng ký ====
  function activateTab(name){
    const isLogin = name === "login";
    $("tabLogin")?.classList.toggle("active", isLogin);
    $("tabSignup")?.classList.toggle("active", !isLogin);
    $("loginPanel")?.classList.toggle("hidden", !isLogin);
    $("signupPanel")?.classList.toggle("hidden", isLogin);
  }

  // ==== Progress 4 kỹ năng ====
  function renderSkillBars(skills){
    const wrap = $("skillsBars"); if (!wrap) return;
    wrap.innerHTML = "";
    const items = [
      ["Listening", skills.listening||0],
      ["Speaking",  skills.speaking||0],
      ["Reading",   skills.reading||0],
      ["Writing",   skills.writing||0],
    ];
    items.forEach(([label, val])=>{
      const row = document.createElement("div");
      row.innerHTML =
        `<div style="display:flex;justify-content:space-between">
           <strong>${label}</strong><span>${Math.round(val)}%</span>
         </div>
         <div class="bar"><span style="width:${val}%;"></span></div>`;
      wrap.appendChild(row);
    });
  }

  // ==== Radar 6 trait (cap 60) ====
  let radarChart = null;
  function renderTraitsRadar(traits){
    const el = $("traitsRadar"); if (!el) return;
    const data = [
      Math.min(60, Number(traits.creativity||0)),
      Math.min(60, Number(traits.competitiveness||0)),
      Math.min(60, Number(traits.sociability||0)),
      Math.min(60, Number(traits.playfulness||0)),
      Math.min(60, Number(traits.self_improvement||0)),
      Math.min(60, Number(traits.perfectionism||0)),
    ];
    const ctx = el.getContext("2d");
    if (radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["Creativity","Competitiveness","Sociability","Playfulness","Self-Improvement","Perfectionism"],
        datasets: [{ label: "Traits % (capped 60)", data }]
      },
      options: { responsive:true, scales:{ r:{ min:0, max:60, ticks:{ stepSize:10 } } } }
    });
  }

  // ==== Nhiệm vụ hằng ngày ====
  async function refreshDailyMission(uid){
    const t = (await db.ref("users/"+uid+"/traits").once("value")).val() || {};
    const top = Object.entries(t).sort((a,b)=>(b[1]||0)-(a[1]||0))[0];
    const key = top ? top[0] : "self_improvement";
    const map = {
      creativity: "Viết lại đoạn hội thoại theo phong cách khác.",
      competitiveness: "Thử vượt kỷ lục điểm ở mini-game đấu nhanh.",
      sociability: "Trao đổi 5 câu với bạn học/AI voice.",
      playfulness: "Chơi game nghe nhạc đoán từ 10 phút.",
      self_improvement: "Hoàn thành 1 bài đọc nâng cao.",
      perfectionism: "Sửa lỗi ngữ pháp cho 1 đoạn văn cũ."
    };
    $("dailyMission") && ($("dailyMission").textContent = map[key]);
  }

  // ==== SPA router: #quiz bật quizScreen, ẩn appScreen ====
  function handleRoute() {
    const isQuiz = location.hash === "#quiz";
    const app  = $("appScreen");
    const quiz = $("quizScreen");
    const authS= $("authScreen");

    authS && authS.classList.add("hidden");
    if (app)  app.classList.toggle("hidden", isQuiz);
    if (quiz) quiz.classList.toggle("hidden", !isQuiz);

    if (isQuiz && typeof window.renderQuiz === "function") {
      window.renderQuiz(); // quiz.js vẽ vào #quizRoot
      const back = $("quizBackBtn");
      if (back && !back._bound) { back._bound = true; back.onclick = () => { location.hash = ""; }; }
    }
  }

  // ==== Bind nút & khởi động ====
  window.addEventListener("DOMContentLoaded", ()=>{
    // theme & logout
    $("themeBtn")  && ($("themeBtn").onclick  = () => document.body.classList.toggle("dark-theme"));
    $("logoutBtn") && ($("logoutBtn").onclick = () => auth.signOut().then(()=>location.replace("index.html")));

    // tabs
    $("tabLogin")  && ($("tabLogin").onclick  = () => activateTab("login"));
    $("tabSignup") && ($("tabSignup").onclick = () => activateTab("signup"));

    // login
    const loginBtn = $("loginBtn");
    if (loginBtn){ loginBtn.type = "button"; loginBtn.onclick = async ()=>{
      const email = ($("loginEmail")?.value || $("email")?.value || "").trim();
      const pass  = ($("loginPassword")?.value || $("password")?.value || "");
      try { await window.AuthUI.login(email, pass); $("authMsg") && ($("authMsg").textContent=""); }
      catch(e){ $("authMsg") && ($("authMsg").textContent = e?.message || "Đăng nhập thất bại"); }
    };}

    // forgot
    const forgotBtn = $("forgotBtn");
    if (forgotBtn){ forgotBtn.type = "button"; forgotBtn.onclick = async ()=>{
      const email = ($("loginEmail")?.value || $("email")?.value || "").trim();
      if (!email) { $("authMsg") && ($("authMsg").textContent="Nhập email trước."); return; }
      try { await window.AuthUI.resetPassword(email); $("authMsg") && ($("authMsg").textContent="Đã gửi email đặt lại mật khẩu."); }
      catch(e){ $("authMsg") && ($("authMsg").textContent = e?.message || "Không gửi được email."); }
    };}

    // signup
    const signupBtn = $("signupBtn");
    if (signupBtn){ signupBtn.type = "button"; signupBtn.onclick = async ()=>{
      const email = ($("signupEmail")?.value || $("email")?.value || "").trim();
      const pass  = ($("signupPassword")?.value || $("password")?.value || "");
      try { await window.AuthUI.signup(email, pass); /* sẽ chuyển #quiz trong auth.js */ }
      catch(e){ $("authMsg") && ($("authMsg").textContent = e?.message || "Đăng ký thất bại"); }
    };}

    // link làm lại quiz
    $("goQuiz") && ($("goQuiz").onclick = (e)=>{ e.preventDefault(); location.hash = "#quiz"; });

    // router
    window.addEventListener("hashchange", handleRoute);
    handleRoute();
  });

  // ==== Theo dõi trạng thái đăng nhập ====
  auth.onAuthStateChanged(async (user)=>{
    if (!user) { showLogin(); return; }
    showApp(user);

    // tổng hợp tuần (không chặn UI nếu lỗi)
    try { window.App?.Analytics?.maybeRefreshWeekly?.(user.uid); } catch {}

    // nạp snapshots
    const [traitsSnap, skillsSnap] = await Promise.all([
      db.ref("users/"+user.uid+"/traits").once("value"),
      db.ref("users/"+user.uid+"/skills").once("value")
    ]);
    const traits = traitsSnap.val() || {};
    const skills = skillsSnap.val() || {};

    // nếu vừa signup, auth.js đã set #quiz → router sẽ hiển thị quiz
    if (location.hash !== "#quiz") {
      renderTraitsRadar(traits);
      renderSkillBars(skills);
      refreshDailyMission(user.uid);
    }

    // gắn logger mini-game (nếu có nút)
    const bind = (id, skill) => { const el=$(id); if (!el) return; el.onclick = ()=> App.Analytics?.logActivity?.(user.uid, skill, {value:1, complete:true}); };
    bind("playListening","listening"); bind("playSpeaking","speaking");
    bind("playReading","reading");     bind("playWriting","writing");
  });
})();
