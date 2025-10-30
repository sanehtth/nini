/* =============================================
 * LearnQuest — quiz.js (6 trait groups)
 * - Ngân hàng tách theo 6 nhóm: creativity, sociability, playfulness,
 *   perfectionism, self_improvement, competitiveness
 * - Mặc định rút đều PER_GROUP câu từ mỗi nhóm
 * - Chỉ dùng chấm điểm theo trait (không dùng positive/negative)
 * ============================================= */

(function(){
  // ===== Cấu hình =====
  const url = new URL(window.location.href);
  const PER_GROUP = Math.max(1, parseInt(url.searchParams.get('per') || '2', 10)); // số câu/nhóm

  const traits = [
    'creativity',
    'sociability',
    'playfulness',
    'perfectionism',
    'self_improvement',
    'competitiveness'
  ];

  // Cập nhật hiển thị tổng số câu nếu có #questionCount
  const questionCountEl = document.getElementById('questionCount');
  if (questionCountEl) questionCountEl.textContent = String(PER_GROUP * traits.length);

  // ===== Ngân hàng câu hỏi tách theo nhóm =====
  // Mỗi câu hỏi chỉ cộng điểm cho trait tương ứng qua data-score: `${trait}:weight`
  const BANK = {
    creativity: [
      { id: 'cr1', text: 'Bạn thích tạo nội dung theo dạng nào?', options: [
        { label: 'Vẽ/minh họa', score: 'creativity:1' },
        { label: 'Viết truyện/blog', score: 'creativity:1' },
        { label: 'Dựng video/podcast', score: 'creativity:1' },
        { label: 'Khác', other: true }
      ]},
      { id: 'cr2', text: 'Cách bạn phát triển ý tưởng mới?', options: [
        { label: 'Mindmap/Sơ đồ', score: 'creativity:1' },
        { label: 'Lấy cảm hứng từ nhiều lĩnh vực', score: 'creativity:1' },
        { label: 'Thử nghiệm nhanh – làm rồi sửa', score: 'creativity:1' }
      ]},
      { id: 'cr3', text: 'Bạn hứng thú nhất với thử thách nào?', options: [
        { label: 'Sáng tác nội dung độc đáo', score: 'creativity:1' },
        { label: 'Thiết kế sản phẩm mới', score: 'creativity:1' },
        { label: 'Lập trình tạo ứng dụng thú vị', score: 'creativity:1' }
      ]}
    ],

    sociability: [
      { id: 'so1', text: 'Bạn thích cách học nào nhất?', options: [
        { label: 'Thảo luận nhóm', score: 'sociability:1' },
        { label: 'Workshop/Meetup', score: 'sociability:1' },
        { label: 'Kèm cặp/đồng hành', score: 'sociability:1' }
      ]},
      { id: 'so2', text: 'Trong project nhóm, bạn thường là…', options: [
        { label: 'Người kết nối và điều phối', score: 'sociability:1' },
        { label: 'Người truyền cảm hứng', score: 'sociability:1' },
        { label: 'Người hỗ trợ mọi thành viên', score: 'sociability:1' }
      ]},
      { id: 'so3', text: 'Điều làm bạn vui nhất khi học cùng người khác?', options: [
        { label: 'Trao đổi ý tưởng liên tục', score: 'sociability:1' },
        { label: 'Cảm giác thuộc về một nhóm', score: 'sociability:1' },
        { label: 'Cùng nhau ăn mừng tiến bộ', score: 'sociability:1' }
      ]}
    ],

    playfulness: [
      { id: 'pl1', text: 'Bạn duy trì động lực học bằng cách…', options: [
        { label: 'Game hóa mục tiêu/điểm thưởng', score: 'playfulness:1' },
        { label: 'Xem video minh họa', score: 'playfulness:1' },
        { label: 'Thử điều mới mỗi tuần', score: 'playfulness:1' }
      ]},
      { id: 'pl2', text: 'Khi rảnh bạn thường…', options: [
        { label: 'Chơi game', score: 'playfulness:1' },
        { label: 'Khám phá nội dung giải trí', score: 'playfulness:1' },
        { label: 'Làm mini-project vui vui', score: 'playfulness:1' }
      ]},
      { id: 'pl3', text: 'Bạn thích kiểu thử thách nào trong app học?', options: [
        { label: 'Nhiệm vụ ngắn – phần thưởng nhanh', score: 'playfulness:1' },
        { label: 'Combo thử thách đa dạng', score: 'playfulness:1' },
        { label: 'Bảng xếp hạng hàng tuần', score: 'playfulness:1' }
      ]}
    ],

    perfectionism: [
      { id: 'pf1', text: 'Khi làm bài khó, bạn sẽ…', options: [
        { label: 'Lập kế hoạch chi tiết', score: 'perfectionism:1' },
        { label: 'Chia nhỏ công việc', score: 'perfectionism:1' },
        { label: 'Kiểm tra checklist kỹ lưỡng', score: 'perfectionism:1' }
      ]},
      { id: 'pf2', text: 'Bạn xử lý lỗi sai như thế nào?', options: [
        { label: 'Sửa cho hoàn hảo', score: 'perfectionism:1' },
        { label: 'Viết lesson learned', score: 'perfectionism:1' },
        { label: 'Tăng tiêu chuẩn cho lần sau', score: 'perfectionism:1' }
      ]},
      { id: 'pf3', text: 'Bạn thấy khó chịu nhất khi…', options: [
        { label: 'Bị gián đoạn khi đang tập trung', score: 'perfectionism:1' },
        { label: 'Không có tiêu chí đánh giá rõ', score: 'perfectionism:1' },
        { label: 'Tài liệu/format lộn xộn', score: 'perfectionism:1' }
      ]}
    ],

    self_improvement: [
      { id: 'si1', text: 'Bạn đặt mục tiêu thế nào?', options: [
        { label: 'SMART, đo lường tiến độ', score: 'self_improvement:1' },
        { label: 'Tăng độ khó theo thời gian', score: 'self_improvement:1' },
        { label: 'Review định kỳ hàng tuần', score: 'self_improvement:1' }
      ]},
      { id: 'si2', text: 'Khi thiếu động lực, bạn sẽ…', options: [
        { label: 'Tạo lịch luyện tập đều đặn', score: 'self_improvement:1' },
        { label: 'Tìm đồng hành/mentor', score: 'self_improvement:1' },
        { label: 'Đặt mini-goal hằng ngày', score: 'self_improvement:1' }
      ]},
      { id: 'si3', text: 'Bạn thích đánh giá tiến bộ bằng…', options: [
        { label: 'Biểu đồ/điểm mốc', score: 'self_improvement:1' },
        { label: 'Nhật ký học tập', score: 'self_improvement:1' },
        { label: 'Bài test định kỳ', score: 'self_improvement:1' }
      ]}
    ],

    competitiveness: [
      { id: 'cp1', text: 'Bạn thấy hứng thú nhất khi…', options: [
        { label: 'Leo bảng xếp hạng', score: 'competitiveness:1' },
        { label: 'Đạt top/break kỷ lục', score: 'competitiveness:1' },
        { label: 'So kè điểm với bạn bè', score: 'competitiveness:1' }
      ]},
      { id: 'cp2', text: 'Môn/kiểu thử thách bạn thích?', options: [
        { label: 'Giải đố/Toán khó', score: 'competitiveness:1' },
        { label: 'Thi kỹ năng nhanh', score: 'competitiveness:1' },
        { label: 'Đấu đối kháng/hùng biện', score: 'competitiveness:1' }
      ]},
      { id: 'cp3', text: 'Điều khiến bạn tự hào nhất là…', options: [
        { label: 'Vượt qua đối thủ mạnh', score: 'competitiveness:1' },
        { label: 'Giữ chuỗi thắng dài', score: 'competitiveness:1' },
        { label: 'Đạt huy hiệu hiếm', score: 'competitiveness:1' }
      ]}
    ]
  };

  // ===== Helpers =====
  function shuffle(arr){
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickPerGroup(bank, per){
    const picked = [];
    for (const trait of Object.keys(bank)){
      const group = bank[trait] || [];
      const chosen = shuffle(group).slice(0, Math.min(per, group.length));
      picked.push(...chosen.map(q => ({...q, trait})));
    }
    return picked;
  }

  // ===== Render =====
  const listEl = document.getElementById('questionList');
  const alertEl = document.getElementById('alert');
  const missingCountEl = document.getElementById('missingCount');
  const submitBtn = document.getElementById('submitBtn');

  const picked = pickPerGroup(BANK, PER_GROUP);

  function render(){
    listEl.innerHTML = '';
    picked.forEach((q, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'question';
      wrap.dataset.q = q.id;

      const title = document.createElement('h3');
      title.textContent = `${idx+1}. ${q.text}`;
      wrap.appendChild(title);

      const opts = document.createElement('div');
      opts.className = 'options';

      q.options.forEach((opt, oi) => {
        const div = document.createElement('div');
        div.className = 'option';
        div.tabIndex = 0;
        div.setAttribute('role','button');
        div.dataset.index = String(oi);

        if (opt.other) div.classList.add('other-trigger');
        if (opt.score) div.dataset.score = opt.score; // "trait:1"

        div.textContent = opt.label;
        opts.appendChild(div);
      });
      wrap.appendChild(opts);

      const otherWrap = document.createElement('div');
      otherWrap.className = 'other-input';
      otherWrap.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Nhập câu trả lời của bạn';
      otherWrap.appendChild(input);
      wrap.appendChild(otherWrap);

      listEl.appendChild(wrap);
    });
  }

  render();

  // Interaction
  listEl.addEventListener('click', (e) => {
    const option = e.target.closest('.option');
    if (!option) return;
    const qBox = option.closest('.question');
    qBox.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');

    const other = option.classList.contains('other-trigger');
    const otherWrap = qBox.querySelector('.other-input');
    if (other) {
      otherWrap.style.display = 'block';
      otherWrap.querySelector('input').focus();
    } else {
      otherWrap.style.display = 'none';
    }

    checkAllAnswered();
  });

  listEl.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('option')){
      e.preventDefault();
      e.target.click();
    }
  });

  function checkAllAnswered(){
    const boxes = listEl.querySelectorAll('.question');
    let missing = 0;
    boxes.forEach(b => { if (!b.querySelector('.option.selected')) missing++; });
    submitBtn.disabled = missing > 0;
    if (missing > 0){
      alertEl.style.display = 'block';
      if (missingCountEl) missingCountEl.textContent = String(missing);
    } else {
      alertEl.style.display = 'none';
    }
  }

  // Scoring — chỉ theo 6 trait
  function score(){
    const result = {
      creativity: 0,
      sociability: 0,
      playfulness: 0,
      perfectionism: 0,
      self_improvement: 0,
      competitiveness: 0
    };

    const boxes = listEl.querySelectorAll('.question');
    boxes.forEach(b => {
      const sel = b.querySelector('.option.selected');
      if (!sel) return;
      const scoreStr = sel.dataset.score; // e.g. "creativity:1"
      if (!scoreStr) return;
      const [trait, wStr] = scoreStr.split(':');
      const w = parseFloat(wStr || '1');
      if (traits.includes(trait)) result[trait] += w;
    });

    return result;
  }

  // Submit
  const SAFE_XP = 50;
  submitBtn.addEventListener('click', () => {
    checkAllAnswered();
    if (submitBtn.disabled) return;

    const res = score();
    try {
      localStorage.setItem('lq_traitScores', JSON.stringify(res));
      localStorage.setItem('lq_quizDone', 'true');
      const xp = parseInt(localStorage.getItem('lq_xp') || '0', 10) + SAFE_XP;
      localStorage.setItem('lq_xp', String(xp));
    } catch(e) { console.warn('localStorage error', e); }

    window.location.href = '/index.html?quiz=done';
  });
})();


