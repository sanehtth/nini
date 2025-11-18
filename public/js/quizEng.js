// public/js/quizEng.js
// Quiz tiếng Anh đọc từ manifest & sections JSON
// Không đụng gì tới quiz.js cũ (tất cả nằm trong IIFE)

(function () {
  async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Không tải được " + url + " (" + res.status + ")");
    }
    return await res.json();
  }

  function getTestIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("test") || "test1"; // mặc định test1
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  async function initQuizEng() {
    const root = document.getElementById("quiz-eng-root");
    if (!root) return; // nếu không có vùng này thì bỏ qua

    root.innerHTML = "Đang tải đề kiểm tra...";

    try {
      const testId = getTestIdFromQuery();

      const testsManifest = await loadJson("/content/testsManifest.json");
      const test =
        testsManifest.tests.find((t) => t.id === testId) || testsManifest.tests[0];
      if (!test) {
        root.textContent = "Không tìm thấy bài kiểm tra.";
        return;
      }

      const sectionsManifest = await loadJson("/content/sectionsManifest.json");
      const sectionMap = new Map(sectionsManifest.sections.map((s) => [s.id, s]));

      const sections = [];
      for (const secId of test.sections) {
        const meta = sectionMap.get(secId);
        if (!meta) continue;
        const data = await loadJson(meta.file);
        sections.push(data);
      }

      renderQuiz(root, test, sections);
    } catch (err) {
      console.error(err);
      root.textContent =
        "Có lỗi khi tải đề kiểm tra tiếng Anh. Mở console để xem chi tiết.";
    }
  }

  function renderQuiz(root, test, sections) {
    root.innerHTML = "";

    const title = createEl("h2", "quiz-title", test.title || "Bài kiểm tra");
    root.appendChild(title);

    const info = createEl(
      "p",
      "quiz-subtitle",
      "Làm xong bấm nút 'Nộp bài' ở cuối để xem điểm và những câu cần ôn lại."
    );
    root.appendChild(info);

    const container = createEl("section", "quiz-card");
    root.appendChild(container);

    sections.forEach((sec) => {
      const secBlock = createEl("div", "quiz-section");
      const secHeader = createEl(
        "h3",
        "quiz-section-title",
        sec.title || `Phần ${sec.partIndex || ""}`
      );
      secBlock.appendChild(secHeader);

      // đoạn văn đọc hiểu nếu có
      if (sec.passage) {
        const p = createEl("div", "quiz-passage");
        p.innerHTML = sec.passage.replace(/\n/g, "<br>");
        secBlock.appendChild(p);
      }

      switch (sec.type) {
        case "mcqOneByOne":
          renderSectionMcq(secBlock, sec);
          break;
        case "mcqImage":
          renderSectionMcqImage(secBlock, sec);
          break;
        case "readingMcq":
          renderSectionReadingMcq(secBlock, sec);
          break;
        case "readingDragDrop":
          renderSectionDragDrop(secBlock, sec);
          break;
        case "wordForm":
          renderSectionWordForm(secBlock, sec);
          break;
        case "reorderAndRewrite":
          renderSectionReorder(secBlock, sec);
          break;
        default:
          secBlock.appendChild(
            createEl("p", null, "Chưa hỗ trợ kiểu phần: " + sec.type)
          );
      }

      container.appendChild(secBlock);
    });

    const submitRow = createEl("div", "quiz-submit-row");
    const submitBtn = createEl("button", "main-btn", "✅ Nộp bài / Xem điểm");
    submitBtn.addEventListener("click", () => gradeQuiz(root, sections));
    submitRow.appendChild(submitBtn);
    container.appendChild(submitRow);
  }

  // ====== RENDER TỪNG KIỂU PHẦN ======

  function renderSectionMcq(parent, section) {
    section.questions.forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");
      const qTitle = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text}`
      );
      box.appendChild(qTitle);

      q.options.forEach((opt, idx) => {
        const line = createEl("label", "quiz-option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = qid;
        input.value = String(idx);
        line.appendChild(input);
        line.appendChild(document.createTextNode(" " + opt));
        box.appendChild(line);
      });

      parent.appendChild(box);
    });
  }

  function renderSectionMcqImage(parent, section) {
    const IMAGE_BASE = "/assets/content";

    section.questions.forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");

      const img = document.createElement("img");
      img.src = IMAGE_BASE + "/" + q.imageFile;
      img.alt = "Question " + q.number;
      img.className = "quiz-image";
      box.appendChild(img);

      const qTitle = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text}`
      );
      box.appendChild(qTitle);

      q.options.forEach((opt, idx) => {
        const line = createEl("label", "quiz-option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = qid;
        input.value = String(idx);
        line.appendChild(input);
        line.appendChild(document.createTextNode(" " + opt));
        box.appendChild(line);
      });

      parent.appendChild(box);
    });
  }

  function renderSectionReadingMcq(parent, section) {
    section.questions.forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");
      const qTitle = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text}`
      );
      box.appendChild(qTitle);

      if (q.kind === "tf") {
        ["True", "False"].forEach((label, idx) => {
          const line = createEl("label", "quiz-option");
          const input = document.createElement("input");
          input.type = "radio";
          input.name = qid;
          input.value = idx === 0 ? "true" : "false";
          line.appendChild(input);
          line.appendChild(document.createTextNode(" " + label));
          box.appendChild(line);
        });
      } else if (q.kind === "mcq") {
        q.options.forEach((opt, idx) => {
          const line = createEl("label", "quiz-option");
          const input = document.createElement("input");
          input.type = "radio";
          input.name = qid;
          input.value = String(idx);
          line.appendChild(input);
          line.appendChild(document.createTextNode(" " + opt));
          box.appendChild(line);
        });
      }
      parent.appendChild(box);
    });
  }

  function renderSectionDragDrop(parent, section) {
    // phiên bản đơn giản: nhập từ vào từng chỗ trống (dễ code, vẫn chấm điểm được)
    const info = createEl(
      "p",
      "quiz-hint",
      "Nhập từ thích hợp vào mỗi chỗ trống (23, 24, 25...)."
    );
    parent.appendChild(info);

    const passageDiv = createEl("div", "quiz-passage quiz-passage-input");

    let html = section.passage;
    Object.keys(section.blanks).forEach((num) => {
      const qid = section.id + "-" + num;
      const inputHtml =
        `<input type="text" class="quiz-blank" data-qid="${qid}" data-num="${num}" size="10" />`;
      const re = new RegExp("__" + num + "__", "g");
      html = html.replace(re, inputHtml);
    });

    passageDiv.innerHTML = html.replace(/\n/g, "<br>");
    parent.appendChild(passageDiv);
  }

  function renderSectionWordForm(parent, section) {
    section.questions.forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");
      const qTitle = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text}`
      );
      box.appendChild(qTitle);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "quiz-input";
      input.dataset.qid = qid;
      box.appendChild(input);

      parent.appendChild(box);
    });
  }

  function renderSectionReorder(parent, section) {
    section.questions.forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");
      const qTitle = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.prompt}`
      );
      box.appendChild(qTitle);

      const area = document.createElement("textarea");
      area.className = "quiz-textarea";
      area.rows = 2;
      area.dataset.qid = qid;
      box.appendChild(area);

      parent.appendChild(box);
    });
  }

  // ====== CHẤM ĐIỂM ======

  function gradeQuiz(root, sections) {
    let total = 0;
    let correctCount = 0;
    const mistakes = [];

    const norm = (s) => s.trim().toLowerCase();

    sections.forEach((section) => {
      switch (section.type) {
        case "mcqOneByOne":
        case "mcqImage":
          section.questions.forEach((q) => {
            if (q.correct == null) return;
            total++;
            const qid = section.id + "-" + q.number;
            const chosen =
              (document.querySelector(`input[name="${qid}"]:checked`) || {}).value;
            if (chosen === String(q.correct)) {
              correctCount++;
            } else {
              mistakes.push(`Câu ${q.number} (phần ${section.partIndex})`);
            }
          });
          break;

        case "readingMcq":
          section.questions.forEach((q) => {
            total++;
            const qid = section.id + "-" + q.number;
            const chosenEl = document.querySelector(
              `input[name="${qid}"]:checked`
            );
            if (!chosenEl) {
              mistakes.push(`Câu ${q.number} (phần 3)`);
              return;
            }
            if (q.kind === "tf") {
              const val = chosenEl.value === "true";
              if (val === q.correct) {
                correctCount++;
              } else {
                mistakes.push(`Câu ${q.number} (phần 3)`);
              }
            } else if (q.kind === "mcq") {
              if (chosenEl.value === String(q.correct)) {
                correctCount++;
              } else {
                mistakes.push(`Câu ${q.number} (phần 3)`);
              }
            }
          });
          break;

        case "readingDragDrop":
          Object.entries(section.blanks).forEach(([num, answer]) => {
            total++;
            const qid = section.id + "-" + num;
            const input = document.querySelector(`input[data-qid="${qid}"]`);
            if (input && norm(input.value) === norm(answer)) {
              correctCount++;
            } else {
              mistakes.push(`Câu ${num} (phần 4)`);
            }
          });
          break;

        case "wordForm":
          section.questions.forEach((q) => {
            total++;
            const qid = section.id + "-" + q.number;
            const input = document.querySelector(
              `input.quiz-input[data-qid="${qid}"]`
            );
            if (input && norm(input.value) === norm(q.answer)) {
              correctCount++;
            } else {
              mistakes.push(`Câu ${q.number} (phần 5)`);
            }
          });
          break;

        case "reorderAndRewrite":
          section.questions.forEach((q) => {
            total++;
            const qid = section.id + "-" + q.number;
            const area = document.querySelector(
              `textarea.quiz-textarea[data-qid="${qid}"]`
            );
            if (area && norm(area.value) === norm(q.answer)) {
              correctCount++;
            } else {
              mistakes.push(`Câu ${q.number} (phần 6)`);
            }
          });
          break;
      }
    });

    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const resultBox =
      document.getElementById("quiz-eng-result") ||
      createEl("div", "quiz-result");

    resultBox.id = "quiz-eng-result";
    resultBox.innerHTML = `
      <h3>Kết quả</h3>
      <p><b>Đúng:</b> ${correctCount}/${total} &nbsp; (~${scorePercent}%)</p>
      ${
        mistakes.length
          ? `<p><b>Cần ôn lại các câu:</b> ${mistakes.join(", ")}</p>`
          : "<p>Xuất sắc! Bạn làm đúng hết tất cả 🎉</p>"
      }
    `;

    root.appendChild(resultBox);
  }

  // ====== STYLE PHỤ (dùng chung với style.css) ======
  (function injectQuizStyles() {
    const css = `
    .quiz-title {
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .quiz-subtitle {
      margin-bottom: 12px;
      font-size: 14px;
      color: #6b7280;
    }
    .quiz-card {
      background: #ffffff;
      border-radius: 18px;
      padding: 18px 20px 20px;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
      border: 1px solid #e5e7eb;
    }
    .quiz-section {
      border-top: 1px solid #f3f4f6;
      padding-top: 12px;
      margin-top: 12px;
    }
    .quiz-section:first-child {
      border-top: none;
      padding-top: 0;
      margin-top: 0;
    }
    .quiz-section-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .quiz-question {
      margin-bottom: 10px;
    }
    .quiz-question-text {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .quiz-option {
      display: block;
      font-size: 14px;
      margin-bottom: 2px;
      cursor: pointer;
    }
    .quiz-option input {
      margin-right: 4px;
    }
    .quiz-image {
      max-width: 100%;
      margin-bottom: 6px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .quiz-passage {
      background: #f9fafb;
      border-radius: 12px;
      padding: 10px 12px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .quiz-passage-input input.quiz-blank {
      border-radius: 8px;
      border: 1px solid #d4d4d8;
      padding: 2px 4px;
      margin: 0 2px;
    }
    .quiz-input, .quiz-textarea {
      width: 100%;
      border-radius: 10px;
      border: 1px solid #d4d4d8;
      padding: 6px 8px;
      font-size: 14px;
      box-sizing: border-box;
    }
    .quiz-textarea {
      min-height: 60px;
      resize: vertical;
    }
    .quiz-hint {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .quiz-submit-row {
      margin-top: 16px;
      text-align: center;
    }
    .quiz-result {
      margin-top: 16px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #f5f5ff;
      border: 1px solid #e5e7eb;
    }
    `;
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  })();

  // Khởi động khi DOM sẵn sàng
  document.addEventListener("DOMContentLoaded", initQuizEng);
})();
