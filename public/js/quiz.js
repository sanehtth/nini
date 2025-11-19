// ====== QUIZ – 30 câu chuẩn (6 trait x 5 câu), mỗi option map {trait, score} ======
(function () {
  // --- BANK 30 CÂU ---
  const BANK = {
    creativity: [
      { text: "Bạn thường biến tấu bài tập theo ý tưởng riêng?",
        options: [
          { label: "Luôn luôn", trait: "creativity", score: 2 },
          { label: "Thỉnh thoảng", trait: "creativity", score: 1 },
          { label: "Hiếm khi", trait: "creativity", score: 0 },
        ]},
      { text: "Khi học, bạn thích vẽ sơ đồ/mindmap hơn là ghi chép dài?",
        options: [
          { label: "Đúng vậy", trait: "creativity", score: 2 },
          { label: "Thỉnh thoảng", trait: "creativity", score: 1 },
          { label: "Không", trait: "creativity", score: 0 },
        ]},
      { text: "Bạn thấy hứng thú khi tạo sản phẩm (video, poster, truyện ngắn…)?",
        options: [
          { label: "Rất hứng thú", trait: "creativity", score: 2 },
          { label: "Bình thường", trait: "creativity", score: 1 },
          { label: "Ít hứng thú", trait: "creativity", score: 0 },
        ]},
      { text: "Bạn hay tìm nhiều cách giải khác nhau cho cùng một vấn đề?",
        options: [
          { label: "Thường xuyên", trait: "creativity", score: 2 },
          { label: "Thỉnh thoảng", trait: "creativity", score: 1 },
          { label: "Hiếm khi", trait: "creativity", score: 0 },
        ]},
      { text: "Bạn thích môn/hoạt động thiên về sáng tạo (Nghệ thuật, Viết, Thiết kế…)?",
        options: [
          { label: "Có", trait: "creativity", score: 2 },
          { label: "Tùy lúc", trait: "creativity", score: 1 },
          { label: "Không", trait: "creativity", score: 0 },
        ]},
    ],

    competitiveness: [
      { text: "Bạn thích thi đua, bảng xếp hạng và phá kỷ lục?",
        options: [
          { label: "Rất thích", trait: "competitiveness", score: 2 },
          { label: "Bình thường", trait: "competitiveness", score: 1 },
          { label: "Không hứng thú", trait: "competitiveness", score: 0 },
        ]},
      { text: "Khi làm bài, bạn hay đặt mục tiêu vượt người khác?",
        options: [
          { label: "Thường xuyên", trait: "competitiveness", score: 2 },
          { label: "Thỉnh thoảng", trait: "competitiveness", score: 1 },
          { label: "Hiếm khi", trait: "competitiveness", score: 0 },
        ]},
      { text: "Bạn thấy có động lực mạnh khi có giải thưởng/huy hiệu?",
        options: [
          { label: "Có", trait: "competitiveness", score: 2 },
          { label: "Tùy lúc", trait: "competitiveness", score: 1 },
          { label: "Không", trait: "competitiveness", score: 0 },
        ]},
      { text: "Bạn thích bài tập dạng thử thách thời gian/điểm số?",
        options: [
          { label: "Có", trait: "competitiveness", score: 2 },
          { label: "Thỉnh thoảng", trait: "competitiveness", score: 1 },
          { label: "Không", trait: "competitiveness", score: 0 },
        ]},
      { text: "Bạn thường so sánh kết quả của mình với bạn bè?",
        options: [
          { label: "Thường xuyên", trait: "competitiveness", score: 2 },
          { label: "Ít khi", trait: "competitiveness", score: 1 },
          { label: "Hầu như không", trait: "competitiveness", score: 0 },
        ]},
    ],

    sociability: [
      { text: "Bạn học tốt hơn khi được thảo luận nhóm?",
        options: [
          { label: "Đúng vậy", trait: "sociability", score: 2 },
          { label: "Tùy chủ đề", trait: "sociability", score: 1 },
          { label: "Không", trait: "sociability", score: 0 },
        ]},
      { text: "Bạn dễ dàng bắt chuyện và đặt câu hỏi với giáo viên/bạn học?",
        options: [
          { label: "Rất dễ", trait: "sociability", score: 2 },
          { label: "Lúc được lúc không", trait: "sociability", score: 1 },
          { label: "Khá ngại", trait: "sociability", score: 0 },
        ]},
      { text: "Bạn thích làm dự án có phân vai và cộng tác chặt chẽ?",
        options: [
          { label: "Rất thích", trait: "sociability", score: 2 },
          { label: "Tùy nhóm", trait: "sociability", score: 1 },
          { label: "Không", trait: "sociability", score: 0 },
        ]},
      { text: "Hoạt động giao tiếp (thuyết trình, debate) hấp dẫn với bạn?",
        options: [
          { label: "Có", trait: "sociability", score: 2 },
          { label: "Thỉnh thoảng", trait: "sociability", score: 1 },
          { label: "Ít hứng thú", trait: "sociability", score: 0 },
        ]},
      { text: "Bạn thường nhờ bạn bè giải thích lại khi chưa hiểu?",
        options: [
          { label: "Thường xuyên", trait: "sociability", score: 2 },
          { label: "Đôi khi", trait: "sociability", score: 1 },
          { label: "Hiếm khi", trait: "sociability", score: 0 },
        ]},
    ],

    playfulness: [
      { text: "Bạn thích học qua game/video hơn bài giảng thuần chữ?",
        options: [
          { label: "Rất thích", trait: "playfulness", score: 2 },
          { label: "Tùy nội dung", trait: "playfulness", score: 1 },
          { label: "Không", trait: "playfulness", score: 0 },
        ]},
      { text: "Bạn hay biến việc học thành thử thách nhỏ vui vui?",
        options: [
          { label: "Có", trait: "playfulness", score: 2 },
          { label: "Thỉnh thoảng", trait: "playfulness", score: 1 },
          { label: "Ít khi", trait: "playfulness", score: 0 },
        ]},
      { text: "Bạn hứng thú với nhiệm vụ hằng ngày/chuỗi streak?",
        options: [
          { label: "Có", trait: "playfulness", score: 2 },
          { label: "Tùy lúc", trait: "playfulness", score: 1 },
          { label: "Không", trait: "playfulness", score: 0 },
        ]},
      { text: "Bạn dễ chán nếu hoạt động quá lặp lại và khô khan?",
        options: [
          { label: "Đúng vậy", trait: "playfulness", score: 2 },
          { label: "Tùy mức độ", trait: "playfulness", score: 1 },
          { label: "Không", trait: "playfulness", score: 0 },
        ]},
      { text: "Bạn thích “phần thưởng nhỏ” khi hoàn thành nhiệm vụ?",
        options: [
          { label: "Rất thích", trait: "playfulness", score: 2 },
          { label: "Bình thường", trait: "playfulness", score: 1 },
          { label: "Không cần", trait: "playfulness", score: 0 },
        ]},
    ],

    self_improvement: [
      { text: "Bạn thường đặt mục tiêu học tập theo tuần/tháng?",
        options: [
          { label: "Có kế hoạch rõ", trait: "self_improvement", score: 2 },
          { label: "Đôi khi", trait: "self_improvement", score: 1 },
          { label: "Hầu như không", trait: "self_improvement", score: 0 },
        ]},
      { text: "Bạn theo dõi tiến bộ (điểm, thời gian học, số bài đã làm)?",
        options: [
          { label: "Thường xuyên", trait: "self_improvement", score: 2 },
          { label: "Lúc có lúc không", trait: "self_improvement", score: 1 },
          { label: "Không", trait: "self_improvement", score: 0 },
        ]},
      { text: "Khi gặp khó, bạn kiên trì thử nhiều cách để hiểu bài?",
        options: [
          { label: "Rất kiên trì", trait: "self_improvement", score: 2 },
          { label: "Tạm được", trait: "self_improvement", score: 1 },
          { label: "Dễ bỏ qua", trait: "self_improvement", score: 0 },
        ]},
      { text: "Bạn tự tìm tài liệu/khóa học bổ sung cho phần yếu?",
        options: [
          { label: "Có", trait: "self_improvement", score: 2 },
          { label: "Thỉnh thoảng", trait: "self_improvement", score: 1 },
          { label: "Ít khi", trait: "self_improvement", score: 0 },
        ]},
      { text: "Bạn thích phản hồi giúp cải thiện hơn là lời khen chung chung?",
        options: [
          { label: "Đúng vậy", trait: "self_improvement", score: 2 },
          { label: "Tùy tình huống", trait: "self_improvement", score: 1 },
          { label: "Không", trait: "self_improvement", score: 0 },
        ]},
    ],

    perfectionism: [
      { text: "Bạn muốn sản phẩm đạt chuẩn “đã mắt/đẹp/chuẩn chỉnh” trước khi nộp?",
        options: [
          { label: "Luôn luôn", trait: "perfectionism", score: 2 },
          { label: "Thỉnh thoảng", trait: "perfectionism", score: 1 },
          { label: "Không cần", trait: "perfectionism", score: 0 },
        ]},
      { text: "Bạn hay sửa bài nhiều lần cho đến khi thật ưng ý?",
        options: [
          { label: "Rất hay", trait: "perfectionism", score: 2 },
          { label: "Đôi khi", trait: "perfectionism", score: 1 },
          { label: "Ít khi", trait: "perfectionism", score: 0 },
        ]},
      { text: "Bạn thích checklist chi tiết để kiểm soát chất lượng?",
        options: [
          { label: "Có", trait: "perfectionism", score: 2 },
          { label: "Thỉnh thoảng", trait: "perfectionism", score: 1 },
          { label: "Không", trait: "perfectionism", score: 0 },
        ]},
      { text: "Bạn khó chịu khi bài làm chưa ‘đủ đẹp’ dù đã đúng ý?",
        options: [
          { label: "Đúng vậy", trait: "perfectionism", score: 2 },
          { label: "Tùy mức độ", trait: "perfectionism", score: 1 },
          { label: "Không", trait: "perfectionism", score: 0 },
        ]},
      { text: "Bạn thích quy trình chuẩn/tiêu chí rõ ràng để dựa theo?",
        options: [
          { label: "Rất thích", trait: "perfectionism", score: 2 },
          { label: "Bình thường", trait: "perfectionism", score: 1 },
          { label: "Không cần", trait: "perfectionism", score: 0 },
        ]},
    ],
  };

  // --- Utils ---
  function pickRandom(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  // --- Auth guard ---
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) window.location.href = "/index.html";
  });

  // --- Render ---
  document.addEventListener("DOMContentLoaded", () => {
    const per = Math.max(1, Number(new URL(location.href).searchParams.get("per") || 3));
    const traits = ["creativity","competitiveness","sociability","playfulness","self_improvement","perfectionism"];

    // gom câu
    let questions = [];
    traits.forEach(t => questions = questions.concat(pickRandom(BANK[t] || [], per)));

    const listEl = document.getElementById("questionList");
    const submitBtn = document.getElementById("submitBtn");
    const alertEl = document.getElementById("alert");
    const missEl  = document.getElementById("missingCount");
    document.getElementById("questionCount").textContent = `${questions.length}`;

    listEl.innerHTML = "";
    questions.forEach((q, idx) => {
      const div = document.createElement("div");
      div.className = "question";
      div.innerHTML = `<h3>${idx+1}. ${q.text}</h3>
        <div class="options">
          ${q.options.map(op => `
            <button class="option" data-trait="${op.trait}" data-score="${op.score}">${op.label}</button>
          `).join("")}
        </div>`;
      listEl.appendChild(div);
    });

    // chọn đáp án
    function checkFilled(){
      const total = questions.length;
      const picked = listEl.querySelectorAll(".option.selected").length;
      const missing = total - picked;
      missEl.textContent = missing;
      alertEl.style.display = missing>0 ? "block" : "none";
      submitBtn.disabled = missing>0;
    }
    listEl.addEventListener("click",(e)=>{
      const btn = e.target.closest(".option");
      if (!btn) return;
      const wrap = btn.closest(".options");
      wrap.querySelectorAll(".option").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      checkFilled();
    });
    checkFilled();

    // submit
    submitBtn.addEventListener("click", async ()=>{
      const traitScores = {
        creativity:0, competitiveness:0, sociability:0,
        playfulness:0, self_improvement:0, perfectionism:0
      };
      listEl.querySelectorAll(".option.selected").forEach(btn=>{
        traitScores[btn.dataset.trait] += Number(btn.dataset.score || 0);
      });

      // chuẩn hoá % 0..100 (mỗi trait có per câu, max điểm/trait = per*2)
      const max = per * 2;
      const traitsPct = {};
      Object.keys(traitScores).forEach(k=>{
        traitsPct[k] = Math.round((traitScores[k] / max) * 100);
      });

      try {
        const user = firebase.auth().currentUser;
        if (!user) { alert("Bạn chưa đăng nhập."); return; }
        const ref = firebase.database().ref("users/"+user.uid);
        await ref.update({ traits: traitsPct, quizDone: true });

 
        alert("Đã lưu kết quả. Quay về trang chính!");
        location.href = "/index.html?quiz=done";
      } catch (e) {
        console.error(e);
        alert("Có lỗi khi lưu kết quả, vui lòng thử lại.");
      }
    });
  });
})();

