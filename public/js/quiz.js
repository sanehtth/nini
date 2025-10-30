/* ===== QUIZ BOOTSTRAP (an toàn) ===== */
"use strict";
console.log("[quiz] loaded");

window.addEventListener("DOMContentLoaded", () => {
  console.log("[quiz] DOM ready");

  const $ = (s) => document.querySelector(s);
  const listEl   = $("#questionList");
  const alertEl  = $("#alert");
  const missEl   = $("#missingCount");
  const submitEl = $("#submitBtn");
  const countEl  = $("#questionCount");

  if (!listEl || !submitEl) {
    console.warn("[quiz] Missing required DOM nodes");
    return;
  }

  // ===== 1) LẤY BANK CÂU HỎI =====
  // Chấp nhận nhiều tên biến global để tránh lệch tên file config
  const BANK =
    window.TRAIT_BANK ||
    window.QUESTION_BANK ||
    window.QUIZ_BANK ||
    window.QUESTIONS ||
    null;

  const TRAITS = ["creativity","sociability","playfulness","perfectionism","self_improvement","competitiveness"];
  const PER_GROUP = 2;  // mỗi nhóm rút ngẫu nhiên 2 câu -> tổng 12

  // ===== 2) Nếu không có BANK -> hiển thị thông báo + câu mẫu
  if (!BANK || typeof BANK !== "object") {
    console.error("[quiz] Không tìm thấy ngân hàng câu hỏi từ trait-config.js");
    listEl.innerHTML = `
      <div class="question">
        <h3>⚙️ Không tải được ngân hàng câu hỏi</h3>
        <p>Kiểm tra lại <b>/js/trait-config.js</b> đã load trước <b>/js/quiz.js</b> chưa,
        và biến global đang export (TRAIT_BANK | QUESTION_BANK | QUIZ_BANK | QUESTIONS).</p>
        <div class="options">
          <div class="option">Sanity option A</div>
          <div class="option">Sanity option B</div>
        </div>
      </div>
    `;
    if (countEl) countEl.textContent = "0";
    submitEl.disabled = true;
    return;
  }

  // ===== 3) RÚT CÂU HỎI NGẪU NHIÊN THEO 6 NHÓM =====
  function pickRandom(arr, n) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(n, a.length));
  }

  // Chuẩn hóa BANK về dạng {trait: [{text, options: [{label, score:"trait:1"}]}]}
  function normalizeGroup(g) {
    // chấp nhận dạng string[] cũng như object có options
    return (g || []).map(q => {
      if (typeof q === "string") {
        // tạo 2 lựa chọn mặc định
        return {
          text: q,
          options: [
            { label: "Đồng ý", score: "creativity:1" },
            { label: "Không",  score: "creativity:0" }
          ]
        };
      }
      return q;
    });
  }

  const groups = {};
  TRAITS.forEach(t => {
    const g = normalizeGroup(BANK[t] || BANK[t.toUpperCase()] || []);
    groups[t] = pickRandom(g, PER_GROUP);
  });

  const ALL = TRAITS.flatMap(t => groups[t]);
  if (countEl) countEl.textContent = String(ALL.length);

  // ===== 4) RENDER =====
  function render() {
    listEl.innerHTML = "";
    ALL.forEach((q, idx) => {
      const qWrap = document.createElement("div");
      qWrap.className = "question";
      qWrap.dataset.q = String(idx + 1);
      qWrap.innerHTML = `
        <h3>${idx + 1}. ${q.text}</h3>
        <div class="options"></div>
      `;
      const optWrap = qWrap.querySelector(".options");
      (q.options || []).forEach((op, oi) => {
        const opt = document.createElement("div");
        opt.className = "option";
        if (op.score) opt.dataset.score = op.score;
        if (op.positive) opt.dataset.positive = op.positive;
        if (op.negative) opt.dataset.negative = op.negative;
        opt.textContent = op.label || op.text || `Lựa chọn ${oi + 1}`;
        opt.addEventListener("click", () => {
          // toggle chọn trong câu này
          qWrap.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
          checkAllAnswered();
        });
        optWrap.appendChild(opt);
      });
      listEl.appendChild(qWrap);
    });
  }

  function checkAllAnswered() {
    const total = ALL.length;
    const answered = listEl.querySelectorAll(".option.selected").length;
    const missing = total - answered;
    if (missEl) missEl.textContent = missing;
    if (alertEl) alertEl.style.display = missing > 0 ? "block" : "none";
    submitEl.disabled = missing > 0;
  }

  render();
  checkAllAnswered();

  // ===== 5) SCORE + SUBMIT =====
  function score() {
    const result = {
      creativity: 0, sociability: 0, playfulness: 0,
      perfectionism: 0, self_improvement: 0, competitiveness: 0
    };
    const boxes = listEl.querySelectorAll(".question");
    boxes.forEach(box => {
      const sel = box.querySelector(".option.selected");
      if (!sel) return;
      // Ưu tiên data-score "trait:w", rồi positive/negative
      const s = sel.dataset.score;
      if (s) {
        const [trait, wStr] = s.split(":");
        const w = parseFloat(wStr || "1");
        if (TRAITS.includes(trait)) result[trait] += w;
      } else {
        if (sel.dataset.positive) result.creativity += Number(sel.dataset.positive);
        if (sel.dataset.negative) result.playfulness += Number(sel.dataset.negative);
      }
    });
    return result;
  }

 // =======================
// SUBMIT: lưu về /users/{uid}
// =======================
(function () {
  const submitEl = document.getElementById("submitBtn");
  if (!submitEl) return;

  submitEl.addEventListener("click", async (e) => {
    e.preventDefault();

    // 1) Kiểm tra đã trả lời đủ chưa
    checkAllAnswered && checkAllAnswered();
    if (submitEl.disabled) return;

    try {
      // 2) Tính điểm traits
      const res = (typeof score === "function") ? score() : null;
      if (!res) throw new Error("score() not found");

      // 3) Yêu cầu có user đăng nhập
      const u = (window.firebase && firebase.auth) ? firebase.auth().currentUser : null;
      if (!u) {
        alert("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.");
        window.location.href = "index.html";
        return;
      }

      // 4) Ghi vào DB
      const db = firebase.database();
      await db.ref(`/users/${u.uid}/traits`).set(res);
      await db.ref(`/users/${u.uid}/quizMeta`).set({
        updatedAt: Date.now(),
        traitKeys: ["creativity","competitiveness","sociability","playfulness","self_improvement","perfectionism"]
      });

      // 5) Thưởng XP nhẹ
      await db.ref(`/users/${u.uid}/stats/xp`).transaction(v => (v || 0) + 50);

      // 6) Về index
      window.location.href = "index.html?quiz=done";
    } catch (err) {
      console.error(err);
      const alertEl = document.getElementById("alert");
      if (alertEl) {
        alertEl.style.display = "block";
        alertEl.textContent = "Lỗi tại quiz: " + (err && err.message ? err.message : String(err));
      } else {
        alert("Lỗi tại quiz: " + (err && err.message ? err.message : String(err)));
      }
    }
  });
})();

// =======================
// CANCEL (nếu muốn bắt sự kiện bằng JS, nhưng đã có fallback <a>)
// =======================
(function () {
  const cancel = document.getElementById("cancelLink");
  if (!cancel) return;
  cancel.addEventListener("click", (e) => {
    // có thể để mặc định, vì đã có href
    // e.preventDefault(); window.location.replace("index.html");
  });
})();




