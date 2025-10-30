// LearnQuest — quiz.js (6 trait groups, render sau DOM)
"use strict";

console.log("[quiz] file loaded");

window.addEventListener("DOMContentLoaded", () => {
  console.log("[quiz] DOM ready");

  // ===== Cấu hình =====
  const url = new URL(window.location.href);
  const PER_GROUP = Math.max(1, parseInt(url.searchParams.get("per") || "2", 10)); // số câu/nhóm

  const TRAITS = [
    "creativity",
    "sociability",
    "playfulness",
    "perfectionism",
    "self_improvement",
    "competitiveness",
  ];

  // Cập nhật hiển thị tổng số câu nếu có #questionCount
  const questionCountEl = document.getElementById("questionCount");
  if (questionCountEl) questionCountEl.textContent = String(PER_GROUP * TRAITS.length);

  // ===== Ngân hàng câu hỏi tách theo 6 nhóm =====
  // Mỗi option chỉ cộng điểm cho đúng trait qua data-score: "trait:1"
  const BANK = {
    creativity: [
      {
        id: "cr1",
        text: "Bạn thích tạo nội dung theo dạng nào?",
        options: [
          { label: "Vẽ/minh họa", score: "creativity:1" },
          { label: "Viết truyện/blog", score: "creativity:1" },
          { label: "Dựng video/podcast", score: "creativity:1" },
          { label: "Khác", other: true },
        ],
      },
      {
        id: "cr2",
        text: "Cách bạn phát triển ý tưởng mới?",
        options: [
          { label: "Mindmap/Sơ đồ", score: "creativity:1" },
          { label: "Lấy cảm hứng nhiều lĩnh vực", score: "creativity:1" },
          { label: "Thử nghiệm nhanh – làm rồi sửa", score: "creativity:1" },
        ],
      },
      {
        id: "cr3",
        text: "Bạn hứng thú nhất với thử thách nào?",
        options: [
          { label: "Sáng tác nội dung độc đáo", score: "creativity:1" },
          { label: "Thiết kế sản phẩm mới", score: "creativity:1" },
          { label: "Lập trình tạo ứng dụng thú vị", score: "creativity:1" },
        ],
      },
    ],

    sociability: [
      {
        id: "so1",
        text: "Bạn thích cách học nào nhất?",
        options: [
          { label: "Thảo luận nhóm", score: "sociability:1" },
          { label: "Workshop/Meetup", score: "sociability:1" },
          { label: "Kèm cặp/đồng hành", score: "sociability:1" },
        ],
      },
      {
        id: "so2",
        text: "Trong project nhóm, bạn thường là…",
        options: [
          { label: "Người kết nối & điều phối", score: "sociability:1" },
          { label: "Người truyền cảm hứng", score: "sociability:1" },
          { label: "Người hỗ trợ mọi thành viên", score: "sociability:1" },
        ],
      },
      {
        id: "so3",
        text: "Điều làm bạn vui nhất khi học cùng người khác?",
        options: [
          { label: "Trao đổi ý tưởng liên tục", score: "sociability:1" },
          { label: "Cảm giác thuộc về một nhóm", score: "sociability:1" },
          { label: "Cùng nhau ăn mừng tiến bộ", score: "sociability:1" },
        ],
      },
    ],

    playfulness: [
      {
        id: "pl1",
        text: "Bạn duy trì động lực học bằng cách…",
        options: [
          { label: "Game hóa mục tiêu/điểm thưởng", score: "playfulness:1" },
          { label: "Xem video minh họa", score: "playfulness:1" },
          { label: "Thử điều mới mỗi tuần", score: "playfulness:1" },
        ],
      },
      {
        id: "pl2",
        text: "Khi rảnh bạn thường…",
        options: [
          { label: "Chơi game", score: "playfulness:1" },
          { label: "Khám phá nội dung giải trí", score: "playfulness:1" },
          { label: "Làm mini-project vui vui", score: "playfulness:1" },
        ],
      },
      {
        id: "pl3",
        text: "Bạn thích kiểu thử thách nào trong app học?",
        options: [
          { label: "Nhiệm vụ ngắn – thưởng nhanh", score: "playfulness:1" },
          { label: "Combo thử thách đa dạng", score: "playfulness:1" },
          { label: "Bảng xếp hạng hàng tuần", score: "playfulness:1" },
        ],
      },
    ],

    perfectionism: [
      {
        id: "pf1",
        text: "Khi làm bài khó, bạn sẽ…",
        options: [
          { label: "Lập kế hoạch chi tiết", score: "perfectionism:1" },
          { label: "Chia nhỏ công việc", score: "perfectionism:1" },
          { label: "Kiểm tra checklist kỹ lưỡng", score: "perfectionism:1" },
        ],
      },
      {
        id: "pf2",
        text: "Bạn xử lý lỗi sai như thế nào?",
        options: [
          { label: "Sửa cho hoàn hảo", score: "perfectionism:1" },
          { label: "Viết lesson learned", score: "perfectionism:1" },
          { label: "Tăng tiêu chuẩn lần sau", score: "perfectionism:1" },
        ],
      },
      {
        id: "pf3",
        text: "Bạn thấy khó chịu nhất khi…",
        options: [
          { label: "Bị gián đoạn lúc tập trung", score: "perfectionism:1" },
          { label: "Không có tiêu chí rõ", score: "perfectionism:1" },
          { label: "Tài liệu/format lộn xộn", score: "perfectionism:1" },
        ],
      },
    ],

    self_improvement: [
      {
        id: "si1",
        text: "Bạn đặt mục tiêu thế nào?",
        options: [
          { label: "SMART, đo lường tiến độ", score: "self_improvement:1" },
          { label: "Tăng độ khó theo thời gian", score: "self_improvement:1" },
          { label: "Review định kỳ hàng tuần", score: "self_improvement:1" },
        ],
      },
      {
        id: "si2",
        text: "Khi thiếu động lực, bạn sẽ…",
        options: [
          { label: "Tạo lịch luyện tập đều", score: "self_improvement:1" },
          { label: "Tìm đồng hành/mentor", score: "self_improvement:1" },
          { label: "Đặt mini-goal hằng ngày", score: "self_improvement:1" },
        ],
      },
      {
        id: "si3",
        text: "Bạn thích đánh giá tiến bộ bằng…",
        options: [
          { label: "Biểu đồ/điểm mốc", score: "self_improvement:1" },
          { label: "Nhật ký học tập", score: "self_improvement:1" },
          { label: "Bài test định kỳ", score: "self_improvement:1" },
        ],
      },
    ],

    competitiveness: [
      {
        id: "cp1",
        text: "Bạn thấy hứng thú nhất khi…",
        options: [
          { label: "Leo bảng xếp hạng", score: "competitiveness:1" },
          { label: "Đạt top/break kỷ lục", score: "competitiveness:1" },
          { label: "So kè điểm với bạn bè", score: "competitiveness:1" },
        ],
      },
      {
        id: "cp2",
        text: "Môn/kiểu thử thách bạn thích?",
        options: [
          { label: "Giải đố/Toán khó", score: "competitiveness:1" },
          { label: "Thi kỹ năng nhanh", score: "competitiveness:1" },
          { label: "Đấu đối kháng/hùng biện", score: "competitiveness:1" },
        ],
      },
      {
        id: "cp3",
        text: "Điều khiến bạn tự hào nhất là…",
        options: [
          { label: "Vượt qua đối thủ mạnh", score: "competitiveness:1" },
          { label: "Giữ chuỗi thắng dài", score: "competitiveness:1" },
          { label: "Đạt huy hiệu hiếm", score: "competitiveness:1" },
        ],
      },
    ],
  };

  // ===== Helpers =====
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickPerGroup(bank, per) {
    const picked = [];
    for (const trait of Object.keys(bank)) {
      const group = bank[trait] || [];
      const chosen = shuffle(group).slice(0, Math.min(per, group.length));
      picked.push(...chosen.map((q) => ({ ...q, trait })));
    }
    return picked;
  }

  // ===== Render =====
  const listEl = document.getElementById("questionList");
  const alertEl = document.getElementById("alert");
  const missingCountEl = document.getElementById("missingCount");
  const submitBtn = document.getElementById("submitBtn");

  const picked = pickPerGroup(BANK, PER_GROUP);

  function render() {
    listEl.innerHTML = "";
    picked.forEach((q, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "question";
      wrap.dataset.q = q.id;

      const title = document.createElement("h3");
      title.textContent = `${idx + 1}. ${q.text}`;
      wrap.appendChild(title);

      const opts = document.createElement("div");
      opts.className = "options";

      q.options.forEach((opt, oi) => {
        const div = document.createElement("div");
        div.className = "option";
        div.tabIndex = 0;
        div.setAttribute("role", "button");
        div.dataset.index = String(oi);

        if (opt.other) div.classList.add("other-trigger");
        if (opt.score) div.dataset.score = opt.score; // "trait:1"

        div.textContent = opt.label;
        opts.appendChild(div);
      });
      wrap.appendChild(opts);

      // input cho "Khác"
      const otherWrap = document.createElement("div");
      otherWrap.className = "other-input";
      otherWrap.style.display = "none";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Nhập câu trả lời của bạn";
      otherWrap.appendChild(input);
      wrap.appendChild(otherWrap);

      listEl.appendChild(wrap);
    });
  }

  render();

  // ===== Interaction =====
  listEl.addEventListener("click", (e) => {
    const option = e.target.closest(".option");
    if (!option) return;
    const qBox = option.closest(".question");
    qBox.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
    option.classList.add("selected");

    const other = option.classList.contains("other-trigger");
    const otherWrap = qBox.querySelector(".other-input");
    if (other) {
      otherWrap.style.display = "block";
      otherWrap.querySelector("input").focus();
    } else {
      otherWrap.style.display = "none";
    }

    checkAllAnswered();
  });

  listEl.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("option")) {
      e.preventDefault();
      e.target.click();
    }
  });

  function checkAllAnswered() {
    const boxes = listEl.querySelectorAll(".question");
    let missing = 0;
    boxes.forEach((b) => {
      if (!b.querySelector(".option.selected")) missing++;
    });

    submitBtn.disabled = missing > 0;
    if (missing > 0) {
      alertEl.style.display = "block";
      if (missingCountEl) missingCountEl.textContent = String(missing);
    } else {
      alertEl.style.display = "none";
    }
  }

  // ===== Chấm điểm =====
  function score() {
    const result = {
      creativity: 0,
      sociability: 0,
      playfulness: 0,
      perfectionism: 0,
      self_improvement: 0,
      competitiveness: 0,
    };

    const boxes = listEl.querySelectorAll(".question");
    boxes.forEach((b) => {
      const sel = b.querySelector(".option.selected");
      if (!sel) return;
      const scoreStr = sel.dataset.score; // "trait:1"
      if (!scoreStr) return;
      const [trait, wStr] = scoreStr.split(":");
      const w = parseFloat(wStr || "1");
      if (TRAITS.includes(trait)) result[trait] += w;
    });

    return result;
  }

  // ===== Submit =====
  const SAFE_XP = 50;
  submitBtn.addEventListener("click", () => {
    checkAllAnswered();
    if (submitBtn.disabled) return;

    const res = score();
    try {
      localStorage.setItem("lq_traitScores", JSON.stringify(res));
      localStorage.setItem("lq_quizDone", "true");
      const xp = parseInt(localStorage.getItem("lq_xp") || "0", 10) + SAFE_XP;
      localStorage.setItem("lq_xp", String(xp));
    } catch (e) {
      console.warn("localStorage error", e);
    }

    window.location.href = "/index.html?quiz=done";
  });
});