//--- mẫu từ index cũ (có thêm id) ---
{ id: 1,  type: 'trait',  text: 'Bạn thích làm gì nhất vào cuối tuần?',
options: [
{ label: 'Vẽ, viết truyện, làm video', score: 'creativity:1' },
{ label: 'Gặp bạn bè, đi chơi',       score: 'sociability:1' },
{ label: 'Chơi game, xem phim',       score: 'playfulness:1' },
{ label: 'Khác', other: true }
] },
{ id: 2,  type: 'trait',  text: 'Bạn học tốt nhất khi nào?',
options: [
{ label: 'Lập kế hoạch chi tiết',     score: 'perfectionism:1' },
{ label: 'Thử thách bản thân',        score: 'self_improvement:1' },
{ label: 'Học vui như chơi',          score: 'playfulness:1' }
] },
{ id: 3,  type: 'trait',  text: 'Bạn thích làm việc nhóm hay cá nhân?',
options: [
{ label: 'Nhóm - năng lượng từ bạn bè', score: 'sociability:1' },
{ label: 'Cá nhân - kiểm soát 100%',    score: 'perfectionism:1' }
] },
{ id: 4,  type: 'trait',  text: 'Bạn có hay đặt mục tiêu dài hạn?',
options: [
{ label: 'Luôn luôn', score: 'self_improvement:1' },
{ label: 'Tùy hứng',  score: 'playfulness:1' }
] },
{ id: 5,  type: 'trait',  text: 'Bạn thích môn học nào nhất?',
options: [
{ label: 'Toán - giải đề khó', score: 'competitiveness:1' },
{ label: 'Văn - sáng tác',     score: 'creativity:1' },
{ label: 'Anh - giao tiếp',    score: 'sociability:1' }
] },
{ id: 6,  type: 'trait',  text: 'Bạn có hay so sánh mình với người khác?',
options: [
{ label: 'Rất hay',         score: 'competitiveness:1' },
{ label: 'Chỉ để cải thiện',score: 'self_improvement:1' },
{ label: 'Không quan tâm',  score: 'playfulness:1' }
] },
{ id: 7,  type: 'trait',  text: 'Bạn học bằng cách nào hiệu quả nhất?',
options: [
{ label: 'Vẽ mindmap, sơ đồ', score: 'creativity:1' },
{ label: 'Thảo luận nhóm',    score: 'sociability:1' },
{ label: 'Game, video',       score: 'playfulness:1' }
] },
{ id: 8,  type: 'trait',  text: 'Bạn có kiên trì với việc khó?',
options: [
{ label: 'Rất kiên trì',        score: 'self_improvement:1' },
{ label: 'Chỉ khi hoàn hảo',    score: 'perfectionism:1' },
{ label: 'Dễ chán',             score: 'playfulness:1' }
] },
{ id: 9,  type: 'trait',  text: 'Bạn thích được khen vì gì?',
options: [
{ label: 'Giỏi nhất lớp',     score: 'competitiveness:1' },
{ label: 'Ý tưởng độc đáo',   score: 'creativity:1' },
{ label: 'Vui vẻ, hòa đồng',  score: 'sociability:1' }
] },
{ id: 10, type: 'polarity', text: 'Bạn có cảm thấy mình có thể làm được mọi thứ?',
options: [
{ label: 'Có, nếu cố gắng!', positive: 1 },
{ label: 'Thỉnh thoảng',     positive: 0.5 },
{ label: 'Không',            positive: 0 }
] },
{ id: 11, type: 'polarity', text: 'Bạn có hay chán khi làm 1 việc lâu?',
options: [
{ label: 'Rất hay',       negative: 1 },
{ label: 'Thỉnh thoảng',  negative: 0.5 },
{ label: 'Không',         negative: 0 }
] },
{ id: 12, type: 'trait', text: 'Bạn muốn được khen vì điều gì?',
options: [
{ label: 'Giỏi nhất',     score: 'competitiveness:1' },
{ label: 'Sáng tạo nhất', score: 'creativity:1' },
{ label: 'Vui vẻ nhất',   score: 'sociability:1' },
{ label: 'Khác', other: true }
] },

