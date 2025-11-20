// js/quizEng.js
// Bài test tiếng Anh: chạy theo TỪNG PHẦN, TỪNG CÂU
// - Đọc testsManifest & sectionsManifest
// - Cho chọn phần (1..6), mỗi phần hiển thị lần lượt từng câu
// - Cộng điểm tạm vào runtime.tempScore
// - Sau này có thể dùng tempScore để cộng XP/Coin thật vào Firebase

(function () {
  // ================== CÁC HÀM DÙNG CHUNG ==================

  function getTestIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("test") || "test1";
  }

  async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Không tải được " + url + " (" + res.status + ")");
    return await res.json();
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  const norm = (s) => (s || "").trim().toLowerCase();

  // ================== KHỞI ĐỘNG TOÀN BÀI ==================

  async function initQuizEng() {
    const root =
      document.getElementById("quiz-eng-root") ||
      document.getElementById("quizEng-root");
    if (!root) return;

    root.textContent = "Đang tải đề kiểm tra...";

    try {
      const testId = getTestIdFromQuery();

      // Đọc manifest
      const [testsManifest, sectionsManifest] = await Promise.all([
        loadJson("/content/testsManifest.json"),
        loadJson("/content/sectionsManifest.json"),
      ]);

      const test =
        (testsManifest.tests || []).find((t) => t.id === testId) ||
        (testsManifest.tests || [])[0];

      if (!test) {
        root.textContent = "Không tìm thấy bài test.";
        return;
      }

      // Map id -> meta
      const sectionMetaMap = new Map(
        (sectionsManifest.sections || []).map((s) => [s.id, s])
      );

      // Load dữ liệu từng section của bài test
      const sections = [];
      for (const secId of test.sections || []) {
        const meta = sectionMetaMap.get(secId);
        if (!meta) continue;
        const data = await loadJson(meta.file);
        // Gắn thêm meta để dùng: title, type, partIndex...
        data.id = meta.id;
        data.partIndex = meta.partIndex;
        data.label = meta.label;
        sections.push(data);
      }

      const runtime = {
        test,
        sections,
        // điểm tạm cho cả bài test (tăng dần mỗi câu đúng)
        tempScore: 0,
        // trạng thái từng phần: "new" | "in-progress" | "done"
        sectionState: {},
        // chỉ số câu hiện tại trong phần đang chạy
        currentQuestionIndex: 0,
      };

      renderTestOverview(root, runtime);
    } catch (e) {
      console.error(e);
      root.textContent =
        "Có lỗi khi tải đề kiểm tra. Vui lòng kiểm tra lại JSON hoặc kết nối mạng.";
    }
  }

  // ================== MÀN HÌNH TỔNG – DANH SÁCH PHẦN ==================

  function renderTestOverview(root, runtime) {
    const { test, sections, sectionState } = runtime;

    root.innerHTML = "";

    const title = el(
      "h2",
      "quiz-eng-overview-title",
      test.title || "English Quiz – Bài kiểm tra tiếng Anh"
    );
    root.appendChild(title);

    if (test.description) {
      const sub = el("p", "quiz-eng-overview-sub", test.description);
      root.appendChild(sub);
    }

    const list = el("div", "quiz-eng-section-list");
    root.appendChild(list);

    sections.forEach((sec, idx) => {
      const state = sectionState[sec.id] || "new";
      const card = el("div", "quiz-eng-section-card");

      const name = el(
        "div",
        "quiz-eng-section-name",
        sec.label || `Phần ${sec.partIndex || idx + 1}`
      );
      card.appendChild(name);

      const metaLine = el(
        "div",
        "quiz-eng-section-meta",
        `Kiểu: ${sec.type || "?"} • Số câu: ${(sec.questions || []).length || 0}`
      );
      card.appendChild(metaLine);

      const btnRow = el("div", "quiz-eng-section-actions");
      card.appendChild(btnRow);

      const btn = el("button", "main-btn");
      if (state === "done") {
        btn.textContent = "Đã hoàn thành";
        btn.disabled = true;
      } else {
        btn.textContent = state === "in-progress" ? "Tiếp tục làm" : "Bắt đầu làm";
        btn.addEventListener("click", () => {
          runtime.sectionState[sec.id] = "in-progress";
          runtime.currentQuestionIndex = 0;
          startSection(root, runtime, sec);
        });
      }
      btnRow.appendChild(btn);

      list.appendChild(card);
    });

    // TODO: khi sau này bạn muốn cộng XP/Coin sau khi làm hết các phần,
    // có thể thêm 1 nút "Hoàn thành bài test / Nộp điểm" ở đây.
  }

  // ================== CHẠY 1 PHẦN ==================

  function startSection(root, runtime, section) {
    const type = section.type;

    switch (type) {
      case "mcqOneByOne":
        runOneByOneSection(root, runtime, section);
        break;

      case "readingMcq":
        runReadingMcqSection(root, runtime, section); // PHẦN 3 – mới
        break;

      // Bạn có thể bổ sung thêm các kiểu khác ở đây:
      // case "mcqImage": ...
      // case "readingDragDrop": ...
      // case "wordForm": ...
      // case "reorderAndRewrite": ...
      default:
        alert("Hiện chưa hỗ trợ kiểu phần: " + (type || "không xác định"));
        renderTestOverview(root, runtime);
    }
  }

  // ================== PHẦN 1 – MCQ ONE BY ONE ==================
  // Mỗi lần chỉ hiện 1 câu trắc nghiệm. Bấm "Câu tiếp theo" để sang câu sau.

  function runOneByOneSection(root, runtime, section) {
    const data = section;
    const questions = data.questions || [];

    if (!questions.length) {
      alert("Phần này chưa có câu hỏi.");
      renderTestOverview(root, runtime);
      return;
    }

    const idx = runtime.currentQuestionIndex || 0;
    const total = questions.length;
    const q = questions[idx];

    root.innerHTML = "";

    // Header phần
    const header = el("div", "quiz-eng-header");
    header.innerHTML = `
      <div class="quiz-eng-title">
        <div class="quiz-eng-title-main">${section.title || "Phần 1 – Trắc nghiệm"}</div>
        <div class="quiz-eng-title-sub">Câu ${idx + 1} / ${total}</div>
      </div>
    `;
    root.appendChild(header);

    // Card nội dung
    const card = el("div", "quiz-eng-card");
    root.appendChild(card);

    const qBox = el("div", "quiz-eng-question");
    card.appendChild(qBox);

    const qText = el(
      "p",
      "quiz-eng-question-text",
      "Câu " + q.number + ". " + (q.text || "")
    );
    qBox.appendChild(qText);

    const optionsBox = el("div", "quiz-eng-options");
    qBox.appendChild(optionsBox);

    (q.options || []).forEach((opt, i) => {
      const label = el("label", "quiz-eng-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "mcq_" + section.id + "_" + q.number;
      input.value = String(i);

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + opt));
      optionsBox.appendChild(label);
    });

    // Footer nút
    const footer = el("div", "quiz-eng-footer");
    card.appendChild(footer);

    const backBtn = el("button", "secondary-btn", "⬅ Về danh sách phần");
    backBtn.onclick = () => {
      runtime.currentQuestionIndex = 0;
      renderTestOverview(root, runtime);
    };
    footer.appendChild(backBtn);

    const nextBtn = el(
      "button",
      "main-btn",
      idx + 1 === total ? "Hoàn thành phần 1" : "Câu tiếp theo ➜"
    );
    footer.appendChild(nextBtn);

    nextBtn.onclick = () => {
      const checked = root.querySelector(
        'input[name="mcq_' + section.id + "_" + q.number + '"]:checked'
      );
      if (!checked) {
        alert("Bạn hãy chọn một đáp án trước khi sang câu tiếp theo nhé.");
        return;
      }

      const userIndex = parseInt(checked.value, 10);
      const isCorrect = userIndex === Number(q.correct);

      if (isCorrect) {
        runtime.tempScore = (runtime.tempScore || 0) + 1;
      }

      // TODO: nếu muốn hiện giải thích từng câu ở đây,
      // bạn có thể mở popup nhỏ, sau đó mới chuyển câu.

      if (idx + 1 < total) {
        runtime.currentQuestionIndex = idx + 1;
        runOneByOneSection(root, runtime, section);
      } else {
        runtime.sectionState[section.id] = "done";
        runtime.currentQuestionIndex = 0;
        alert("Bạn đã hoàn thành Phần 1 – Trắc nghiệm.");
        renderTestOverview(root, runtime);
      }
    };
  }

  // ================== PHẦN 3 – READING MCQ (TỪNG CÂU) ==================
  // Giữ nguyên đoạn văn ở trên, chỉ thay câu hỏi & đáp án ở dưới.

  function runReadingMcqSection(root, runtime, section) {
    const data = section;
    const questions = data.questions || [];

    if (!questions.length) {
      alert("Phần này chưa có câu hỏi.");
      renderTestOverview(root, runtime);
      return;
    }

    const idx = runtime.currentQuestionIndex || 0;
    const total = questions.length;
    const q = questions[idx];

    root.innerHTML = "";

    // Header phần
    const header = el("div", "quiz-eng-header");
    header.innerHTML = `
      <div class="quiz-eng-title">
        <div class="quiz-eng-title-main">${section.title || "Phần 3 – Đọc hiểu"}</div>
        <div class="quiz-eng-title-sub">Câu ${idx + 1} / ${total}</div>
      </div>
    `;
    root.appendChild(header);

    // Card nội dung
    const card = el("div", "quiz-eng-card");
    root.appendChild(card);

    // Đoạn văn – LUÔN cố định cho cả phần
    if (section.passage) {
      const passageDiv = el("div", "quiz-eng-passage");
      passageDiv.innerHTML = section.passage.replace(/\n/g, "<br>");
      card.appendChild(passageDiv);
    }

    // Câu hỏi hiện tại
    const qBox = el("div", "quiz-eng-question");
    card.appendChild(qBox);

    const qText = el(
      "p",
      "quiz-eng-question-text",
      "Câu " + q.number + ". " + (q.text || "")
    );
    qBox.appendChild(qText);

    const optionsBox = el("div", "quiz-eng-options");
    qBox.appendChild(optionsBox);

    (q.options || []).forEach((opt, i) => {
      const label = el("label", "quiz-eng-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "readingmcq_" + section.id + "_" + q.number;
      input.value = String(i);

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + opt));
      optionsBox.appendChild(label);
    });

    // Footer nút
    const footer = el("div", "quiz-eng-footer");
    card.appendChild(footer);

    const backBtn = el("button", "secondary-btn", "⬅ Về danh sách phần");
    backBtn.onclick = () => {
      runtime.currentQuestionIndex = 0;
      renderTestOverview(root, runtime);
    };
    footer.appendChild(backBtn);

    const nextBtn = el(
      "button",
      "main-btn",
      idx + 1 === total ? "Hoàn thành phần 3" : "Câu tiếp theo ➜"
    );
    footer.appendChild(nextBtn);

    nextBtn.onclick = () => {
      const checked = root.querySelector(
        'input[name="readingmcq_' + section.id + "_" + q.number + '"]:checked'
      );
      if (!checked) {
        alert("Bạn hãy chọn một đáp án trước khi sang câu tiếp theo nhé.");
        return;
      }

      const userIndex = parseInt(checked.value, 10);
      const isCorrect = userIndex === Number(q.correct);

      if (isCorrect) {
        runtime.tempScore = (runtime.tempScore || 0) + 1;
      }

      // TODO: chỗ này cũng có thể hiển thị giải thích từng câu nếu muốn.

      if (idx + 1 < total) {
        runtime.currentQuestionIndex = idx + 1;
        runReadingMcqSection(root, runtime, section);
      } else {
        runtime.sectionState[section.id] = "done";
        runtime.currentQuestionIndex = 0;
        alert("Bạn đã hoàn thành Phần 3 – Đọc hiểu.");
        renderTestOverview(root, runtime);
      }
    };
  }

  // ================== DOM READY ==================

  document.addEventListener("DOMContentLoaded", () => {
    initQuizEng();
  });
})();
