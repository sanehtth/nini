// js/game.js — Demo 4 mini-game theo skill; thật tế bạn thay bằng game thật
window.Game = {
play(uid, skill){
// giả lập hoàn thành 1 hoạt động ~1 điểm
App.Analytics.logActivity(uid, skill, { value:1, complete:true, accuracy:0.7, duration:300, difficulty:0.6 });
alert(`Đã ghi 1 hoạt động cho ${skill}`);
}
};
