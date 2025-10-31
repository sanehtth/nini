window.App = window.App || {};

(() => {
  const db = ()=>window.App.db;

  function getIsoWeekKey(d=new Date()){
    const date = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const day = date.getUTCDay()||7;
    date.setUTCDate(date.getUTCDate()+4-day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((date-yearStart)/86400000)+1)/7);
    return `${date.getUTCFullYear()}-${String(weekNo).padStart(2,"0")}`;
  }

  function logActivity(uid, gameId){
    const week = getIsoWeekKey();
    const ref = db().ref(`users/${uid}/activity/${week}/${gameId}`);
    ref.transaction(cur => (cur||0)+1);
  }

  function maybeRefreshWeekly(uid, data){
    const now = Date.now();
    const last = data.lastTraitUpdate || 0;
    if (now - last < 7*24*60*60*1000) return; // <7 ngày, bỏ qua

    const activity = data.activity || {};
    const weekKey = Object.keys(activity).sort().pop();
    if (!weekKey){
      return db().ref(`users/${uid}`).update({ lastTraitUpdate: now });
    }

    const weights = {
      art:"creativity", math:"competitiveness", english:"sociability",
      game:"playfulness", science:"self_improvement", puzzle:"perfectionism"
    };

    const act = activity[weekKey];
    let totals = {
      creativity:0, competitiveness:0, sociability:0,
      playfulness:0, self_improvement:0, perfectionism:0
    };
    Object.keys(act).forEach(game=>{
      const t = weights[game];
      if (t) totals[t] += act[game]||0;
    });

    const maxVal = Math.max(...Object.values(totals));
    if (maxVal>0) {
      Object.keys(totals).forEach(k=>{
        totals[k] = Math.round((totals[k]/maxVal)*12);  // scale 0..12
      });
    } else {
      totals = data.traits || totals; // không hoạt động: giữ nguyên
    }

    return db().ref(`users/${uid}`).update({
      traits: totals,
      lastTraitUpdate: now
    });
  }

  window.App.Analytics = { logActivity, maybeRefreshWeekly };
})();
