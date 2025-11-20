// js/quizEng.js
// Render bài test tiếng Anh từ JSON, làm từng phần, từng câu, chấm điểm & cộng XP/Coin vào Firebase.

(function () {
  // ====================== HELPER CHUNG ======================
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

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function norm(s) {
    return (s || "").trim().toLowerCase();
  }

  // ====================== HEADER QUIZ: XP/COIN ======================
  function initQuizHeader() {
    if (!window.firebase || !firebase.auth) return;

    const emailEl = document.getElementById("quizUserEmail");
    const xpEl = document.getElementById("quizXP");
    const coinEl = document.getElementById("quizCoin");
    const badgeEl = document.getElementById("quizBadge");

    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        if (emailEl) emailEl.textContent = "Chưa đăng nhập";
        return;
      }
      if (emailEl) emailEl.textContent = user.email;

      const statsRef = firebase.database().ref("users/" + user.uid + "/stats");
      statsRef.on("value", (snap) => {
        const stats = snap.val() || {};
        if (xpEl) xpEl.textContent = stats.xp != null ? stats.xp : 0;
        if (coinEl) coinEl.textContent = stats.coin != null ? stats.coin : 0;
        if (badgeEl) badgeEl.textContent = stats.badge != null ? stats.badge : 1;
      });
    });
  }

  // ====================== LOAD QUIZ & KHỞI ĐỘNG ======================
  async function initQuizEng() {
    const root = document.getElementById("quiz-eng-root");
    if (!root) return;

    root.textContent = "Đang tải đề kiểm tra...";

    try {
      const testId = getTestIdFromQuery();

      // Đọc danh sách bài test
      const testsManifest = await loadJson("/content/testsManifest.json");
      const test =
        (testsManifest.tests || []).find((t) => t.id === testId) ||
        (testsManifest.tests || [])[0];

      if (!test) {
        root.textContent = "Không tìm thấy bài kiểm tra.";
        return;
      }

      // Đọc sectionsManifest để lấy meta
      const sectionsManifest = await loadJson("/content/sectionsManifest.json");
      const sectionMap = new Map(
        (sectionsManifest.sections || []).map((s) => [s.id, s])
      );

      // Load từng section JSON
      const runtime = {
        testId: test.id,
        testTitle: test.title || "Bài kiểm tra tiếng Anh",
        testDescription:
          test.description ||
          "Hoàn thành tất cả các phần để nhận XP & Coin.",
        sections: [],
        mistakes: [], // lưu "Câu X (phần Y)"
        submitted: false
      };

      for (const secId of test.sections || []) {
        const meta = sectionMap.get(secId);
        if (!meta) continue;
        const data = await loadJson(meta.file);

        const type = data.type || meta.type || "mcqOneByOne";
        const questionCount = getSectionQuestionCount(type, data);

        runtime.sections.push({
          id: meta.id,
          type,
          partIndex: data.partIndex || meta.partIndex || 0,
          label:
            data.title ||
            meta.label ||
            `Phần ${data.partIndex || meta.partIndex || ""}`,
          meta,
          data,
          state: {
            total: questionCount,
            correct: 0,
            done: false
          }
        });
      }

      renderTestOverview(root, runtime);
      loadQuizProgressForHeader(root, testId);
    } catch (err) {
      console.error(err);
      root.innerHTML = "";
      const p = document.createElement("p");
      p.textContent =
        "Có lỗi khi tải đề kiểm tra. Bạn kiểm tra lại đường dẫn JSON hoặc mở DevTools (F12) để xem chi tiết.";
      root.appendChild(p);
    }
  }

  // Đếm số câu hỏi của 1 section, tuỳ theo type
  function getSectionQuestionCount(type, data) {
    switch (type) {
      case "readingDragDrop":
        return Object.keys(data.blanks || {}).length;
      case "mcqOneByOne":
      case "mcqImage":
      case "readingMcq":
      case "wordForm":
      case "reorderAndRewrite":
      default:
        return (data.questions || []).length;
    }
  }

  // ====================== HIỂN THỊ OVERVIEW CÁC PHẦN ======================
  function renderTestOverview(root, runtime) {
    root.innerHTML = "";

    const headerRow = createEl("div", "quiz-top-row");
    const title = createEl("h2", "quiz-title", runtime.testTitle);
    const desc = createEl("p", "quiz-subtitle", runtime.testDescription);

    const quitBtn = createEl("button", "btn ghost", "⬅ Thoát bài test");
    quitBtn.addEventListener("click", () => confirmQuit(runtime));

    headerRow.appendChild(title);
    headerRow.appendChild(quitBtn);
    root.appendChild(headerRow);
    root.appendChild(desc);

    const card = createEl("section", "quiz-card");
    root.appendChild(card);

    const list = createEl("div", "quiz-section-list");
    card.appendChild(list);

    let allDone = true;

    // Sort theo partIndex
    const sectionsSorted = runtime.sections.slice().sort((a, b) => {
      return (a.partIndex || 0) - (b.partIndex || 0);
    });

    sectionsSorted.forEach((sec) => {
      const { state } = sec;
      if (!state.done) allDone = false;

      const item = createEl("div", "quiz-section-item");
      const title = createEl("div", "quiz-section-item-title", sec.label);
      const metaLine = createEl(
        "div",
        "quiz-section-item-meta",
        `Số câu: ${state.total}`
      );

      let statusText = "";
      if (state.done) {
        statusText = `Đã hoàn thành – Đúng ${state.correct}/${state.total}`;
      } else {
        statusText = "Chưa làm";
      }
      const status = createEl("div", "quiz-section-item-status", statusText);

      const btn = createEl(
        "button",
        "main-btn quiz-section-start-btn",
        state.done ? "Đã xong ✅" : "Bắt đầu phần này"
      );
      if (state.done) {
        btn.disabled = true;
        btn.classList.add("btn-disabled");
      } else {
        btn.addEventListener("click", () => {
          startSection(root, runtime, sec);
        });
      }

      item.appendChild(title);
      item.appendChild(metaLine);
      item.appendChild(status);
      item.appendChild(btn);
      list.appendChild(item);
    });

    const footer = createEl("div", "quiz-overview-footer");
    if (allDone && runtime.sections.length > 0) {
      const submitBtn = createEl(
        "button",
        "main-btn",
        "✅ Nộp bài & nhận điểm"
      );
      submitBtn.addEventListener("click", () => finalizeQuiz(root, runtime));
      footer.appendChild(submitBtn);
    } else {
      const hint = createEl(
        "p",
        "quiz-hint",
        "Hãy hoàn thành tất cả các phần để có thể nộp bài và nhận XP/Coin."
      );
      footer.appendChild(hint);
    }

    card.appendChild(footer);
  }

  function confirmQuit(runtime) {
    // Kiểm tra đã làm xong toàn bộ chưa
    const allDone = runtime.sections.every((s) => s.state.done);

    if (allDone) {
      // Nếu đã xong hết mà muốn thoát, coi như không nộp bài
      if (
        confirm(
          "Bạn đã hoàn thành tất cả các phần nhưng chưa nộp bài.\n" +
            "Nếu thoát bây giờ, hệ thống sẽ KHÔNG lưu điểm và KHÔNG cộng XP/Coin.\n\n" +
            "Bạn có chắc muốn thoát?"
        )
      ) {
        window.location.href = "index.html";
      }
    } else {
      if (
        confirm(
          "Bạn chưa hoàn thành toàn bộ bài test.\n" +
            "Nếu thoát bây giờ, hệ thống sẽ KHÔNG lưu điểm và KHÔNG cộng XP/Coin.\n" +
            "Lần sau vào lại bạn sẽ phải làm từ đầu.\n\n" +
            "Bạn có chắc muốn thoát?"
        )
      ) {
        window.location.href = "index.html";
      }
    }
  }

  // ====================== ĐỌC LỊCH SỬ QUIZ (header thông tin) ======================
  function loadQuizProgressForHeader(containerOrRoot, testId) {
    if (!window.firebase || !firebase.auth) return;

    const infoP = createEl(
      "p",
      null,
      "Đang kiểm tra lịch sử làm bài..."
    );
    infoP.style.fontSize = "13px";
    infoP.style.color = "#4b5563";
    infoP.style.marginBottom = "8px";

    // chèn phía trên thẻ .quiz-card đầu tiên nếu có
    if (containerOrRoot.firstChild) {
      containerOrRoot.insertBefore(infoP, containerOrRoot.firstChild.nextSibling);
    } else {
      containerOrRoot.appendChild(infoP);
    }

    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        infoP.textContent =
          "Hãy đăng nhập để hệ thống lưu điểm & XP của bạn.";
        return;
      }
      const quizRef = firebase
        .database()
        .ref("users/" + user.uid + "/quizEng/" + testId);

      quizRef.once("value").then((snap) => {
        const data = snap.val() || {};
        const attempts = data.attempts || 0;
        const bestScore =
          typeof data.bestScore === "number" ? data.bestScore : null;

        if (attempts === 0) {
          infoP.textContent = "Đây là lần đầu bạn làm bài này. Cố lên nhé!";
        } else if (attempts === 1) {
          infoP.textContent =
            "Bạn đã làm bài này 1 lần. Điểm cao nhất: " +
            (bestScore != null ? bestScore + "%" : "chưa có");
        } else {
          infoP.textContent =
            "Bạn đã làm bài này " +
            attempts +
            " lần. Điểm cao nhất: " +
            (bestScore != null ? bestScore + "%" : "chưa có");
        }
      });
    });
  }

  // ====================== CHẠY 1 PHẦN ======================
  function startSection(root, runtime, section) {
    const type = section.type;

    switch (type) {
      case "mcqOneByOne":
      case "mcqImage":
      case "readingMcq":
      case "wordForm":
      case "reorderAndRewrite":
        runOneByOneSection(root, runtime, section);
        break;

      case "readingDragDrop":
        runDragDropSection(root, runtime, section);
        break;

      default:
        alert("Chưa hỗ trợ kiểu phần: " + type);
        renderTestOverview(root, runtime);
        break;
    }
  }

  // ====================== PHẦN MCQ / ONE-BY-ONE ======================
  function runOneByOneSection(root, runtime, section) {
    const { data, state } = section;
    const questions = data.questions || [];
    if (questions.length === 0) {
      alert("Phần này chưa có câu hỏi.");
      renderTestOverview(root, runtime);
      return;
    }

    let currentIndex = 0;
    let correctCount = 0;
    const localMistakes = [];

    function renderCurrentQuestion() {
      const q = questions[currentIndex];
      root.innerHTML = "";

      const topRow = createEl("div", "quiz-top-row");
      const title = createEl("h2", "quiz-title", section.label);
      const backBtn = createEl("button", "btn ghost", "⬅ Thoát bài test");
      backBtn.addEventListener("click", () => confirmQuit(runtime));
      topRow.appendChild(title);
      topRow.appendChild(backBtn);
      root.appendChild(topRow);

      const infoLine = createEl(
        "p",
        "quiz-subtitle",
        `Câu ${q.number} / ${questions.length}`
      );
      root.appendChild(infoLine);

      const card = createEl("section", "quiz-card");
      root.appendChild(card);

      const qBox = createEl("div", "quiz-question");
      const qText = createEl(
        "p",
        "quiz-question-text",
        "Câu " + q.number + ". " + (q.text || q.prompt || "")
      );
      qBox.appendChild(qText);

      // Với readingMcq, có thể có passage riêng ở trong section
      if (section.type === "readingMcq" && section.data.passage) {
        const passage = createEl("div", "quiz-passage");
        passage.innerHTML = section.data.passage.replace(/\n/g, "<br>");
        qBox.insertBefore(passage, qText);
      }

      // Với mcqImage, thêm hình
      if (section.type === "mcqImage" && q.imageFile) {
        const img = document.createElement("img");
        img.src = "/assets/content/" + q.imageFile;
        img.alt = "Question " + q.number;
        img.className = "quiz-image";
        qBox.insertBefore(img, qText);
      }

      // Tuỳ type để render phần input
      let answered = false;
      let isCorrect = false;

      if (
        section.type === "mcqOneByOne" ||
        section.type === "mcqImage" ||
        section.type === "readingMcq"
      ) {
        // Multiple choice
        const options = q.options || [];
        const optionList = createEl("div", "quiz-option-list");

        options.forEach((opt, idx) => {
          const line = createEl("label", "quiz-option");
          const input = document.createElement("input");
          input.type = "radio";
          input.name = "q_" + section.id + "_" + q.number;
          // Với readingMcq + True/False: có thể dùng kind === 'tf'
          if (section.type === "readingMcq" && q.kind === "tf") {
            input.value = idx === 0 ? "true" : "false";
          } else {
            input.value = String(idx);
          }
          line.appendChild(input);
          const span = document.createTextNode(" " + opt);
          line.appendChild(span);

          line.addEventListener("click", () => {
            if (answered) return;
            answered = true;

            // Xử lý đúng/sai
            if (section.type === "readingMcq" && q.kind === "tf") {
              const val = input.value === "true";
              isCorrect = val === q.correct;
            } else {
              isCorrect = input.value === String(q.correct);
            }

            if (isCorrect) correctCount++;
            else {
              localMistakes.push(
                "Câu " + q.number + " (phần " + (section.partIndex || "?") + ")"
              );
            }

            // Tô màu đúng/sai
            highlightMcqAnswer(optionList, section, q, input.value);

            // Hiện giải thích nếu có
            showExplanation(card, q);

            // Hiện nút tiếp theo
            nextBtn.disabled = false;
          });

          optionList.appendChild(line);
        });

        qBox.appendChild(optionList);
      } else if (section.type === "wordForm") {
        const hint = createEl(
          "p",
          "quiz-hint",
          "Viết dạng đúng của từ trong ngoặc."
        );
        qBox.appendChild(hint);

        const input = document.createElement("input");
        input.type = "text";
        input.className = "quiz-input";
        qBox.appendChild(input);

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") checkWordForm();
        });

        function checkWordForm() {
          if (answered) return;
          answered = true;
          const val = norm(input.value);
          isCorrect = val === norm(q.answer);
          if (isCorrect) correctCount++;
          else {
            localMistakes.push(
              "Câu " + q.number + " (phần " + (section.partIndex || "?") + ")"
            );
            input.classList.add("quiz-input-wrong");
          }
          showExplanation(card, q);
          nextBtn.disabled = false;
        }

        const checkBtn = createEl("button", "main-btn", "Kiểm tra câu này");
        checkBtn.style.marginTop = "8px";
        checkBtn.addEventListener("click", checkWordForm);
        qBox.appendChild(checkBtn);
      } else if (section.type === "reorderAndRewrite") {
        // Nếu có chunks => ghép cụm
        if (Array.isArray(q.chunks) && q.chunks.length > 0) {
          const hint = createEl(
            "p",
            "quiz-hint",
            "Click vào các cụm từ để xếp thành câu đúng."
          );
          qBox.appendChild(hint);

          const dropZone = createEl("div", "reorder-dropzone");
          qBox.appendChild(dropZone);

          const bank = createEl("div", "reorder-bank");
          const chunks = q.chunks.slice().sort(() => Math.random() - 0.5);

          const hidden = document.createElement("input");
          hidden.type = "hidden";
          qBox.appendChild(hidden);

          function updateHidden() {
            const parts = Array.from(
              dropZone.querySelectorAll(".reorder-chip")
            ).map((el) => el.textContent.trim());
            hidden.value = parts.join(" ");
          }

          chunks.forEach((chunk) => {
            const chip = createEl("span", "reorder-chip", chunk);
            chip.addEventListener("click", () => {
              if (answered) return;
              const clone = createEl("span", "reorder-chip in-drop", chunk);
              dropZone.appendChild(clone);
              updateHidden();
            });
            bank.appendChild(chip);
          });

          dropZone.addEventListener("click", (e) => {
            if (!answered && e.target.classList.contains("reorder-chip")) {
              e.target.remove();
              updateHidden();
            }
          });

          qBox.appendChild(bank);

          function checkReorder() {
            if (answered) return;
            answered = true;
            const userText = norm(hidden.value);
            const correctText = norm(q.answer || "");
            isCorrect = userText === correctText;
            if (isCorrect) correctCount++;
            else {
              localMistakes.push(
                "Câu " + q.number + " (phần " + (section.partIndex || "?") + ")"
              );
              dropZone.classList.add("reorder-dropzone-wrong");
            }
            showExplanation(card, q);
            nextBtn.disabled = false;
          }

          const checkBtn = createEl("button", "main-btn", "Kiểm tra câu này");
          checkBtn.style.marginTop = "8px";
          checkBtn.addEventListener("click", checkReorder);
          qBox.appendChild(checkBtn);
        } else {
          // Nếu không có chunks => cho gõ lại câu
          const area = document.createElement("textarea");
          area.className = "quiz-textarea";
          area.rows = 2;
          qBox.appendChild(area);

          function checkRewrite() {
            if (answered) return;
            answered = true;
            const userText = norm(area.value);
            const correctText = norm(q.answer || "");
            isCorrect = userText === correctText;
            if (isCorrect) correctCount++;
            else {
              localMistakes.push(
                "Câu " + q.number + " (phần " + (section.partIndex || "?") + ")"
              );
              area.classList.add("quiz-input-wrong");
            }
            showExplanation(card, q);
            nextBtn.disabled = false;
          }

          area.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              checkRewrite();
            }
          });

          const checkBtn = createEl("button", "main-btn", "Kiểm tra câu này");
          checkBtn.style.marginTop = "8px";
          checkBtn.addEventListener("click", checkRewrite);
          qBox.appendChild(checkBtn);
        }
      }

      card.appendChild(qBox);

      // khu vực giải thích (sẽ được fill khi có kết quả)
      const explainBox = createEl("div", "quiz-explanation-box");
      card.appendChild(explainBox);

      // nút điều hướng
      const navRow = createEl("div", "quiz-submit-row");
      const isLast = currentIndex === questions.length - 1;
      const label = isLast
        ? "Hoàn thành phần này"
        : "Câu tiếp theo ▶";

      const backSectionBtn = createEl("button", "btn ghost", "⬅ Về danh sách phần");
      backSectionBtn.addEventListener("click", () => {
        // Không cho quay lại overview nếu chưa trả lời xong câu này
        if (!answered) {
          if (
            confirm(
              "Câu hỏi này chưa được chấm.\nNếu quay lại danh sách phần, câu này sẽ không được tính.\n\nBạn có muốn quay lại không?"
            )
          ) {
            renderTestOverview(root, runtime);
          }
        } else {
          renderTestOverview(root, runtime);
        }
      });

      nextBtn = createEl("button", "main-btn", label);
      nextBtn.disabled = true;
      nextBtn.style.marginLeft = "auto";

      nextBtn.addEventListener("click", () => {
        if (!answered) return;
        if (!isLast) {
          currentIndex++;
          renderCurrentQuestion();
        } else {
          // Kết thúc phần
          section.state.correct = correctCount;
          section.state.total = questions.length;
          section.state.done = true;
          // Gộp mistakes cục bộ vào tổng
          runtime.mistakes = runtime.mistakes.concat(localMistakes);
          renderTestOverview(root, runtime);
        }
      });

      navRow.appendChild(backSectionBtn);
      navRow.appendChild(nextBtn);
      card.appendChild(navRow);

      // helper:
      function showExplanation(cardEl, qObj) {
        explainBox.innerHTML = "";
        const correctLine = createEl(
          "p",
          "quiz-correct-line",
          "Đáp án đúng: " + buildCorrectAnswerText(section, qObj)
        );
        explainBox.appendChild(correctLine);

        if (qObj.explanation) {
          const expP = createEl("p", "quiz-hint", qObj.explanation);
          explainBox.appendChild(expP);
        }
      }
    }

    let nextBtn; // sẽ được gán trong renderCurrentQuestion
    renderCurrentQuestion();
  }

  function highlightMcqAnswer(optionList, section, q, chosenValue) {
    const labels = optionList.querySelectorAll(".quiz-option");
    labels.forEach((lab, idx) => {
      const input = lab.querySelector("input[type=radio]");
      if (!input) return;

      // cho tất cả disable sau khi chọn
      input.disabled = true;

      if (section.type === "readingMcq" && q.kind === "tf") {
        const val = input.value === "true";
        if (val === q.correct) {
          lab.classList.add("quiz-option-correct");
        }
        if (input.value === chosenValue && val !== q.correct) {
          lab.classList.add("quiz-option-wrong");
        }
      } else {
        if (String(idx) === String(q.correct)) {
          lab.classList.add("quiz-option-correct");
        }
        if (input.value === chosenValue && String(idx) !== String(q.correct)) {
          lab.classList.add("quiz-option-wrong");
        }
      }
    });
  }

  function buildCorrectAnswerText(section, q) {
    if (
      section.type === "readingMcq" &&
      q.kind === "tf" &&
      typeof q.correct === "boolean"
    ) {
      return q.correct ? "True" : "False";
    }
    const idx = q.correct;
    const options = q.options || [];
    if (typeof idx === "number" && options[idx] != null) {
      // Đáp án dạng “C. absolutely”
      const letter = String.fromCharCode(65 + idx); // A B C D...
      return letter + ". " + options[idx];
    }
    return "";
  }

  // ====================== PHẦN READING DRAG-DROP (PHẦN 4) ======================
  function runDragDropSection(root, runtime, section) {
    const { data, state } = section;
    const blanks = data.blanks || {};
    const blankKeys = Object.keys(blanks);
    if (blankKeys.length === 0) {
      alert("Phần này chưa có chỗ trống để điền.");
      renderTestOverview(root, runtime);
      return;
    }

    root.innerHTML = "";

    const topRow = createEl("div", "quiz-top-row");
    const title = createEl("h2", "quiz-title", section.label);
    const backBtn = createEl("button", "btn ghost", "⬅ Thoát bài test");
    backBtn.addEventListener("click", () => confirmQuit(runtime));
    topRow.appendChild(title);
    topRow.appendChild(backBtn);
    root.appendChild(topRow);

    const infoLine = createEl(
      "p",
      "quiz-subtitle",
      "Điền từ thích hợp vào các chỗ trống trong đoạn văn."
    );
    root.appendChild(infoLine);

    const card = createEl("section", "quiz-card");
    root.appendChild(card);

    const passageDiv = createEl("div", "quiz-passage quiz-passage-input");
    let html = data.passage || "";

    Object.keys(blanks).forEach((num) => {
      const qid = section.id + "-" + num;
      const inputHtml =
        '<input type="text" class="quiz-blank" ' +
        'data-qid="' +
        qid +
        '" data-num="' +
        num +
        '" size="10" />';
      const re = new RegExp("__" + num + "__", "g");
      html = html.replace(re, inputHtml);
    });

    passageDiv.innerHTML = html.replace(/\n/g, "<br>");
    card.appendChild(passageDiv);

    if (Array.isArray(data.wordBank) && data.wordBank.length > 0) {
      const bankTitle = createEl("p", "quiz-hint", "Từ gợi ý:");
      card.appendChild(bankTitle);

      const bankDiv = createEl("div", "quiz-wordbank");
      data.wordBank.forEach((w) => {
        const chip = createEl("span", "quiz-wordchip", w);
        chip.draggable = true;
        chip.dataset.word = w;
        chip.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", w);
        });
        bankDiv.appendChild(chip);
      });

      card.appendChild(bankDiv);

      const inputs = passageDiv.querySelectorAll("input.quiz-blank");
      inputs.forEach((input) => {
        input.addEventListener("dragover", (e) => e.preventDefault());
        input.addEventListener("drop", (e) => {
          e.preventDefault();
          const word = e.dataTransfer.getData("text/plain");
          if (word) input.value = word;
        });
      });
    }

    const navRow = createEl("div", "quiz-submit-row");
    const backSectionBtn = createEl("button", "btn ghost", "⬅ Về danh sách phần");
    backSectionBtn.addEventListener("click", () => {
      renderTestOverview(root, runtime);
    });

    const finishBtn = createEl("button", "main-btn", "Hoàn thành phần này");
    finishBtn.addEventListener("click", () => {
      // chấm phần 4
      let total = 0;
      let correct = 0;
      const localMistakes = [];

      Object.entries(blanks).forEach(([num, ans]) => {
        total++;
        const qid = section.id + "-" + num;
        const input = passageDiv.querySelector(
          'input.quiz-blank[data-qid="' + qid + '"]'
        );
        if (!input) return;
        const userVal = norm(input.value);
        if (userVal === norm(ans)) {
          correct++;
          input.classList.add("quiz-blank-correct");
        } else {
          input.classList.add("quiz-blank-wrong");
          localMistakes.push(
            "Câu " + num + " (phần " + (section.partIndex || "?") + ")"
          );
        }
      });

      section.state.total = total;
      section.state.correct = correct;
      section.state.done = true;
      runtime.mistakes = runtime.mistakes.concat(localMistakes);

      alert(
        "Bạn đã hoàn thành phần này.\nĐúng " + correct + "/" + total + " câu."
      );
      renderTestOverview(root, runtime);
    });

    navRow.appendChild(backSectionBtn);
    navRow.appendChild(finishBtn);
    card.appendChild(navRow);
  }

  // ====================== THƯỞNG XP / COIN ======================
  async function awardStats(scorePercent, testIdOverride) {
    scorePercent = Math.max(0, Math.min(100, scorePercent || 0));
    const testId = testIdOverride || getTestIdFromQuery();

    if (!window.firebase || !firebase.auth) {
      console.warn("Firebase chưa sẵn sàng, không cập nhật XP/Coin được.");
      return { xpGain: 0, coinGain: 0, updated: false };
    }

    const user = firebase.auth().currentUser;
    if (!user) {
      console.warn("Chưa đăng nhập, không cập nhật XP/Coin.");
      return { xpGain: 0, coinGain: 0, updated: false };
    }

    const uid = user.uid;
    const db = firebase.database();
    const quizRef = db.ref("users/" + uid + "/quizEng/" + testId);
    const statsRef = db.ref("users/" + uid + "/stats");

    const snap = await quizRef.once("value");
    const info = snap.val() || {};
    const attempts = info.attempts || 0;
    const gotPerfectCoin = !!info.gotPerfectCoin;

    let xpGain = 0;
    let coinGain = 0;
    let newGotPerfectCoin = gotPerfectCoin;

    // === RULE MỚI ===
    // Lần đầu:
    //   - 100%: +100 XP, +250 Coin
    //   - <100%: +score% XP, +50 Coin
    // Các lần sau:
    //   - XP = score%
    //   - Nếu lần đầu THÀNH CÔNG đạt 100% và chưa từng nhận perfect-coin: +150 Coin
    if (attempts === 0) {
      if (scorePercent === 100) {
        xpGain = 100;
        coinGain = 250; // ★ tăng coin khi làm perfect lần đầu
        newGotPerfectCoin = true;
      } else {
        xpGain = scorePercent;
        coinGain = 50;
      }
    } else {
      xpGain = scorePercent;
      if (scorePercent === 100 && !gotPerfectCoin) {
        coinGain = 150;
        newGotPerfectCoin = true;
      }
    }

    const newAttempts = attempts + 1;
    const bestScore = Math.max(info.bestScore || 0, scorePercent);

    await quizRef.update({
      attempts: newAttempts,
      bestScore: bestScore,
      lastScore: scorePercent,
      gotPerfectCoin: newGotPerfectCoin,
      lastUpdated: Date.now()
    });

    if (xpGain || coinGain) {
      await statsRef.transaction((stats) => {
        stats = stats || {};
        stats.xp = (stats.xp || 0) + xpGain;
        stats.coin = (stats.coin || 0) + coinGain;
        if (stats.badge == null) stats.badge = 1;
        return stats;
      });
    }

    return { xpGain, coinGain, updated: true };
  }

  // ====================== NỘP BÀI & MODAL KẾT QUẢ ======================
  let quizAlreadySubmitted = false;

  async function finalizeQuiz(root, runtime) {
    if (quizAlreadySubmitted) return;

    const allDone = runtime.sections.every((s) => s.state.done);
    if (!allDone) {
      alert("Bạn cần hoàn thành tất cả các phần trước khi nộp bài.");
      return;
    }

    quizAlreadySubmitted = true;

    let total = 0;
    let correctCount = 0;
    runtime.sections.forEach((sec) => {
      total += sec.state.total || 0;
      correctCount += sec.state.correct || 0;
    });

    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let reward = { xpGain: 0, coinGain: 0, updated: false };
    try {
      reward = await awardStats(scorePercent, runtime.testId);
    } catch (e) {
      console.warn("awardStats error:", e);
    }

    const summary = {
      scorePercent,
      correctCount,
      total,
      mistakes: runtime.mistakes || []
    };

    showResultModal(summary, reward, () => {
      // callback khi bấm "Về trang chính"
      window.location.href = "index.html";
    });
  }

  function showResultModal(summary, reward, onExit) {
    let overlay = document.getElementById("quiz-result-modal");
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.id = "quiz-result-modal";
    overlay.className = "quiz-modal-overlay";

    const card = document.createElement("div");
    card.className = "quiz-modal-card";

    const { scorePercent, correctCount, total, mistakes } = summary;

    let emoMsg = "";
    if (scorePercent >= 90) {
      emoMsg = "🔥 Quá đỉnh! Bạn làm gần như hoàn hảo. Giữ phong độ này nhé!";
    } else if (scorePercent >= 75) {
      emoMsg =
        "👏 Rất tốt! Bạn đã nắm khá chắc bài. Thử làm lại xem có lên 100% không?";
    } else if (scorePercent >= 50) {
      emoMsg =
        "🙂 Ổn rồi! Bạn đã có nền tảng. Xem lại các câu sai rồi luyện thêm nhé.";
    } else {
      emoMsg =
        "💪 Không sao hết! Quan trọng là bạn biết mình cần ôn lại phần nào. Lần sau sẽ tốt hơn!";
    }

    const rewardText = reward.updated
      ? `Thưởng: +${reward.xpGain} XP, +${reward.coinGain} Coin.`
      : "Không cập nhật được XP/Coin (chưa đăng nhập hoặc lỗi mạng).";

    card.innerHTML = `
      <h3>Kết quả bài test</h3>
      <p><b>Đúng:</b> ${correctCount}/${total} (~${scorePercent}%)</p>
      <p style="margin-top:6px;">${emoMsg}</p>
      ${
        mistakes.length
          ? `<p style="font-size:13px; margin-top:8px;"><b>Cần ôn lại các câu:</b> ${mistakes.join(
              ", "
            )}</p>`
          : "<p style='margin-top:8px;'>Xuất sắc! Bạn làm đúng hết tất cả 🎉</p>"
      }
      <p style="margin-top:8px; font-size:13px; color:#4b5563;">${rewardText}</p>
      <div class="quiz-modal-actions">
        <button id="quiz-modal-exit" class="main-btn">⬅ Về trang chính</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const exitBtn = card.querySelector("#quiz-modal-exit");
    if (exitBtn) {
      exitBtn.addEventListener("click", () => {
        if (typeof onExit === "function") onExit();
      });
    }
  }

  // ====================== DOM READY ======================
  document.addEventListener("DOMContentLoaded", () => {
    initQuizHeader();
    initQuizEng();
  });
})();

