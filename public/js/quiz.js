// js/quiz.js — Trắc nghiệm lần đầu & làm lại khi thiếu dữ liệu
const Q = window.TRAIT_BANK; const dbq = window.firebaseDB; const authq = window.firebaseAuth;


function buildPool(){
const pool = [];
Object.keys(Q).forEach(trait=>{
Q[trait].forEach(item=>{
const options = item.options.map(o=>o.label);
const scores = {}; item.options.forEach(o=>{
const [k,v] = String(o.score).split(':'); scores[k]=Number(v);
});
pool.push({ q:item.text, options, scores });
});
});
return pool;
}


function renderQuiz(){
const root = document.body; const pool = buildPool();
const form = document.createElement('form'); form.className='card';
form.innerHTML = `<h2>Trắc nghiệm sở thích học</h2>`;
pool.forEach((it,idx)=>{
const div = document.createElement('div');
div.innerHTML = `<p><strong>${idx+1}. ${it.q}</strong></p>` + it.options.map((op,i)=>
`<label><input type="radio" name="q${idx}" value="${i}"> ${op}</label>`
).join('<br/>');
form.appendChild(div);
});
const btn = document.createElement('button'); btn.type='submit'; btn.className='btn primary'; btn.textContent='Nộp bài';
form.appendChild(document.createElement('hr')); form.appendChild(btn);
form.onsubmit = async (e)=>{
e.preventDefault();
const pool2 = buildPool();
const sums = { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };
pool2.forEach((it,idx)=>{
const val = (new FormData(form)).get('q'+idx);
if(val==null) return; const opt = it.options[Number(val)];
const scoring = it.scores; Object.keys(scoring).forEach(k=>{ sums[k] += Number(scoring[k]||0); });
});
// chuẩn hóa về % (0..100)
const maxPerTrait = pool2.filter(i=>Object.keys(i.scores).includes('creativity')).length || 6; // gần đúng
const toPct = (x)=> Math.round(100 * x / Math.max(1,maxPerTrait));
const traits = {
creativity:toPct(sums.creativity), competitiveness:toPct(sums.competitiveness), sociability:toPct(sums.sociability),
playfulness:toPct(sums.playfulness), self_improvement:toPct(sums.self_improvement), perfectionism:toPct(sums.perfectionism)
};
const uid = authq.currentUser.uid;
await dbq.ref('users/'+uid+'/traits').set(traits);
alert('Đã lưu trắc nghiệm. Quay lại trang chính để xem biểu đồ.');
window.location.href = 'index.html';
};
root.innerHTML=''; root.appendChild(form);
}


window.addEventListener('DOMContentLoaded', ()=>{
if(!authq.currentUser){ window.location.href='index.html'; return; }
renderQuiz();
});
