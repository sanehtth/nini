// js/quizEng.js
// Hiển thị bài test tiếng Anh theo từng PHẦN, làm từng câu, có giải thích và tô màu đúng / sai.

(function () {
  // ====== Helpers chung ======
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function getTestIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("test") || "test1";
  }

  async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Không tải được " + url + " (" + res.status + ")");
    }
    return await res.json();
  }

  // ====== State chính ======
  const state = {
    root: null,
    test: null,
    sections: [], // [{meta, data}]
    results: {},  // { sectionId: { done, correct, total } }
    currentRun: null, // { sectionIndex, questionIndex, correctCount, total }
  };

  // ====== Init ======
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("quiz-eng-root");
    if (!root) return;
    state.root = root;

    initQuizEng().catch((err) => {
      console.error(err);
      state.root.textContent =
        "Có lỗi khi tải đề kiểm tra. Vui lòng kiểm tra lại file JSON hoặc mở DevTools (F12) để xem chi tiết.";
    });
  });

  async function initQuizEng() {
    const root = state.root;
    root.textContent = "Đang tải đề kiểm tra...";

    const testId = getTestIdFromQuery();

    const [testsManifest, sectionsManifest] = await Promise.all([
      loadJson("/content/testsManifest.json"),
      loadJson("/content/sectionsManifest.json"),
    ]);

    const tests = testsManifest.tests || [];
    const sectionsMetaAll = sectionsManifest.sections || [];

    const test =
      tests.find((t) => t.id === testId) || tests.length ? tests[0] : null;

    if (!test) {
      state.root.textContent = "Không tìm thấy bài kiểm tra.";
      return;
    }

    state.test = test;

    // Lọc meta cho các section thuộc test
    const sectionIdSet = new Set(test.sections || []);
    const metaList = sectionsMetaAll.filter((s) => sectionIdSet.has(s.id));

    // Tải dữ liệu từng section
    const sectionDatas = await Promise.all(
      metaList.map((m) => loadJson(m.file))
    );

    state.sections = metaList.map((meta, idx) => ({
      meta,
      data: sectionDatas[idx],
    }));

    // Lần đầu render overview
    renderTestOverview();
  }

  // ====== OVERVIEW – danh sách 6 phần ======
  function renderTestOverview() {
    const root = state.root;
    root.innerHTML = "";

    const card = createEl("div", "quiz-card");
    root.appendChild(card);

    const title = createEl(
      "h2",
      "quiz-title",
      state.test.title || "FP8 – Review 1 – Test 1"
    );
    const subtitle = createEl(
      "p",
      "quiz-subtitle",
      "Chọn một phần để bắt đầu làm. Làm xong một phần sẽ được đánh dấu ✓ Hoàn thành."
    );

    card.appendChild(title);
    card.appendChild(subtitle);

    const list = createEl("div", "quiz-section-list");
    card.appendChild(list);

    let doneCount = 0;

    state.sections.forEach((secWrap, idx) => {
      const meta = secWrap.meta;
      const secData = secWrap.data;
      const partId = meta.id;
      const res = state.results[partId];

      if (res && res.done) doneCount++;

      const partCard = createEl("div", "quiz-part-card");
      list.appendChild(partCard);

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.justifyContent = "space-between";
      topRow.style.gap = "10px";

      // Header (title + type)
      const header = createEl("div", "quiz-part-header");
      const titleEl = createEl(
        "div",
        "quiz-part-title",
        meta.label || secData.title || `Phần ${meta.partIndex}`
      );
      const typeEl = createEl(
        "div",
        "quiz-part-type",
        "Kiểu: " + (secData.type || meta.type || "N/A")
      );
      header.appendChild(titleEl);
      header.appendChild(typeEl);

      // Meta (status)
      const metaBox = createEl("div", "quiz-part-meta");
      const statusEl = createEl("div", "quiz-part-status");
      if (res && res.done) {
        statusEl.classList.add("done");
        statusEl.textContent = `Đã làm – Đúng ${res.correct}/${res.total}`;
      } else {
        statusEl.textContent = "Chưa làm";
      }
      metaBox.appendChild(statusEl);

      topRow.appendChild(header);
      topRow.appendChild(metaBox);

      partCard.appendChild(topRow);

      // Actions
      const actions = createEl("div", "quiz-part-actions");
      actions.style.marginTop = "8px";
      partCard.appendChild(actions);

      const btn = createEl(
        "button",
        "main-btn",
        res && res.done ? "Làm lại phần này" : "Bắt đầu phần này"
      );
      btn.addEventListener("click", () => startSection(idx));
      actions.appendChild(btn);
    });

    const footer = createEl("div", "quiz-overview-footer");
    footer.textContent = `Hoàn thành: ${doneCount}/${state.sections.length} phần`;
    card.appendChild(footer);
  }

  // ====== BẮT ĐẦU 1 PHẦN ======
  function startSection(sectionIndex) {
    const secWrap = state.sections[sectionIndex];
    const secData = secWrap.data;

    let questions = secData.questions || [];
    if (!Array.isArray(questions)) questions = [];

    state.currentRun = {
      sectionIndex,
      questionIndex: 0,
      correctCount: 0,
      total: questions.length,
    };

    renderSectionStep();
  }

  // ====== Render 1 bước (1 câu của 1 phần) ======
  function renderSectionStep() {
    const { sectionIndex, questionIndex, total } = state.currentRun;
    const secWrap = state.sections[sectionIndex];
    const secMeta = secWrap.meta;
    const secData = secWrap.data;
    const questions = secData.questions || [];

    const q = questions[questionIndex];
    if (!q) {
      // nếu không có câu -> quay lại
      renderTestOverview();
      return;
    }

    const root = state.root;
    root.innerHTML = "";

    const card = createEl("div", "quiz-step-card");
    root.appendChild(card);

    // Header
    const backRow = createEl("div", "quiz-step-backrow");
    const backBtn = createEl("button", "sub-btn", "← Về danh sách phần");
    backBtn.addEventListener("click", () => {
      const confirmLeave = confirm(
        "Nếu rời khỏi, tiến độ phần này sẽ bị bỏ và phải làm lại từ đầu. Bạn có chắc muốn rời khỏi phần?"
      );
      if (confirmLeave) {
        state.currentRun = null;
        renderTestOverview();
      }
    });
    backRow.appendChild(backBtn);
    card.appendChild(backRow);

    const title = createEl(
      "h2",
      "quiz-step-title",
      secData.title || secMeta.label || `Phần ${secMeta.partIndex}`
    );
    const sub = createEl(
      "p",
      "quiz-step-subtitle",
      `Câu ${questionIndex + 1} / ${total}`
    );
    card.appendChild(title);
    card.appendChild(sub);

    // Nội dung câu hỏi
    const body = document.createElement("div");
    card.appendChild(body);

    // Nếu là phần đọc (readingMcq) thì hiển thị đoạn văn phía trên
    if (secData.type === "readingMcq" && secData.passage) {
      const passageBox = createEl("div", "reading-passage-box");
      passageBox.innerHTML = (secData.passage || "").replace(/\n/g, "<br>");
      body.appendChild(passageBox);
    }

    // Nếu là nhìn hình (mcqImage) thì hiển thị ảnh
    if (secData.type === "mcqImage" && q.imageFile) {
      const img = document.createElement("img");
      img.src = "/assets/content/" + q.imageFile;
      img.alt = "Question image";
      img.className = "quiz-image";
      body.appendChild(img);
    }

    const qBox = createEl("div", "reading-question-box");
    body.appendChild(qBox);

    const qText = createEl(
      "p",
      "quiz-question-text",
      (q.number ? "Câu " + q.number + ". " : "Câu: ") + (q.text || "")
    );
    qBox.appendChild(qText);

    // Wrap options
    const optsWrap = createEl("div", "quiz-options-wrap");
    qBox.appendChild(optsWrap);

    const inputName = "sec_" + secMeta.id + "_q_" + (q.number || questionIndex);

    if (secData.type === "readingMcq" && q.kind === "tf") {
      // True / False
      const tfOptions = [
        { label: "True", value: "true" },
        { label: "False", value: "false" },
      ];
      tfOptions.forEach((opt) => {
        const line = createEl("label", "quiz-option-row");
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = inputName;
        radio.value = opt.value;
        line.appendChild(radio);
        line.appendChild(document.createTextNode(" " + opt.label));
        optsWrap.appendChild(line);
      });
    } else {
      // MCQ bình thường
      (q.options || []).forEach((optText, idx) => {
        const line = createEl("label", "quiz-option-row");
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = inputName;
        radio.value = String(idx);
        line.appendChild(radio);
        line.appendChild(document.createTextNode(" " + optText));
        optsWrap.appendChild(line);
      });
    }

    // Hộp giải thích (ban đầu trống)
    const explainBox = createEl("div", "quiz-explanation-box");
    explainBox.style.display = "none";
    qBox.appendChild(explainBox);

    // Nav row
    const navRow = createEl("div", "quiz-step-navrow");
    card.appendChild(navRow);

    const progressText = createEl(
      "div",
      "quiz-progress-text",
      `Phần ${secMeta.partIndex} – Câu ${questionIndex + 1}/${total}`
    );
    navRow.appendChild(progressText);

    const btnCheck = createEl("button", "main-btn", "Kiểm tra đáp án");
    btnCheck.dataset.mode = "check";
    navRow.appendChild(btnCheck);

    btnCheck.addEventListener("click", () =>
      handleCheckNext(secMeta, secData, q, card, explainBox, btnCheck)
    );
  }

  // ====== Xử lý CHECK / NEXT / FINISH cho 1 câu ======
  function handleCheckNext(secMeta, secData, q, card, explainBox, btn) {
    const run = state.currentRun;
    if (!run) return;

    if (btn.dataset.mode === "check") {
      const inputName = "sec_" + secMeta.id + "_q_" + (q.number || run.questionIndex);
      const radios = $all(`input[type="radio"][name="${inputName}"]`, card);
      let chosenIdx = -1;
      let chosenBool = null; // cho True/False

      if (secData.type === "readingMcq" && q.kind === "tf") {
        radios.forEach((r) => {
          if (r.checked) {
            chosenBool = r.value === "true";
          }
        });
        if (chosenBool === null) {
          alert("Bạn hãy chọn một đáp án trước đã nhé!");
          return;
        }
      } else {
        radios.forEach((r, idx) => {
          if (r.checked) chosenIdx = idx;
        });
        if (chosenIdx === -1) {
          alert("Bạn hãy chọn một đáp án trước đã nhé!");
          return;
        }
      }

      // Xoá class cũ
      const lines = $all(".quiz-option-row", card);
      lines.forEach((line) => {
        line.classList.remove(
          "is-selected",
          "is-correct",
          "is-wrong",
          "opt-correct",
          "opt-wrong",
          "opt-chosen"
        );
      });

      let isCorrect = false;
      let correctIndex = null;

      if (secData.type === "readingMcq" && q.kind === "tf") {
        isCorrect = chosenBool === q.correct;
        // tô màu: True là index 0, False là index 1
        correctIndex = q.correct ? 0 : 1;
        lines.forEach((line, idx) => {
          if (idx === correctIndex) {
            line.classList.add("is-correct", "opt-correct");
          }
          const r = line.querySelector("input");
          if (r && r.checked) {
            line.classList.add("is-selected", "opt-chosen");
            if (!isCorrect) {
              line.classList.add("is-wrong", "opt-wrong");
            }
          }
        });
      } else {
        correctIndex = typeof q.correct === "number" ? q.correct : null;
        lines.forEach((line, idx) => {
          if (idx === correctIndex) {
            line.classList.add("is-correct", "opt-correct");
          }
          if (idx === chosenIdx) {
            line.classList.add("is-selected", "opt-chosen");
            if (correctIndex != null && chosenIdx !== correctIndex) {
              line.classList.add("is-wrong", "opt-wrong");
            }
          }
        });

        isCorrect =
          correctIndex != null && chosenIdx === correctIndex;
      }

      if (isCorrect) {
        run.correctCount++;
      }

      // Hộp giải thích
      explainBox.style.display = "block";
      explainBox.classList.remove(
        "quiz-explain-correct",
        "quiz-explain-incorrect"
      );

      const expText = q.explanation || "";

      if (isCorrect) {
        explainBox.classList.add("quiz-explain-correct");
        explainBox.innerHTML = `
          <div class="quiz-correct-line">✓ Chính xác!</div>
          <div>${expText}</div>
        `;
      } else {
        let correctMsg = "";
        if (secData.type === "readingMcq" && q.kind === "tf") {
          correctMsg = q.correct ? "True" : "False";
        } else if (
          Array.isArray(q.options) &&
          typeof q.correct === "number" &&
          q.options[q.correct]
        ) {
          correctMsg = q.options[q.correct];
        }
        explainBox.classList.add("quiz-explain-incorrect");
        explainBox.innerHTML = `
          <div class="quiz-correct-line">✗ Chưa chính xác.</div>
          <div>Đáp án đúng: <b>${correctMsg}</b>. ${expText}</div>
        `;
      }

      // Chuyển nút sang NEXT hoặc FINISH
      const isLast = run.questionIndex >= run.total - 1;
      btn.dataset.mode = isLast ? "finish" : "next";
      btn.textContent = isLast ? "Kết thúc phần này" : "Câu tiếp theo →";
      return;
    }

    if (btn.dataset.mode === "next") {
      // Sang câu tiếp theo
      state.currentRun.questionIndex++;
      renderSectionStep();
      return;
    }

    if (btn.dataset.mode === "finish") {
      // Kết thúc phần
      finishCurrentSection();
      return;
    }
  }

  // ====== Kết thúc 1 phần ======
  function finishCurrentSection() {
    const run = state.currentRun;
    if (!run) return;

    const secWrap = state.sections[run.sectionIndex];
    const secMeta = secWrap.meta;
    const total = run.total || 0;
    const correct = run.correctCount || 0;

    state.results[secMeta.id] = {
      done: true,
      correct,
      total,
    };

    alert(
      `Bạn đã hoàn thành ${secMeta.label || "phần này"}.\nĐúng ${correct}/${total} câu.`
    );

    state.currentRun = null;
    renderTestOverview();
  }
})();
