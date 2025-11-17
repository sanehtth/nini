// js/admin.js

const ADMIN_EMAIL = "sane.htth@gmail.com";
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // chưa đăng nhập → đá về trang login
      window.location.href = "index.html";
      return;
    }

    if (user.email !== ADMIN_EMAIL) {
      // không phải admin → cũng đá về
      window.location.href = "index.html";
      return;
    }

    // đúng admin → cho ở lại trang và hiển thị email
    const span = document.getElementById("adminEmail");
    if (span) span.textContent = user.email;
  });
});
