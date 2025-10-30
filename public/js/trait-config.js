/* =========================================================
   trait-config.js
   - Config thống kê (giữ nguyên)
   - Ngân hàng câu hỏi trắc nghiệm 6 nhóm tính cách (TRAIT_BANK)
   ========================================================= */

window.TraitConfig = {
  // các mốc điểm tối đa/tuần (tuỳ app dùng)
  weeklyMax: {
    creativity: 200, competitiveness: 300, sociability: 180,
    playfulness: 220, self_improvement: 250, perfectionism: 160,
  },
  weights: {
    art_generated:       { creativity: 5 },
    math_round_completed:{ competitiveness: 3 },
    group_interaction:   { sociability: 2 },
    game_played:         { playfulness: 1 },
    lesson_completed:    { self_improvement: 4 },
    puzzle_perfected:    { perfectionism: 4 },
  },
};

/* =========================================================
   BANK CÂU HỎI — 6 NHÓM: 
   creativity, sociability, playfulness, perfectionism, 
   self_improvement, competitiveness
   - Mỗi câu có:
     { text, options: [{label, score: "trait:1"}, ...] }
   - Có thể thêm "other" hoặc option trung tính nếu muốn
   ========================================================= */
window.TRAIT_BANK = {
  /* ---------- 1) SÁNG TẠO (creativity) ---------- */
  creativity: [
    {
      text: "Cuối tuần, bạn thích làm gì nhất?",
      options: [
        { label: "Vẽ/viết/làm video", score: "creativity:1" },
        { label: "Đi chơi cùng bạn",   score: "sociability:1" },
        { label: "Chơi game/xem phim", score: "playfulness:1" },
      ],
    },
    {
      text: "Cách bạn ghi nhớ kiến thức mới?",
      options: [
        { label: "Vẽ mindmap/sơ đồ",   score: "creativity:1" },
        { label: "Làm flashcard",      score: "self_improvement:1" },
        { label: "Nhẩm lại thật nhiều",score: "perfectionism:1" },
      ],
    },
    {
      text: "Một đề bài mở (không có đáp án cố định) làm bạn thấy…",
      options: [
        { label: "Hứng thú vì được sáng tạo", score: "creativity:1" },
        { label: "Bình thường",                score: "playfulness:0.5" },
        { label: "Khó chịu vì thiếu rõ ràng",  score: "perfectionism:1" },
      ],
    },
    {
      text: "Bạn thích kiểu bài tập nào hơn?",
      options: [
        { label: "Dự án tự do (làm poster, phim ngắn…)", score: "creativity:1" },
        { label: "Bài tập chuẩn mẫu, có rubric rõ ràng",  score: "perfectionism:1" },
      ],
    },
    {
      text: "Khi học văn/viết lách, bạn…",
      options: [
        { label: "Thích thêm ý tưởng riêng, twist độc đáo", score: "creativity:1" },
        { label: "Bám khung đoạn – câu – ý thật chặt",      score: "perfectionism:1" },
      ],
    },
    {
      text: "Bạn có hay thử công cụ/ứng dụng mới để học/làm?",
      options: [
        { label: "Có, rất thường xuyên", score: "creativity:1" },
        { label: "Thỉnh thoảng",         score: "playfulness:0.5" },
        { label: "Hiếm khi",             score: "perfectionism:0.5" },
      ],
    },
    {
      text: "Bạn thấy thế nào khi phải nghĩ ra nhiều cách giải khác nhau?",
      options: [
        { label: "Rất vui, càng lạ càng tốt", score: "creativity:1" },
        { label: "Tốt nhưng tốn thời gian",   score: "self_improvement:0.5" },
        { label: "Không cần, 1 cách chuẩn là đủ", score: "perfectionism:1" },
      ],
    },
    {
      text: "Khi làm nhóm, bạn thường nhận vai…",
      options: [
        { label: "Nghĩ ý tưởng/thiết kế", score: "creativity:1" },
        { label: "Điều phối giao tiếp",   score: "sociability:1" },
        { label: "Soát lỗi/chuẩn hoá",    score: "perfectionism:1" },
      ],
    },
  ],

  /* ---------- 2) XÃ HỘI (sociability) ---------- */
  sociability: [
    {
      text: "Bạn thích làm việc theo kiểu nào?",
      options: [
        { label: "Nhóm – có bạn bè sẽ vui hơn", score: "sociability:1" },
        { label: "Cá nhân – tập trung tốt hơn", score: "perfectionism:1" },
      ],
    },
    {
      text: "Khi có bài khó, bạn sẽ…",
      options: [
        { label: "Nhắn hỏi/trao đổi với bạn", score: "sociability:1" },
        { label: "Tự mày mò trước",            score: "self_improvement:1" },
      ],
    },
    {
      text: "Bạn cảm thấy thế nào khi phải thuyết trình?",
      options: [
        { label: "Thích, được nói chuyện", score: "sociability:1" },
        { label: "OK nếu chuẩn bị kỹ",      score: "perfectionism:1" },
        { label: "Ngại lắm",                score: "playfulness:0.5" },
      ],
    },
    {
      text: "Trong nhóm bạn, bạn là người…",
      options: [
        { label: "Bắt chuyện, kéo mọi người tham gia", score: "sociability:1" },
        { label: "Lắng nghe và làm theo kế hoạch",      score: "self_improvement:0.5" },
      ],
    },
    {
      text: "Bạn thích học ngoại ngữ kiểu…",
      options: [
        { label: "Nói chuyện với người khác", score: "sociability:1" },
        { label: "Luyện đề/thi thử",           score: "competitiveness:1" },
      ],
    },
    {
      text: "Khi tham gia CLB/sự kiện mới, bạn…",
      options: [
        { label: "Thử ngay cho biết", score: "sociability:1" },
        { label: "Quan sát trước đã",  score: "perfectionism:0.5" },
      ],
    },
    {
      text: "Bạn có thích role-play/đóng vai khi học?",
      options: [
        { label: "Có, hoạt náo vui",   score: "sociability:1" },
        { label: "Không, hơi ngại",    score: "playfulness:0.5" },
      ],
    },
    {
      text: "Nếu có bạn học chậm, bạn sẽ…",
      options: [
        { label: "Chủ động kèm/giải thích", score: "sociability:1" },
        { label: "Động viên nhẹ nhàng",     score: "self_improvement:0.5" },
      ],
    },
  ],

  /* ---------- 3) VUI VẺ (playfulness) ---------- */
  playfulness: [
    {
      text: "Bạn thích học kiểu nào?",
      options: [
        { label: "Gamified – có cấp/coin/huy hiệu", score: "playfulness:1" },
        { label: "Truyền thống – vở/SGK/đề",        score: "perfectionism:0.5" },
      ],
    },
    {
      text: "Khi rảnh 15 phút, bạn sẽ…",
      options: [
        { label: "Chơi mini game/ứng dụng học vui", score: "playfulness:1" },
        { label: "Đọc lướt kiến thức",               score: "self_improvement:0.5" },
      ],
    },
    {
      text: "Bạn có thích thử các thử thách ngắn (daily challenge)?",
      options: [
        { label: "Thích, vui mà!",  score: "playfulness:1" },
        { label: "Không quan tâm",  score: "perfectionism:0.5" },
      ],
    },
    {
      text: "Khi xem video học tập, bạn thích…",
      options: [
        { label: "Ví dụ hài hước/dễ hiểu",      score: "playfulness:1" },
        { label: "Vào trọng tâm, nhanh gọn",    score: "self_improvement:0.5" },
      ],
    },
    {
      text: "Bạn có dễ chán khi làm 1 việc lâu?",
      options: [
        { label: "Có, khá dễ chán", score: "playfulness:1" },
        { label: "Không lắm",       score: "self_improvement:0.5" },
      ],
    },
    {
      text: "Khi học môn khó, điều gì giúp bạn bền bỉ hơn?",
      options: [
        { label: "Cơ chế thưởng (coin/huy hiệu)", score: "playfulness:1" },
        { label: "Kế hoạch rõ ràng",              score: "perfectionism:1" },
      ],
    },
    {
      text: "Bạn thích hoạt động trải nghiệm kiểu…",
      options: [
        { label: "Thực hành vui (thí nghiệm, trò chơi)", score: "playfulness:1" },
        { label: "Viết báo cáo/thu hoạch",               score: "perfectionism:1" },
      ],
    },
    {
      text: "Bạn có hay tự nghĩ ra luật chơi khi học với bạn?",
      options: [
        { label: "Có, rất hay", score: "playfulness:1" },
        { label: "Hiếm khi",    score: "sociability:0.5" },
      ],
    },
  ],

  /* ---------- 4) CẦU TOÀN (perfectionism) ---------- */
  perfectionism: [
    {
      text: "Trước khi nộp bài, bạn thường…",
      options: [
        { label: "Soát kỹ, chỉnh từng chi tiết", score: "perfectionism:1" },
        { label: "Ổn là nộp, không câu nệ",      score: "playfulness:0.5" },
      ],
    },
    {
      text: "Bạn thích giáo viên kiểu…",
      options: [
        { label: "Nghiêm, yêu cầu cao",  score: "perfectionism:1" },
        { label: "Hài hước, dễ chịu",    score: "playfulness:1" },
      ],
    },
    {
      text: "Bạn có hay đặt checklist chi tiết trước khi học/làm?",
      options: [
        { label: "Có, luôn có", score: "perfectionism:1" },
        { label: "Thỉnh thoảng",score: "self_improvement:0.5" },
      ],
    },
    {
      text: "Khi làm nhóm, bạn thường…",
      options: [
        { label: "Soát bố cục, format, chính tả", score: "perfectionism:1" },
        { label: "Pitch, trình bày ý tưởng",       score: "sociability:0.5" },
      ],
    },
    {
      text: "Đứng trước deadline, bạn…",
      options: [
        { label: "Lên kế hoạch chi tiết", score: "perfectionism:1" },
        { label: "Chạy nước rút cho kịch tính", score: "playfulness:1" },
      ],
    },
    {
      text: "Bạn thấy thế nào về sai sót nhỏ (ví dụ 1–2 lỗi chính tả)?",
      options: [
        { label: "Khó chịu, phải sửa",  score: "perfectionism:1" },
        { label: "Không sao lắm",       score: "playfulness:1" },
      ],
    },
    {
      text: "Chọn cách nộp bài:",
      options: [
        { label: "Đúng format – đủ yêu cầu", score: "perfectionism:1" },
        { label: "Tự do trình bày",          score: "creativity:1" },
      ],
    },
    {
      text: "Khi học Toán, bạn thích…",
      options: [
        { label: "Bài làm sạch đẹp, từng bước", score: "perfectionism:1" },
        { label: "Ý tưởng giải nhanh, lạ",      score: "creativity:1" },
      ],
    },
  ],

  /* ---------- 5) TỰ CẢI THIỆN (self_improvement) ---------- */
  self_improvement: [
    {
      text: "Bạn có đặt mục tiêu tuần/tháng cho việc học?",
      options: [
        { label: "Có, và theo dõi tiến độ", score: "self_improvement:1" },
        { label: "Không cố định",           score: "playfulness:0.5" },
      ],
    },
    {
      text: "Bạn học tốt nhất khi…",
      options: [
        { label: "Có kế hoạch rõ ràng", score: "self_improvement:1" },
        { label: "Thử thách bản thân",  score: "competitiveness:1" },
        { label: "Học vui như chơi",   score: "playfulness:1" },
      ],
    },
    {
      text: "Gặp thất bại, bạn thường…",
      options: [
        { label: "Xem lại nguyên nhân, cải thiện", score: "self_improvement:1" },
        { label: "Thử cái khác cho vui",           score: "playfulness:1" },
      ],
    },
    {
      text: "Bạn có thói quen ghi lại lessons learned?",
      options: [
        { label: "Có",  score: "self_improvement:1" },
        { label: "Không", score: "playfulness:0.5" },
      ],
    },
    {
      text: "Bạn thích theo dõi tiến bộ bằng…",
      options: [
        { label: "Dashboard/biểu đồ", score: "self_improvement:1" },
        { label: "Cảm giác là đủ",     score: "playfulness:0.5" },
      ],
    },
    {
      text: "Khi có việc khó, bạn…",
      options: [
        { label: "Kiên trì làm đến cùng", score: "self_improvement:1" },
        { label: "Bỏ qua để giữ mood",    score: "playfulness:1" },
      ],
    },
    {
      text: "Bạn có thường tự đặt deadline nhỏ (micro-deadline)?",
      options: [
        { label: "Có",   score: "self_improvement:1" },
        { label: "Không",score: "playfulness:0.5" },
      ],
    },
    {
      text: "Bạn thích học theo series dài ngày (30-day challenge)?",
      options: [
        { label: "Có",  score: "self_improvement:1" },
        { label: "Không", score: "playfulness:1" },
      ],
    },
  ],

  /* ---------- 6) CẠNH TRANH (competitiveness) ---------- */
  competitiveness: [
    {
      text: "Bạn có hay so sánh thành tích với người khác?",
      options: [
        { label: "Có, để cố gắng hơn", score: "competitiveness:1" },
        { label: "Không mấy quan tâm", score: "playfulness:0.5" },
      ],
    },
    {
      text: "Bạn phản ứng thế nào với bảng xếp hạng?",
      options: [
        { label: "Rất hứng thú, muốn leo rank", score: "competitiveness:1" },
        { label: "Xem cho biết thôi",           score: "playfulness:0.5" },
      ],
    },
    {
      text: "Bạn thích kiểu kiểm tra nào?",
      options: [
        { label: "Thi tốc độ/đấu giải", score: "competitiveness:1" },
        { label: "Bài tự luận dài",     score: "perfectionism:1" },
      ],
    },
    {
      text: "Khi thua một trận/điểm thấp, bạn…",
      options: [
        { label: "Muốn phục thù ngay",   score: "competitiveness:1" },
        { label: "Để sau tính, không sao",score: "playfulness:1" },
      ],
    },
    {
      text: "Bạn có thích bảng nhiệm vụ hằng ngày + streak?",
      options: [
        { label: "Có, giữ mình không đứt mạch", score: "competitiveness:1" },
        { label: "Không cần",                    score: "playfulness:0.5" },
      ],
    },
    {
      text: "Chọn hoạt động toán học bạn thích hơn:",
      options: [
        { label: "Giải nhanh (Speed Math)", score: "competitiveness:1" },
        { label: "Giải đẹp (trình bày chuẩn)", score: "perfectionism:1" },
      ],
    },
    {
      text: "Bạn thích tham gia giải đấu/olympic cấp trường?",
      options: [
        { label: "Có",  score: "competitiveness:1" },
        { label: "Không", score: "playfulness:0.5" },
      ],
    },
    {
      text: "Bạn cảm thấy thế nào khi được chọn làm đội trưởng?",
      options: [
        { label: "Thích, muốn dẫn đầu", score: "competitiveness:1" },
        { label: "Thôi nhường người khác", score: "sociability:0.5" },
      ],
    },
  ],
};
