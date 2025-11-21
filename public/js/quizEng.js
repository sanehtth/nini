// public/js/quizEng.js
// Trang bài test tiếng Anh nhiều phần (6 phần).
// - Đọc testsManifest.json & sectionsManifest.json để biết cấu trúc bài.
// - Mỗi phần làm theo kiểu "từng câu một".
//   + mcqOneByOne  : trắc nghiệm thường
//   + mcqImage     : trắc nghiệm có hình
//   + readingMcq   : có đoạn văn + câu hỏi trắc nghiệm
//
// File này KHÔNG cộng XP/Coin. Việc cộng XP/Coin sẽ được xử lý ở bước sau
// khi mình thống nhất luật điểm. Hiện tại chỉ là luyện tập + giải thích.

(function () {
  // ================== Helper chung ==================
  function getTestIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("test") || "test1";
  }

  async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Không tải được " + url + " (" + res.status + ")");
    }
    return res.json();
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function nl2br(text) {
    return (text || "").replace(/\n/g, "<br>");
  }

  // ================== State toàn cục ==================
  let gRoot = null;              // container chính
  let gTest = null;              // object test trong testsManifest
  let gSections = [];            // [{meta, data}]
  let gSectionProgress = {};     // {sectionId: {done, correct, total}}
  let gCurrentRuntime = null;    // trạng thái khi đang làm 1 phần

  // ================== Khởi động trang ==================
  document.addEventListener("DOMContentLoaded", initQuizEngPage);

  async function initQuizEngPage() {
    // Tìm container: thử vài id cho chắc vì HTML mình từng đổi tên
    gRoot =
      document.getElementById("quizEngRoot") ||
      document.getElementById("quiz-eng-root") ||
      document.getElementById("quizEng") ||
      document.getElementById("quiz-eng") ||
      document.getElementById("quiz");

    if (!gRoot) {
      // Không phải trang quizEng → thoát.
      return;
    }

    gRoot.textContent = "Đang tải bài test...";

    try {
      const testId = getTestIdFromQuery();

      const testsManifest = await loadJson("/content/testsManifest.json");
      const allTests = testsManifest.tests || [];
      gTest =
        allTests.find((t) => t.id === testId) ||
        allTests[0];

      if (!gTest) {
        gRoot.textContent = "Không tìm thấy bài test.";
        return;
      }

      const sectionsManifest = await loadJson("/content/sectionsManifest.json");
      const sectionMap = new Map(
        (sectionsManifest.sections || []).map((s) => [s.id, s])
      );

      const sectionMetas = (gTest.sections || [])
        .map((id) => sectionMap.get(id))
        .filter(Boolean)
        .sort((a, b) => {
          const pa = a.partIndex || 0;
          const pb = b.partIndex || 0;
          if (pa !== pb) return pa - pb;
          const oa = a.sectionOrder || 0;
          const ob = b.sectionOrder || 0;
          return oa - ob;
        });

      gSections = [];
      for (const meta of sectionMetas) {
        const data = await loadJson(meta.file);
        gSections.push({ meta, data });
        gSectionProgress[meta.id] = {
          done: false,
          correct: 0,
          total: (data.questions || []).length || 0,
        };
      }

      renderSectionsOverview();
    } catch (err) {
      console.error(err);
      gRoot.innerHTML =
        '<p>Không tải được dữ liệu test. Bạn kiểm tra lại file JSON hoặc thử tải lại trang.</p>';
    }
  }

  // ================== Màn hình danh sách 6 phần ==================
  function renderSectionsOverview() {
    gCurrentRuntime = null;

    gRoot.innerHTML = "";

    const title = createEl(
      "h2",
      "quiz-title",
      gTest.title || (gTest.id ? gTest.id : "Bài test tiếng Anh")
    );
    gRoot.appendChild(title);

    const desc = createEl(
      "p",
      "quiz-subtitle",
      "Chọn một phần để bắt đầu làm. Làm xong một phần sẽ được đánh dấu ✓ Hoàn thành."
    );
    gRoot.appendChild(desc);

    gSections.forEach(({ meta, data }) => {
      const secId = meta.id;
      const progress = gSectionProgress[secId] || {
        done: false,
        correct: 0,
        total: (data.questions || []).length || 0,
      };

      const card = createEl("div", "quiz-part-card");
      const header = createEl(
        "div",
        "quiz-part-header",
        meta.label || data.title || "Phần " + (meta.partIndex || "")
      );
      card.appendChild(header);

      const info = createEl(
        "p",
        "quiz-part-info",
        `Kiểu: ${data.type || "?"} · Số câu: ${(data.questions || []).length || 0}`
      );
      card.appendChild(info);

      const status = createEl(
        "p",
        "quiz-part-status",
        progress.done
          ? `Đã làm · Đúng ${progress.correct}/${progress.total} câu`
          : "Chưa làm"
      );
      card.appendChild(status);

      const btn = createEl(
        "button",
        "main-btn quiz-part-btn",
        progress.done ? "Làm lại phần này" : "Bắt đầu phần này"
      );
      btn.addEventListener("click", () => {
        startSection({ meta, data });
      });
      card.appendChild(btn);

      gRoot.appendChild(card);
    });
  }

  // ================== Bắt đầu 1 phần ==================
  function startSection(sectionBundle) {
    const { meta, data } = sectionBundle;
    const type = data.type;

    // Runtime mới cho phần này
    gCurrentRuntime = {
      meta,
      section: data,
      idx: 0,
      correct: 0,
      state: "answering", // "answering" | "reviewing"
    };

    switch (type) {
      case "mcqOneByOne":
      case "mcqImage":
      case "readingMcq":
        renderCurrentQuestion();
        break;
      default:
        alert(
          `Kiểu phần "${type}" hiện chưa hỗ trợ làm từng câu. Tạm thời bạn dùng kiểu khác trước nhé.`
        );
        renderSectionsOverview();
    }
  }

  // ================== Render 1 câu hỏi của phần hiện tại ==================
  function renderCurrentQuestion() {
    const rt = gCurrentRuntime;
    if (!rt) return;

    const { section, meta } = rt;
    const questions = section.questions || [];
    if (rt.idx < 0 || rt.idx >= questions.length) {
      // Hết câu -> quay về overview & lưu progress
      finishCurrentSection();
      return;
    }

    const q = questions[rt.idx];

    gRoot.innerHTML = "";

    // ---- Header ----
    const header = createEl("div", "quiz-section-header");
    const title = createEl(
      "h2",
      "quiz-title",
      section.title ||
        meta.label ||
        `Phần ${meta.partIndex || ""} - ${section.type || ""}`
    );
    header.appendChild(title);

    const sub = createEl(
      "p",
      "quiz-subtitle",
      `Câu ${q.number || rt.idx + 1} / ${questions.length}`
    );
    header.appendChild(sub);

    gRoot.appendChild(header);

    // ---- Card chứa nội dung câu hỏi ----
    const card = createEl("div", "quiz-card");
    gRoot.appendChild(card);

    // Nếu có passage (đọc hiểu)
    if (section.type === "readingMcq" && section.passage) {
      const passageBox = createEl("div", "quiz-passage");
      passageBox.innerHTML = nl2br(section.passage);
      card.appendChild(passageBox);
    }

    // Nếu có hình (phần 2)
    if (section.type === "mcqImage" && q.imageFile) {
      const imgWrap = createEl("div", "quiz-image-wrap");
      const img = document.createElement("img");
      img.src = "/assets/content/" + q.imageFile;
      img.alt = q.text || "Question image";
      img.className = "quiz-image";
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
    }

    // Câu hỏi
    const qText = createEl(
      "p",
      "quiz-question-text",
      (q.prefix || "Câu " + (q.number || rt.idx + 1) + ". ") + (q.text || "")
    );
    card.appendChild(qText);

    // Options
    const optsWrap = createEl("div", "quiz-options");
    card.appendChild(optsWrap);

    const name = "quizOpt";
    const options = [];

    if (section.type === "readingMcq" && q.kind === "tf") {
      // True / False
      [["true", "True"], ["false", "False"]].forEach(([value, label]) => {
        const line = createEl("label", "quiz-option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.value = value;
        line.appendChild(input);
        line.appendChild(document.createTextNode(" " + label));
        optsWrap.appendChild(line);
        options.push({ input, label: line, value });
      });
    } else {
      (q.options || []).forEach((opt, idx) => {
        const line = createEl("label", "quiz-option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.value = String(idx);
        line.appendChild(input);
        line.appendChild(document.createTextNode(" " + opt));
        optsWrap.appendChild(line);
        options.push({ input, label: line, idx });
      });
    }

    // Ô giải thích
    const explainBox = createEl("div", "quiz-explanation");
    card.appendChild(explainBox);

    // Hàng nút
    const actions = createEl("div", "quiz-actions");
    const backBtn = createEl("button", "sub-btn quiz-back-btn", "← Về danh sách phần");
    const primaryText =
      rt.state === "reviewing"
        ? rt.idx === (section.questions || []).length - 1
          ? "Kết thúc phần này"
          : "Câu tiếp theo →"
        : "Kiểm tra đáp án";
    const checkBtn = createEl("button", "main-btn quiz-check-btn", primaryText);
    actions.appendChild(backBtn);
    actions.appendChild(checkBtn);
    card.appendChild(actions);

    // ====== Gán event ======

    backBtn.addEventListener("click", () => {
      const confirmLeave =
        rt.state === "reviewing" || rt.idx > 0
          ? confirm(
              "Nếu bạn thoát bây giờ thì kết quả tạm thời của phần này sẽ không được lưu. Bạn chắc chắn muốn thoát?"
            )
          : true;
      if (confirmLeave) {
        gCurrentRuntime = null;
        renderSectionsOverview();
      }
    });

    checkBtn.addEventListener("click", () => {
      handleCheckOrNext({ options, explainBox, checkBtn });
    });
  }

  // ================== Xử lý click "Kiểm tra đáp án" / "Câu tiếp theo" ==================
  function handleCheckOrNext(viewRefs) {
    const rt = gCurrentRuntime;
    if (!rt) return;

    const section = rt.section;
    const questions = section.questions || [];
    theQuestion = questions[rt.idx];
    const q = theQuestion;

    if (rt.state === "answering") {
      // ---- Kiểm tra đáp án ----
      const chosen = viewRefs.options
        .map((o) => o.input)
        .find((i) => i.checked);

      if (!chosen) {
        alert("Bạn hãy chọn 1 đáp án trước đã nhé.");
        return;
      }

      let isCorrect = false;
      let correctLabelText = "";

      if (section.type === "readingMcq" && q.kind === "tf") {
        const val = chosen.value === "true";
        isCorrect = val === !!q.correct;
        correctLabelText = q.correct ? "True" : "False";
      } else {
        const correctIdx = String(q.correct);
        isCorrect = chosen.value === correctIdx;

        const opt = (q.options || [])[q.correct] || "";
        correctLabelText = opt;
      }

      if (isCorrect) {
        rt.correct++;
      }

      // Khóa các option
      viewRefs.options.forEach(({ input }) => {
        input.disabled = true;
      });

      // Nội dung giải thích
      const baseMsg = isCorrect
        ? "✔ Chính xác! "
        : "✘ Chưa chính xác. ";
      const explain =
        q.explanation ||
        (correctLabelText
          ? "Đáp án đúng là: " + correctLabelText
          : "");

      viewRefs.explainBox.innerHTML =
        "<p><strong>" + baseMsg + "</strong>" + explain + "</p>";

      rt.state = "reviewing";

      const isLast = rt.idx === questions.length - 1;
      viewRefs.checkBtn.textContent = isLast
        ? "Kết thúc phần này"
        : "Câu tiếp theo →";
    } else {
      // ---- Sang câu tiếp theo / kết thúc phần ----
      const isLast = rt.idx === (section.questions || []).length - 1;
      if (isLast) {
        finishCurrentSection();
      } else {
        rt.idx++;
        rt.state = "answering";
        renderCurrentQuestion();
      }
    }
  }

  // ================== Kết thúc 1 phần ==================
  function finishCurrentSection() {
    const rt = gCurrentRuntime;
    if (!rt) {
      renderSectionsOverview();
      return;
    }
    const secId = rt.meta.id;
    const total = (rt.section.questions || []).length || 0;

    gSectionProgress[secId] = {
      done: true,
      correct: rt.correct,
      total,
    };

    alert(
      `Bạn đã làm xong ${rt.section.title || rt.meta.label || "phần này"}.\n` +
        `Kết quả: đúng ${rt.correct}/${total} câu.`
    );

    gCurrentRuntime = null;
    renderSectionsOverview();
  }
})();
