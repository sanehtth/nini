// js/quizEng.js
// Render bài test tiếng Anh từ JSON, chấm điểm và cộng XP/Coin vào Firebase.

(function () {
  // ============================================================
  // 1. Helper chung
  // ============================================================
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

  // ============================================================
  // 2. State riêng cho phần mcqOneByOne (làm từng câu)
  // ============================================================
  // Mỗi section.id sẽ có state:
  // {
  //   questions: [...],
  //   current: 0,
  //   userAnswers: [null | index],
  //   correctCount: number
  // }
  const mcqOneByOneState = {};

  // ============================================================
  // 3. Header quiz: đọc XP/Coin từ Firebase
  // ============================================================
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

      const statsRef = firebase
        .database()
        .ref("users/" + user.uid + "/stats");

      statsRef.on("value", (snap) => {
        const stats = snap.val() || {};
        if (xpEl) xpEl.textContent = stats.xp != null ? stats.xp : 0;
        if (coinEl) coinEl.textContent = stats.coin != null ? stats.coin : 0;
        if (badgeEl) badgeEl.textContent = stats.badge != null ? stats.badge : 1;
      });
    });
  }

  // ============================================================
  // 4. Khởi động quiz: load manifest + sections
  // ============================================================
  async function initQuizEng() {
    const root = document.getElementById("quiz-eng-root");
    if (!root) return;

    root.textContent = "Đang tải đề kiểm tra...";

    try {
      const testId = getTestIdFromQuery();

      const testsManifest = await loadJson("/content/testsManifest.json");
      const test =
        (testsManifest.tests || []).find((t) => t.id === testId) ||
        (testsManifest.tests || [])[0];

      if (!test) {
        root.textContent = "Không tìm thấy bài kiểm tra.";
        return;
      }

      const sectionsManifest = await loadJson("/content/sectionsManifest.json");
      const sectionMap = new Map(
        (sectionsManifest.sections || []).map((s) => [s.id, s])
      );

      const sections = [];
      for (const secId of test.sections || []) {
        const meta = sectionMap.get(secId);
        if (!meta) continue;
        const data = await loadJson(meta.file);
        sections.push(data);
      }

      renderQuiz(root, test, sections);
    } catch (err) {
      console.error(err);
      const p = document.createElement("p");
      p.textContent =
        "Có lỗi khi tải đề kiểm tra. Bạn kiểm tra lại đường dẫn JSON hoặc mở DevTools (F12) để xem chi tiết.";
      root.innerHTML = "";
      root.appendChild(p);
    }
  }

  // ============================================================
  // 5. Render quiz tổng
  // ============================================================
  function renderQuiz(root, test, sections) {
    root.innerHTML = "";

    const title = createEl(
      "h2",
      "quiz-title",
      test.title || "Bài kiểm tra tiếng Anh"
    );
    root.appendChild(title);

    const info = createEl(
      "p",
      "quiz-subtitle",
      test.description ||
        "Làm xong bấm nút 'Nộp bài' để xem điểm, XP & Coin được cộng."
    );
    root.appendChild(info);

    const container = createEl("section", "quiz-card");
    root.appendChild(container);

    // “Chỉ số chăm chỉ” (số lần đã làm & bestScore) – đọc nhanh từ Firebase
    loadQuizProgressForHeader(container);

    sections.forEach((sec) => {
      const secBlock = createEl("div", "quiz-section");

      const secHeader = createEl(
        "h3",
        "quiz-section-title",
        sec.title || `Phần ${sec.partIndex || ""}`
      );
      secBlock.appendChild(secHeader);

      if (sec.passage && sec.type !== "readingDragDrop") {
        const p = createEl("div", "quiz-passage");
        p.innerHTML = sec.passage.replace(/\n/g, "<br>");
        secBlock.appendChild(p);
      }

      // === NHÁNH THEO KIỂU PHẦN (type) ===
      switch (sec.type) {
        case "mcqOneByOne":
          // *** MỚI: phần 1 trắc nghiệm từng câu ***
          renderSectionMcqOneByOne(secBlock, sec);
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

  // ============================================================
  // 6. “Chỉ số chăm chỉ” – đọc progress từ Firebase
  // ============================================================
  function loadQuizProgressForHeader(container) {
    if (!window.firebase || !firebase.auth) return;
    const testId = getTestIdFromQuery();

    const infoP = createEl(
      "p",
      null,
      "Đang kiểm tra lịch sử làm bài..."
    );
    infoP.style.fontSize = "13px";
    infoP.style.color = "#4b5563";
    infoP.style.marginBottom = "8px";
    container.parentElement.insertBefore(infoP, container);

    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        infoP.textContent = "Hãy đăng nhập để hệ thống lưu điểm & XP của bạn.";
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
          infoP.textContent =
            "Đây là lần đầu bạn làm bài này. Cố lên nhé!";
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

  // ============================================================
  // 7. Render từng loại phần
  // ============================================================

  // 7.1. MCQ thường: hiện cả bài (dùng cho phần khác)
  function renderSectionMcq(parent, section) {
    (section.questions || []).forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");
      const qTitle = createEl(
        "p",
        "quiz-question-text",
        "Câu " + q.number + ". " + (q.text || "")
      );
      box.appendChild(qTitle);

      (q.options || []).forEach((opt, idx) => {
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

  // 7.2. MCQ có hình
  function renderSectionMcqImage(parent, section) {
    const IMAGE_BASE = "/assets/content";

    (section.questions || []).forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");

      if (q.imageFile) {
        const img = document.createElement("img");
        img.src = IMAGE_BASE + "/" + q.imageFile;
        img.alt = "Question " + q.number;
        img.className = "quiz-image";
        box.appendChild(img);
      }

      const qTitle = createEl(
        "p",
        "quiz-question-text",
        "Câu " + q.number + ". " + (q.text || "")
      );
      box.appendChild(qTitle);

      (q.options || []).forEach((opt, idx) => {
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

  // 7.3. Reading + MCQ / True-False
  function renderSectionReadingMcq(parent, section) {
    (section.questions || []).forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");
      const qTitle = createEl(
        "p",
        "quiz-question-text",
        "Câu " + q.number + ". " + (q.text || "")
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
      } else {
        (q.options || []).forEach((opt, idx) => {
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

  // 7.4. Cloze – điền từ vào đoạn văn
  function renderSectionDragDrop(parent, section) {
    const info = createEl(
      "p",
      "quiz-hint",
      "Điền từ thích hợp vào các chỗ trống."
    );
    parent.appendChild(info);

    const passageDiv = createEl("div", "quiz-passage quiz-passage-input");
    let html = section.passage || "";

    Object.keys(section.blanks || {}).forEach((num) => {
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
    parent.appendChild(passageDiv);

    if (Array.isArray(section.wordBank) && section.wordBank.length > 0) {
      const bankTitle = createEl("p", "quiz-hint", "Từ gợi ý:");
      parent.appendChild(bankTitle);

      const bankDiv = createEl("div", "quiz-wordbank");

      section.wordBank.forEach((w) => {
        const chip = createEl("span", "quiz-wordchip", w);
        chip.draggable = true;
        chip.dataset.word = w;

        chip.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", w);
        });

        bankDiv.appendChild(chip);
      });

      parent.appendChild(bankDiv);

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
  }

  // 7.5. Word form – chia từ loại, chia thì
  function renderSectionWordForm(parent, section) {
    (section.questions || []).forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");
      const qTitle = createEl(
        "p",
        "quiz-question-text",
        "Câu " + q.number + ". " + (q.text || "")
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

  // 7.6. Reorder / Rewrite – sắp xếp cụm từ, viết lại câu
  function renderSectionReorder(parent, section) {
    (section.questions || []).forEach((q) => {
      const qid = section.id + "-" + q.number;
      const box = createEl("div", "quiz-question");

      const qTitle = createEl(
        "p",
        "quiz-question-text",
        "Câu " + q.number + ". " + (q.prompt || "")
      );
      box.appendChild(qTitle);

      // Nếu có chunks -> cho kéo thả, nếu không -> textarea gõ
      if (Array.isArray(q.chunks) && q.chunks.length > 0) {
        const hint = createEl(
          "p",
          "quiz-hint",
          "Kéo các cụm từ bên dưới vào ô trên để xếp thành câu hoàn chỉnh."
        );
        box.appendChild(hint);

        const dropZone = createEl("div", "reorder-dropzone");
        dropZone.dataset.qid = qid;
        box.appendChild(dropZone);

        const bank = createEl("div", "reorder-bank");
        const chunks = q.chunks.slice().sort(() => Math.random() - 0.5);

        chunks.forEach((chunk) => {
          const chip = createEl("span", "reorder-chip", chunk);
          chip.draggable = true;

          chip.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", chunk);
          });

          chip.addEventListener("click", () => {
            const clone = createEl("span", "reorder-chip in-drop", chunk);
            dropZone.appendChild(clone);
            updateHidden();
          });

          bank.appendChild(chip);
        });

        box.appendChild(bank);

        dropZone.addEventListener("dragover", (e) => e.preventDefault());
        dropZone.addEventListener("drop", (e) => {
          e.preventDefault();
          const text = e.dataTransfer.getData("text/plain");
          if (!text) return;
          const chip = createEl("span", "reorder-chip in-drop", text);
          dropZone.appendChild(chip);
          updateHidden();
        });

        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.dataset.qid = qid;
        box.appendChild(hidden);

        function updateHidden() {
          const parts = Array.from(
            dropZone.querySelectorAll(".reorder-chip")
          ).map((el) => el.textContent.trim());
          hidden.value = parts.join(" ");
        }

        dropZone.addEventListener("click", (e) => {
          if (e.target.classList.contains("reorder-chip")) {
            e.target.remove();
            updateHidden();
          }
        });
      } else {
        const area = document.createElement("textarea");
        area.className = "quiz-textarea";
        area.rows = 2;
        area.dataset.qid = qid;
        box.appendChild(area);
      }

      parent.appendChild(box);
    });
  }

  // 7.x. *** MỚI *** – Phần 1: MCQ từng câu một (mcqOneByOne)
  // ------------------------------------------------------------
  // - Hiện 1 câu / lần
  // - Chọn đáp án -> hiện ngay đúng/sai + giải thích
  // - Ghi điểm tạm trong mcqOneByOneState
  // - Không cập nhật Firebase ở đây, chỉ khi bấm "Nộp bài"
  function renderSectionMcqOneByOne(parent, section) {
    const questions = section.questions || [];
    if (!questions.length) {
      parent.appendChild(createEl("p", null, "Không có câu hỏi trong phần này."));
      return;
    }

    // Tạo state cho section này
    const state = {
      questions,
      current: 0,
      userAnswers: new Array(questions.length).fill(null),
      correctCount: 0,
    };
    mcqOneByOneState[section.id] = state;

    const box = createEl("div", "mcq-onebyone");

    const headerRow = createEl("div", "mcq-header-row");
    const progress = createEl("span", "mcq-progress", "");
    headerRow.appendChild(progress);
    box.appendChild(headerRow);

    const qText = createEl("p", "quiz-question-text", "");
    box.appendChild(qText);

    const optionsWrap = createEl("div", "mcq-choice-list");
    box.appendChild(optionsWrap);

    const explainBox = createEl("div", "quiz-explain", "");
    box.appendChild(explainBox);

    const navRow = createEl("div", "mcq-nav-row");
    const prevBtn = createEl("button", "quiz-nav-btn ghost", "◀ Câu trước");
    const nextBtn = createEl("button", "quiz-nav-btn", "Câu tiếp ▶");
    navRow.appendChild(prevBtn);
    navRow.appendChild(nextBtn);
    box.appendChild(navRow);

    parent.appendChild(box);

    function updateProgress() {
      const idx = state.current;
      const total = questions.length;
      progress.textContent = `Câu ${idx + 1} / ${total} | Đúng tạm thời: ${state.correctCount}/${total}`;
    }

    function renderCurrent() {
      const idx = state.current;
      const q = questions[idx];
      if (!q) return;

      qText.textContent = `Câu ${q.number ?? idx + 1}. ${q.text || ""}`;
      optionsWrap.innerHTML = "";
      explainBox.textContent = "";

      const chosenIndex = state.userAnswers[idx];

      (q.options || []).forEach((opt, optIdx) => {
        const btn = createEl("button", "quiz-choice-btn", opt);
        btn.dataset.idx = String(optIdx);

        // Nếu đã chọn rồi -> highlight trạng thái
        if (chosenIndex != null) {
          if (optIdx === q.correct) {
            btn.classList.add("correct");
          }
          if (optIdx === chosenIndex && chosenIndex !== q.correct) {
            btn.classList.add("wrong");
          }
          if (optIdx === chosenIndex) {
            btn.classList.add("chosen");
          }
        }

        btn.addEventListener("click", () => handleChoice(optIdx));
        optionsWrap.appendChild(btn);
      });

      // Nếu đã trả lời rồi -> hiện lại giải thích
      if (chosenIndex != null) {
        const isCorrect = chosenIndex === questions[idx].correct;
        showExplanation(q, isCorrect);
      }

      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === questions.length - 1;
      updateProgress();
    }

    function handleChoice(choiceIndex) {
      const idx = state.current;
      const q = questions[idx];

      // Nếu đã chọn rồi -> không cho đổi nữa
      if (state.userAnswers[idx] != null) return;

      state.userAnswers[idx] = choiceIndex;

      const isCorrect = choiceIndex === q.correct;
      if (isCorrect) {
        state.correctCount += 1;
      }

      // Tô màu các nút
      const btns = optionsWrap.querySelectorAll(".quiz-choice-btn");
      btns.forEach((b) => {
        const i = Number(b.dataset.idx || "0");
        b.classList.remove("correct", "wrong", "chosen");
        if (i === q.correct) {
          b.classList.add("correct");
        }
        if (i === choiceIndex && choiceIndex !== q.correct) {
          b.classList.add("wrong");
        }
        if (i === choiceIndex) {
          b.classList.add("chosen");
        }
      });

      // Hiển thị giải thích
      showExplanation(q, isCorrect);
      updateProgress();
    }

    function showExplanation(q, isCorrect) {
      if (!explainBox) return;
      const ansText = q.options && q.options[q.correct] != null
        ? q.options[q.correct]
        : "";

      const baseExplain = q.explanation || "";
      if (isCorrect) {
        explainBox.innerHTML =
          "✅ Chính xác! " + (baseExplain ? baseExplain : "");
      } else {
        explainBox.innerHTML =
          "❌ Sai rồi. Đáp án đúng là: <b>" +
          ansText +
          "</b>" +
          (baseExplain ? " – " + baseExplain : "");
      }
    }

    prevBtn.addEventListener("click", () => {
      if (state.current > 0) {
        state.current -= 1;
        renderCurrent();
      }
    });

    nextBtn.addEventListener("click", () => {
      if (state.current < questions.length - 1) {
        state.current += 1;
        renderCurrent();
      }
    });

    // render câu đầu tiên
    renderCurrent();
  }

  // ============================================================
  // 8. Thưởng XP / Coin – cấp phát sau khi Nộp bài
  // ============================================================
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

    if (attempts === 0) {
      if (scorePercent === 100) {
        xpGain = 100;
        coinGain = 150;
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

  // ============================================================
  // 9. Modal kết quả cuối bài
  // ============================================================
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
        window.location.href = "index.html";
      });
    }
  }

  // ============================================================
  // 10. Chấm điểm toàn bài (gọi khi bấm “Nộp bài”)
  // ============================================================
  let quizAlreadySubmitted = false;

  async function gradeQuiz(root, sections) {
    if (quizAlreadySubmitted) return;
    quizAlreadySubmitted = true;

    let total = 0;
    let correctCount = 0;
    const mistakes = [];
    const norm = (s) => (s || "").trim().toLowerCase();

    sections.forEach((section) => {
      switch (section.type) {
        // ---- PHẦN 1: mcqOneByOne – dùng state đã lưu ----
        case "mcqOneByOne": {
          const state = mcqOneByOneState[section.id];
          const qs = section.questions || [];
          if (!state || !qs.length) break;

          total += qs.length;
          correctCount += state.correctCount;

          qs.forEach((q, idx) => {
            const chosen = state.userAnswers[idx];
            const correct = q.correct;
            if (chosen !== correct) {
              const num = q.number ?? idx + 1;
              mistakes.push("Câu " + num + " (phần " + section.partIndex + ")");
            }
          });
          break;
        }

        // ---- MCQ có hình – chấm bằng radio trong DOM như cũ ----
        case "mcqImage":
          (section.questions || []).forEach((q) => {
            if (q.correct == null) return;
            total++;
            const qid = section.id + "-" + q.number;
            const chosen =
              (document.querySelector(
                'input[name="' + qid + '"]:checked'
              ) || {}).value;
            if (chosen === String(q.correct)) {
              correctCount++;
            } else {
              mistakes.push("Câu " + q.number + " (phần " + section.partIndex + ")");
            }
          });
          break;

        // ---- Reading MCQ / True-False ----
        case "readingMcq":
          (section.questions || []).forEach((q) => {
            total++;
            const qid = section.id + "-" + q.number;
            const chosenEl = document.querySelector(
              'input[name="' + qid + '"]:checked'
            );
            if (!chosenEl) {
              mistakes.push("Câu " + q.number + " (phần 3)");
              return;
            }
            if (q.kind === "tf") {
              const val = chosenEl.value === "true";
              if (val === q.correct) correctCount++;
              else mistakes.push("Câu " + q.number + " (phần 3)");
            } else {
              if (chosenEl.value === String(q.correct)) correctCount++;
              else mistakes.push("Câu " + q.number + " (phần 3)");
            }
          });
          break;

        // ---- Cloze --- điền vào đoạn văn ----
        case "readingDragDrop":
          Object.entries(section.blanks || {}).forEach(([num, ans]) => {
            total++;
            const qid = section.id + "-" + num;
            const input = document.querySelector(
              'input.quiz-blank[data-qid="' + qid + '"]'
            );
            if (input && norm(input.value) === norm(ans)) {
              correctCount++;
            } else {
              mistakes.push("Câu " + num + " (phần 4)");
            }
          });
          break;

        // ---- Word form ----
        case "wordForm":
          (section.questions || []).forEach((q) => {
            total++;
            const qid = section.id + "-" + q.number;
            const input = document.querySelector(
              'input.quiz-input[data-qid="' + qid + '"]'
            );
            if (input && norm(input.value) === norm(q.answer)) {
              correctCount++;
            } else {
              mistakes.push("Câu " + q.number + " (phần 5)");
            }
          });
          break;

        // ---- Reorder / Rewrite ----
        case "reorderAndRewrite":
          (section.questions || []).forEach((q) => {
            total++;
            const qid = section.id + "-" + q.number;
            const hidden = document.querySelector(
              'input[type="hidden"][data-qid="' + qid + '"]'
            );
            const area = document.querySelector(
              'textarea.quiz-textarea[data-qid="' + qid + '"]'
            );
            const userText = hidden ? hidden.value : area ? area.value : "";
            if (!q.answer) {
              mistakes.push(
                "Câu " + q.number + " (phần 6 - thiếu answer trong JSON)"
              );
              return;
            }
            if (norm(userText) === norm(q.answer)) {
              correctCount++;
            } else {
              mistakes.push("Câu " + q.number + " (phần 6)");
            }
          });
          break;
      }
    });

    const scorePercent =
      total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let reward = { xpGain: 0, coinGain: 0, updated: false };
    try {
      reward = await awardStats(scorePercent);
    } catch (e) {
      console.warn("awardStats error:", e);
    }

    const summary = { scorePercent, correctCount, total, mistakes };
    showResultModal(summary, reward);
  }

  // ============================================================
  // 11. CSS phụ cho quiz (tiêm runtime, giữ style đồng bộ)
  // ============================================================
  (function injectQuizStyles() {
    const css = `
    .quiz-title {
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .quiz-subtitle {
      margin-bottom: 8px;
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
    .quiz-wordbank {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    .quiz-wordchip {
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid #d4d4d8;
      background: #eef2ff;
      font-size: 13px;
      cursor: grab;
      user-select: none;
    }
    .quiz-wordchip:active {
      cursor: grabbing;
    }
    .reorder-bank,
    .reorder-dropzone {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 10px;
      border: 1px dashed #d4d4d8;
      min-height: 38px;
      margin-top: 4px;
      background: #f9fafb;
    }
    .reorder-dropzone {
      margin-bottom: 6px;
      background: #eff6ff;
    }
    .reorder-chip {
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid #d4d4d8;
      background: #ffffff;
      font-size: 13px;
      cursor: grab;
      user-select: none;
    }
    .reorder-chip.in-drop {
      background: #e0e7ff;
    }
    .reorder-chip:active {
      cursor: grabbing;
    }
    .quiz-submit-row {
      margin-top: 16px;
      text-align: center;
    }
    .quiz-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .quiz-modal-card {
      background: #ffffff;
      border-radius: 18px;
      padding: 18px 22px 16px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 18px 40px rgba(15,23,42,0.25);
      border: 1px solid #e5e7eb;
      font-size: 14px;
    }
    .quiz-modal-card h3 {
      margin-top: 0;
      margin-bottom: 6px;
    }
    .quiz-modal-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
    }

    /* ====== Style riêng cho mcqOneByOne ====== */
    .mcq-onebyone {
      padding: 8px 0;
    }
    .mcq-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .mcq-choice-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 6px;
      margin-bottom: 4px;
    }
    .quiz-choice-btn {
      width: 100%;
      text-align: left;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid #d4d4d8;
      background: #f9fafb;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.05s ease, box-shadow 0.1s ease;
    }
    .quiz-choice-btn:hover {
      background: #e5e7eb;
      transform: translateY(-1px);
      box-shadow: 0 1px 3px rgba(15,23,42,0.12);
    }
    .quiz-choice-btn.correct {
      background: #dcfce7;
      border-color: #16a34a;
      color: #14532d;
    }
    .quiz-choice-btn.wrong {
      background: #fee2e2;
      border-color: #dc2626;
      color: #7f1d1d;
    }
    .quiz-choice-btn.chosen {
      box-shadow: 0 0 0 1px rgba(37,99,235,0.25);
    }
    .quiz-explain {
      font-size: 13px;
      margin-top: 4px;
      margin-bottom: 8px;
      color: #4b5563;
    }
    .mcq-nav-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      gap: 8px;
    }
    .quiz-nav-btn {
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid #d4d4d8;
      background: #f9fafb;
      font-size: 13px;
      cursor: pointer;
    }
    .quiz-nav-btn.ghost {
      background: #ffffff;
    }
    .quiz-nav-btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
    `;
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  })();

  // ============================================================
  // 12. DOM ready
  // ============================================================
  document.addEventListener("DOMContentLoaded", () => {
    initQuizHeader();
    initQuizEng();
  });
})();
