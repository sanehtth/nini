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

// Khi trang load, áp dụng theme đã lưu
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);
});

// Để dùng được từ HTML (onclick="toggleTheme()")
window.toggleTheme = toggleTheme;
