// public/js/quizEng.js
// Quiz tiếng Anh theo 6 phần – làm từng phần, từng câu + giải thích
// Dùng cho các type: mcqOneByOne, mcqImage, readingMcq, readingDragDrop, wordForm, reorderAndRewrite

(function () {
  // ================== Helpers chung ==================
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

  function norm(str) {
    return (str || "").trim().toLowerCase();
  }

  // ================== Runtime ==================
  const runtime = {
    test: null,              // metadata test hiện tại
    sectionsMeta: [],        // manifest của các section trong test
    sectionsData: {},        // id -> JSON detail
    sectionResults: {},      // id -> {done, correct, total}
    currentTestId: null
  };

  // ================== Firebase thưởng XP / Coin ==================
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
        coinGain = 250; // theo yêu cầu: lần đầu 100% thưởng 250 coin
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

  function showResultModal(summary, reward, onExit) {
    let overlay = document.getElementById("quiz-result-modal");
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.id = "quiz-result-modal";
    overlay.className = "quiz-modal-overlay";

    const card = document.createElement("div");
    card.className = "quiz-modal-card";

    const { scorePercent, correctCount, total } = summary;

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

  // ================== Khởi tạo trang quizEng ==================
  async function initQuizEng() {
    const root = document.getElementById("quiz-eng-root");
    if (!root) return;

    root.textContent = "Đang tải đề kiểm tra...";

    try {
      const testId = getTestIdFromQuery();
      runtime.currentTestId = testId;

      const testsManifest = await loadJson("/content/testsManifest.json");
      const test =
        (testsManifest.tests || []).find((t) => t.id === testId) ||
        (testsManifest.tests || [])[0];

      if (!test) {
        root.textContent = "Không tìm thấy bài kiểm tra.";
        return;
      }

      runtime.test = test;

      const sectionsManifest = await loadJson("/content/sectionsManifest.json");
      const sectionMap = new Map(
        (sectionsManifest.sections || []).map((s) => [s.id, s])
      );

      const sectionsMeta = [];
      for (const secId of test.sections || []) {
        const meta = sectionMap.get(secId);
        if (!meta) continue;
        sectionsMeta.push(meta);

        // Tải JSON từng section
        const data = await loadJson(meta.file);
        runtime.sectionsData[meta.id] = data;

        // Khởi tạo result rỗng
        runtime.sectionResults[meta.id] = {
          done: false,
          correct: 0,
          total: countQuestionsOfSection(data)
        };
      }

      runtime.sectionsMeta = sectionsMeta;

      renderOverview(root);
    } catch (err) {
      console.error(err);
      root.textContent =
        "Có lỗi khi tải đề kiểm tra. Hãy mở DevTools (F12) để xem chi tiết.";
    }
  }

  function countQuestionsOfSection(section) {
    if (!section) return 0;
    switch (section.type) {
      case "mcqOneByOne":
      case "mcqImage":
      case "readingMcq":
      case "wordForm":
      case "reorderAndRewrite":
        return (section.questions || []).length;
      case "readingDragDrop":
        return Object.keys(section.blanks || {}).length;
      default:
        return 0;
    }
  }

  // ================== Overview – danh sách 6 phần ==================
  function renderOverview(root) {
    root.innerHTML = "";

    const title = createEl(
      "h2",
      "quiz-title",
      runtime.test.title || "Bài test tiếng Anh"
    );
    const subtitle = createEl(
      "p",
      "quiz-subtitle",
      "Chọn một phần để bắt đầu làm. Làm xong một phần sẽ được đánh dấu ✓ Hoàn thành."
    );

    const card = createEl("section", "quiz-card");
    const list = createEl("div", "quiz-section-list");

    runtime.sectionsMeta.forEach((meta, idx) => {
      const secData = runtime.sectionsData[meta.id];
      const r = runtime.sectionResults[meta.id] || {
        done: false,
        correct: 0,
        total: countQuestionsOfSection(secData)
      };

      const partCard = createEl("div", "quiz-part-card");
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.gap = "12px";

      const header = createEl("div", "quiz-part-header");
      const titleText =
        meta.label || secData.title || `Phần ${secData.partIndex || idx + 1}`;
      const h = createEl("div", "quiz-part-title", titleText);
      const typeText =
        "Kiểu: " +
        (secData.type || "").toString() +
        " · Số câu: " +
        (r.total || 0);
      const t = createEl("div", "quiz-part-type", typeText);
      header.appendChild(h);
      header.appendChild(t);

      const metaBox = createEl("div", "quiz-part-meta");
      const status = createEl("div", "quiz-part-status");
      if (r.done) {
        status.textContent = `Đã làm – Đúng ${r.correct}/${r.total}`;
        status.classList.add("done");
      } else if (r.correct > 0) {
        status.textContent = `Đang làm dở – Đúng ${r.correct}/${r.total}`;
        status.classList.add("in-progress");
      } else {
        status.textContent = "Chưa làm";
      }

      const btn = createEl(
        "button",
        "main-btn",
        r.done ? "Làm lại phần này" : "Bắt đầu phần này"
      );
      btn.addEventListener("click", () => startSection(root, secData));

      metaBox.appendChild(status);
      metaBox.appendChild(btn);

      row.appendChild(header);
      row.appendChild(metaBox);

      partCard.appendChild(row);
      list.appendChild(partCard);
    });

    const footer = createEl("div", "quiz-overview-footer");
    const finishBtn = createEl("button", "main-btn", "Hoàn thành bài test");
    finishBtn.addEventListener("click", () => finishWholeTest(root));
    footer.appendChild(finishBtn);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(list);
    card.appendChild(footer);
    root.appendChild(card);
  }

  async function finishWholeTest(root) {
    // Tính tổng điểm từ các phần đã làm
    let total = 0;
    let correct = 0;

    Object.values(runtime.sectionResults).forEach((r) => {
      total += r.total || 0;
      correct += r.correct || 0;
    });

    if (!total) {
      alert("Bạn chưa làm phần nào nên chưa có điểm để tính.");
      return;
    }

    const percent = Math.round((correct / total) * 100);

    let reward = { xpGain: 0, coinGain: 0, updated: false };
    try {
      reward = await awardStats(percent);
    } catch (e) {
      console.warn("awardStats error:", e);
    }

    const summary = {
      scorePercent: percent,
      correctCount: correct,
      total
    };

    showResultModal(summary, reward, () => {
      // Sau khi đóng modal, quay lại overview (đề phòng root bị thay đổi)
      renderOverview(root);
    });
  }

  // ================== Điều hướng vào từng phần ==================
  function startSection(root, section) {
    const type = section.type;

    switch (type) {
      case "mcqOneByOne":
        runMcqOneByOneSection(root, section);
        break;
      case "mcqImage":
        runImageMcqSection(root, section);
        break;
      case "readingMcq":
        runReadingMcqSection(root, section);
        break;
      case "readingDragDrop":
        runReadingDragDropSection(root, section); // Phần 4 mới
        break;
      case "wordForm":
        runWordFormSection(root, section);
        break;
      case "reorderAndRewrite":
        runReorderSection(root, section);
        break;
      default:
        alert("Chưa hỗ trợ kiểu phần: " + type);
        renderOverview(root);
    }
  }

  function updateSectionResult(sectionId, deltaCorrect, deltaTotal) {
    const r = runtime.sectionResults[sectionId] || {
      done: false,
      correct: 0,
      total: 0
    };
    r.correct += deltaCorrect;
    r.total = r.total || deltaTotal;
    runtime.sectionResults[sectionId] = r;
  }

  function markSectionDone(sectionId) {
    const r = runtime.sectionResults[sectionId] || {
      done: false,
      correct: 0,
      total: 0
    };
    r.done = true;
    runtime.sectionResults[sectionId] = r;
  }

  // ============================================================
  // =============== PHẦN 1 – MCQ ONE BY ONE ====================
  // ============================================================
  function runMcqOneByOneSection(root, section) {
    const questions = section.questions || [];
    const total = questions.length;
    const secId = section.id;

    let index = 0;
    let answeredMap = {}; // number -> {chosenIdx, isCorrect}

    function renderStep() {
      root.innerHTML = "";

      const card = createEl("section", "quiz-step-card");
      const backRow = createEl("div", "quiz-step-backrow");
      const backBtn = createEl("button", "sub-btn", "⬅ Về danh sách phần");
      backBtn.addEventListener("click", () => renderOverview(root));
      backRow.appendChild(backBtn);

      const title = createEl(
        "h3",
        "quiz-step-title",
        section.title || "Phần 1 - Trắc nghiệm"
      );
      const subtitle = createEl(
        "p",
        "quiz-step-subtitle",
        `Câu ${index + 1} / ${total}`
      );

      const q = questions[index];
      const qBox = createEl("div", "quiz-question");
      const qText = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text || ""}`
      );
      qBox.appendChild(qText);

      const optionsWrap = createEl("div", "quiz-options-wrap");
      let selectedIdx = answeredMap[q.number]?.chosenIdx ?? null;
      let checked = answeredMap[q.number]?.checked ?? false;
      let isCorrect = answeredMap[q.number]?.isCorrect ?? false;

      const explanationBox = createEl("div", "quiz-explain-box");
      explanationBox.style.display = "none";

      (q.options || []).forEach((opt, idx) => {
        const row = createEl("label", "quiz-option-row");
        if (idx === selectedIdx) row.classList.add("is-selected");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "qOpt";
        input.value = String(idx);
        if (idx === selectedIdx) input.checked = true;

        row.appendChild(input);
        row.appendChild(document.createTextNode(" " + opt));

        row.addEventListener("click", () => {
          if (checked) return; // đã chấm rồi thì không cho đổi
          selectedIdx = idx;
          const allRows = optionsWrap.querySelectorAll(".quiz-option-row");
          allRows.forEach((r) => r.classList.remove("is-selected"));
          row.classList.add("is-selected");
        });

        optionsWrap.appendChild(row);
      });

      qBox.appendChild(optionsWrap);

      const navRow = createEl("div", "quiz-step-navrow");
      const progressText = createEl(
        "div",
        "quiz-progress-text",
        ""
      );
      const checkBtn = createEl(
        "button",
        "main-btn",
        checked ? "Đã kiểm tra" : "Kiểm tra đáp án"
      );
      const nextBtn = createEl(
        "button",
        "main-btn",
        index === total - 1 ? "Kết thúc phần này" : "Câu tiếp theo ➜"
      );
      nextBtn.disabled = !checked;

      checkBtn.addEventListener("click", () => {
        if (checked) return;
        if (selectedIdx == null) {
          alert("Bạn hãy chọn một đáp án trước.");
          return;
        }
        checked = true;
        const correctIdx = q.correct;
        isCorrect = String(selectedIdx) === String(correctIdx);

        // Cập nhật thống kê phần
        const r = runtime.sectionResults[secId];
        if (!answeredMap[q.number]) {
          // trả lời lần đầu
          if (isCorrect) {
            r.correct += 1;
          }
        } else {
          // nếu đã có, cần điều chỉnh lại (phòng trường hợp làm lại phần)
          if (answeredMap[q.number].isCorrect && !isCorrect) {
            r.correct -= 1;
          } else if (!answeredMap[q.number].isCorrect && isCorrect) {
            r.correct += 1;
          }
        }

        answeredMap[q.number] = {
          chosenIdx: selectedIdx,
          checked: true,
          isCorrect
        };

        // highlight
        const allRows = optionsWrap.querySelectorAll(".quiz-option-row");
        allRows.forEach((row, idx) => {
          row.classList.remove("is-correct");
          if (idx === correctIdx) row.classList.add("is-correct");
        });

        // giải thích
        explanationBox.style.display = "block";
        explanationBox.innerHTML = "";
        const titleLine = createEl(
          "div",
          "explain-title",
          isCorrect ? "✓ Chính xác!" : "✗ Chưa chính xác."
        );
        explanationBox.appendChild(titleLine);

        if (!isCorrect) {
          const corr = createEl(
            "div",
            null,
            "Đáp án đúng là: " + (q.options?.[correctIdx] ?? "")
          );
          explanationBox.appendChild(corr);
        }

        const exText = q.explanation || q.explain;
        if (exText) {
          const ex = createEl("div", null, exText);
          explanationBox.appendChild(ex);
        }

        checkBtn.textContent = "Đã kiểm tra";
        nextBtn.disabled = false;

        const r2 = runtime.sectionResults[secId];
        progressText.textContent = `Đúng ${r2.correct}/${r2.total}`;
      });

      nextBtn.addEventListener("click", () => {
        if (!checked) return;
        if (index < total - 1) {
          index++;
          renderStep();
        } else {
          markSectionDone(secId);
          renderOverview(root);
        }
      });

      navRow.appendChild(progressText);
      navRow.appendChild(checkBtn);
      navRow.appendChild(nextBtn);

      card.appendChild(backRow);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(qBox);
      card.appendChild(explanationBox);
      card.appendChild(navRow);

      root.appendChild(card);
    }

    // đặt lại số đúng về 0 khi làm lại phần
    runtime.sectionResults[secId].correct = 0;
    renderStep();
  }

  // ============================================================
  // =============== PHẦN 2 – MCQ HÌNH ẢNH ======================
  // ============================================================
  function runImageMcqSection(root, section) {
    const questions = section.questions || [];
    const total = questions.length;
    const secId = section.id;
    const IMAGE_BASE = "/assets/content";

    let index = 0;
    let answeredMap = {};

    runtime.sectionResults[secId].correct = 0;

    function renderStep() {
      root.innerHTML = "";

      const card = createEl("section", "quiz-step-card");
      const backRow = createEl("div", "quiz-step-backrow");
      const backBtn = createEl("button", "sub-btn", "⬅ Về danh sách phần");
      backBtn.addEventListener("click", () => renderOverview(root));
      backRow.appendChild(backBtn);

      const title = createEl(
        "h3",
        "quiz-step-title",
        section.title || "Phần 2 - Nhìn hình trả lời câu hỏi"
      );
      const subtitle = createEl(
        "p",
        "quiz-step-subtitle",
        `Câu ${index + 1} / ${total}`
      );

      const q = questions[index];
      const qBox = createEl("div", "quiz-question");

      if (q.imageFile) {
        const img = document.createElement("img");
        img.src = IMAGE_BASE + "/" + q.imageFile;
        img.alt = "Câu " + q.number;
        img.className = "quiz-image";
        qBox.appendChild(img);
      }

      const qText = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text || ""}`
      );
      qBox.appendChild(qText);

      const optionsWrap = createEl("div", "quiz-options-wrap");
      let selectedIdx = answeredMap[q.number]?.chosenIdx ?? null;
      let checked = answeredMap[q.number]?.checked ?? false;
      let isCorrect = answeredMap[q.number]?.isCorrect ?? false;

      const explanationBox = createEl("div", "quiz-explain-box");
      explanationBox.style.display = "none";

      (q.options || []).forEach((opt, idx) => {
        const row = createEl("label", "quiz-option-row");
        if (idx === selectedIdx) row.classList.add("is-selected");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "qOpt";
        input.value = String(idx);
        if (idx === selectedIdx) input.checked = true;

        row.appendChild(input);
        row.appendChild(document.createTextNode(" " + opt));

        row.addEventListener("click", () => {
          if (checked) return;
          selectedIdx = idx;
          const allRows = optionsWrap.querySelectorAll(".quiz-option-row");
          allRows.forEach((r) => r.classList.remove("is-selected"));
          row.classList.add("is-selected");
        });

        optionsWrap.appendChild(row);
      });

      qBox.appendChild(optionsWrap);

      const navRow = createEl("div", "quiz-step-navrow");
      const progressText = createEl("div", "quiz-progress-text", "");
      const checkBtn = createEl(
        "button",
        "main-btn",
        checked ? "Đã kiểm tra" : "Kiểm tra đáp án"
      );
      const nextBtn = createEl(
        "button",
        "main-btn",
        index === total - 1 ? "Kết thúc phần này" : "Câu tiếp theo ➜"
      );
      nextBtn.disabled = !checked;

      checkBtn.addEventListener("click", () => {
        if (checked) return;
        if (selectedIdx == null) {
          alert("Bạn hãy chọn một đáp án trước.");
          return;
        }
        checked = true;
        const correctIdx = q.correct;
        isCorrect = String(selectedIdx) === String(correctIdx);

        const r = runtime.sectionResults[secId];
        if (!answeredMap[q.number]) {
          if (isCorrect) r.correct += 1;
        } else {
          if (answeredMap[q.number].isCorrect && !isCorrect) r.correct -= 1;
          else if (!answeredMap[q.number].isCorrect && isCorrect) r.correct += 1;
        }

        answeredMap[q.number] = {
          chosenIdx: selectedIdx,
          checked: true,
          isCorrect
        };

        const allRows = optionsWrap.querySelectorAll(".quiz-option-row");
        allRows.forEach((row, idx) => {
          row.classList.remove("is-correct");
          if (idx === correctIdx) row.classList.add("is-correct");
        });

        explanationBox.style.display = "block";
        explanationBox.innerHTML = "";
        const titleLine = createEl(
          "div",
          "explain-title",
          isCorrect ? "✓ Chính xác!" : "✗ Chưa chính xác."
        );
        explanationBox.appendChild(titleLine);

        if (!isCorrect) {
          const corr = createEl(
            "div",
            null,
            "Đáp án đúng là: " + (q.options?.[correctIdx] ?? "")
          );
          explanationBox.appendChild(corr);
        }

        const exText = q.explanation || q.explain;
        if (exText) {
          const ex = createEl("div", null, exText);
          explanationBox.appendChild(ex);
        }

        checkBtn.textContent = "Đã kiểm tra";
        nextBtn.disabled = false;

        const r2 = runtime.sectionResults[secId];
        progressText.textContent = `Đúng ${r2.correct}/${r2.total}`;
      });

      nextBtn.addEventListener("click", () => {
        if (!checked) return;
        if (index < total - 1) {
          index++;
          renderStep();
        } else {
          markSectionDone(secId);
          renderOverview(root);
        }
      });

      navRow.appendChild(progressText);
      navRow.appendChild(checkBtn);
      navRow.appendChild(nextBtn);

      card.appendChild(backRow);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(qBox);
      card.appendChild(explanationBox);
      card.appendChild(navRow);

      root.appendChild(card);
    }

    renderStep();
  }

  // ============================================================
  // =============== PHẦN 3 – READING MCQ =======================
  // ============================================================
  function runReadingMcqSection(root, section) {
    const questions = section.questions || [];
    const total = questions.length;
    const secId = section.id;

    let index = 0;
    let answeredMap = {};

    runtime.sectionResults[secId].correct = 0;

    function renderStep() {
      root.innerHTML = "";

      const card = createEl("section", "quiz-step-card");
      const backRow = createEl("div", "quiz-step-backrow");
      const backBtn = createEl("button", "sub-btn", "⬅ Về danh sách phần");
      backBtn.addEventListener("click", () => renderOverview(root));
      backRow.appendChild(backBtn);

      const title = createEl(
        "h3",
        "quiz-step-title",
        section.title || "Phần 3 - Đọc đoạn văn và trả lời câu hỏi"
      );
      const subtitle = createEl(
        "p",
        "quiz-step-subtitle",
        `Câu ${index + 1} / ${total}`
      );

      const passageBox = createEl("div", "reading-passage-box");
      passageBox.innerHTML = (section.passage || "").replace(/\n/g, "<br>");
      const q = questions[index];

      const qBox = createEl("div", "reading-question-box");
      const qText = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text || ""}`
      );
      qBox.appendChild(qText);

      const optionsWrap = createEl("div", "quiz-options-wrap");
      let selectedValue = answeredMap[q.number]?.chosen ?? null;
      let checked = answeredMap[q.number]?.checked ?? false;
      let isCorrect = answeredMap[q.number]?.isCorrect ?? false;

      const explanationBox = createEl("div", "quiz-explain-box");
      explanationBox.style.display = "none";

      if (q.kind === "tf") {
        ["True", "False"].forEach((label, idx) => {
          const val = idx === 0 ? "true" : "false";
          const row = createEl("label", "quiz-option-row");
          const input = document.createElement("input");
          input.type = "radio";
          input.name = "qOpt";
          input.value = val;
          if (selectedValue === val) {
            input.checked = true;
            row.classList.add("is-selected");
          }

          row.appendChild(input);
          row.appendChild(document.createTextNode(" " + label));

          row.addEventListener("click", () => {
            if (checked) return;
            selectedValue = val;
            const all = optionsWrap.querySelectorAll(".quiz-option-row");
            all.forEach((r) => r.classList.remove("is-selected"));
            row.classList.add("is-selected");
          });

          optionsWrap.appendChild(row);
        });
      } else {
        (q.options || []).forEach((opt, idx) => {
          const row = createEl("label", "quiz-option-row");
          const input = document.createElement("input");
          input.type = "radio";
          input.name = "qOpt";
          input.value = String(idx);
          if (selectedValue === String(idx)) {
            input.checked = true;
            row.classList.add("is-selected");
          }

          row.appendChild(input);
          row.appendChild(document.createTextNode(" " + opt));

          row.addEventListener("click", () => {
            if (checked) return;
            selectedValue = String(idx);
            const all = optionsWrap.querySelectorAll(".quiz-option-row");
            all.forEach((r) => r.classList.remove("is-selected"));
            row.classList.add("is-selected");
          });

          optionsWrap.appendChild(row);
        });
      }

      qBox.appendChild(optionsWrap);

      const navRow = createEl("div", "quiz-step-navrow");
      const progressText = createEl("div", "quiz-progress-text", "");
      const checkBtn = createEl(
        "button",
        "main-btn",
        checked ? "Đã kiểm tra" : "Kiểm tra đáp án"
      );
      const nextBtn = createEl(
        "button",
        "main-btn",
        index === total - 1 ? "Kết thúc phần này" : "Câu tiếp theo ➜"
      );
      nextBtn.disabled = !checked;

      checkBtn.addEventListener("click", () => {
        if (checked) return;
        if (selectedValue == null) {
          alert("Bạn hãy chọn một đáp án trước.");
          return;
        }
        checked = true;

        if (q.kind === "tf") {
          const val = selectedValue === "true";
          isCorrect = val === q.correct;
        } else {
          isCorrect = String(selectedValue) === String(q.correct);
        }

        const r = runtime.sectionResults[secId];
        if (!answeredMap[q.number]) {
          if (isCorrect) r.correct += 1;
        } else {
          if (answeredMap[q.number].isCorrect && !isCorrect) r.correct -= 1;
          else if (!answeredMap[q.number].isCorrect && isCorrect) r.correct += 1;
        }

        answeredMap[q.number] = {
          chosen: selectedValue,
          checked: true,
          isCorrect
        };

        explanationBox.style.display = "block";
        explanationBox.innerHTML = "";
        const titleLine = createEl(
          "div",
          "explain-title",
          isCorrect ? "✓ Chính xác!" : "✗ Chưa chính xác."
        );
        explanationBox.appendChild(titleLine);

        if (!isCorrect) {
          let corrText = "";
          if (q.kind === "tf") corrText = q.correct ? "True" : "False";
          else corrText = q.options?.[q.correct] ?? "";
          explanationBox.appendChild(
            createEl("div", null, "Đáp án đúng là: " + corrText)
          );
        }

        const exText = q.explanation || q.explain;
        if (exText) explanationBox.appendChild(createEl("div", null, exText));

        checkBtn.textContent = "Đã kiểm tra";
        nextBtn.disabled = false;

        const r2 = runtime.sectionResults[secId];
        progressText.textContent = `Đúng ${r2.correct}/${r2.total}`;
      });

      nextBtn.addEventListener("click", () => {
        if (!checked) return;
        if (index < total - 1) {
          index++;
          renderStep();
        } else {
          markSectionDone(secId);
          renderOverview(root);
        }
      });

      navRow.appendChild(progressText);
      navRow.appendChild(checkBtn);
      navRow.appendChild(nextBtn);

      card.appendChild(backRow);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(passageBox);
      card.appendChild(qBox);
      card.appendChild(explanationBox);
      card.appendChild(navRow);

      root.appendChild(card);
    }

    renderStep();
  }

  // ============================================================
  // =============== PHẦN 4 – READING DRAG / DROP ===============
  // ============================================================
  // JSON cần: passage có __1__, __2__, ...
  // blanks: { "1": "từ đúng", "2": "..." }
  // wordBank: ["...", ...] (tùy chọn)
  function runReadingDragDropSection(root, section) {
    const blanks = section.blanks || {};
    const blankNums = Object.keys(blanks).sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10)
    );
    const total = blankNums.length;
    const secId = section.id;

    let index = 0;
    let answeredMap = {}; // num -> {answer, isCorrect}

    runtime.sectionResults[secId].correct = 0;

    function buildPassageHtml(focusNum, answersMap) {
      let html = section.passage || "";

      // Thay từng __n__
      Object.keys(blanks).forEach((num) => {
        const re = new RegExp("__" + num + "__", "g");
        let replacement = "";

        if (num === focusNum) {
          // Ô đang làm: input
          replacement =
            '<input type="text" class="quiz-blank" data-blank="' +
            num +
            '" size="10" />';
        } else {
          const answered = answersMap[num]?.answer;
          if (answered) {
            replacement =
              '<span class="quiz-blank-static">' +
              answered +
              "</span>";
          } else {
            replacement =
              '<span class="quiz-blank-static">____(' +
              num +
              ")____</span>";
          }
        }

        html = html.replace(re, replacement);
      });

      return html.replace(/\n/g, "<br>");
    }

    function renderStep() {
      const num = blankNums[index];
      const correctWord = blanks[num];

      root.innerHTML = "";

      const card = createEl("section", "quiz-step-card");
      const backRow = createEl("div", "quiz-step-backrow");
      const backBtn = createEl("button", "sub-btn", "⬅ Về danh sách phần");
      backBtn.addEventListener("click", () => renderOverview(root));
      backRow.appendChild(backBtn);

      const title = createEl(
        "h3",
        "quiz-step-title",
        section.title || "Phần 4 - Đọc đoạn văn và điền vào chỗ trống"
      );
      const subtitle = createEl(
        "p",
        "quiz-step-subtitle",
        `Chỗ trống ${index + 1} / ${total}`
      );

      const passageBox = createEl("div", "reading-passage-box");
      passageBox.innerHTML = buildPassageHtml(num, answeredMap);

      const hint = createEl(
        "p",
        "quiz-hint",
        "Hãy điền từ thích hợp vào chỗ trống số " + num + "."
      );

      // Thanh gợi ý từ (nếu có wordBank)
      let bankDiv = null;
      if (Array.isArray(section.wordBank) && section.wordBank.length > 0) {
        bankDiv = createEl("div", "quiz-wordbank");
        section.wordBank.forEach((w) => {
          const chip = createEl("span", "quiz-wordchip", w);
          chip.draggable = true;
          chip.dataset.word = w;
          chip.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", w);
          });
          chip.addEventListener("click", () => {
            const input = passageBox.querySelector(
              'input.quiz-blank[data-blank="' + num + '"]'
            );
            if (input) input.value = w;
          });
          bankDiv.appendChild(chip);
        });
      }

      const explanationBox = createEl("div", "quiz-explain-box");
      explanationBox.style.display = "none";

      // Bắt sự kiện drop vào input
      const blankInput = () =>
        passageBox.querySelector('input.quiz-blank[data-blank="' + num + '"]');

      const inp = blankInput();
      if (inp) {
        inp.addEventListener("dragover", (e) => e.preventDefault());
        inp.addEventListener("drop", (e) => {
          e.preventDefault();
          const word = e.dataTransfer.getData("text/plain");
          if (word) inp.value = word;
        });
      }

      let checked = false;
      let isCorrect = false;

      const navRow = createEl("div", "quiz-step-navrow");
      const progressText = createEl("div", "quiz-progress-text", "");
      const checkBtn = createEl("button", "main-btn", "Kiểm tra đáp án");
      const nextBtn = createEl(
        "button",
        "main-btn",
        index === total - 1 ? "Kết thúc phần này" : "Chỗ trống tiếp theo ➜"
      );
      nextBtn.disabled = true;

      checkBtn.addEventListener("click", () => {
        if (checked) return;
        const inputEl = blankInput();
        const userAns = inputEl ? inputEl.value : "";
        if (!userAns.trim()) {
          alert("Bạn hãy điền từ vào chỗ trống trước.");
          return;
        }
        checked = true;

        isCorrect = norm(userAns) === norm(correctWord);

        const r = runtime.sectionResults[secId];
        if (!answeredMap[num]) {
          if (isCorrect) r.correct += 1;
        } else {
          if (answeredMap[num].isCorrect && !isCorrect) r.correct -= 1;
          else if (!answeredMap[num].isCorrect && isCorrect) r.correct += 1;
        }

        answeredMap[num] = {
          answer: userAns,
          isCorrect
        };

        if (inputEl) {
          inputEl.classList.add(
            isCorrect ? "quiz-blank-correct" : "quiz-blank-wrong"
          );
        }

        explanationBox.style.display = "block";
        explanationBox.innerHTML = "";
        const titleLine = createEl(
          "div",
          "explain-title",
          isCorrect ? "✓ Chính xác!" : "✗ Chưa chính xác."
        );
        explanationBox.appendChild(titleLine);

        if (!isCorrect) {
          explanationBox.appendChild(
            createEl("div", null, "Đáp án đúng là: " + correctWord)
          );
        }

        const exText =
          (section.explanations && section.explanations[num]) || "";
        if (exText) explanationBox.appendChild(createEl("div", null, exText));

        checkBtn.textContent = "Đã kiểm tra";
        nextBtn.disabled = false;

        const r2 = runtime.sectionResults[secId];
        progressText.textContent = `Đúng ${r2.correct}/${r2.total}`;
      });

      nextBtn.addEventListener("click", () => {
        if (!checked) return;
        if (index < total - 1) {
          index++;
          renderStep();
        } else {
          markSectionDone(secId);
          renderOverview(root);
        }
      });

      navRow.appendChild(progressText);
      navRow.appendChild(checkBtn);
      navRow.appendChild(nextBtn);

      card.appendChild(backRow);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(passageBox);
      card.appendChild(hint);
      if (bankDiv) card.appendChild(bankDiv);
      card.appendChild(explanationBox);
      card.appendChild(navRow);

      root.appendChild(card);
    }

    renderStep();
  }

  // ============================================================
  // =============== PHẦN 5 – WORDFORM (nhập từ) ================
  // ============================================================
  function runWordFormSection(root, section) {
    const questions = section.questions || [];
    const total = questions.length;
    const secId = section.id;

    let index = 0;
    let answeredMap = {};

    runtime.sectionResults[secId].correct = 0;

    function renderStep() {
      root.innerHTML = "";

      const card = createEl("section", "quiz-step-card");
      const backRow = createEl("div", "quiz-step-backrow");
      const backBtn = createEl("button", "sub-btn", "⬅ Về danh sách phần");
      backBtn.addEventListener("click", () => renderOverview(root));
      backRow.appendChild(backBtn);

      const title = createEl(
        "h3",
        "quiz-step-title",
        section.title || "Phần 5 - Chọn đúng dạng của từ"
      );
      const subtitle = createEl(
        "p",
        "quiz-step-subtitle",
        `Câu ${index + 1} / ${total}`
      );

      const q = questions[index];
      const qBox = createEl("div", "quiz-question");
      const qText = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.text || ""}`
      );
      qBox.appendChild(qText);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "quiz-input";
      if (answeredMap[q.number]?.answer) {
        input.value = answeredMap[q.number].answer;
      }
      qBox.appendChild(input);

      const explanationBox = createEl("div", "quiz-explain-box");
      explanationBox.style.display = "none";

      let checked = answeredMap[q.number]?.checked ?? false;
      let isCorrect = answeredMap[q.number]?.isCorrect ?? false;

      const navRow = createEl("div", "quiz-step-navrow");
      const progressText = createEl("div", "quiz-progress-text", "");
      const checkBtn = createEl(
        "button",
        "main-btn",
        checked ? "Đã kiểm tra" : "Kiểm tra đáp án"
      );
      const nextBtn = createEl(
        "button",
        "main-btn",
        index === total - 1 ? "Kết thúc phần này" : "Câu tiếp theo ➜"
      );
      nextBtn.disabled = !checked;

      checkBtn.addEventListener("click", () => {
        if (checked) return;
        const ans = input.value || "";
        if (!ans.trim()) {
          alert("Bạn hãy nhập đáp án trước.");
          return;
        }
        checked = true;

        isCorrect = norm(ans) === norm(q.answer);

        const r = runtime.sectionResults[secId];
        if (!answeredMap[q.number]) {
          if (isCorrect) r.correct += 1;
        } else {
          if (answeredMap[q.number].isCorrect && !isCorrect) r.correct -= 1;
          else if (!answeredMap[q.number].isCorrect && isCorrect) r.correct += 1;
        }

        answeredMap[q.number] = {
          answer: ans,
          checked: true,
          isCorrect
        };

        if (!isCorrect) input.classList.add("quiz-input-wrong");
        else input.classList.remove("quiz-input-wrong");

        explanationBox.style.display = "block";
        explanationBox.innerHTML = "";
        const titleLine = createEl(
          "div",
          "explain-title",
          isCorrect ? "✓ Chính xác!" : "✗ Chưa chính xác."
        );
        explanationBox.appendChild(titleLine);

        if (!isCorrect) {
          explanationBox.appendChild(
            createEl("div", null, "Đáp án đúng là: " + (q.answer || ""))
          );
        }

        const exText = q.explanation || q.explain;
        if (exText) explanationBox.appendChild(createEl("div", null, exText));

        checkBtn.textContent = "Đã kiểm tra";
        nextBtn.disabled = false;

        const r2 = runtime.sectionResults[secId];
        progressText.textContent = `Đúng ${r2.correct}/${r2.total}`;
      });

      nextBtn.addEventListener("click", () => {
        if (!checked) return;
        if (index < total - 1) {
          index++;
          renderStep();
        } else {
          markSectionDone(secId);
          renderOverview(root);
        }
      });

      navRow.appendChild(progressText);
      navRow.appendChild(checkBtn);
      navRow.appendChild(nextBtn);

      card.appendChild(backRow);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(qBox);
      card.appendChild(explanationBox);
      card.appendChild(navRow);

      root.appendChild(card);
    }

    renderStep();
  }

  // ============================================================
  // =============== PHẦN 6 – REORDER / REWRITE =================
  // ============================================================
  function runReorderSection(root, section) {
    const questions = section.questions || [];
    const total = questions.length;
    const secId = section.id;

    let index = 0;
    let answeredMap = {};

    runtime.sectionResults[secId].correct = 0;

    function renderStep() {
      root.innerHTML = "";

      const card = createEl("section", "quiz-step-card");
      const backRow = createEl("div", "quiz-step-backrow");
      const backBtn = createEl("button", "sub-btn", "⬅ Về danh sách phần");
      backBtn.addEventListener("click", () => renderOverview(root));
      backRow.appendChild(backBtn);

      const title = createEl(
        "h3",
        "quiz-step-title",
        section.title || "Phần 6 - Ghép câu và viết lại câu"
      );
      const subtitle = createEl(
        "p",
        "quiz-step-subtitle",
        `Câu ${index + 1} / ${total}`
      );

      const q = questions[index];
      const qBox = createEl("div", "quiz-question");
      const qText = createEl(
        "p",
        "quiz-question-text",
        `Câu ${q.number}. ${q.prompt || ""}`
      );
      qBox.appendChild(qText);

      let inputEl;
      if (Array.isArray(q.chunks) && q.chunks.length > 0) {
        const hint = createEl(
          "p",
          "quiz-hint",
          "Kéo các cụm từ bên dưới vào ô trên để xếp thành câu hoàn chỉnh."
        );
        qBox.appendChild(hint);

        const dropZone = createEl("div", "reorder-dropzone");
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

        dropZone.addEventListener("dragover", (e) => e.preventDefault());
        dropZone.addEventListener("drop", (e) => {
          e.preventDefault();
          const text = e.dataTransfer.getData("text/plain");
          if (!text) return;
          const chip = createEl("span", "reorder-chip in-drop", text);
          dropZone.appendChild(chip);
          updateHidden();
        });

        dropZone.addEventListener("click", (e) => {
          if (e.target.classList.contains("reorder-chip")) {
            e.target.remove();
            updateHidden();
          }
        });

        inputEl = document.createElement("input");
        inputEl.type = "hidden";

        function updateHidden() {
          const parts = Array.from(
            dropZone.querySelectorAll(".reorder-chip")
          ).map((el) => el.textContent.trim());
          inputEl.value = parts.join(" ");
        }

        qBox.appendChild(dropZone);
        qBox.appendChild(bank);
        qBox.appendChild(inputEl);
      } else {
        const area = document.createElement("textarea");
        area.className = "quiz-textarea";
        area.rows = 2;
        if (answeredMap[q.number]?.answer) {
          area.value = answeredMap[q.number].answer;
        }
        qBox.appendChild(area);
        inputEl = area;
      }

      const explanationBox = createEl("div", "quiz-explain-box");
      explanationBox.style.display = "none";

      let checked = answeredMap[q.number]?.checked ?? false;
      let isCorrect = answeredMap[q.number]?.isCorrect ?? false;

      const navRow = createEl("div", "quiz-step-navrow");
      const progressText = createEl("div", "quiz-progress-text", "");
      const checkBtn = createEl(
        "button",
        "main-btn",
        checked ? "Đã kiểm tra" : "Kiểm tra đáp án"
      );
      const nextBtn = createEl(
        "button",
        "main-btn",
        index === total - 1 ? "Kết thúc phần này" : "Câu tiếp theo ➜"
      );
      nextBtn.disabled = !checked;

      checkBtn.addEventListener("click", () => {
        if (checked) return;
        const ans = inputEl.value || "";
        if (!ans.trim()) {
          alert("Bạn hãy nhập/xếp câu trước.");
          return;
        }
        checked = true;

        isCorrect = norm(ans) === norm(q.answer);

        const r = runtime.sectionResults[secId];
        if (!answeredMap[q.number]) {
          if (isCorrect) r.correct += 1;
        } else {
          if (answeredMap[q.number].isCorrect && !isCorrect) r.correct -= 1;
          else if (!answeredMap[q.number].isCorrect && isCorrect) r.correct += 1;
        }

        answeredMap[q.number] = {
          answer: ans,
          checked: true,
          isCorrect
        };

        if (!isCorrect && inputEl.classList) {
          inputEl.classList.add("reorder-dropzone-wrong");
        }

        explanationBox.style.display = "block";
        explanationBox.innerHTML = "";
        const titleLine = createEl(
          "div",
          "explain-title",
          isCorrect ? "✓ Chính xác!" : "✗ Chưa chính xác."
        );
        explanationBox.appendChild(titleLine);

        if (!isCorrect) {
          explanationBox.appendChild(
            createEl("div", null, "Đáp án đúng là: " + (q.answer || ""))
          );
        }

        const exText = q.explanation || q.explain;
        if (exText) explanationBox.appendChild(createEl("div", null, exText));

        checkBtn.textContent = "Đã kiểm tra";
        nextBtn.disabled = false;

        const r2 = runtime.sectionResults[secId];
        progressText.textContent = `Đúng ${r2.correct}/${r2.total}`;
      });

      nextBtn.addEventListener("click", () => {
        if (!checked) return;
        if (index < total - 1) {
          index++;
          renderStep();
        } else {
          markSectionDone(secId);
          renderOverview(root);
        }
      });

      navRow.appendChild(progressText);
      navRow.appendChild(checkBtn);
      navRow.appendChild(nextBtn);

      card.appendChild(backRow);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(qBox);
      card.appendChild(explanationBox);
      card.appendChild(navRow);

      root.appendChild(card);
    }

    renderStep();
  }

  // ================== DOMContentLoaded ==================
  document.addEventListener("DOMContentLoaded", () => {
    initQuizEng();
  });
})();
