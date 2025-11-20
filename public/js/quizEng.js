// js/quizEng.js
// Render bài test tiếng Anh từ JSON (6 phần), làm từng câu một, có giải thích.

// Toàn bộ code gói trong IIFE để không rò rỉ biến global
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

  function norm(s) {
    return (s || "").trim().toLowerCase();
  }

  // ============================================================
  // 2. Header: đọc XP/Coin từ Firebase (giống bản cũ của bạn)
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
  // 3. Runtime cho cả bài test
  // ============================================================

  const runtime = {
    root: null,
    testMeta: null,          // object trong testsManifest
    sectionMetas: [],        // mảng meta trong sectionsManifest
    sectionData: {},         // id -> data JSON (P1_001.json,...)
    sectionStates: [],       // per section: {done, answers:[], total}
    currentSectionIndex: -1,
    currentQuestionIndex: -1
  };

  // ============================================================
  // 4. Khởi động trang quiz
  // ============================================================

  async function initQuizEng() {
    const root =
      document.getElementById("quiz-eng-root") ||
      document.getElementById("quizRoot") ||
      document.getElementById("quizApp");

    if (!root) {
      console.warn("[quizEng] Không tìm thấy #quiz-eng-root");
      return;
    }
    runtime.root = root;
    root.textContent = "Đang tải đề kiểm tra...";

    try {
      const testId = getTestIdFromQuery();

      // 4.1. Đọc manifest bài test
      const testsManifest = await loadJson("/content/testsManifest.json");
      const tests = testsManifest.tests || [];
      const testMeta =
        tests.find((t) => t.id === testId) || tests[0];

      if (!testMeta) {
        root.textContent = "Không tìm thấy bài kiểm tra.";
        return;
      }
      runtime.testMeta = testMeta;

      // 4.2. Đọc manifest sections
      const sectionsManifest = await loadJson("/content/sectionsManifest.json");
      const sectionMap = new Map(
        (sectionsManifest.sections || []).map((s) => [s.id, s])
      );

      const sectionMetas = [];
      const sectionIds = testMeta.sections || testMeta.sectionIds || [];
      sectionIds.forEach((id) => {
        const meta = sectionMap.get(id);
        if (meta) sectionMetas.push(meta);
      });

      if (!sectionMetas.length) {
        root.textContent =
          "Không tìm thấy danh sách phần cho bài test này (kiểm tra testsManifest & sectionsManifest).";
        return;
      }
      runtime.sectionMetas = sectionMetas;

      // 4.3. Load dữ liệu từng phần
      runtime.sectionData = {};
      runtime.sectionStates = [];
      for (const meta of sectionMetas) {
        const data = await loadJson(meta.file);
        runtime.sectionData[meta.id] = data;
        runtime.sectionStates.push({
          id: meta.id,
          done: false,
          total: countQuestionsInSection(data),
          answers: [] // mỗi phần tử: {number, correct:true/false}
        });
      }

      // 4.4. Hiển thị danh sách phần
      renderSectionsOverview();
    } catch (err) {
      console.error(err);
      runtime.root.innerHTML =
        "<p>Có lỗi khi tải đề kiểm tra. Kiểm tra lại đường dẫn JSON hoặc mở F12 để xem chi tiết.</p>";
    }
  }

  function countQuestionsInSection(sectionData) {
    if (!sectionData) return 0;
    if (Array.isArray(sectionData.questions)) return sectionData.questions.length;
    if (sectionData.type === "readingDragDrop" && sectionData.blanks) {
      return Object.keys(sectionData.blanks).length;
    }
    return 0;
  }

  // ============================================================
  // 5. Màn danh sách phần
  // ============================================================

  function renderSectionsOverview() {
    const root = runtime.root;
    root.innerHTML = "";

    const h = createEl(
      "h2",
      "quiz-title",
      runtime.testMeta.title || "English Quiz"
    );
    root.appendChild(h);

    const note = createEl(
      "p",
      "quiz-subtitle",
      "Chọn một phần để bắt đầu. Làm xong một phần sẽ được đánh dấu ✔ Hoàn thành."
    );
    root.appendChild(note);

    const list = createEl("div", "quiz-card");
    root.appendChild(list);

    runtime.sectionMetas.forEach((meta, idx) => {
      const state = runtime.sectionStates[idx] || { done: false, total: 0 };
      const data = runtime.sectionData[meta.id];

      const box = createEl("div", "quiz-section");
      const title = createEl(
        "h3",
        "quiz-section-title",
        meta.label || data.title || "Phần " + (meta.partIndex || idx + 1)
      );
      box.appendChild(title);

      const info = createEl(
        "p",
        "quiz-hint",
        `Kiểu: ${data.type || "unknown"} · Số câu: ${state.total}`
      );
      box.appendChild(info);

      const status = createEl(
        "p",
        "quiz-hint",
        state.done ? "✔ Đã hoàn thành" : "Chưa làm"
      );
      status.style.fontWeight = "500";
      status.style.color = state.done ? "#16a34a" : "#6b7280";
      box.appendChild(status);

      const btn = createEl(
        "button",
        "main-btn",
        state.done ? "Làm lại phần này" : "Bắt đầu phần này"
      );
      btn.addEventListener("click", () => {
        startSection(idx);
      });
      box.appendChild(btn);

      list.appendChild(box);
    });

    // nút tạm: sau này bạn có thể dùng để tính điểm tổng / kết thúc bài test
    const footer = createEl("div", "quiz-submit-row");
    const endBtn = createEl("button", "main-btn", "Thoát bài test");
    endBtn.addEventListener("click", () => {
      if (confirm("Thoát bài test? Điểm XP/Coin hiện tại chưa được tính thêm.")) {
        window.location.href = "index.html";
      }
    });
    footer.appendChild(endBtn);
    root.appendChild(footer);
  }

  // ============================================================
  // 6. Chuyển vào một phần
  // ============================================================

  function startSection(sectionIndex) {
    runtime.currentSectionIndex = sectionIndex;
    runtime.currentQuestionIndex = 0;

    const meta = runtime.sectionMetas[sectionIndex];
    const data = runtime.sectionData[meta.id];
    const type = data.type;

    if (type === "mcqOneByOne") {
      runMcqOneByOneSection();
    } else if (type === "readingMcq") {
      runReadingMcqSection();
    } else {
      // Các loại khác tạm chưa làm step-by-step
      alert(
        "Kiểu phần '" +
          type +
          "' hiện chưa được làm từng câu. Mình đang để TODO để làm sau."
      );
      renderSectionsOverview();
    }
  }

  // ============================================================
  // 7. Phần 1 – MCQ từng câu (mcqOneByOne)
  // ============================================================

  function runMcqOneByOneSection() {
    const secIdx = runtime.currentSectionIndex;
    const meta = runtime.sectionMetas[secIdx];
    const data = runtime.sectionData[meta.id];
    const questions = data.questions || [];
    const total = questions.length;

    // bảo vệ
    if (!total) {
      alert("Phần này không có câu hỏi.");
      renderSectionsOverview();
      return;
    }

    const qIndex = runtime.currentQuestionIndex;
    const q = questions[qIndex];

    const root = runtime.root;
    root.innerHTML = "";

    const title = createEl(
      "h2",
      "quiz-title",
      `${data.testName || runtime.testMeta.title || "Test"} - Phần ${
        data.partIndex || meta.partIndex || secIdx + 1
      } - Trắc nghiệm`
    );
    root.appendChild(title);

    const sub = createEl(
      "p",
      "quiz-subtitle",
      `Câu ${qIndex + 1} / ${total}`
    );
    root.appendChild(sub);

    const card = createEl("section", "quiz-card");
    root.appendChild(card);

    const box = createEl("div", "quiz-question");
    const qTitle = createEl(
      "p",
      "quiz-question-text",
      `Câu ${q.number}. ${q.text || ""}`
    );
    box.appendChild(qTitle);

    const optionsWrap = createEl("div");
    const name = `sec${secIdx}_q${q.number}`;
    (q.options || []).forEach((opt, idx) => {
      const line = createEl("label", "quiz-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = String(idx);
      line.appendChild(input);
      line.appendChild(document.createTextNode(" " + opt));
      optionsWrap.appendChild(line);
    });
    box.appendChild(optionsWrap);

    const explainBox = createEl("div", "quiz-passage");
    explainBox.style.display = "none";
    card.appendChild(box);
    card.appendChild(explainBox);

    // row nút
    const row = createEl("div", "quiz-submit-row");
    card.appendChild(row);

    const backBtn = createEl("button", "sub-btn", "← Về danh sách phần");
    backBtn.addEventListener("click", () => {
      if (
        confirm(
          "Thoát khỏi phần này? Những câu chưa làm sẽ không được tính vào điểm."
        )
      ) {
        renderSectionsOverview();
      }
    });
    row.appendChild(backBtn);

    const actionBtn = createEl("button", "main-btn", "Kiểm tra đáp án");
    row.appendChild(actionBtn);

    let checked = false;

    actionBtn.addEventListener("click", () => {
      const chosenInput = card.querySelector(
        `input[name="${name}"]:checked`
      );
      if (!checked) {
        // Lần đầu: chấm câu này
        if (!chosenInput) {
          alert("Bạn hãy chọn một đáp án trước đã nhé.");
          return;
        }
        checked = true;

        const chosen = Number(chosenInput.value);
        const correct = q.correct;
        const optsDom = Array.from(
          optionsWrap.querySelectorAll("label.quiz-option")
        );

        optsDom.forEach((labelEl, idx) => {
          labelEl.classList.remove("opt-correct", "opt-wrong", "opt-chosen");
          if (idx === correct) {
            labelEl.classList.add("opt-correct");
          }
          if (idx === chosen) {
            labelEl.classList.add("opt-chosen");
            if (idx !== correct) {
              labelEl.classList.add("opt-wrong");
            }
          }
        });

        // Lưu kết quả câu này vào state
        const secState = runtime.sectionStates[secIdx];
        secState.answers[qIndex] = {
          number: q.number,
          correct: chosen === correct
        };

        // Giải thích
        let html = `<b>Đáp án đúng:</b> ${
          (q.options && q.options[correct]) || ""
        }`;
        if (q.explanation) {
          html += `<br><span style="font-size:13px;">${q.explanation}</span>`;
        }
        explainBox.innerHTML = html;
        explainBox.style.display = "block";

        if (qIndex < total - 1) {
          actionBtn.textContent = "Câu tiếp theo →";
        } else {
          actionBtn.textContent = "Hoàn thành phần này";
        }
      } else {
        // Sau khi đã xem đáp án → chuyển câu / kết thúc phần
        if (qIndex < total - 1) {
          runtime.currentQuestionIndex++;
          runMcqOneByOneSection();
        } else {
          runtime.sectionStates[secIdx].done = true;
          alert("Bạn đã hoàn thành phần 1 – Trắc nghiệm!");
          renderSectionsOverview();
        }
      }
    });
  }

  // ============================================================
  // 8. Phần 3 – Đọc đoạn văn & trả lời (readingMcq)
  // ============================================================

  function runReadingMcqSection() {
    const secIdx = runtime.currentSectionIndex;
    const meta = runtime.sectionMetas[secIdx];
    const data = runtime.sectionData[meta.id];
    const questions = data.questions || [];
    const total = questions.length;

    if (!total) {
      alert("Phần đọc hiểu này không có câu hỏi.");
      renderSectionsOverview();
      return;
    }

    const qIndex = runtime.currentQuestionIndex;
    const q = questions[qIndex];

    const root = runtime.root;
    root.innerHTML = "";

    const title = createEl(
      "h2",
      "quiz-title",
      `${data.testName || runtime.testMeta.title || "Test"} - Phần ${
        data.partIndex || meta.partIndex || secIdx + 1
      } - Đọc đoạn văn và trả lời`
    );
    root.appendChild(title);

    const sub = createEl(
      "p",
      "quiz-subtitle",
      `Câu ${qIndex + 1} / ${total}`
    );
    root.appendChild(sub);

    const card = createEl("section", "quiz-card");
    root.appendChild(card);

    // Đoạn văn (giữ nguyên cho tất cả câu)
    if (data.passage) {
      const passDiv = createEl("div", "quiz-passage");
      passDiv.innerHTML = data.passage.replace(/\n/g, "<br>");
      card.appendChild(passDiv);
    }

    // Câu hỏi
    const box = createEl("div", "quiz-question");
    const qTitle = createEl(
      "p",
      "quiz-question-text",
      `Câu ${q.number}. ${q.text || ""}`
    );
    box.appendChild(qTitle);

    const optionsWrap = createEl("div");
    const name = `sec${secIdx}_q${q.number}`;

    if (q.kind === "tf") {
      const choices = ["True", "False"];
      choices.forEach((label, idx) => {
        const line = createEl("label", "quiz-option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.value = idx === 0 ? "true" : "false";
        line.appendChild(input);
        line.appendChild(document.createTextNode(" " + label));
        optionsWrap.appendChild(line);
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
        optionsWrap.appendChild(line);
      });
    }

    box.appendChild(optionsWrap);
    card.appendChild(box);

    const explainBox = createEl("div", "quiz-passage");
    explainBox.style.display = "none";
    card.appendChild(explainBox);

    // Nút
    const row = createEl("div", "quiz-submit-row");
    card.appendChild(row);

    const backBtn = createEl("button", "sub-btn", "← Về danh sách phần");
    backBtn.addEventListener("click", () => {
      if (
        confirm(
          "Thoát khỏi phần đọc hiểu? Những câu chưa làm sẽ không được tính vào điểm."
        )
      ) {
        renderSectionsOverview();
      }
    });
    row.appendChild(backBtn);

    const actionBtn = createEl("button", "main-btn", "Kiểm tra đáp án");
    row.appendChild(actionBtn);

    let checked = false;

    actionBtn.addEventListener("click", () => {
      const chosenInput = card.querySelector(
        `input[name="${name}"]:checked`
      );
      if (!checked) {
        if (!chosenInput) {
          alert("Bạn hãy chọn một đáp án trước đã nhé.");
          return;
        }
        checked = true;

        let isCorrect = false;
        if (q.kind === "tf") {
          const val = chosenInput.value === "true";
          isCorrect = val === !!q.correct;
        } else {
          const chosenIdx = Number(chosenInput.value);
          isCorrect = chosenIdx === q.correct;
        }

        const optsDom = Array.from(
          optionsWrap.querySelectorAll("label.quiz-option")
        );

        if (q.kind === "tf") {
          const trueCorrect = q.correct === true;
          optsDom.forEach((labelEl, idx) => {
            labelEl.classList.remove("opt-correct", "opt-wrong", "opt-chosen");
            const val = idx === 0; // True
            if (val === q.correct) {
              labelEl.classList.add("opt-correct");
            }
            if (
              chosenInput &&
              labelEl.contains(chosenInput) &&
              val !== q.correct
            ) {
              labelEl.classList.add("opt-wrong");
            }
            if (labelEl.contains(chosenInput)) {
              labelEl.classList.add("opt-chosen");
            }
          });
        } else {
          optsDom.forEach((labelEl, idx) => {
            const input = labelEl.querySelector("input");
            const chosen = input && input.checked;
            labelEl.classList.remove("opt-correct", "opt-wrong", "opt-chosen");
            if (idx === q.correct) {
              labelEl.classList.add("opt-correct");
            }
            if (chosen) {
              labelEl.classList.add("opt-chosen");
              if (idx !== q.correct) {
                labelEl.classList.add("opt-wrong");
              }
            }
          });
        }

        // Lưu state
        const secState = runtime.sectionStates[secIdx];
        secState.answers[qIndex] = {
          number: q.number,
          correct: isCorrect
        };

        // Giải thích
        let explain = "";
        if (q.kind === "tf") {
          explain =
            "<b>Đáp án đúng:</b> " + (q.correct ? "True" : "False");
        } else {
          explain =
            "<b>Đáp án đúng:</b> " +
            ((q.options && q.options[q.correct]) || "");
        }
        if (q.explanation) {
          explain += `<br><span style="font-size:13px;">${q.explanation}</span>`;
        }
        explainBox.innerHTML = explain;
        explainBox.style.display = "block";

        if (qIndex < total - 1) {
          actionBtn.textContent = "Câu tiếp theo →";
        } else {
          actionBtn.textContent = "Hoàn thành phần này";
        }
      } else {
        // next / finish
        if (qIndex < total - 1) {
          runtime.currentQuestionIndex++;
          runReadingMcqSection();
        } else {
          runtime.sectionStates[secIdx].done = true;
          alert("Bạn đã hoàn thành phần 3 – Đọc hiểu!");
          renderSectionsOverview();
        }
      }
    });
  }

  // ============================================================
  // 9. (Giữ lại) Hàm awardStats – cộng XP/Coin (chưa gọi tới)
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
        coinGain = 250; // theo yêu cầu: lần đầu 100% thưởng 250 coin
        newGotPerfectCoin = true;
      } else {
        xpGain = scorePercent;
        coinGain = 50;
      }
    } else {
      xpGain = scorePercent;
      if (scorePercent === 100 && !gotPerfectCoin) {
        coinGain = 250;
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
  // 11. DOM ready
  // ============================================================

  document.addEventListener("DOMContentLoaded", () => {
    initQuizHeader();
    initQuizEng();
  });
})();
