// js/behavior.js — Ghi hành vi học → đầu vào cho weekly
window.App = window.App || {};
window.App.logBehaviorEvent = function(uid, type, meta={}){
return firebase.database().ref(`behavior/${uid}/events`).push({ ts:Date.now(), type, ...meta });
};
