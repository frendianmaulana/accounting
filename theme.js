const themeSwitchInput = document.getElementById("theme-switch-input");
const themeSwitchLabel = document.getElementById("theme-switch");

const THEME_KEY = "theme_pref";
const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");

const getStoredTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : null;
};

const getResolvedTheme = () => {
  const stored = getStoredTheme();
  if (stored) return stored;
  return darkMedia.matches ? "dark" : "light";
};

// Panggil toast hanya jika tersedia (script.js memuatnya via DOMContentLoaded)
const notify = (icon, title) => {
  if (typeof window.showToast === "function") {
    window.showToast(icon, title);
  }
};

const updateMetaColor = (theme) => {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0f1817" : "#064e3b");
};

const updateSwitchUI = (theme) => {
  const isDark = theme === "dark";

  if (themeSwitchInput) {
    themeSwitchInput.checked = isDark;
    themeSwitchInput.setAttribute("aria-label", isDark ? "Nonaktifkan tema gelap" : "Aktifkan tema gelap");
  }

  if (themeSwitchLabel) {
    themeSwitchLabel.title = isDark ? "Tema: Gelap — klik untuk Terang" : "Tema: Terang — klik untuk Gelap";
  }
};

const applyTheme = (theme, silent = false) => {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-bs-theme", theme);
  updateSwitchUI(theme);
  updateMetaColor(theme);
};

if (themeSwitchInput) {
  themeSwitchInput.addEventListener("change", () => {
    applyTheme(themeSwitchInput.checked ? "dark" : "light");
  });
}

// Ikuti perubahan tema sistem selama user belum memilih manual
const onSystemThemeChange = () => {
  if (getStoredTheme()) return; // user sudah pilih manual → abaikan
  const resolved = darkMedia.matches ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", resolved);
  updateSwitchUI(resolved);
  updateMetaColor(resolved);
};

if (typeof darkMedia.addEventListener === "function") {
  darkMedia.addEventListener("change", onSystemThemeChange);
} else if (typeof darkMedia.addListener === "function") {
  darkMedia.addListener(onSystemThemeChange);
}

// Init (tanpa menulis ke localStorage → preferensi "belum dipilih" tetap terjaga)
const initialTheme = getResolvedTheme();
document.documentElement.setAttribute("data-bs-theme", initialTheme);
updateSwitchUI(initialTheme);
updateMetaColor(initialTheme);