// --- Thêm nhiều câu mới để rút ngẫu nhiên ---
{ id: 13, type: 'trait', text: 'Khi có bài tập khó, bạn làm gì?',
  options: [
    { label: 'Tìm mẹo và shortcut', score: 'playfulness:1' },
    { label: 'Hỏi bạn bè/nhóm',     score: 'sociability:1' },
    { label: 'Lập plan chi tiết',   score: 'perfectionism:1' }
  ] },
{ id: 14, type: 'trait', text: 'Bạn yêu thích hoạt động nào?',
  options: [
    { label: 'Viết blog / dựng video', score: 'creativity:1' },
    { label: 'Thi đấu, đua top',       score: 'competitiveness:1' },
    { label: 'Thử cái mới mỗi tuần',   score: 'self_improvement:1' }
  ] },
{ id: 15, type: 'polarity', text: 'Bạn có thường hoàn thành công việc đúng hạn?',
  options: [
    { label: 'Luôn đúng hạn', positive: 1 },
    { label: 'Thỉnh thoảng trễ', positive: 0.5 },
    { label: 'Hay trễ', positive: 0 }
  ] },
{ id: 16, type: 'trait', text: 'Khi làm project nhóm, bạn thường là…',
  options: [
    { label: 'Người kết nối, hẹn lịch', score: 'sociability:1' },
    { label: 'Người lo chất lượng',     score: 'perfectionism:1' },
    { label: 'Người nghĩ ý tưởng',      score: 'creativity:1' }
  ] },
{ id: 17, type: 'trait', text: 'Bạn thấy điều gì hấp dẫn ở game?',
  options: [
    { label: 'Cạnh tranh top / rank', score: 'competitiveness:1' },
    { label: 'Tự do khám phá',        score: 'playfulness:1' },
    { label: 'Xây dựng, sáng tạo',    score: 'creativity:1' }
  ] },
{ id: 18, type: 'trait', text: 'Thói quen học tập của bạn là…',
  options: [
    { label: 'Nhóm học định kỳ',    score: 'sociability:1' },
    { label: 'Checklist và review', score: 'perfectionism:1' },
    { label: 'Bắt đầu ngay lập tức',score: 'self_improvement:1' }
  ] },
{ id: 19, type: 'polarity', text: 'Bạn thường trì hoãn công việc?',
  options: [
    { label: 'Không bao giờ', negative: 0 },
    { label: 'Đôi khi',       negative: 0.5 },
    { label: 'Khá thường xuyên', negative: 1 }
  ] },
{ id: 20, type: 'trait', text: 'Bạn thích kiểu thử thách nào?',
  options: [
    { label: 'Giải đố khó',      score: 'competitiveness:1' },
    { label: 'Sáng tạo nội dung',score: 'creativity:1' },
    { label: 'Hoạt động nhóm',   score: 'sociability:1' }
  ] },
{ id: 21, type: 'trait', text: 'Bạn quản lý lỗi sai như thế nào?',
  options: [
    { label: 'Sửa cho hoàn hảo', score: 'perfectionism:1' },
    { label: 'Xem như bài học',  score: 'self_improvement:1' },
    { label: 'Chơi/đổi hoạt động',score: 'playfulness:1' }
  ] },
{ id: 22, type: 'polarity', text: 'Bạn có tin vào việc luyện tập mỗi ngày tạo khác biệt lớn?',
  options: [
    { label: 'Rất tin', positive: 1 },
    { label: 'Bình thường', positive: 0.5 },
    { label: 'Không hẳn', positive: 0 }
  ] },
{ id: 23, type: 'trait', text: 'Nhận xét nào giống bạn nhất?',
  options: [
    { label: 'Thích giao lưu',       score: 'sociability:1' },
    { label: 'Cầu toàn',             score: 'perfectionism:1' },
    { label: 'Thích sáng tạo',       score: 'creativity:1' }
  ] },
{ id: 24, type: 'trait', text: 'Bạn thường đặt mục tiêu như thế nào?',
  options: [
    { label: 'SMART và đo lường', score: 'self_improvement:1' },
    { label: 'Mục tiêu thách thức', score: 'competitiveness:1' },
    { label: 'Tùy cảm hứng',      score: 'playfulness:1' }
  ] },
{ id: 25, type: 'trait', text: 'Kênh học ưa thích?',
  options: [
    { label: 'Video/Podcast',      score: 'playfulness:1' },
    { label: 'Sách/Tài liệu',      score: 'perfectionism:1' },
    { label: 'Workshop/Meetup',    score: 'sociability:1' }
  ] },
{ id: 26, type: 'polarity', text: 'Bạn có hay xin feedback sau mỗi bài/đồ án?',
  options: [
    { label: 'Luôn luôn', positive: 1 },
    { label: 'Thỉnh thoảng', positive: 0.5 },
    { label: 'Ít khi', positive: 0 }
  ] },
{ id: 27, type: 'trait', text: 'Câu nào đúng với bạn?',
  options: [
    { label: 'Ghét bị gián đoạn',      score: 'perfectionism:1' },
    { label: 'Giỏi khuấy động không khí', score: 'sociability:1' },
    { label: 'Ý tưởng xuất hiện liên tục', score: 'creativity:1' }
  ] },
{ id: 28, type: 'trait', text: 'Khi thiếu động lực, bạn sẽ…',
  options: [
    { label: 'Thử game hóa mục tiêu', score: 'playfulness:1' },
    { label: 'Tìm đối tác đồng hành', score: 'sociability:1' },
    { label: 'Tái thiết kế quy trình', score: 'perfectionism:1' }
  ] },
{ id: 29, type: 'polarity', text: 'Bạn có tin “nỗ lực > tài năng”?',
  options: [
    { label: 'Đồng ý mạnh', positive: 1 },
    { label: 'Phân vân',    positive: 0.5 },
    { label: 'Không đồng ý', positive: 0 }
  ] },
{ id: 30, type: 'trait', text: 'Bạn thấy tự hào nhất khi…',
  options: [
    { label: 'Vượt qua đối thủ', score: 'competitiveness:1' },
    { label: 'Tạo ra thứ mới',   score: 'creativity:1' },
    { label: 'Giúp đỡ mọi người',score: 'sociability:1' }
  ] }

];

