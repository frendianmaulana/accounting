const themeButton = document.getElementById("theme-button");
const themeIcon = document.getElementById("theme-icon");

const THEME_KEY = "theme_pref";
const THEME_ORDER = ["light", "dark", "auto"];
const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");

const THEME_META = {
  light: { icon: "bi-sun-fill", title: "Tema: Terang — klik untuk Gelap" },
  dark: { icon: "bi-moon-stars-fill", title: "Tema: Gelap — klik untuk Auto" },
  auto: { icon: "bi-circle-half", title: "Tema: Auto (ikuti sistem) — klik untuk Terang" },
};

const getThemePref = () => {
  const saved = localStorage.getItem(THEME_KEY);
  return THEME_ORDER.includes(saved) ? saved : "auto";
};

const applyTheme = (pref, silent = false) => {
  localStorage.setItem(THEME_KEY, pref);

  const resolved = pref === "auto" ? (darkMedia.matches ? "dark" : "light") : pref;

  document.documentElement.setAttribute("data-bs-theme", resolved);
  document.documentElement.setAttribute("data-theme-pref", pref);

  // Update ikon & tooltip tombol
  if (themeIcon && themeButton) {
    themeIcon.className = `bi ${THEME_META[pref].icon}`;
    themeButton.title = THEME_META[pref].title;
    themeButton.setAttribute("aria-label", THEME_META[pref].title);
  }

  // Update warna address bar browser mobile
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", resolved === "dark" ? "#0f1817" : "#064e3b");

  if (!silent) {
    const label = pref === "auto" ? "Otomatis (ikuti sistem)" : pref === "dark" ? "Gelap" : "Terang";
    showToast("info", `Tema: ${label}`);
  }
};

const toggleTheme = () => {
  const next = THEME_ORDER[(THEME_ORDER.indexOf(getThemePref()) + 1) % THEME_ORDER.length];
  applyTheme(next);
};

if (themeButton) themeButton.addEventListener("click", toggleTheme);

// Ikuti perubahan tema sistem saat mode "auto"
const onSystemThemeChange = () => {
  if (getThemePref() === "auto") applyTheme("auto", true);
};
if (typeof darkMedia.addEventListener === "function") {
  darkMedia.addEventListener("change", onSystemThemeChange);
} else if (typeof darkMedia.addListener === "function") {
  darkMedia.addListener(onSystemThemeChange); // fallback Safari lama
}

applyTheme(getThemePref(), true);
