// js/quiz.js - TRẮC NGHIỆM ĐỘC LẬP
class QuizManager {
  constructor() {
    this.db = window.firebaseDB;
    this.auth = window.firebaseAuth;
    this.currentUser = null;
    this.totalQuestions = 12;
    this.answeredCount = 0;
    this.questions = [];
    this.questionPool = this.getQuestionPool(); // Kho câu hỏi lớn
    this.init();
  }

  init() {
    this.auth.onAuthStateChanged(user => {
      if (user) this.currentUser = user;
    });
  }

  // === KHO CÂU HỎI LỚN (30+ CÂU) ===
  getQuestionPool() {
    return [
      // NHÓM 1: Sáng tạo
      { q: "Bạn thích làm gì vào cuối tuần?", options: ["Vẽ, viết truyện", "Gặp bạn bè", "Chơi game"], scores: { creativity: 1, sociability: 0, playfulness: 0 } },
      { q: "Bạn học tốt nhất khi nào?", options: ["Vẽ sơ đồ", "Thảo luận nhóm", "Chơi game"], scores: { creativity: 1, sociability: 0, playfulness: 0 } },
      { q: "Bạn thích môn nào?", options: ["Văn - sáng tác", "Toán", "Anh"], scores: { creativity: 1, competitiveness: 0, sociability: 0 } },

      // NHÓM 2: Cạnh tranh
      { q: "Bạn có hay so sánh mình với người khác?", options: ["Rất hay", "Chỉ để cải thiện", "Không"], scores: { competitiveness: 1, self_improvement: 0, playfulness: 0 } },
      { q: "Bạn thích được khen vì gì?", options: ["Giỏi nhất lớp", "Ý tưởng độc đáo", "Vui vẻ"], scores: { competitiveness: 1, creativity: 0, sociability: 0 } },

      // NHÓM 3: Xã hội
      { q: "Bạn thích làm việc nhóm hay cá nhân?", options: ["Nhóm", "Cá nhân"], scores: { sociability: 1, perfectionism: 0 } },
      { q: "Bạn có nhiều bạn bè không?", options: ["Rất nhiều", "Vừa đủ", "Ít"], scores: { sociability: 1, self_improvement: 0, playfulness: 0 } },

      // NHÓM 4: Vui vẻ
      { q: "Bạn có hay chán khi làm 1 việc lâu?", options: ["Rất hay", "Thỉnh thoảng", "Không"], scores: { playfulness: 1, self_improvement: 0, perfectionism: 0 } },
      { q: "Bạn học bằng cách nào?", options: ["Game, video", "Sơ đồ", "Thảo luận"], scores: { playfulness: 1, creativity: 0, sociability: 0 } },

      // NHÓM 5: Tự cải thiện
      { q: "Bạn có đặt mục tiêu dài hạn?", options: ["Luôn luôn", "Tùy hứng"], scores: { self_improvement: 1, playfulness: 0 } },
      { q: "Bạn có kiên trì với việc khó?", options: ["Rất kiên trì", "Chỉ khi hoàn hảo", "Dễ chán"], scores: { self_improvement: 1, perfectionism: 0, playfulness: 0 } },

      // NHÓM 6: Cầu toàn
      { q: "Bạn có cần mọi thứ hoàn hảo?", options: ["Luôn luôn", "Không cần"], scores: { perfectionism: 1, playfulness: 0 } },
      { q: "Bạn làm việc cá nhân hay nhóm?", options: ["Cá nhân - kiểm soát 100%", "Nhóm"], scores: { perfectionism: 1, sociability: 0 } },

      // CÂU HỎI CHUNG
      { q: "Bạn có cảm thấy mình làm được mọi thứ?", options: ["Có", "Thỉnh thoảng", "Không"], scores: { self_improvement: 1 } },
      { q: "Bạn muốn được khen vì gì?", options: ["Sáng tạo nhất", "Giỏi nhất", "Vui vẻ nhất"], scores: { creativity: 1, competitiveness: 0, sociability: 0 } }
    ];
  }

