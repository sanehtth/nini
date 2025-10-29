/***********************************************************
 * analytics.unified.js — Hợp nhất bản cũ & mới (1 file)
 * - Nền tảng: 4 kỹ năng (listening/speaking/reading/writing)
 * - Suy ra 6 thuộc tính để vẽ Radar (creativity…)
 * - API tương thích ngược: window.App.Analytics.{logActivity, maybeRefreshWeekly}
 * - API mới đầy đủ: window.Metrics.{computeWeeklyMetrics, updateTraitEMA, ...}
 *
 * Cách include:
 *   <script defer src="/js/firebase.js"></script>
 *   <script defer src="/js/analytics.unified.js"></script>
 *   <script defer src="/js/main.js"></script>
 ***********************************************************/

(function () {
  // ===== Guard =====
  window.App = window.App || {};
  if (!window.App.db) {
    console.warn("[analytics.unified] window.App.db is required.");
    return;
  }
  const db = window.App.db;

  /***********************
   * 0) Helpers
   ***********************/
  // Tuần hiện tại (thứ 2 là đầu tuần) -> key "YYYY-MM-DD"
  function getCurrentWeekId(date = new Date()) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // 0=Mon..6=Sun
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - day);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));
  const nz = (x) => Number(x) || 0;

  const SKILLS = ["listening","speaking","reading","writing"];
  const TRAITS = ["creativity","competitiveness","sociability","playfulness","self_improvement","perfectionism"];

  /***********************
   * 1) Behavior logging (sự kiện)
   ***********************/
  // NOTE: Ghi 1 event hành vi → dùng cho tổng hợp tuần
  // opts: { value=1, duration, difficulty, accuracy, selfReport, complete, expectedDuration, surge, transfer }
  async function logBehaviorEvent(uid, skill, opts = {}) {
    if (!SKILLS.includes(skill)) return;
    const ev = {
      ts: Date.now(),
      type: skill,
      value: Number(opts.value ?? 1),
      duration: Number(opts.duration ?? 0),
      difficulty: typeof opts.difficulty === "number" ? opts.difficulty : undefined,
      accuracy:  typeof opts.accuracy  === "number" ? opts.accuracy  : undefined,
      meta: {
        complete: !!opts.complete,
        expectedDuration: Number(opts.expectedDuration ?? 0),
        selfReport: typeof opts.selfReport === "number" ? opts.selfReport : undefined,
        surge: !!opts.surge,
        transfer: typeof opts.transfer === "number" ? opts.transfer : undefined
      }
    };
    await db.ref(`behavior/${uid}/events`).push(ev);
  }

  /***********************
   * 2) Tổng hợp tuần từ events
   ***********************/
  async function aggregateBehaviorForWeek(uid, startTs, endTs) {
    const ref = db.ref(`behavior/${uid}/events`).orderByChild("ts").startAt(startTs).endAt(endTs);
    const snap = await ref.once("value");
    const events = snap.val() || {};

    // Thô theo skill
    const raw = { listening:0, speaking:0, reading:0, writing:0 };

    // Inputs PI/FI
    let accSum=0, accCnt=0;
    let completeCnt=0, totalCnt=0;
    let transferSum=0, transferCnt=0;

    let srSum=0, srCnt=0;
    let effSum=0, effCnt=0;
    let fitSum=0, fitCnt=0;

    // Surge inputs
    let surgeMastery=0, surgeCnt=0;
    let surgeTransfer=0, surgeTrCnt=0;
    let surgeStamina=0, surgeStCnt=0;
    let surgeOptIn=0, surgeOptCnt=0;

    Object.values(events).forEach(ev => {
      const type = ev.type;
      const value = nz(ev.value);
      if (SKILLS.includes(type)) raw[type] += value;

      totalCnt += 1;

      if (typeof ev.accuracy === "number") {
        accSum += clamp01(ev.accuracy); accCnt++;
      }
      const complete = !!(ev.meta && ev.meta.complete);
      if (complete) completeCnt++;

      if (ev.meta && typeof ev.meta.transfer === "number") {
        transferSum += clamp01(ev.meta.transfer); transferCnt++;
      }

      // FI
      if (ev.meta && typeof ev.meta.selfReport === "number") {
        srSum += clamp01(ev.meta.selfReport); srCnt++;
      }
      const dur = nz(ev.duration);
      const exp = nz(ev.meta && ev.meta.expectedDuration);
      if (dur>0 && exp>0) { // time efficiency: exp/dur
        const eff = Math.max(0, Math.min(1, exp / dur));
        effSum += eff; effCnt++;
      }
      if (typeof ev.difficulty === "number" && typeof ev.accuracy === "number") {
        // difficulty fit: |acc - (1 - diff)| càng nhỏ càng tốt
        const fit = 1 - Math.min(1, Math.abs(clamp01(ev.accuracy) - (1 - clamp01(ev.difficulty))));
        fitSum += fit; fitCnt++;
      }

      // Surge
      const surge = !!(ev.meta && ev.meta.surge);
      if (surge) {
        if (typeof ev.accuracy === "number") { surgeMastery += clamp01(ev.accuracy); surgeCnt++; }
        if (ev.meta && typeof ev.meta.transfer === "number") { surgeTransfer += clamp01(ev.meta.transfer); surgeTrCnt++; }
        if (dur>0) { surgeStamina += Math.max(0, Math.min(1, dur/1200)); surgeStCnt++; } // 20' = 1.0
        if (ev.meta && typeof ev.meta.selfReport === "number") { surgeOptIn += clamp01(ev.meta.selfReport); surgeOptCnt++; }
      }
    });

    // Chuẩn hoá % theo tổng tuần (skills_pct)
    const sum = raw.listening + raw.speaking + raw.reading + raw.writing;
    const skillsPct = sum>0 ? {
      listening: raw.listening/sum*100,
      speaking:  raw.speaking/sum*100,
      reading:   raw.reading/sum*100,
      writing:   raw.writing/sum*100,
    } : { listening:0, speaking:0, reading:0, writing:0 };

    // Averages
    const avgAccuracy  = accCnt ? accSum/accCnt : 0;
    const completion   = totalCnt ? (completeCnt/totalCnt) : 0;
    const avgTransfer  = transferCnt ? transferSum/transferCnt : 0;

    const selfReport   = srCnt ? srSum/srCnt : 0;
    const timeEff      = effCnt ? effSum/effCnt : 0;
    const diffFit      = fitCnt ? fitSum/fitCnt : 0;

    const surgeMasteryAvg  = surgeCnt   ? surgeMastery/surgeCnt : 0;
    const surgeTransferAvg = surgeTrCnt ? surgeTransfer/surgeTrCnt : 0;
    const surgeStaminaAvg  = surgeStCnt ? surgeStamina/surgeStCnt : 0;
    const surgeOptInAvg    = surgeOptCnt? surgeOptIn/surgeOptCnt : 0;

    return {
      raw, skillsPct,
      piInputs: { avgAccuracy, completion, avgTransfer },
      fiInputs: { selfReport, timeEff, diffFit },
      surgeInputs: { surgeMasteryAvg, surgeTransferAvg, surgeStaminaAvg, surgeOptInAvg }
    };
  }

  /***********************
   * 3) Chỉ số tổng hợp (PI, FI, PI★)
   ***********************/
  function computePI({ avgAccuracy=0, completion=0, avgTransfer=0 }) {
    const wAcc=0.5, wCom=0.3, wTr=0.2;
    return clamp01(wAcc*clamp01(avgAccuracy) + wCom*clamp01(completion) + wTr*clamp01(avgTransfer));
  }
  function computeFI({ selfReport=0, timeEff=0, diffFit=0 }) {
    const wSR=0.5, wTE=0.3, wDF=0.2;
    return clamp01(wSR*clamp01(selfReport) + wTE*clamp01(timeEff) + wDF*clamp01(diffFit));
  }
  function computePIStar({ mastery=0, transfer=0, stamina=0, optIn=0 }) {
    return clamp01(0.4*clamp01(mastery) + 0.3*clamp01(transfer) + 0.2*clamp01(stamina) + 0.1*clamp01(optIn));
  }

  /***********************
   * 4) Mapping 4 kỹ năng → 6 thuộc tính (config JSON)
   ***********************/
  async function loadTraitMapping() {
    const snap = await db.ref("config/trait_mapping/english/weights").once("value");
    const w = snap.val();
    if (w) return w;
    // default đều nếu chưa cấu hình
    return {
      creativity:       { listening:0.25, speaking:0.25, reading:0.25, writing:0.25 },
      competitiveness:  { listening:0.25, speaking:0.25, reading:0.25, writing:0.25 },
      sociability:      { listening:0.25, speaking:0.25, reading:0.25, writing:0.25 },
      playfulness:      { listening:0.25, speaking:0.25, reading:0.25, writing:0.25 },
      self_improvement: { listening:0.25, speaking:0.25, reading:0.25, writing:0.25 },
      perfectionism:    { listening:0.25, speaking:0.25, reading:0.25, writing:0.25 },
    };
  }
  function deriveTraitsPctFromSkillsPct(skillsPct, weights) {
    const raw = {};
    TRAITS.forEach(t => {
      let s=0; SKILLS.forEach(k => { s += (Number(weights?.[t]?.[k])||0) * (Number(skillsPct?.[k])||0); });
      raw[t] = Math.max(0, s);
    });
    const sum = TRAITS.reduce((a,t)=>a+raw[t], 0);
    const pct = {};
    if (sum>0) TRAITS.forEach(t => pct[t] = raw[t]/sum*100);
    else TRAITS.forEach(t => pct[t] = 0);
    return pct;
  }

  /***********************
   * 5) EMA cho traits (tùy chọn)
   ***********************/
  async function updateTraitEMA(uid, { alpha=0.1, sourceWeekId=getCurrentWeekId() } = {}) {
    const snap = await db.ref(`users/${uid}/weekly/${sourceWeekId}/traits_pct`).once("value");
    const signal = snap.val() || { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };

    const emaRef = db.ref(`users/${uid}/metrics/traits_ema`);
    const prevSnap = await emaRef.once("value");
    const prev = prevSnap.val() || { creativity:0, competitiveness:0, sociability:0, playfulness:0, self_improvement:0, perfectionism:0 };

    const ema = {};
    TRAITS.forEach(t => {
      ema[t] = alpha*(Number(signal[t])||0) + (1-alpha)*(Number(prev[t])||0);
    });
    await emaRef.set(ema);
    return ema;
  }

  /***********************
   * 6) Lưu weekly + snapshot UI
   ***********************/
  async function saveWeekly(uid, weekId, { skillsRaw, skillsPct, traitsPct, pi, fi, piStar }) {
    const base = db.ref(`users/${uid}/weekly/${weekId}`);
    await base.child("skills_raw").set(skillsRaw);
    await base.child("skills_pct").set(skillsPct);
    await base.child("traits_pct").set(traitsPct);
    await base.child("pi").set(clamp01(pi));
    await base.child("fi").set(clamp01(fi));
    await base.child("pistar").set(clamp01(piStar));
  }
  async function updateSnapshotsForUI(uid, { skillsPct, traitsPct, pi, fi, piStar }) {
    await db.ref(`users/${uid}/skills`).set({
      listening:  Number(skillsPct.listening  || 0),
      speaking:   Number(skillsPct.speaking   || 0),
      reading:    Number(skillsPct.reading    || 0),
      writing:    Number(skillsPct.writing    || 0),
    });
    await db.ref(`users/${uid}/traits`).set({
      creativity:       Number(traitsPct.creativity       || 0),
      competitiveness:  Number(traitsPct.competitiveness  || 0),
      sociability:      Number(traitsPct.sociability      || 0),
      playfulness:      Number(traitsPct.playfulness      || 0),
      self_improvement: Number(traitsPct.self_improvement || 0),
      perfectionism:    Number(traitsPct.perfectionism    || 0),
    });
    await db.ref(`users/${uid}/metrics`).update({
      pi: clamp01(pi), fi: clamp01(fi), pistar: clamp01(piStar)
    });
  }

  /***********************
   * 7) Hàm “tất cả trong một” cho tuần
   ***********************/
  async function computeWeeklyMetrics(uid, {
    weekId = getCurrentWeekId(),
    startTs = null, endTs = null,
    emaAlpha = 0.1
  } = {}) {
    // Khoảng tuần tự tính nếu chưa truyền
    if (startTs == null || endTs == null) {
      const base = new Date(weekId + "T00:00:00");
      startTs = base.getTime();
      endTs   = startTs + 7*24*3600*1000 - 1;
    }

    // 1) Tổng hợp sự kiện → skills_raw, skills_pct + inputs chỉ số
    const agg = await aggregateBehaviorForWeek(uid, startTs, endTs);
    const skillsRaw = agg.raw;
    const skillsPct = agg.skillsPct;

    // 2) Mapping thành 6 traits %
    const weights = await loadTraitMapping();
    const traitsPct = deriveTraitsPctFromSkillsPct(skillsPct, weights);

    // 3) Tính chỉ số 0..1
    const pi     = computePI(agg.piInputs);
    const fi     = computeFI(agg.fiInputs);
    const piStar = computePIStar({
      mastery:  agg.surgeInputs.surgeMasteryAvg,
      transfer: agg.surgeInputs.surgeTransferAvg,
      stamina:  agg.surgeInputs.surgeStaminaAvg,
      optIn:    agg.surgeInputs.surgeOptInAvg
    });

    // 4) Lưu weekly & snapshot UI
    await saveWeekly(uid, weekId, { skillsRaw, skillsPct, traitsPct, pi, fi, piStar });
    await updateSnapshotsForUI(uid, { skillsPct, traitsPct, pi, fi, piStar });

    // 5) EMA traits (tùy chọn)
    await updateTraitEMA(uid, { alpha: emaAlpha, sourceWeekId: weekId });

    return { weekId, skillsRaw, skillsPct, traitsPct, pi, fi, piStar };
  }

  /***********************
   * 8) Expose API (mới)
   ***********************/
  window.Metrics = {
    // Helpers
    getCurrentWeekId,
    // Core
    computeWeeklyMetrics,
    updateTraitEMA,
    // If needed externally
    computePI, computeFI, computePIStar,
    // For tests
    _aggregateBehaviorForWeek: aggregateBehaviorForWeek,
    _deriveTraitsPctFromSkillsPct: deriveTraitsPctFromSkillsPct,
    _loadTraitMapping: loadTraitMapping
  };

  /***********************
   * 9) API tương thích ngược (bản cũ)
   *    window.App.Analytics.{logActivity, maybeRefreshWeekly}
   ***********************/
  // Map gameId cũ → skill (mặc định giữ nguyên nếu đã là skill)
  const GAME_TO_SKILL = {
    listening:"listening", speaking:"speaking", reading:"reading", writing:"writing",
    // nếu UI cũ còn các id khác, map tạm về 1 skill gần nhất:
    art:"writing", math:"speaking", english:"reading", game:"listening", science:"reading", puzzle:"writing",
  };

  async function compat_logActivity(uid, gameIdOrSkill, opts={}) {
    const skill = GAME_TO_SKILL[gameIdOrSkill] || gameIdOrSkill;
    return logBehaviorEvent(uid, skill, opts);
  }

  async function compat_maybeRefreshWeekly(uid) {
    // cùng logic “>7 ngày mới chốt tuần” như file cũ
    const userRef = db.ref(`users/${uid}`);
    const snap = await userRef.once("value");
    const data = snap.val() || {};
    const now = Date.now();
    const last = data.lastTraitUpdate || 0;
    if (now - last < 7*24*60*60*1000) return;

    await computeWeeklyMetrics(uid);             // tổng hợp & cập nhật tất cả
    await userRef.update({ lastTraitUpdate: now }); // ghi mốc
  }

  window.App.Analytics = {
    logActivity: compat_logActivity,
    maybeRefreshWeekly: compat_maybeRefreshWeekly
  };
})();