// ====== Render ======
const listEl = document.getElementById('questionList');
const alertEl = document.getElementById('alert');
const missingCountEl = document.getElementById('missingCount');
const submitBtn = document.getElementById('submitBtn');

const traits = ['creativity','sociability','playfulness','perfectionism','self_improvement','competitiveness'];

// Fisher-Yates shuffle
function shuffle(arr){
const a = arr.slice();
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}

const picked = shuffle(BANK).slice(0, NUM_QUESTIONS);

function renderQuestions(){
listEl.innerHTML = '';
picked.forEach((q, idx) => {
const qId = `q_${q.id}`;
const wrapper = document.createElement('div');
wrapper.className = 'question';
wrapper.dataset.q = String(q.id);

  const title = document.createElement('h3');
  title.textContent = `${idx+1}. ${q.text}`;
  wrapper.appendChild(title);

  const options = document.createElement('div');
  options.className = 'options';

  q.options.forEach((opt, oi) => {
    const div = document.createElement('div');
    div.className = 'option';
    div.tabIndex = 0;
    div.setAttribute('role','button');
    div.dataset.index = String(oi);

    if (opt.other) div.classList.add('other-trigger');
    if (opt.score) div.dataset.score = opt.score; // trait:weight
    if (typeof opt.positive !== 'undefined') div.dataset.positive = String(opt.positive);
    if (typeof opt.negative !== 'undefined') div.dataset.negative = String(opt.negative);

    div.textContent = opt.label;
    options.appendChild(div);
  });
  wrapper.appendChild(options);

  // input cho "Khác"
  const otherWrap = document.createElement('div');
  otherWrap.className = 'other-input';
  otherWrap.style.display = 'none';
  const otherInput = document.createElement('input');
  otherInput.type = 'text';
  otherInput.placeholder = 'Nhập câu trả lời của bạn';
  otherWrap.appendChild(otherInput);
  wrapper.appendChild(otherWrap);

  listEl.appendChild(wrapper);
});


}

