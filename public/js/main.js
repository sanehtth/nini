// main.js
// Điều phối UI, router #quiz, bind sự kiện auth
(function () {
  const db   = firebase.database();
  const auth = firebase.auth();

  const $ = (id) => document.getElementById(id);

  // Hiển thị/ẩn màn hình
  function showLogin(){
    $("authScreen")?.classList.remove("hidden");
    $("appScreen")?.classList.add("hidden");
  }
  function showApp(){
    $("authScreen")?.classList.add("hidden");
    $("appScreen")?.classList.remove("hidden");
  }

  // Tabs auth
  function activateTab(name){
    const isLogin = name === "login";
    $("tabLogin")?.classList.toggle("active", isLogin);
    $("tabSignup")?.classList.toggle("active", !isLogin);
    $("loginPanel")?.classList.toggle("hidden", !isLogin);
    $("signupPanel")?.classList.toggle("hidden", isLogin);
  }

  // Progress bars
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

  // Radar traits (cap 60 cho UI)
  let radarChart = null;
  function renderTraitsRadar(traits){
    const el = document.getElementById("traitsRadar");
    if (!el) return;
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

  // Nhiệm vụ hằng ngày (gợi ý theo trait mạnh)
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

  // Router: nếu hash = #quiz thì mở quiz trong index (SPA)
  function handleRoute(){
    const isQuiz = location.hash === "#quiz";
    $("appScreen")?.classList.toggle("hidden", isQuiz);
    if (isQuiz && typeof window.renderQuiz === "function") {
      // quiz.js phải define window.renderQuiz
      window.renderQuiz();
    }
  }

  // Bind UI
  window.addEventListener("DOMContentLoaded", ()=>{
    // theme & logout
    $("themeBtn")  && ($("themeBtn").onclick  = () => document.body.classList.toggle("dark-theme"));
    $("logoutBtn") && ($("logoutBtn").onclick = () => auth.signOut());

    // tabs
    $("tabLogin")  && ($("tabLogin").onclick  = () => activateTab("login"));
    $("tabSignup") && ($("tabSignup").onclick = () => activateTab("signup"));

    // login
    $("loginBtn") && ($("loginBtn").type="button");
    $("loginBtn") && ($("loginBtn").onclick = async ()=>{
      const email = (document.getElementById("loginEmail")?.value || document.getElementById("email")?.value || "").trim();
      const pass  = (document.getElementById("loginPassword")?.value || document.getElementById("password")?.value || "");
      try { await window.AuthUI.login(email, pass); $("authMsg") && ($("authMsg").textContent=""); }
      catch(e){ $("authMsg") && ($("authMsg").textContent = e?.message || "Đăng nhập thất bại"); }
    });

    // forgot
    $("forgotBtn") && ($("forgotBtn").type="button");
    $("forgotBtn") && ($("forgotBtn").onclick = async ()=>{
      const email = (document.getElementById("loginEmail")?.value || document.getElementById("email")?.value || "").trim();
      if (!email) { $("authMsg") && ($("authMsg").textContent="Nhập email trước."); return; }
      try { await window.AuthUI.resetPassword(email); $("authMsg") && ($("authMsg").textContent="Đã gửi email đặt lại mật khẩu."); }
      catch(e){ $("authMsg") && ($("authMsg").textContent = e?.message || "Không gửi được email."); }
    });

    // signup
    $("signupBtn") && ($("signupBtn").type="button");
    $("signupBtn") && ($("signupBtn").onclick = async ()=>{
      const email = (document.getElementById("signupEmail")?.value || document.getElementById("email")?.value || "").trim();
      const pass  = (document.getElementById("signupPassword")?.value || document.getElementById("password")?.value || "");
      try { await window.AuthUI.signup(email, pass); }
      catch(e){ $("authMsg") && ($("authMsg").textContent = e?.message || "Đăng ký thất bại"); }
    });

    // “Làm lại trắc nghiệm”
    $("goQuiz") && ($("goQuiz").onclick = (e)=>{ e.preventDefault(); location.hash="#quiz"; });

    // SPA router
    window.addEventListener("hashchange", handleRoute);
    handleRoute();
  });

  // Auth state
  auth.onAuthStateChanged(async (user)=>{
    if (!user) { showLogin(); return; }
    showApp();

    // tổng hợp tuần (nếu có)
    try { window.App?.Analytics?.maybeRefreshWeekly?.(user.uid); } catch {}

    const [traitsSnap, skillsSnap] = await Promise.all([
      db.ref("users/"+user.uid+"/traits").once("value"),
      db.ref("users/"+user.uid+"/skills").once("value")
    ]);
    const traits = traitsSnap.val() || {};
    const skills = skillsSnap.val() || {};

    // nếu vừa đăng ký (đã set ở auth.js) → mở quiz
    const justSignedUp = localStorage.getItem("justSignedUp") === "1";
    if (justSignedUp) { localStorage.removeItem("justSignedUp"); location.hash="#quiz"; return; }

    // nếu chưa có traits, để user tự bấm “Làm lại trắc nghiệm” (không auto chuyển trang)
    renderTraitsRadar(traits);
    renderSkillBars(skills);
    refreshDailyMission(user.uid);

    // demo: gắn logger game nếu có nút
    const bind = (id, skill) => { const el=$(id); if (!el) return; el.onclick = ()=> App.Analytics?.logActivity?.(user.uid, skill, {value:1, complete:true}); };
    bind("playListening","listening"); bind("playSpeaking","speaking");
    bind("playReading","reading");     bind("playWriting","writing");
  });
})();
