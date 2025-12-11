// js/theme.js

const THEME_KEY   = "nini_theme";
const THEME_ORDER = ["light", "dark", "green"]; // thứ tự xoay vòng theme

function applyTheme(theme) {
  const body = document.body;

  // Xoá hết class theme cũ
  body.classList.remove("dark-theme", "green-theme");

  // Áp class theo theme mới
  if (theme === "dark") {
    body.classList.add("dark-theme");
  } else if (theme === "green") {
    body.classList.add("green-theme");
  }
  // theme === "light" thì không thêm gì, dùng CSS mặc định

  // Validate và lưu vào localStorage
  const validTheme = THEME_ORDER.includes(theme) ? theme : "light";
  localStorage.setItem(THEME_KEY, validTheme);

  // Cập nhật text cho nút đổi theme (nếu có)
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    let label = "";
    switch (validTheme) {
      case "dark":
        label = "Theme: Dark";
        break;
      case "green":
        label = "Theme: Xanh lá & nâu";
        break;
      default:
        label = "Theme: Default";
        break;
    }
    btn.textContent = label;
  }
}

function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || "light";
  const currentIndex = THEME_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
  const nextTheme = THEME_ORDER[nextIndex];
  applyTheme(nextTheme);
}

// Khi load trang, áp dụng theme đã lưu
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);
});

// cho PHP / HTML gọi
window.applyTheme  = applyTheme;
window.toggleTheme = toggleTheme;
