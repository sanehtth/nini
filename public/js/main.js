// js/main.js
type:'radar', data:{
labels:['Creativity','Competitiveness','Sociability','Playfulness','Self-Improvement','Perfectionism'],
datasets:[{ label:'Traits % (capped 60)', data }]
}, options:{ responsive:true, scales:{ r:{ min:0, max:60, ticks:{ stepSize:10 } } } }
});
}


// Nhiệm vụ hằng ngày từ trait mạnh nhất
async function refreshDailyMission(uid){
const t = (await db.ref('users/'+uid+'/traits').once('value')).val()||{};
const top = Object.entries(t).sort((a,b)=> (b[1]||0)-(a[1]||0))[0];
const topKey = top ? top[0] : 'self_improvement';
const map = {
creativity: 'Viết lại đoạn hội thoại theo phong cách khác.',
competitiveness: 'Thử vượt kỷ lục điểm ở mini-game đấu nhanh.',
sociability: 'Trao đổi 5 câu với bạn học/AI voice.',
playfulness: 'Chơi game nghe nhạc đoán từ 10 phút.',
self_improvement: 'Hoàn thành 1 bài đọc nâng cao.',
perfectionism: 'Sửa lỗi ngữ pháp cho 1 đoạn văn cũ.'
};
$('dailyMission').textContent = map[topKey];
}


// === Event bindings ===
window.addEventListener('DOMContentLoaded', ()=>{
// theme & logout
$('themeBtn').onclick = toggleTheme;
$('logoutBtn').onclick = ()=> auth.signOut();


// auth tabs
$('tabLogin').onclick = ()=> activateTab('login');
$('tabSignup').onclick = ()=> activateTab('signup');


// login
$('loginBtn').onclick = async ()=>{
const email = $('loginEmail').value.trim(); const pass = $('loginPassword').value;
try{ await AuthUI.login(email, pass); $('authMsg').textContent=''; }
catch(e){ $('authMsg').textContent = e.message || 'Đăng nhập thất bại'; }
};


// forgot
$('forgotBtn').onclick = async ()=>{
const email = $('loginEmail').value.trim(); if(!email){ $('authMsg').textContent='Nhập email trước.'; return; }
try{ await AuthUI.resetPassword(email); $('authMsg').textContent='Đã gửi email đặt lại mật khẩu.'; }
catch(e){ $('authMsg').textContent = e.message || 'Không gửi được email.'; }
};


// signup
$('signupBtn').onclick = async ()=>{
const email = $('signupEmail').value.trim(); const pass = $('signupPassword').value;
try{ await AuthUI.signup(email, pass); $('authMsg').textContent='Tạo tài khoản thành công!'; }
catch(e){ $('authMsg').textContent = e.message || 'Đăng ký thất bại'; }
};


// đi làm quiz thủ công
$('goQuiz').onclick = (e)=>{ e.preventDefault(); window.location.href = 'quiz.html'; };
});


// === Auth state → điều hướng ===
auth.onAuthStateChanged(async (user)=>{
if(!user){ showLogin(); return; }
currentUser = user; showApp();
// tổng hợp tuần nếu tới hạn
if(window.App?.Analytics?.maybeRefreshWeekly) window.App.Analytics.maybeRefreshWeekly(user.uid);


// nạp snapshots
const [traitsSnap, skillsSnap] = await Promise.all([
db.ref('users/'+user.uid+'/traits').once('value'),
db.ref('users/'+user.uid+'/skills').once('value')
]);
const traits = traitsSnap.val()||{}; const skills = skillsSnap.val()||{};


// nếu chưa có traits → bắt làm quiz ngay
if(!traits || Object.values(traits).every(v => (v||0)===0)){
window.location.href = 'quiz.html'; return;
}


renderTraitsRadar(traits); renderSkillBars(skills); refreshDailyMission(user.uid);


// demo: bấm game → log event
const bind = (id, skill)=> $(id).onclick = ()=> App.Analytics.logActivity(user.uid, skill, { value:1, complete:true });
bind('playListening','listening'); bind('playSpeaking','speaking'); bind('playReading','reading'); bind('playWriting','writing');
});
