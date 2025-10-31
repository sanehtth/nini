// public/js/quiz.js — render quiz trong index (SPA) vào #quizRoot
(function () {
  const auth = firebase.auth();
  const db   = firebase.database();
  const BANK = window.TRAIT_BANK || {};

  function buildPool() {
    const pool = [];
    Object.keys(BANK).forEach(trait => {
      (BANK[trait] || []).forEach(q => {
        const options = q.options.map(o => o.label);
        const scores  = {};
        q.options.forEach(o => {
          if (typeof o.score === "string") {
            const [k,v] = o.score.split(":"); scores[k] = Number(v);
          } else if (typeof o.score === "object" && o.score) {
            Object.assign(scores, o.score);
          }
        });
        pool.push({ q: q.text || q.q || "", options, scores });
      });
    });
    return pool;
  }

  function renderQuiz() {
    const root = document.getElementById("quizRoot");
    if (!root) return;
    const user = auth.currentUser;
    if (!user) { location.href = "index.html"; return; }

    const pool = buildPool();
    if (!pool.length) { root.innerHTML = "<p>Chưa có câu hỏi trong trait-config.js.</p>"; return; }

    const form = document.createElement("form");
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
    submit.type = "submit"; submit.className = "btn primary"; submit.textContent = "Nộp bài";
    form.appendChild(submit);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const sums = { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
      const counts = { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };

      const pool2 = buildPool(); // giữ nguyên thứ tự
      const fd = new FormData(form);
      pool2.forEach((it, idx) => {
        const v = fd.get("q"+idx);
        if (v == null) return;
        Object.keys(it.scores).forEach(k => {
          sums[k] += Number(it.scores[k] || 0);
          counts[k] += 1;
        });
      });

      const pct = (k) => Math.round(100 * (sums[k] || 0) / Math.max(1, counts[k] || 0));
      const traits = {
        creativity: pct("creativity"),
        competitiveness: pct("competitiveness"),
        sociability: pct("sociability"),
        playfulness: pct("playfulness"),
        self_improvement: pct("self_improvement"),
        perfectionism: pct("perfectionism"),
      };

      try {
        await db.ref("users/" + user.uid + "/traits").set(traits);
        alert("Đã lưu trắc nghiệm! Quay lại trang chính để xem biểu đồ.");
        location.hash = ""; // quay về dashboard
      } catch (err) {
        console.error(err);
        alert("Lưu kết quả thất bại. Thử lại nhé.");
      }
    };

    root.innerHTML = "";
    root.appendChild(form);
  }

  // export cho router trong main.js gọi
  window.renderQuiz = renderQuiz;
})();
