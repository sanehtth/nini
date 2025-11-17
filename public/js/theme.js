// js/theme.js
const THEME_KEY = "nini_theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || "light";
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
}

// Khi load trang, áp dụng theme đã lưu
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);
});

// cho phép gọi từ HTML
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
