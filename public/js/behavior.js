// behavior.js — core
(function (w) {
  const db = w.firebaseDB;
  const CFG = w.TraitConfig;

  function yearWeekKey(d = new Date()) {
    const y = d.getUTCFullYear(); const oneJan = new Date(Date.UTC(y,0,1));
    const week = Math.ceil((((d - oneJan)/86400000) + oneJan.getUTCDay()+1) / 7);
    return `${y}-W${String(week).padStart(2,'0')}`;
  }

  const Behavior = {
    uid: null,
    setUser(uid) { this.uid = uid; },

    log(eventKey) {
      if (!this.uid) return;
      const w = (CFG.weights || {})[eventKey] || {};
      if (!Object.keys(w).length) return;

      const ref = db.ref(`weekly/${this.uid}/${yearWeekKey()}/raw`);
      ref.transaction(cur => {
        cur = cur || {};
        for (const [trait, delta] of Object.entries(w)) {
          cur[trait] = (cur[trait] || 0) + delta;
        }
        return cur;
      });
    },

    async finalizeWeek(d = new Date()) {
      if (!this.uid) return;
      const wk = yearWeekKey(d);
      const rawSnap = await db.ref(`weekly/${this.uid}/${wk}/raw`).once('value');
      const raw = rawSnap.val() || {};

      // normalize → 0..12
      const max = CFG.weeklyMax || {};
      const traits12 = {};
      for (const t of ["creativity","competitiveness","sociability","playfulness","self_improvement","perfectionism"]) {
        const r = Math.max(0, raw[t] || 0);
        const cap = Math.max(1, max[t] || 12);
        traits12[t] = Math.min(12, Math.round((r / cap) * 12));
      }

      // merge vào profile (EMA)
      const profRef = db.ref(`users/${this.uid}`);
      const prof = (await profRef.once('value')).val() || {};
      const prev = prof.traits || {};
      const alpha = 0.5; // độ “mềm”
      const merged = {};
      for (const t of Object.keys(traits12)) {
        merged[t] = Math.min(12, Math.max(0, Math.round((1 - alpha) * (prev[t] || 0) + alpha * traits12[t])));
      }

      await profRef.update({
        traitsRawLastWeek: raw,
        traitsLastWeek: traits12,
        traits: merged,
      });
    },
  };

  w.Behavior = Behavior;
})(window);