renderQuestions();

// ====== Interaction ======
listEl.addEventListener('click', (e) => {
const option = e.target.closest('.option');
if (!option) return;
const qBox = option.closest('.question');
const options = qBox.querySelectorAll('.option');
options.forEach(o => o.classList.remove('selected'));
option.classList.add('selected');


// Hiện/ẩn input "Khác"
const other = option.classList.contains('other-trigger');
const otherWrap = qBox.querySelector('.other-input');
if (other) {
  otherWrap.style.display = 'block';
  const input = otherWrap.querySelector('input');
  input.focus();
} else {
  otherWrap.style.display = 'none';
}

checkAllAnswered();


});

// keyboard support (Enter/Space)
listEl.addEventListener('keydown', (e) => {
if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('option')){
e.preventDefault();
e.target.click();
}
});

function checkAllAnswered(){
const boxes = listEl.querySelectorAll('.question');
let missing = 0;
boxes.forEach(b => {
if (!b.querySelector('.option.selected')) missing++;
});


submitBtn.disabled = missing > 0;
if (missing > 0) {
  alertEl.style.display = 'block';
  missingCountEl.textContent = String(missing);
} else {
  alertEl.style.display = 'none';
}


}

// ====== Scoring ======
function scoreQuiz(){
const result = {
creativity: 0,
sociability: 0,
playfulness: 0,
perfectionism: 0,
self_improvement: 0,
competitiveness: 0,
positive: 0,
negative: 0,
};


const boxes = listEl.querySelectorAll('.question');
boxes.forEach(b => {
  const sel = b.querySelector('.option.selected');
  if (!sel) return;

  const score = sel.dataset.score; // e.g. "creativity:1"
  if (score){
    const [trait, weightStr] = score.split(':');
    const weight = parseFloat(weightStr || '1');
    if (traits.includes(trait)) result[trait] += weight;
  }

  if (typeof sel.dataset.positive !== 'undefined') {
    result.positive += parseFloat(sel.dataset.positive || '0');
  }
  if (typeof sel.dataset.negative !== 'undefined') {
    result.negative += parseFloat(sel.dataset.negative || '0');
  }
});

return result;


}

// ====== Submit ======
submitBtn.addEventListener('click', () => {
// đảm bảo đã trả lời đủ
checkAllAnswered();
if (submitBtn.disabled) return;
const res = scoreQuiz();

try {
  // Lưu localStorage — tùy bạn chuyển sang Firebase tại đây
  localStorage.setItem('lq_traitScores', JSON.stringify(res));
  localStorage.setItem('lq_quizDone', 'true');
  // thưởng XP/coin nhẹ (tuỳ game):
  const xp = parseInt(localStorage.getItem('lq_xp') || '0', 10) + 50;
  localStorage.setItem('lq_xp', String(xp));
} catch(e){
  console.warn('Cannot access localStorage', e);
}

// quay về index
window.location.href = '/index.html?quiz=done';


});
})();