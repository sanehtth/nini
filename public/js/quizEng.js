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

    // TODO: Sau này thêm nút "Nộp điểm / cộng XP" ở đây nếu cần
  }

  // ================== CHẠY 1 PHẦN ==================

  function startSection(root, runtime, section) {
    const type = section.type;

    switch (type) {
      case "mcqOneByOne":
        runOneByOneSection(root, runtime, section);
        break;

      case "readingMcq":
        runReadingMcqSection(root, runtime, section); // PHẦN 3
        break;

      // Sau này thêm các kiểu khác:
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

 // ============================ PHẦN 1: MCQ ONE-BY-ONE ============================
function runOneByOneSection(root, runtime, section) {
  const data = section;              // chính là JSON P1_001
  const questions = data.questions || [];
  const total = questions.length;

  if (!total) {
    root.innerHTML = "<p>Phần này chưa có câu hỏi.</p>";
    return;
  }

  const state = {
    idx: 0,                  // câu đang làm (0 .. total-1)
    stage: "answer",         // "answer" -> chọn đáp án, "feedback" -> xem giải thích
  };

  renderStep();

  function renderStep() {
    const q = questions[state.idx];

    root.innerHTML = "";

    // Header: tiêu đề + tiến độ
    const header = document.createElement("div");
    header.className = "quiz-eng-header-row";

    const title = document.createElement("h2");
    title.className = "quiz-title";
    title.textContent = data.title || "Phần 1 - Trắc nghiệm";
    header.appendChild(title);

    const progress = document.createElement("span");
    progress.className = "quiz-progress";
    progress.textContent = `Câu ${q.number} / ${questions[questions.length - 1].number}`;
    header.appendChild(progress);

    root.appendChild(header);

    // Thân câu hỏi
    const card = document.createElement("div");
    card.className = "quiz-card";

    const qText = document.createElement("p");
    qText.className = "quiz-question-text";
    qText.textContent = `Câu ${q.number}. ${q.text || ""}`;
    card.appendChild(qText);

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "quiz-options";

    (q.options || []).forEach((opt, idx) => {
      const line = document.createElement("label");
      line.className = "quiz-option-row";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "mcq-" + data.id + "-" + q.number;
      input.value = String(idx);

      const span = document.createElement("span");
      span.textContent = opt;

      line.appendChild(input);
      line.appendChild(span);
      optionsWrap.appendChild(line);
    });

    card.appendChild(optionsWrap);

    // Vùng feedback (giải thích)
    const feedback = document.createElement("div");
    feedback.className = "quiz-feedback";
    feedback.style.minHeight = "32px";
    card.appendChild(feedback);

    // Hàng nút
    const btnRow = document.createElement("div");
    btnRow.className = "quiz-nav-row";

    const backBtn = document.createElement("button");
    backBtn.className = "sub-btn";
    backBtn.textContent = "⬅ Về danh sách phần";
    backBtn.addEventListener("click", () => {
      renderSectionsOverview(runtime);
    });
    btnRow.appendChild(backBtn);

    const mainBtn = document.createElement("button");
    mainBtn.className = "main-btn";
    mainBtn.textContent =
      state.stage === "answer" ? "Kiểm tra đáp án" : "Câu tiếp theo ➜";
    btnRow.appendChild(mainBtn);

    card.appendChild(btnRow);
    root.appendChild(card);

    // ===== Logic cho nút chính =====
    mainBtn.addEventListener("click", () => {
      const chosen = card.querySelector(
        'input[name="mcq-' + data.id + "-" + q.number + '"]:checked'
      );

      if (state.stage === "answer") {
        if (!chosen) {
          alert("Bạn hãy chọn 1 đáp án trước đã nhé.");
          return;
        }

        const chosenIndex = Number(chosen.value);
        const correctIndex = Number(q.correct);
        const optionLabels = "ABCD";

        // Đánh dấu đúng / sai
        const allRows = optionsWrap.querySelectorAll(".quiz-option-row");
        allRows.forEach((row, idx) => {
          row.classList.remove("is-correct", "is-wrong", "is-selected");
          if (idx === chosenIndex) row.classList.add("is-selected");
          if (idx === correctIndex) row.classList.add("is-correct");
        });

        let msg;
        const explain = q.explain || q.explanation || "";

        if (chosenIndex === correctIndex) {
          // cộng điểm tạm
          runtime.tempScore = (runtime.tempScore || 0) + 1;

          msg =
            "✅ Chính xác! " +
            (explain ? " " + explain : "Bạn đã chọn đúng đáp án.");
        } else {
          msg =
            `❌ Chưa đúng. Đáp án đúng là ${
              optionLabels[correctIndex] || (correctIndex + 1)
            }. ` + (explain ? explain : "");
        }

        feedback.textContent = msg;
        state.stage = "feedback";
        mainBtn.textContent =
          state.idx === total - 1 ? "Hoàn thành phần này" : "Câu tiếp theo ➜";
      } else {
        // sang câu kế tiếp hoặc quay lại danh sách phần
        if (state.idx < total - 1) {
          state.idx++;
          state.stage = "answer";
          renderStep();
        } else {
          // đánh dấu đã xong phần & quay lại overview
          markSectionDone(runtime, data.id);
          renderSectionsOverview(runtime);
        }
      }
    });
  }
}


  // ================== PHẦN 3 – READING MCQ (TỪNG CÂU) ==================
  // Giữ nguyên đoạn văn ở trên, chỉ thay câu hỏi & đáp án ở dưới.
  // HỖ TRỢ:
  //   kind: "tf"  -> 2 đáp án True / False, correct = boolean
  //   kind: "mcq" -> 4 đáp án trong mảng options, correct = index

  // ============================ PHẦN 3: READING + MCQ ============================
function runReadingMcqSection(root, runtime, section) {
  const data = section;               // JSON P3_001
  const questions = data.questions || [];
  const total = questions.length;

  if (!total) {
    root.innerHTML = "<p>Phần này chưa có câu hỏi.</p>";
    return;
  }

  const state = {
    idx: 0,
    stage: "answer",
  };

  renderStep();

  function renderStep() {
    const q = questions[state.idx];

    root.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "quiz-eng-header-row";

    const title = document.createElement("h2");
    title.className = "quiz-title";
    title.textContent =
      data.title || "Phần 3 - Đọc đoạn văn và trả lời câu hỏi";
    header.appendChild(title);

    const progress = document.createElement("span");
    progress.className = "quiz-progress";
    progress.textContent = `Câu ${state.idx + 1} / ${total}`;
    header.appendChild(progress);

    root.appendChild(header);

    // Đoạn văn – luôn hiển thị phía trên
    const passageCard = document.createElement("div");
    passageCard.className = "quiz-card reading-passage-card";

    const passage = document.createElement("div");
    passage.className = "quiz-passage";
    passage.innerHTML = (data.passage || "").replace(/\n/g, "<br>");
    passageCard.appendChild(passage);

    root.appendChild(passageCard);

    // Card câu hỏi ngay dưới đoạn văn
    const card = document.createElement("div");
    card.className = "quiz-card";

    const qText = document.createElement("p");
    qText.className = "quiz-question-text";
    qText.textContent = `Câu ${q.number}. ${q.text || ""}`;
    card.appendChild(qText);

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "quiz-options";

    if (q.kind === "tf") {
      // True / False
      [["true", "True"], ["false", "False"]].forEach(([val, label]) => {
        const row = document.createElement("label");
        row.className = "quiz-option-row";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "reading-" + data.id + "-" + q.number;
        input.value = val;

        const span = document.createElement("span");
        span.textContent = label;

        row.appendChild(input);
        row.appendChild(span);
        optionsWrap.appendChild(row);
      });
    } else {
      // MCQ 4 lựa chọn
      (q.options || []).forEach((opt, idx) => {
        const row = document.createElement("label");
        row.className = "quiz-option-row";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "reading-" + data.id + "-" + q.number;
        input.value = String(idx);

        const span = document.createElement("span");
        span.textContent = opt;

        row.appendChild(input);
        row.appendChild(span);
        optionsWrap.appendChild(row);
      });
    }

    card.appendChild(optionsWrap);

    // Feedback
    const feedback = document.createElement("div");
    feedback.className = "quiz-feedback";
    feedback.style.minHeight = "32px";
    card.appendChild(feedback);

    // Nút
    const btnRow = document.createElement("div");
    btnRow.className = "quiz-nav-row";

    const backBtn = document.createElement("button");
    backBtn.className = "sub-btn";
    backBtn.textContent = "⬅ Về danh sách phần";
    backBtn.addEventListener("click", () => {
      renderSectionsOverview(runtime);
    });
    btnRow.appendChild(backBtn);

    const mainBtn = document.createElement("button");
    mainBtn.className = "main-btn";
    mainBtn.textContent =
      state.stage === "answer" ? "Kiểm tra đáp án" : "Câu tiếp theo ➜";
    btnRow.appendChild(mainBtn);

    card.appendChild(btnRow);
    root.appendChild(card);

    // ===== Logic nút chính =====
    mainBtn.addEventListener("click", () => {
      const chosen = card.querySelector(
        'input[name="reading-' + data.id + "-" + q.number + '"]:checked'
      );

      if (state.stage === "answer") {
        if (!chosen) {
          alert("Bạn hãy chọn 1 đáp án trước đã nhé.");
          return;
        }

        const explain = q.explain || q.explanation || "";
        let correct = false;
        let correctLabel = "";

        if (q.kind === "tf") {
          const userVal = chosen.value === "true";
          correct = userVal === !!q.correct;
          correctLabel = q.correct ? "True" : "False";
        } else {
          const userIdx = Number(chosen.value);
          const rightIdx = Number(q.correct);
          correct = userIdx === rightIdx;
          const labels = "ABCD";
          correctLabel = labels[rightIdx] || `Lựa chọn ${rightIdx + 1}`;
        }

        // Đánh dấu đúng / sai
        const allRows = optionsWrap.querySelectorAll(".quiz-option-row");
        allRows.forEach((row) => row.classList.remove("is-correct", "is-wrong", "is-selected"));

        allRows.forEach((row) => {
          const input = row.querySelector("input");
          if (!input) return;
          const val = input.value;

          if (q.kind === "tf") {
            const isTrueRow = val === "true";
            const isCorrect = (!!q.correct && isTrueRow) || (!q.correct && !isTrueRow);
            if (isCorrect) row.classList.add("is-correct");
            if (input === chosen) row.classList.add("is-selected");
          } else {
            const idx = Number(val);
            if (idx === Number(q.correct)) row.classList.add("is-correct");
            if (input === chosen && idx !== Number(q.correct)) {
              row.classList.add("is-selected");
            }
          }
        });

        let msg;
        if (correct) {
          runtime.tempScore = (runtime.tempScore || 0) + 1;
          msg =
            "✅ Chính xác! " +
            (explain ? " " + explain : "Bạn đã chọn đúng dựa trên đoạn văn.");
        } else {
          msg =
            `❌ Chưa đúng. Đáp án đúng là ${correctLabel}. ` +
            (explain ? explain : "");
        }

        feedback.textContent = msg;
        state.stage = "feedback";
        mainBtn.textContent =
          state.idx === total - 1 ? "Hoàn thành phần này" : "Câu tiếp theo ➜";
      } else {
        if (state.idx < total - 1) {
          state.idx++;
          state.stage = "answer";
          renderStep();
        } else {
          markSectionDone(runtime, data.id);
          renderSectionsOverview(runtime);
        }
      }
    });
  }
}

  // ================== DOM READY ==================

  document.addEventListener("DOMContentLoaded", () => {
    initQuizEng();
  });
})();

