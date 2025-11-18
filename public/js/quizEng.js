// js/quizEng.js
// Render bài test tiếng Anh từ JSON, chấm điểm và cộng XP/Coin vào Firebase.

(function () {
  // ===== Helper chung =====
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

  // ===== Header: đọc XP/Coin từ Firebase =====
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

  // ===== Khởi động quiz =====
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

  // ===== Render quiz =====
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

  // Đọc nhanh progress để hiển thị “lần làm & bestScore”
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

  // ===== Render từng loại phần =====
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

  // ===== Thưởng XP / Coin =====
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

  // ===== Modal kết quả =====
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

  // ===== Chấm điểm =====
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
        case "mcqOneByOne":
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

  // ===== CSS phụ cho quiz =====
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
    `;
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  })();

  // ===== DOM ready =====
  document.addEventListener("DOMContentLoaded", () => {
    initQuizHeader();
    initQuizEng();
  });
})();
