(function () {
  "use strict";

  var toggle = document.getElementById("header-menu-toggle");
  var menu = document.getElementById("header-actions");
  if (!toggle || !menu) return;

  var mq = window.matchMedia("(max-width: 575.98px)");

  function openMenu() {
    menu.classList.add("show");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Tutup menu");
  }

  function closeMenu() {
    menu.classList.remove("show");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Buka menu");
  }

  function isOpen() {
    return menu.classList.contains("show");
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();
  });

  /* Tutup saat klik di luar menu */
  document.addEventListener("click", function (e) {
    if (!isOpen()) return;
    if (menu.contains(e.target) || toggle.contains(e.target)) return;
    closeMenu();
  });

  /* Tutup dengan tombol Escape */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Esc") closeMenu();
  });

  /* Tutup setelah salah satu aksi dipilih (tombol) */
  menu.querySelectorAll("button").forEach(function (btn) {
    btn.addEventListener("click", closeMenu);
  });

  /* Tutup otomatis saat layar melebar ke ukuran desktop */
  function handleResize() {
    if (!mq.matches) closeMenu();
  }
  if (mq.addEventListener) mq.addEventListener("change", handleResize);
  else mq.addListener(handleResize);
})();
