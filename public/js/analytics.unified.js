/****************************************************
* analytics.unified.js — Pipeline tuần & snapshots
* NOTE: QUAN TRỌNG: không đổi tên key đã chuẩn hoá.
****************************************************/
(function(){
window.App = window.App || {}; const db = window.App.db;
if(!db){ console.warn('App.db missing'); return; }


const SK = ['listening','speaking','reading','writing'];
const TR = ['creativity','competitiveness','sociability','playfulness','self_improvement','perfectionism'];
const clamp01 = x=> Math.max(0, Math.min(1, Number(x)||0));
const nz = x=> Number(x)||0;
function weekIdOf(d=new Date()){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; }


async function logActivity(uid, skill, opts={}){
if(!SK.includes(skill)) return; const ev={ ts:Date.now(), type:skill, value:nz(opts.value)||1, duration:nz(opts.duration), accuracy:opts.accuracy, difficulty:opts.difficulty, meta:{ complete:!!opts.complete, selfReport:opts.selfReport, expectedDuration:nz(opts.expectedDuration), surge:!!opts.surge, transfer:opts.transfer } };
await db.ref(`behavior/${uid}/events`).push(ev);
}


async function aggregateBehaviorForWeek(uid, startTs, endTs){
const q = db.ref(`behavior/${uid}/events`).orderByChild('ts').startAt(startTs).endAt(endTs);
const snap = await q.once('value'); const events = snap.val()||{};
const raw = { listening:0, speaking:0, reading:0, writing:0 };
let accSum=0,accCnt=0, completeCnt=0,totalCnt=0, transferSum=0,transferCnt=0;
let srSum=0,srCnt=0, effSum=0,effCnt=0, fitSum=0,fitCnt=0; // cho FI
let mastery=0, mCnt=0, tr2=0,tr2Cnt=0, stamina=0, stCnt=0, optIn=0, opCnt=0; // cho PI★


Object.values(events).forEach(ev=>{
if(SK.includes(ev.type)) raw[ev.type]+= nz(ev.value||1);
totalCnt++;
if(typeof ev.accuracy==='number'){ accSum+=ev.accuracy; accCnt++; }
if(ev.meta?.complete) completeCnt++;
if(typeof ev.meta?.transfer==='number'){ transferSum+=ev.meta.transfer; transferCnt++; }
if(typeof ev.meta?.selfReport==='number'){ srSum+=ev.meta.selfReport; srCnt++; }
if(nz(ev.duration)>0 && nz(ev.meta?.expectedDuration)>0){ effSum += Math.min(1, nz(ev.meta.expectedDuration)/nz(ev.duration)); effCnt++; }
if(typeof ev.difficulty==='number' && typeof ev.accuracy==='number'){ const fit = 1 - Math.abs(ev.difficulty - ev.accuracy); fitSum+=fit; fitCnt++; }
if(ev.meta?.surge){ mastery+= (ev.accuracy||0); mCnt++; tr2 += (ev.meta.transfer||0); tr2Cnt++; stamina += Math.min(1, nz(ev.duration)/600); stCnt++; optIn += 1; opCnt++; }
});


const pct = (v)=> Math.round(100 * v / Math.max(1, raw.listening+raw.speaking+raw.reading+raw.writing));
const skillsPct = {
listening: pct(raw.listening), speaking: pct(raw.speaking), reading: pct(raw.reading), writing: pct(raw.writing)
};


const acc = accCnt? accSum/accCnt : 0; const completion = totalCnt? (completeCnt/totalCnt):0; const transfer = transferCnt? (transferSum/transferCnt):0;
const selfReport = srCnt? srSum/srCnt:0; const timeEff = effCnt? effSum/effCnt:0; const diffFit = fitCnt? fitSum/fitCnt:0;
const PI = 0.5*acc + 0.3*completion + 0.2*transfer;
const FI = 0.5*selfReport + 0.3*timeEff + 0.2*diffFit;
const PIstar = (0.4*(mCnt? mastery/mCnt:0) + 0.3*(tr2Cnt? tr2/tr2Cnt:0) + 0.2*(stCnt? stamina/stCnt:0) + 0.1*(opCnt? optIn/opCnt:0));


return { raw, skillsPct, PI, FI, PIstar };
}


async function deriveTraitsPctFromSkillsPct(sk){
// đơn giản: ánh xạ đều hoặc tuỳ chỉnh bằng ma trận (có thể đọc từ config DB sau)
const t = {
creativity: (sk.reading + sk.writing)/2,
competitiveness: sk.speaking,
sociability: sk.speaking,
playfulness: sk.listening,
self_improvement: (sk.reading+sk.listening)/2,
perfectionism: sk.writing
};
return Object.fromEntries(TR.map(k=> [k, Math.round(Math.min(100, Math.max(0, t[k]||0)))]));
}


async function updateSnapshotsForUI(uid, skillsPct, traitsPct, PI, FI, PIstar){
await db.ref(`users/${uid}/skills`).set(skillsPct);
await db.ref(`users/${uid}/traits`).set(traitsPct);
await db.ref(`users/${uid}/metrics`).update({ pi:clamp01(PI), fi:clamp01(FI), pi_star:clamp01(PIstar) });
}


async function computeWeeklyMetrics(uid, when=new Date()){
const start = new Date(when); const day=(start.getDay()+6)%7; start.setHours(0,0,0,0); start.setDate(start.getDate()-day);
const end = new Date(start); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
const { raw, skillsPct, PI, FI, PIstar } = await aggregateBehaviorForWeek(uid, +start, +end);
const traitsPct = await deriveTraitsPctFromSkillsPct(skillsPct);
const wid = weekIdOf(start); const base = db.ref(`users/${uid}/weekly/${wid}`);
await base.child('raw').set(raw); await base.child('pct').set(skillsPct); await base.child('traits_pct').set(traitsPct);
await base.update({ pi:clamp01(PI), fi:clamp01(FI), pi_star:clamp01(PIstar) });
await updateSnapshotsForUI(uid, skillsPct, traitsPct, PI, FI, PIstar);
return { wid, raw, skillsPct, traitsPct, PI, FI, PIstar };
})();