  // === CHỌN 12 CÂU NGẪU NHIÊN, ĐẢM BẢO CÂN BẰNG ===
  generateRandomQuestions() {
    const selected = [];
    const groups = [[], [], [], [], [], []]; // 6 nhóm

    // Phân loại câu hỏi vào nhóm
    this.questionPool.forEach((q, i) => {
      if (q.scores.creativity) groups[0].push({ ...q, index: i });
      if (q.scores.competitiveness) groups[1].push({ ...q, index: i });
      if (q.scores.sociability) groups[2].push({ ...q, index: i });
      if (q.scores.playfulness) groups[3].push({ ...q, index: i });
      if (q.scores.self_improvement) groups[4].push({ ...q, index: i });
      if (q.scores.perfectionism) groups[5].push({ ...q, index: i });
    });

    // Chọn 2 câu mỗi nhóm
    groups.forEach(group => {
      if (group.length > 0) {
        const shuffled = group.sort(() => 0.5 - Math.random());
        selected.push(...shuffled.slice(0, 2));
      }
    });

    // Nếu thiếu, bổ sung ngẫu nhiên
    while (selected.length < this.totalQuestions) {
      const randomQ = this.questionPool[Math.floor(Math.random() * this.questionPool.length)];
      if (!selected.includes(randomQ)) selected.push(randomQ);
    }

    // Trộn lại
    return selected.sort(() => 0.5 - Math.random()).slice(0, this.totalQuestions);
  }

  // === KHỞI TẠO TRẮC NGHIỆM ===
  start() {
    this.questions = this.generateRandomQuestions();
    this.answeredCount = 0;
    this.renderQuestions();
    this.setupEvents();
  }

  renderQuestions() {
    const container = document.getElementById("quiz");
    container.innerHTML = `
      <h2>Khám Phá Tính Cách (1 lần duy nhất)</h2>
      <div class="alert" id="alert">Vui lòng trả lời <span id="missingCount">12</span> câu!</div>
      ${this.questions.map((q, i) => `
        <div class="question" data-q="${i+1}">
          <h3>${i+1}. ${q.q}</h3>
          <div class="options">
            ${q.options.map((opt, j) => `
              <div class="option" data-index="${j}">${opt}</div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <button id="submitQuizBtn" class="main-btn" disabled>HOÀN TẤT</button>
    `;

    document.getElementById("missingCount").textContent = this.totalQuestions;
  }

  setupEvents() {
    const questions = document.querySelectorAll(".question");
    const submitBtn = document.getElementById("submitQuizBtn");
    const alert = document.getElementById("alert");
    const missingCount = document.getElementById("missingCount");

    questions.forEach(q => {
      const options = q.querySelectorAll(".option");
      options.forEach(opt => {
        opt.onclick = () => {
          options.forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
          this.checkAllAnswered();
        };
      });
    });

    this.checkAllAnswered = () => {
      this.answeredCount = 0;
      questions.forEach(q => {
        if (q.querySelector(".option.selected")) this.answeredCount++;
      });
      missingCount.textContent = this.totalQuestions - this.answeredCount;
      alert.style.display = this.answeredCount === this.totalQuestions ? "none" : "block";
      submitBtn.disabled = this.answeredCount !== this.totalQuestions;
    };

    submitBtn.onclick = () => this.submit();
  }

  // === GỬI KẾT QUẢ + TÍNH TỶ LỆ ===
  submit() {
    const traits = { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
    let correctCount = 0;
    let totalCount = 0;

    document.querySelectorAll(".question").forEach((q, i) => {
      const selected = q.querySelector(".option.selected");
      if (selected) {
        const qData = this.questions[i];
        const optIndex = Array.from(q.querySelectorAll(".option")).indexOf(selected);
        const selectedText = qData.options[optIndex];

        // Tính điểm
        Object.keys(qData.scores).forEach(trait => {
          if (qData.options[optIndex] === qData.options[0]) { // Giả sử đáp án đúng là cái đầu tiên
            traits[trait] += qData.scores[trait];
            correctCount++;
          }
        });
        totalCount++;
      }
    });

    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // Lưu vào Firebase
    this.db.ref('users/' + this.currentUser.uid).update({
      traits,
      quizDone: true,
      quizAccuracy: accuracy,
      quizTimestamp: new Date().toISOString()
    }).then(() => {
      this.showResult(accuracy);
    });
  }

  showResult(accuracy) {
    const container = document.getElementById("quiz");
    container.innerHTML = `
      <h2>Kết quả trắc nghiệm</h2>
      <p>Độ chính xác: <strong style="color:#e11d48">${accuracy}%</strong></p>
      <p>Đã lưu kết quả! Đang tải game...</p>
    `;
    setTimeout(() => window.location.reload(), 2000);
  }
}

// GỌI TỪ BÊN NGOÀI
window.startQuiz = () => {
  const quiz = new QuizManager();
  quiz.start();
};
