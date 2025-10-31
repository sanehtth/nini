/****************************************************
 * analytics.unified.js — Pipeline tuần & snapshots
 * Phụ trách:
 *  - App.Analytics.logActivity(uid, skill, opts)
 *  - App.Analytics.computeWeeklyMetrics(uid, when?)
 *  - App.Analytics.maybeRefreshWeekly(uid)
 * Lưu đúng schema:
 *  users/{uid}/weekly/{weekId}/{raw,pct,traits_pct,pi,fi,pi_star}
 *  users/{uid}/{skills, traits, metrics.{pi,fi,pi_star}}
 ****************************************************/
(function () {
  // Bảo vệ: chưa có DB thì không chạy
  window.App = window.App || {};
  const db = window.firebase?.database ? window.firebase.database() : window.App.db;
  if (!db) {
    console.warn("[analytics] Firebase DB chưa sẵn sàng.");
    return;
  }

  const SK = ["listening", "speaking", "reading", "writing"];
  const TR = ["creativity", "competitiveness", "sociability", "playfulness", "self_improvement", "perfectionism"];
  const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));
  const nz = (x) => Number(x) || 0;

  // Tính Monday (đầu tuần) cho weekId
  function weekIdOf(d = new Date()) {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  }

  // 1) Ghi sự kiện hành vi
  async function logActivity(uid, skill, opts = {}) {
    if (!uid || !SK.includes(skill)) return;
    const ev = {
      ts: Date.now(),
      type: skill,
      value: nz(opts.value) || 1,
      duration: nz(opts.duration),
      accuracy: typeof opts.accuracy === "number" ? opts.accuracy : undefined,
      difficulty: typeof opts.difficulty === "number" ? opts.difficulty : undefined,
      meta: {
        complete: !!opts.complete,
        selfReport: typeof opts.selfReport === "number" ? opts.selfReport : undefined,
        expectedDuration: nz(opts.expectedDuration),
        surge: !!opts.surge,
        transfer: typeof opts.transfer === "number" ? opts.transfer : undefined
      }
    };
    return db.ref(`behavior/${uid}/events`).push(ev);
  }

  // 2) Tổng hợp tuần từ events
  async function aggregateBehaviorForWeek(uid, startTs, endTs) {
    const q = db.ref(`behavior/${uid}/events`).orderByChild("ts").startAt(startTs).endAt(endTs);
    const snap = await q.once("value");
    const events = snap.val() || {};

    const raw = { listening: 0, speaking: 0, reading: 0, writing: 0 };
    let accSum = 0, accCnt = 0, completeCnt = 0, totalCnt = 0, transferSum = 0, transferCnt = 0;
    let srSum = 0, srCnt = 0, effSum = 0, effCnt = 0, fitSum = 0, fitCnt = 0;
    let mastery = 0, mCnt = 0, tr2 = 0, tr2Cnt = 0, stamina = 0, stCnt = 0, optIn = 0, opCnt = 0;

    Object.values(events).forEach((ev) => {
      if (SK.includes(ev.type)) raw[ev.type] += nz(ev.value || 1);
      totalCnt++;
      if (typeof ev.accuracy === "number") { accSum += ev.accuracy; accCnt++; }
      if (ev.meta && ev.meta.complete) completeCnt++;
      if (ev.meta && typeof ev.meta.transfer === "number") { transferSum += ev.meta.transfer; transferCnt++; }
      if (ev.meta && typeof ev.meta.selfReport === "number") { srSum += ev.meta.selfReport; srCnt++; }
      if (nz(ev.duration) > 0 && ev.meta && nz(ev.meta.expectedDuration) > 0) {
        effSum += Math.min(1, nz(ev.meta.expectedDuration) / nz(ev.duration)); effCnt++;
      }
      if (typeof ev.difficulty === "number" && typeof ev.accuracy === "number") {
        const fit = 1 - Math.abs(ev.difficulty - ev.accuracy); fitSum += fit; fitCnt++;
      }
      if (ev.meta && ev.meta.surge) {
        mastery += (ev.accuracy || 0); mCnt++;
        tr2 += (ev.meta.transfer || 0); tr2Cnt++;
        stamina += Math.min(1, nz(ev.duration) / 600); stCnt++;
        optIn += 1; opCnt++;
      }
    });

    const total = raw.listening + raw.speaking + raw.reading + raw.writing;
    const pct = (v) => Math.round(100 * v / Math.max(1, total));
    const skillsPct = {
      listening: pct(raw.listening),
      speaking:  pct(raw.speaking),
      reading:   pct(raw.reading),
      writing:   pct(raw.writing)
    };

    const acc = accCnt ? accSum / accCnt : 0;
    const completion = totalCnt ? (completeCnt / totalCnt) : 0;
    const transfer = transferCnt ? (transferSum / transferCnt) : 0;
    const selfReport = srCnt ? srSum / srCnt : 0;
    const timeEff = effCnt ? effSum / effCnt : 0;
    const diffFit = fitCnt ? fitSum / fitCnt : 0;

    const PI = 0.5 * acc + 0.3 * completion + 0.2 * transfer;
    const FI = 0.5 * selfReport + 0.3 * timeEff + 0.2 * diffFit;
    const PIstar = 0.4 * (mCnt ? mastery / mCnt : 0)
                 + 0.3 * (tr2Cnt ? tr2 / tr2Cnt : 0)
                 + 0.2 * (stCnt ? stamina / stCnt : 0)
                 + 0.1 * (opCnt ? optIn / opCnt : 0);

    return { raw, skillsPct, PI, FI, PIstar };
  }

  // 3) Map 4 kỹ năng → 6 traits (đơn giản; có thể thay bằng ma trận DB)
  function deriveTraitsPctFromSkillsPct(sk) {
    const t = {
      creativity:       (sk.reading + sk.writing) / 2,
      competitiveness:  sk.speaking,
      sociability:      sk.speaking,
      playfulness:      sk.listening,
      self_improvement: (sk.reading + sk.listening) / 2,
      perfectionism:    sk.writing
    };
    const out = {};
    TR.forEach(k => out[k] = Math.round(Math.min(100, Math.max(0, t[k] || 0))));
    return out;
  }

  // 4) Cập nhật snapshots cho UI
  async function updateSnapshotsForUI(uid, skillsPct, traitsPct, PI, FI, PIstar) {
    await db.ref(`users/${uid}/skills`).set(skillsPct);
    await db.ref(`users/${uid}/traits`).set(traitsPct);
    await db.ref(`users/${uid}/metrics`).update({
      pi: clamp01(PI), fi: clamp01(FI), pi_star: clamp01(PIstar)
    });
  }

  // 5) Tính & lưu metrics tuần hiện tại
  async function computeWeeklyMetrics(uid, when = new Date()) {
    const start = new Date(when);
    const day = (start.getDay() + 6) % 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const { raw, skillsPct, PI, FI, PIstar } = await aggregateBehaviorForWeek(uid, +start, +end);
    const traitsPct = deriveTraitsPctFromSkillsPct(skillsPct);
    const wid = weekIdOf(start);
    const base = db.ref(`users/${uid}/weekly/${wid}`);

    await base.child("raw").set(raw);
    await base.child("pct").set(skillsPct);
    await base.child("traits_pct").set(traitsPct);
    await base.update({ pi: clamp01(PI), fi: clamp01(FI), pi_star: clamp01(PIstar) });

    await updateSnapshotsForUI(uid, skillsPct, traitsPct, PI, FI, PIstar);
    return { wid, raw, skillsPct, traitsPct, PI, FI, PIstar };
  }

  // 6) Gọi tổng hợp mỗi ~7 ngày một lần
  async function maybeRefreshWeekly(uid) {
    const ref = db.ref(`users/${uid}`);
    const snap = await ref.once("value");
    const d = snap.val() || {};
    const now = Date.now();
    const last = d.lastTraitUpdate || 0;
    if (now - last < 7 * 24 * 60 * 60 * 1000) return;
    await computeWeeklyMetrics(uid);
    await ref.update({ lastTraitUpdate: now });
  }

  window.App.Analytics = { logActivity, computeWeeklyMetrics, maybeRefreshWeekly };
})();
