// ===== main.js SAFE BOOTSTRAP =====
(function () {
  // Helper
  const $ = (id) => document.getElementById(id);

  // 1) Guard Firebase đã sẵn sàng
  if (!window.firebase || !window.firebaseAuth || !window.firebaseDB) {
    console.error("[main] Firebase chưa sẵn sàng. Kiểm tra thứ tự <script> và bản SDK (8.x, KHÔNG compat).");
    return;
  }
  const auth = window.firebaseAuth;
  const db   = window.firebaseDB;

  // 2) Lấy đúng input DÙ dùng ID cũ hay mới
  const getLoginEmail = () =>
    ($("loginEmail")?.value ?? $("email")?.value ?? "").trim();
  const getLoginPass  = () =>
    ($("loginPassword")?.value ?? $("password")?.value ?? "");

  // 3) Không để nút submit reload trang
  const patchButtonAsClick = (id, fn) => {
    const el = $(id);
    if (!el) return;
    // ép button thành type=button
    if (!el.getAttribute("type")) el.setAttribute("type", "button");
    el.onclick = (e) => { e.preventDefault(); try { fn(e); } catch (err) { console.error(err); } };
  };

  // 4) Tab chuyển đổi (nếu có trong DOM)
  const activateTab = (name) => {
    const isLogin = name === "login";
    $("tabLogin")?.classList.toggle("active", isLogin);
    $("tabSignup")?.classList.toggle("active", !isLogin);
    $("loginPanel")?.classList.toggle("hidden", !isLogin);
    $("signupPanel")?.classList.toggle("hidden", isLogin);
  };

  // 5) Bind UI một cách chịu lỗi
  window.addEventListener("DOMContentLoaded", () => {
    // theme & logout
    $("themeBtn") && ($("themeBtn").onclick = () => document.body.classList.toggle("dark-theme"));
    $("logoutBtn") && ($("logoutBtn").onclick = () => auth.signOut());

    // tabs
    $("tabLogin")  && ($("tabLogin").onclick  = () => activateTab("login"));
    $("tabSignup") && ($("tabSignup").onclick = () => activateTab("signup"));

    // login
    patchButtonAsClick("loginBtn", async () => {
      const email = getLoginEmail();
      const pass  = getLoginPass();
      try {
        await (window.AuthUI?.login ? window.AuthUI.login(email, pass) : auth.signInWithEmailAndPassword(email, pass));
        $("authMsg") && ($("authMsg").textContent = "");
      } catch (e) {
        $("authMsg") && ($("authMsg").textContent = e?.message || "Đăng nhập thất bại");
      }
    });

    // forgot
    patchButtonAsClick("forgotBtn", async () => {
      const email = getLoginEmail();
      if (!email) { $("authMsg") && ($("authMsg").textContent = "Nhập email trước."); return; }
      try {
        await (window.AuthUI?.resetPassword ? window.AuthUI.resetPassword(email) : auth.sendPasswordResetEmail(email));
        $("authMsg") && ($("authMsg").textContent = "Đã gửi email đặt lại mật khẩu.");
      } catch (e) {
        $("authMsg") && ($("authMsg").textContent = e?.message || "Không gửi được email.");
      }
    });

    // signup
    patchButtonAsClick("signupBtn", async () => {
      const email = ($("signupEmail")?.value ?? $("email")?.value ?? "").trim();
      const pass  = ($("signupPassword")?.value ?? $("password")?.value ?? "");
      try {
        if (window.AuthUI?.signup) {
          await AuthUI.signup(email, pass);
        } else {
          // fallback nếu chưa tách auth.js
          const cred = await auth.createUserWithEmailAndPassword(email, pass);
          const uid = cred.user.uid;
          const now = new Date().toISOString().split("T")[0];
          await db.ref("users/" + uid).set({
            profile: { email, joined: now, consent_insight: false },
            stats: { xp: 0, coin: 0, badge: 1 },
            metrics: { pi: 0, fi: 0, pi_star: 0 },
            skills: { listening: 0, speaking: 0, reading: 0, writing: 0 },
            traits: { creativity: 0, competitiveness: 0, sociability: 0, playfulness: 0, self_improvement: 0, perfectionism: 0 },
            weekly: {}, gameProgress: {}
          });
        }
        $("authMsg") && ($("authMsg").textContent = "Tạo tài khoản thành công!");
      } catch (e) {
        $("authMsg") && ($("authMsg").textContent = e?.message || "Đăng ký thất bại");
      }
    });

    // quiz link (nếu có)
    $("goQuiz") && ($("goQuiz").onclick = (e) => { e.preventDefault(); location.href = "quiz.html"; });
  });

  // 6) Điều hướng an toàn (chặn ping–pong)
  const onIndex = /index\.html?$/.test(location.pathname) || location.pathname === "/" || location.pathname === "";
  auth.onAuthStateChanged(async (user) => {
    try {
      if (!user) { $("authScreen")?.classList.remove("hidden"); $("appScreen")?.classList.add("hidden"); return; }

      $("authScreen")?.classList.add("hidden");
      $("appScreen")?.classList.remove("hidden");

      // Tổng hợp tuần (không chặn UI nếu lỗi)
      try { window.App?.Analytics?.maybeRefreshWeekly?.(user.uid); } catch {}

      const [traitsSnap, skillsSnap] = await Promise.all([
        db.ref("users/" + user.uid + "/traits").once("value"),
        db.ref("users/" + user.uid + "/skills").once("value"),
      ]);
      const traits = traitsSnap.val() || {};
      const skills = skillsSnap.val() || {};
      const emptyTraits = !traits || Object.values(traits).every(v => (Number(v) || 0) === 0);

      // Chỉ chuyển qua quiz nếu đang ở index và traits rỗng
      if (emptyTraits && onIndex) { location.href = "quiz.html"; return; }

      // Nếu có hàm render trong main cũ của bạn, gọi lại ở đây:
      if (typeof renderTraitsRadar === "function") renderTraitsRadar(traits);
      if (typeof renderSkillBars === "function")  renderSkillBars(skills);
      if (typeof refreshDailyMission === "function") refreshDailyMission(user.uid);
    } catch (err) {
      console.error("[onAuthStateChanged]", err);
      $("authScreen")?.classList.remove("hidden");
      $("appScreen")?.classList.add("hidden");
    }
  });
})();
