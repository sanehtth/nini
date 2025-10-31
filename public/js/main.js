// SPA router: #quiz => show quizScreen, hide appScreen
function handleRoute() {
  const isQuiz = location.hash === "#quiz";
  const app = document.getElementById("appScreen");
  const quiz= document.getElementById("quizScreen");
  const auth= document.getElementById("authScreen");

  // Luôn ẩn auth khi đã đăng nhập
  auth && auth.classList.add("hidden");

  // Bật/tắt app vs quiz
  if (app)  app.classList.toggle("hidden", isQuiz);
  if (quiz) quiz.classList.toggle("hidden", !isQuiz);

  // Khi vào #quiz, render UI
  if (isQuiz && typeof window.renderQuiz === "function") {
    window.renderQuiz();                 // quiz.js sẽ vẽ vào #quizRoot
    // nút quay lại
    const back = document.getElementById("quizBackBtn");
    if (back && !back._bound) {
      back._bound = true;
      back.onclick = () => { location.hash = ""; };
    }
  }
}

window.addEventListener("hashchange", handleRoute);
window.addEventListener("DOMContentLoaded", handleRoute);
