// js/main.js

const ADMIN_EMAIL = "sane.htth@gmail.com"; // email admin
let currentUser = null;

let answeredCount = 0;
const totalQuestions = 12;
let lastXP = 0,
  lastCoin = 0;
let radarChart = null;

document.addEventListener("DOMContentLoaded", () => {
  // ===== Gán handler nút (an toàn trên nhiều trang) =====
  document
    .getElementById("signupBtn")
    ?.addEventListener("click", () => handleAuth(signup, "signupBtn"));

  document
    .getElementById("loginBtn")
    ?.addEventListener("click", () => handleAuth(login, "loginBtn"));

  document
    .getElementById("logoutBtn")
    ?.addEventListener("click", () =>
      auth.signOut().then(() => location.reload())
    );

  document
    .getElementById("profileBtn")
    ?.addEventListener("click", showProfile);

  document
    .getElementById("backBtn")
    ?.addEventListener("click", backToGameBoard);

  // Nếu page có quiz nội tuyến (index cũ) thì set up
  if (
    document.getElementById("submitBtn") ||
    document.querySelector(".question")
  ) {
    setupQuiz();
  }

  // ============ Xử lý Đăng nhập / Đăng ký ============

  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const actionBtn = document.getElementById("actionBtn");
  const forgotPassword = document.getElementById("forgotPassword");
  const authMsg = document.getElementById("authMsg");
  const forgotBtn = document.getElementById("forgotBtn");

  // Chỉ cài đặt logic login/signup nếu đúng là trang có form đăng nhập
  if (loginTab && signupTab && actionBtn && forgotPassword && authMsg) {
    let isLoginMode = true;

    // Chuyển tab
    loginTab.onclick = () => {
      isLoginMode = true;
      loginTab.classList.add("active");
      signupTab.classList.remove("active");
      actionBtn.textContent = "Đăng nhập";
      forgotPassword.style.display = "block";
      authMsg.textContent = "";
    };

    signupTab.onclick = () => {
      isLoginMode = false;
      signupTab.classList.add("active");
      loginTab.classList.remove("active");
      actionBtn.textContent = "Đăng ký";
      forgotPassword.style.display = "none";
      authMsg.textContent = "";
    };

    // Hành động chính
    actionBtn.onclick = () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      if (!email || !password) {
        authMsg.textContent =
          "Vui lòng nhập đầy đủ email và mật khẩu!";
        return;
      }

      if (isLoginMode) {
        login(email, password);
      } else {
        signup(email, password);
      }
    };

    // Quên mật khẩu
    if (forgotBtn) {
      forgotBtn.onclick = (e) => {
        e.preventDefault();
        const email = document
          .getElementById("email")
          .value.trim();
        if (!email) {
          authMsg.textContent = "Vui lòng nhập email trước!";
          return;
        }
        // Hàm này nằm trong firebase.js
        sendPasswordReset(email);
      };
    }
  }

  // ============ Vá schema user ============

  async function ensureUserSchema(uid, emailIfMissing) {
    const userRef = db.ref("users/" + uid);
    const snap = await userRef.once("value");
    const data = snap.val() || {};

    data.profile = Object.assign(
      {
        email: emailIfMissing || "",
        joined: new Date().toISOString().split("T")[0],
        consent_insight: false,
      },
      data.profile || {}
    );

    // 🔧 STATS: chỉ tạo / vá field, KHÔNG reset XP/Coin đã có
    if (!data.stats) {
      data.stats = { xp: 0, coin: 0, badge: 1 };
    } else {
      if (typeof data.stats.xp !== "number") data.stats.xp = 0;
      if (typeof data.stats.coin !== "number") data.stats.coin = 0;
      if (typeof data.stats.badge !== "number") data.stats.badge = 1;
    }

    data.metrics = Object.assign(
      { pi: 0, fi: 0, pi_star: 0 },
      data.metrics || {}
    );
    data.skills = Object.assign(
      { listening: 0, speaking: 0, reading: 0, writing: 0 },
      data.skills || {}
    );
    data.traits = Object.assign(
      {
        creativity: 0,
        competitiveness: 0,
        sociability: 0,
        playfulness: 0,
        self_improvement: 0,
        perfectionism: 0,
      },
      data.traits || {}
    );
    if (typeof data.quizDone !== "boolean") data.quizDone = false;
    if (!data.weekly) data.weekly = {};
    if (!data.gameProgress) data.gameProgress = {};

    await userRef.update(data);
  }

  // ============ Hiển thị login nếu chưa có user ============

  function showLoginFallback() {
    const a = document.getElementById("authScreen");
    const m =
      document.getElementById("mainApp") ||
      document.getElementById("appScreen");
    const q =
      document.getElementById("quiz") ||
      document.getElementById("quizScreen");
    a && a.classList.remove("hidden");
    m && m.classList.add("hidden");
    q && q.classList.add("hidden");
  }

  // ============ Auth state ============

  auth.onAuthStateChanged(async (user) => {
    try {
      if (!user) {
        currentUser = null;
        updateAdminUI(null);
        showLoginFallback();
        return;
      }

      currentUser = user;
      updateAdminUI(user);

      // Mỗi lần login vá lại schema cho chắc
      await ensureUserSchema(user.uid, user.email);

      // Mời làm quiz nếu chưa làm
      const uref = db.ref("users/" + user.uid);
      const u = (await uref.once("value")).val() || {};
      const invite = document.getElementById("quizInvite");
      const goQuizBtn = document.getElementById("goQuizBtn");
      const skipQuizBtn = document.getElementById("skipQuizBtn");

      if (u.quizDone !== true && invite) {
        invite.classList.remove("hidden");
        goQuizBtn &&
          (goQuizBtn.onclick = () => {
            window.location.href = "/quiz.html?per=3";
          });
        skipQuizBtn &&
          (skipQuizBtn.onclick = () => invite.classList.add("hidden"));
      }

      loadUserDataAndShowApp();
    } catch (e) {
      console.error("[onAuthStateChanged]", e);
      showLoginFallback();
    }
  });

  // ============ Helpers đăng nhập ============

  function handleAuth(authFn, btnId) {
    const email = document.getElementById("email")?.value.trim();
    const pass = document.getElementById("password")?.value;
    const msg = document.getElementById("authMsg");
    const button = document.getElementById(btnId);

    if (!email || !pass || !button || !msg) return;

    msg.textContent = "Đang xử lý...";
    msg.style.color = "#e11d48";
    button.disabled = true;
    button.classList.add("loading");
    button.textContent = "";

    authFn(email, pass)
      .then(() => {
        msg.textContent = "Thành công! Đang tải...";
        msg.style.color = "green";
      })
      .catch((err) => {
        msg.textContent = err.message;
        msg.style.color = "red";
        button.disabled = false;
        button.classList.remove("loading");
        button.textContent =
          btnId === "signupBtn" ? "Đăng ký" : "Đăng nhập";
      });
  }

  function signup(email, pass) {
    return auth
      .fetchSignInMethodsForEmail(email)
      .then((methods) => {
        if (methods.length > 0)
          throw new Error("Email đã được sử dụng!");
        return auth.createUserWithEmailAndPassword(email, pass);
      })
      .then(async (cred) => {
        const uid = cred.user.uid;
        const today = new Date().toISOString().split("T")[0];

        const monday = new Date();
        const d = (monday.getDay() + 6) % 7; // Mon=0
        monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() - d);
        const weekId = `${monday.getFullYear()}-${String(
          monday.getMonth() + 1
        ).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

        const DEFAULT_DOC = {
          profile: { email, joined: today, consent_insight: false },
          stats: { xp: 0, coin: 0, badge: 1 },
          metrics: { pi: 0, fi: 0, pi_star: 0 },
          skills: {
            listening: 0,
            speaking: 0,
            reading: 0,
            writing: 0,
          },
          traits: {
            creativity: 0,
            competitiveness: 0,
            sociability: 0,
            playfulness: 0,
            self_improvement: 0,
            perfectionism: 0,
          },
          quizDone: false,
          weekly: {
            [weekId]: {
              raw: {
                listening: 0,
                speaking: 0,
                reading: 0,
                writing: 0,
              },
              pct: {
                listening: 0,
                speaking: 0,
                reading: 0,
                writing: 0,
              },
              traits_pct: {
                creativity: 0,
                competitiveness: 0,
                sociability: 0,
                playfulness: 0,
                self_improvement: 0,
                perfectionism: 0,
              },
              pi: 0,
              fi: 0,
              pi_star: 0,
            },
          },
          gameProgress: {},
        };

        await db.ref("users/" + uid).set(DEFAULT_DOC);
        try {
          localStorage.setItem("justSignedUp", "1");
        } catch (e) {}
        location.href = "index.html#quiz";
        return cred;
      });
  }

  function login(email, pass) {
    return auth.signInWithEmailAndPassword(email, pass);
  }

  // ============ Admin button ============

  function updateAdminUI(user) {
    const adminBtn = document.getElementById("adminBtn");
    if (!adminBtn) return;

    if (user && user.email === ADMIN_EMAIL) {
      adminBtn.style.display = "inline-flex";
    } else {
      adminBtn.style.display = "none";
    }
  }

  // ============ Load app ============

  let userDataListenerAttached = false;

  function loadUserDataAndShowApp() {
    document.getElementById("authScreen")?.classList.add("hidden");
    document.getElementById("mainApp")?.classList.remove("hidden");

    const ue = document.getElementById("userEmail");
    if (ue && currentUser?.email) {
      ue.textContent = currentUser.email.split("@")[0];
    }

    // Lần đầu: đọc 1 phát
    db.ref("users/" + currentUser.uid)
      .once("value")
      .then((snap) => {
        const data = snap.val() || {};
        updateGlobalStats(data);

        if (data.quizDone) {
          showGameBoard(data);
        } else {
          const invite = document.getElementById("quizInvite");
          if (invite) {
            invite.classList.remove("hidden");
            const go = document.getElementById("goQuizBtn");
            const skip = document.getElementById("skipQuizBtn");
            if (go && !go._bound) {
              go._bound = true;
              go.onclick = () =>
                (location.href = "/quiz.html?per=3");
            }
            if (skip && !skip._bd) {
              skip._bd = true;
              skip.onclick = () => invite.classList.add("hidden");
            }
          } else {
            location.href = "/quiz.html?per=3";
          }
        }
      });

    // Lắng nghe realtime duy nhất 1 lần
    if (!userDataListenerAttached) {
      userDataListenerAttached = true;
      db.ref("users/" + currentUser.uid).on("value", (snap) => {
        const data = snap.val() || {};
        updateGlobalStats(data);
        const pf = document.getElementById("profile");
        if (pf && !pf.classList.contains("hidden")) {
          App.Profile.renderProfile(data);
        }
      });
    }
  }

  // ============ Global stats (chỉ dùng để show toast) ============

  function updateGlobalStats(data) {
    const s = data.stats || {};
    const totalXP = s.xp || 0;
    const totalCoin = s.coin || 0;

    if (totalXP > lastXP) {
      showToast(`+${totalXP - lastXP} XP!`);
    }
    if (totalCoin > lastCoin) {
      showToast(`+${totalCoin - lastCoin} Coin!`);
    }

    lastXP = totalXP;
    lastCoin = totalCoin;

    // Không cập nhật DOM ở đây nữa, stats.js lo phần đó
  }

  // ============ Quiz nội tuyến (tính cách) ============

  function setupQuiz() {
    const questions = document.querySelectorAll(".question");
    const submitBtn = document.getElementById("submitBtn");
    if (!submitBtn || questions.length === 0) return;

    const alertBox = document.getElementById("alert");
    const missingCount = document.getElementById("missingCount");

    questions.forEach((q) => {
      const options = q.querySelectorAll(".option");
      const otherInput = q.querySelector(".other-input");

      options.forEach((opt) => {
        opt.onclick = () => {
          options.forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");

          if (opt.classList.contains("other-trigger") && otherInput) {
            otherInput.style.display = "block";
          } else if (otherInput) {
            otherInput.style.display = "none";
          }

          checkAllAnswered();
        };
      });

      const input = otherInput?.querySelector("input");
      if (input) input.oninput = checkAllAnswered;
    });

    function checkAllAnswered() {
      answeredCount = 0;
      questions.forEach((q) => {
        const selected = q.querySelector(".option.selected");
        const otherVal =
          q.querySelector(".other-input input")?.value.trim();
        if (selected || otherVal) answeredCount++;
      });

      if (missingCount) {
        missingCount.textContent = totalQuestions - answeredCount;
      }
      if (alertBox) {
        alertBox.style.display =
          answeredCount === totalQuestions ? "none" : "block";
      }
      submitBtn.disabled = answeredCount !== totalQuestions;
    }

    submitBtn.onclick = () => {
      if (!currentUser) {
        alert("Bạn cần đăng nhập trước khi làm trắc nghiệm.");
        return;
      }

      const traits = {
        creativity: 0,
        competitiveness: 0,
        sociability: 0,
        playfulness: 0,
        self_improvement: 0,
        perfectionism: 0,
      };

      questions.forEach((q) => {
        const selected = q.querySelector(".option.selected");
        if (selected && selected.dataset.score) {
          const [trait, score] = selected.dataset.score.split(":");
          traits[trait] += parseInt(score, 10);
        }
      });

      db.ref("users/" + currentUser.uid)
        .update({
          traits,
          quizDone: true,
        })
        .then(() => {
          showToast("Hoàn tất trắc nghiệm! Đang tải game...");
          loadUserDataAndShowApp();
        })
        .catch((e) => {
          console.error(e);
          alert("Có lỗi khi lưu kết quả, vui lòng thử lại.");
        });
    };
  }

  // ============ Game Board ============

  function showGameBoard(data) {
    if (location.hash === "#quiz") location.hash = "";

    const quizDiv = document.getElementById("quiz");
    if (quizDiv) quizDiv.classList.add("hidden");

    const board = document.getElementById("gameBoard");
    if (!board) {
      console.warn("[showGameBoard] #gameBoard not found");
      return;
    }
    board.classList.remove("hidden");

    const traits = data.traits || {};
    const highTrait = Object.keys(traits).reduce(
      (a, b) => (traits[a] > traits[b] ? a : b),
      "creativity"
    );

    const traitToGame = {
      creativity: "art",
      competitiveness: "math",
      sociability: "english",
      playfulness: "game",
      self_improvement: "science",
      perfectionism: "puzzle",
    };

    const recommendedGame = traitToGame[highTrait] || "art";

    const vietnameseNames = {
      creativity: "Sáng tạo",
      competitiveness: "Cạnh tranh",
      sociability: "Xã hội",
      playfulness: "Vui vẻ",
      self_improvement: "Tự cải thiện",
      perfectionism: "Cầu toàn",
    };

    const wm = document.getElementById("welcomeMsg");
    if (wm) {
      wm.innerHTML = `Dựa trên <strong>${
        vietnameseNames[highTrait] || "Sáng tạo"
      }</strong>, gợi ý: <strong style="color:#e11d48">${recommendedGame.toUpperCase()}</strong>`;
    }

    const grid = document.getElementById("gameGrid");
    if (grid) {
      grid.innerHTML = "";
      const games = [
        {
          id: "art",
          title: "Vẽ Tranh AI",
          icon: "Art",
          level: "Sáng tạo",
          rec: highTrait === "creativity",
        },
        {
          id: "math",
          title: "Toán Siêu Tốc",
          icon: "Math",
          level: "Cạnh tranh",
          rec: highTrait === "competitiveness",
        },
        {
          id: "english",
          title: "Học Từ Vựng",
          icon: "English",
          level: "Xã hội",
          rec: highTrait === "sociability",
        },
        {
          id: "science",
          title: "Thí Nghiệm",
          icon: "Science",
          level: "Tự cải thiện",
          rec: highTrait === "self_improvement",
        },
        {
          id: "puzzle",
          title: "Ghép Hình",
          icon: "Puzzle",
          level: "Cầu toàn",
          rec: highTrait === "perfectionism",
        },
        {
          id: "game",
          title: "Mini Game",
          icon: "Game",
          level: "Vui vẻ",
          rec: highTrait === "playfulness",
        },
      ];

      games.forEach((g) => {
        const card = document.createElement("div");
        card.className = `game-card ${g.rec ? "recommended" : ""}`;
        card.innerHTML = `
          <div class="game-icon">${g.icon}</div>
          <div class="game-title">${g.title}</div>
          <div class="game-level">${g.level}</div>
          ${g.rec ? '<div class="badge">GỢI Ý</div>' : ""}
        `;
        card.onclick = () =>
          showToast(`Chơi ${g.title} (sắp có!)`);
        grid.appendChild(card);
      });
    }
  }

  // ============ Profile ============

  function showProfile() {
    const gb = document.getElementById("gameBoard");
    const pf = document.getElementById("profile");
    gb && gb.classList.add("hidden");
    pf && pf.classList.remove("hidden");

    if (!currentUser) return;

    db.ref("users/" + currentUser.uid)
      .once("value")
      .then((snap) => App.Profile.renderProfile(snap.val()));
  }

  function backToGameBoard() {
    const pf = document.getElementById("profile");
    const gb = document.getElementById("gameBoard");
    pf && pf.classList.add("hidden");
    gb && gb.classList.remove("hidden");
  }

  // ============ Toast ============

  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
});
