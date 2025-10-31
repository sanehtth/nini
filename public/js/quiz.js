// quiz.js — render quiz trong index (SPA) vào #quizRoot
(function () {
  const auth = firebase.auth();
  const db   = firebase.database();
  const BANK = window.TRAIT_BANK || {};

  // Tạo danh sách câu hỏi hợp nhất từ BANK
  function buildPool() {
    const pool = [];
    Object.keys(BANK).forEach(trait => {
      (BANK[trait] || []).forEach(q => {
        const options = q.options.map(o => o.label);
        const scores  = {};
        q.options.forEach(o => {
          // "trait:1" hoặc {trait:1}
          if (typeof o.score === "string") {
            const [k,v] = o.score.split(":");
            scores[k] = Number(v);
          } else if (typeof o.score === "object" && o.score) {
            Object.assign(scores, o.score);
          }
        });
        pool.push({ q: q.text || q.q || "", options, scores });
      });
    });
    return pool;
  }

  // Render quiz vào #quizRoot
  function renderQuiz() {
    const root = document.getElementById("quizRoot");
    if (!root) return;
    const user = auth.currentUser;
    if (!user) { location.href = "index.html"; return; }

    const pool = buildPool();
    if (!pool.length) {
      root.innerHTML = "<p>Không có câu hỏi. Vui lòng thêm trong trait-config.js.</p>";
      return;
    }

    // UI
    const form = document.createElement("form");
    form.innerHTML = "";
    pool.forEach((it, idx) => {
      const div = document.createElement("div");
      div.style.marginBottom = "12px";
      div.innerHTML = `<p><strong>${idx+1}. ${it.q}</strong></p>` +
        it.options.map((op,i)=>(
          `<label style="display:block;margin:4px 0">
             <input type="radio" name="q${idx}" value="${i}"> ${op}
           </label>`
        )).join("");
      form.appendChild(div);
    });

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn primary";
    submit.textContent = "Nộp bài";
    form.appendChild(submit);

    // Xử lý nộp quiz
    form.onsubmit = async (e) => {
      e.preventDefault();
      const sums = {
        creativity:0, competitiveness:0, sociability:0,
        playfulness:0, self_improvement:0, perfectionism:0
      };

      const fd = new FormData(form);
      pool.forEach((it, idx) => {
        const v = fd.get("q"+idx);
        if (v == null) return;
        // cộng điểm theo mapping
        Object.keys(it.scores).forEach(k => {
          sums[k] += Number(it.scores[k] || 0);
        });
      });

      // Chuẩn hoá về % (đơn giản: chia theo tổng tối đa từng trait nếu có)
      // Nếu BANK đều dùng score=1 mỗi lần trait xuất hiện, có thể lấy max = số lần trait đó xuất hiện
      const counts = { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
      pool.forEach(it => {
        Object.keys(it.scores).forEach(k => { if (counts[k] != null) counts[k]++; });
      });
      const toPct = (k) => {
        const max = Math.max(1, counts[k]);
        return Math.round(100 * sums[k] / max);
      };
      const traits = {
        creativity:       toPct("creativity"),
        competitiveness:  toPct("competitiveness"),
        sociability:      toPct("sociability"),
        playfulness:      toPct("playfulness"),
        self_improvement: toPct("self_improvement"),
        perfectionism:    toPct("perfectionism"),
      };

      try {
        await db.ref("users/" + user.uid + "/traits").set(traits);
        // thông báo nhẹ
        alert("Đã lưu kết quả trắc nghiệm! Quay lại trang chính để xem biểu đồ.");
        // quay lại trang chính (bỏ #quiz) để hiện dashboard
        location.hash = "";
      } catch (err) {
        console.error(err);
        alert("Lưu kết quả thất bại. Vui lòng thử lại.");
      }
    };

    root.innerHTML = "";
    root.appendChild(form);
  }

  // Export cho main.js router gọi
  window.renderQuiz = renderQuiz;
})();
