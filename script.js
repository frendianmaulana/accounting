// import rumus from "./script2";
const transactionForm = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const transactionList = document.getElementById("transaction-list");
const totalIncomeEl = document.getElementById("total-income");
const totalExpenseEl = document.getElementById("total-expense");
const balanceEl = document.getElementById("balance");
const resetButton = document.getElementById("reset-button");
const editIdInput = document.getElementById("edit-id");
const addButton = document.getElementById("add-button");
const cancelEditButton = document.getElementById("cancel-edit-button");
const searchInput = document.getElementById("search-input");
const filterButtons = document.querySelectorAll(".filter-btn");
const previewPrintButton = document.getElementById("preview-print");
const infoButton = document.getElementById("info-button");
const roundButton = document.getElementById("round-button");

// --- RESPONSIVE ---
const mobileMedia = window.matchMedia("(max-width: 575.98px)");
const isSmallScreen = () => mobileMedia.matches;

// ========================================================
//  HELPERS: konversi nilai → string digit (BigInt-friendly)
// ========================================================

/** Ambil digit murni dari Number, BigInt, atau string (tanpa pemisah). */
const toDigits = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "bigint") return value < 0n ? (-value).toString() : value.toString();
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value === 0) return "0";
    // Intl expand notasi eksponensial (mis. 1e22 → "10000000000000000000000")
    return new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 0 }).format(Math.round(value));
  }
  return String(value).replace(/\D/g, "");
};

/** Beri titik ribuan pada digit string. */
const groupDigits = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Ubah string digit → BigInt (0n untuk string kosong). */
const digitsToBigInt = (digits) => (digits ? BigInt(digits) : 0n);

// ========================================================
//  FORMATTERS
// ========================================================

/** Rp dengan pemisah ribuan, aman untuk BigInt / angka raksasa. */
const formatCurrency = (value) => {
  let big;
  if (typeof value === "bigint") big = value;
  else if (typeof value === "number") {
    if (!Number.isFinite(value)) return "Rp 0";
    big = BigInt(Math.round(value));
  } else {
    const digits = toDigits(value);
    if (!digits) return "Rp 0";
    big = BigInt(digits);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(big);
};

/**
 * Format angka → versi pendek ala Indonesia (string-based, bebas presisi).
 *   1_500_000         → "1,5 Juta"
 *   1_000_000_000_000 → "1 T"
 *   1e33              → "1 Des"
 */
const formatShortNumber = (value) => {
  const digits = toDigits(value);
  if (!digits || digits === "0") return "0";

  const len = digits.length;

  // Satuan skala pendek (short scale) — urut turun
  const units = [
    { exp: 33, label: "Des" }, // Desiliun
    { exp: 30, label: "Non" }, // Noniliun
    { exp: 27, label: "Okt" }, // Oktiliun
    { exp: 24, label: "Sep" }, // Septiliun
    { exp: 21, label: "Sek" }, // Sekstiliun
    { exp: 18, label: "Qu" }, // Kuintiliun
    { exp: 15, label: "Qa" }, // Kuadriliun
    { exp: 12, label: "T" }, // Triliun
    { exp: 9, label: "M" }, // Miliar
    { exp: 6, label: "Juta" },
    { exp: 3, label: "Ribu" },
  ];

  for (const { exp, label } of units) {
    if (len > exp) {
      const intPart = digits.slice(0, len - exp);
      const decDigit = digits[len - exp] || "0";
      const dec = decDigit !== "0" ? "," + decDigit : "";
      return `${intPart}${dec} ${label}`;
    }
  }
  return groupDigits(digits);
};

/** Versi ringkas ber-"Rp" untuk kartu ringkasan (di bawah 1 juta tetap penuh). */
const formatCompactCurrency = (value) => {
  const big = typeof value === "bigint" ? value : digitsToBigInt(toDigits(value));
  const neg = big < 0n;
  const absBig = neg ? -big : big;
  const sign = neg ? "-" : "";

  if (absBig < 1_000_000n) return formatCurrency(value);
  return `${sign}Rp ${formatShortNumber(absBig.toString())}`;
};

/** Tanggal/waktu. compact=true → versi pendek untuk HP. */
const formatDateTime = (isoString, compact = false) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    }
    return date.toLocaleString("id-ID", compact ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" });
  } catch (e) {
    console.error("Error formatting date:", isoString, e);
    return new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  }
};

/** Escape HTML untuk deskripsi. */
const escapeHTML = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// --- SweetAlert2 Toast ---
const showToast = (icon, title) => {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    // timer: 1200,
    // timerProgressBar: true,
    customClass: { popup: "rounded-4 shadow-lg border-0" },
    didOpen: (toast) => {
      let startX = 0;
      let currentX = 0;

      toast.addEventListener(
        "touchstart",
        (e) => {
          startX = e.touches[0].clientX;
          toast.style.transition = "none";
        },
        { passive: true },
      );

      toast.addEventListener(
        "touchmove",
        (e) => {
          currentX = e.touches[0].clientX - startX;
          toast.style.transform = `translateX(${currentX}px)`;
          toast.style.opacity = String(1 - Math.min(Math.abs(currentX) / 150, 1));
        },
        { passive: true },
      );

      toast.addEventListener("touchend", () => {
        toast.style.transition = "transform .2s, opacity .2s";
        if (Math.abs(currentX) > 80) {
          Swal.close();
        } else {
          toast.style.transform = "";
          toast.style.opacity = "";
        }
      });
    },
  });
  Toast.fire({ icon, title });
};
window.showToast = showToast;

// ========================================================
//  STATE
// ========================================================
// Migrasi otomatis: kalau ada tx.amount lama berbentuk Number, ubah ke string digit.
let transactions = (JSON.parse(localStorage.getItem("transactions_wa")) || []).map((tx) => ({
  ...tx,
  amount: toDigits(tx.amount),
}));

let editingId = null;
let currentFilter = "all";
let currentSearchQuery = "";

// ========================================================
//  AMOUNT INPUT: ribuan + auto-compact (bebas presisi)
// ========================================================
let amountRawValue = ""; // string digit
let amountIsCompact = false;
let amountCompactText = "";
const AMOUNT_MAX_DIGITS = 36; // muat sampai 9,9 Des (10^33)

const measureAmountText = (() => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  return (text) => {
    const s = getComputedStyle(amountInput);
    ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    return ctx.measureText(text).width;
  };
})();

const getAmountAvailableWidth = () => {
  const s = getComputedStyle(amountInput);
  const pad = (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.paddingRight) || 0);
  return amountInput.clientWidth - pad;
};

/** Format penuh (dengan titik ribuan) dari string digit. */
const formatAmountFull = (raw) => {
  const digits = toDigits(raw);
  return digits ? groupDigits(digits) : "";
};

const renderAmountInput = () => {
  if (!amountRawValue) {
    amountInput.value = "";
    amountIsCompact = false;
    amountCompactText = "";
    amountInput.removeAttribute("title");
    return;
  }

  const full = formatAmountFull(amountRawValue);
  const avail = getAmountAvailableWidth();
  const fits = avail > 0 ? measureAmountText(full) <= avail - 4 : full.length <= 11;

  if (fits) {
    amountInput.value = full;
    amountIsCompact = false;
    amountCompactText = "";
    amountInput.title = full;
  } else {
    const compact = `≈ ${formatShortNumber(amountRawValue)}`;
    amountInput.value = compact;
    amountIsCompact = true;
    amountCompactText = compact;
    amountInput.title = full;
  }
};

const setAmountValue = (value) => {
  amountRawValue = toDigits(value).slice(0, AMOUNT_MAX_DIGITS);
  renderAmountInput();
};

const resetAmountInput = () => {
  amountRawValue = "";
  amountIsCompact = false;
  amountCompactText = "";
  amountInput.value = "";
  amountInput.removeAttribute("title");
};

amountInput.addEventListener("input", () => {
  const v = amountInput.value;

  if (v === "") {
    amountRawValue = "";
  } else if (amountIsCompact) {
    if (v.startsWith(amountCompactText)) {
      const extra = v.slice(amountCompactText.length).replace(/\D/g, "");
      if (extra) amountRawValue = (amountRawValue + extra).slice(0, AMOUNT_MAX_DIGITS);
    } else if (amountCompactText.startsWith(v)) {
      amountRawValue = amountRawValue.slice(0, -1);
    } else {
      amountRawValue = v.replace(/\D/g, "").slice(0, AMOUNT_MAX_DIGITS);
    }
  } else {
    amountRawValue = v.replace(/\D/g, "").slice(0, AMOUNT_MAX_DIGITS);
  }

  renderAmountInput();
});

let amountResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(amountResizeTimer);
  amountResizeTimer = setTimeout(() => {
    renderAmountInput();
    renderTransactions();
  }, 150);
});

if (typeof mobileMedia.addEventListener === "function") {
  mobileMedia.addEventListener("change", () => renderTransactions());
} else if (typeof mobileMedia.addListener === "function") {
  mobileMedia.addListener(() => renderTransactions());
}

// --- Tombol Bulatkan (BigInt agar aman untuk angka raksasa) ---
const roundToNearestBig = (digits, kelipatan = 1000n, mode = "nearest") => {
  const n = digitsToBigInt(digits);
  if (n <= 0n) return 0n;
  const k = BigInt(kelipatan);

  switch (mode) {
    case "up":
      return ((n + k - 1n) / k) * k;
    case "down":
      return (n / k) * k;
    default: {
      const q = n / k;
      const r = n % k;
      return (r * 2n >= k ? q + 1n : q) * k;
    }
  }
};

if (roundButton) {
  roundButton.addEventListener("click", () => {
    const raw = digitsToBigInt(amountRawValue);

    if (raw <= 0n) {
      showToast("warning", "Isi nominal dulu sebelum dibulatkan!");
      return;
    }

    const rounded = roundToNearestBig(amountRawValue, 1000n, "nearest");

    if (rounded === raw) {
      showToast("info", "Nominal sudah bulat: " + formatAmountFull(amountRawValue));
      return;
    }

    amountRawValue = rounded.toString().slice(0, AMOUNT_MAX_DIGITS);
    renderAmountInput();

    showToast("success", `Dibulatkan: ${formatShortNumber(raw.toString())} → ${formatShortNumber(rounded.toString())}`);
  });
}

// ========================================================
//  RENDER DAFTAR TRANSAKSI
// ========================================================
const renderTransactionItem = (transaction) => {
  const { id, type, description, amount, timestamp } = transaction;
  const item = document.createElement("div");
  item.classList.add("transaction-item-wrapper", "w-100", "mb-2");
  item.dataset.id = id;

  const isIncome = type === "income";
  const amountSign = isIncome ? "+" : "-";
  const amountColor = isIncome ? "text-success" : "text-danger";
  const borderAccent = isIncome ? "border-start border-4 border-success" : "border-start border-4 border-danger";
  const iconBg = isIncome ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
  const directionIcon = isIncome ? "bi-arrow-down-left" : "bi-arrow-up-right";
  const badgeLabel = isIncome ? "Masuk" : "Keluar";
  const badgeColor = isIncome ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";

  const small = isSmallScreen();
  const amountText = small ? formatCompactCurrency(amount) : formatCurrency(amount);
  const amountTitle = formatCurrency(amount);

  const dateText = formatDateTime(timestamp, small);
  const dateTitle = formatDateTime(timestamp, false);

  const safeDesc = escapeHTML(description || "(Tanpa Keterangan)");

  item.innerHTML = `
      <div class="card transaction-card rounded-4 p-3 ${borderAccent} shadow-sm position-relative">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div class="d-flex align-items-start gap-2 flex-grow-1" style="min-width: 0;">
            <div class="icon-badge rounded-circle d-flex align-items-center justify-content-center ${iconBg}">
              <i class="bi ${directionIcon}"></i>
            </div>
            <div class="flex-grow-1" style="min-width: 0;">
              <div class="d-flex flex-wrap align-items-center gap-1 mb-1">
                <span class="badge ${badgeColor} rounded-pill px-2 py-0" style="font-size: 0.65rem;">
                  ${badgeLabel}
                </span>
                <span class="text-muted small d-inline-flex align-items-center gap-1" style="font-size: 0.7rem;" title="${dateTitle}">
                  <i class="far fa-clock"></i>
                  ${dateText}
                </span>
              </div>
              <h6 class="fw-bold mb-0 text-dark" style="word-break: break-word; overflow-wrap: anywhere;" title="${safeDesc}">
                ${safeDesc}
              </h6>
            </div>
          </div>

          <div class="text-end flex-shrink-0">
            <div class="fw-bolder fs-6 ${amountColor}" style="white-space: nowrap;" title="${amountTitle}">
              ${amountSign} ${amountText}
            </div>
            <div class="transaction-actions mt-1 d-flex gap-1 justify-content-end">
              <button type="button" class="btn btn-sm btn-light border text-primary edit-btn rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" title="Edit Transaksi">
                <i class="fas fa-pen-to-square" style="font-size: 0.75rem;"></i>
              </button>
              <button type="button" class="btn btn-sm btn-light border text-danger delete-btn rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" title="Hapus Transaksi">
                <i class="fas fa-trash-can" style="font-size: 0.75rem;"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

  return item;
};

const renderTransactions = () => {
  transactionList.innerHTML = "";

  let filtered = [...transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (currentFilter !== "all") filtered = filtered.filter((tx) => tx.type === currentFilter);

  if (currentSearchQuery.trim() !== "") {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter((tx) => (tx.description || "").toLowerCase().includes(q));
  }

  if (transactions.length === 0) {
    transactionList.innerHTML = `
        <div class="text-center py-5 text-muted opacity-75">
          <div class="mb-3"><i class="fas fa-receipt fa-3x text-secondary opacity-50"></i></div>
          <h6 class="fw-bold text-secondary mb-1">Belum Ada Transaksi</h6>
          <p class="small text-muted mb-0">Silakan isi data</p>
        </div>`;
  } else if (filtered.length === 0) {
    transactionList.innerHTML = `
        <div class="text-center py-5 text-muted opacity-75">
          <i class="fas fa-magnifying-glass fa-2x text-secondary opacity-50 mb-2"></i>
          <h6 class="fw-semibold text-secondary mb-1">Data Tidak Ditemukan</h6>
          <p class="small text-muted mb-0">Coba cek kata kunci pencarian atau ganti filter antum.</p>
        </div>`;
  } else {
    filtered.forEach((tx) => transactionList.appendChild(renderTransactionItem(tx)));
  }

  updateSummary();
  saveToLocalStorage();
};

// ========================================================
//  SUMMARY pakai BigInt supaya akurat sampai Des
// ========================================================
const sumByTypeBig = (type) => transactions.filter((tx) => tx.type === type).reduce((s, tx) => s + digitsToBigInt(tx.amount), 0n);

const updateSummary = () => {
  const income = sumByTypeBig("income");
  const expense = sumByTypeBig("expense");
  const balance = income - expense;

  totalIncomeEl.textContent = formatCompactCurrency(income);
  totalIncomeEl.title = formatCurrency(income);
  totalExpenseEl.textContent = formatCompactCurrency(expense);
  totalExpenseEl.title = formatCurrency(expense);
  balanceEl.textContent = formatCurrency(balance);

  balanceEl.classList.remove("text-danger", "text-success", "text-secondary");
  if (balance < 0n) balanceEl.classList.add("text-danger");
  else if (balance > 0n) balanceEl.classList.add("text-success");
  else balanceEl.classList.add("text-secondary");
};

const saveToLocalStorage = () => {
  localStorage.setItem("transactions_wa", JSON.stringify(transactions));
};

// ========================================================
//  SUBMIT
// ========================================================
const handleFormSubmit = (e) => {
  e.preventDefault();

  const description = descriptionInput.value.trim();
  const amountStr = amountRawValue;
  const typeChecked = document.querySelector('input[name="type"]:checked');

  if (!description) return showToast("error", "Keterangan transaksi wajib diisi ya!");
  if (!amountStr || digitsToBigInt(amountStr) <= 0n) return showToast("error", "Nominal harus berupa angka lebih dari 0!");
  if (!typeChecked) return showToast("error", "Pilih tipe transaksi dulu (In / Out).");

  const type = typeChecked.value;

  if (type === "expense") {
    let availableBalance = sumByTypeBig("income") - sumByTypeBig("expense");

    if (editingId !== null) {
      const oldTx = transactions.find((tx) => tx.id === editingId);
      if (oldTx && oldTx.type === "expense") availableBalance += digitsToBigInt(oldTx.amount);
      else if (oldTx && oldTx.type === "income") availableBalance -= digitsToBigInt(oldTx.amount);
    }

    if (digitsToBigInt(amountStr) > availableBalance) return showToast("error", "Maaf, saldo antum tidak mencukupi!");
  }

  if (editingId !== null) {
    const index = transactions.findIndex((tx) => tx.id === editingId);
    if (index > -1) {
      transactions[index] = { ...transactions[index], description, amount: amountStr, type };
      showToast("success", "Alhamdulillah, transaksi berhasil diperbarui!");
    } else {
      showToast("error", "Gagal memperbarui: Data tidak ditemukan.");
    }
    stopEditMode();
  } else {
    transactions.push({ id: Date.now(), description, amount: amountStr, type, timestamp: new Date().toISOString() });
    showToast("success", "Alhamdulillah, transaksi berhasil dicatat!");
  }

  renderTransactions();
  resetAmountInput();
  transactionForm.reset();
};

// ========================================================
//  EDIT / DELETE / RESET
// ========================================================
const startEditMode = (id) => {
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;

  editingId = id;
  editIdInput.value = id;
  descriptionInput.value = tx.description;
  setAmountValue(tx.amount);

  const radio = document.querySelector(`input[name="type"][value="${tx.type}"]`);
  if (radio) radio.checked = true;

  addButton.innerHTML = '<i class="fas fa-floppy-disk me-1"></i> <span>Simpan Perubahan</span>';
  addButton.className = "btn btn-primary text-white fw-bold py-2 px-4 rounded-pill flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow-sm";
  addButton.title = "Simpan Perubahan";

  cancelEditButton.classList.remove("d-none");
  cancelEditButton.classList.add("d-inline-flex");

  descriptionInput.focus();
  descriptionInput.scrollIntoView({ behavior: "smooth", block: "center" });
};

const stopEditMode = () => {
  editingId = null;
  editIdInput.value = "";
  resetAmountInput();
  transactionForm.reset();

  const incomeRadio = document.querySelector('input[name="type"][value="income"]');
  if (incomeRadio) incomeRadio.checked = true;

  addButton.innerHTML = '<i class="fas fa-circle-plus me-1"></i> <span>Catat Transaksi</span>';
  addButton.className = "btn btn-gradient-emerald text-white fw-bold py-2 px-4 rounded-pill flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow-sm";
  addButton.title = "Catat Transaksi";

  cancelEditButton.classList.remove("d-inline-flex");
  cancelEditButton.classList.add("d-none");
};

const handleDelete = (id) => {
  Swal.fire({
    title: "Hapus Catatan Ini?",
    text: "Data transaksi ini bakal dihapus permanen ya akhi.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: '<i class="fas fa-trash-can me-1"></i> Ya, Hapus!',
    cancelButtonText: "Batal",
    customClass: {
      popup: "rounded-4 shadow-lg",
      confirmButton: "btn btn-danger rounded-pill px-4",
      cancelButton: "btn btn-secondary rounded-pill px-4",
    },
    buttonsStyling: false,
  }).then((result) => {
    if (result.isConfirmed) {
      transactions = transactions.filter((tx) => tx.id !== id);
      if (editingId === id) stopEditMode();
      renderTransactions();
      showToast("success", "Transaksi berhasil dihapus.");
    }
  });
};

const handleReset = () => {
  if (transactions.length === 0) return showToast("info", "Belum ada data untuk direset");

  Swal.fire({
    title: "Reset Semua Catatan?",
    text: "PERINGATAN: Semua riwayat transaksi akan dihapus dari penyimpanan perangkat!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: '<i class="fas fa-trash-can me-1"></i> Ya, Bersihkan Semua!',
    cancelButtonText: "Batal",
    customClass: {
      popup: "rounded-4 shadow-lg",
      confirmButton: "btn btn-danger rounded-pill px-4",
      cancelButton: "btn btn-secondary rounded-pill px-4",
    },
    buttonsStyling: false,
  }).then((result) => {
    if (result.isConfirmed) {
      transactions = [];
      stopEditMode();
      renderTransactions();
      showToast("success", "Semua data kas berhasil dibersihkan.");
    }
  });
};

// ========================================================
//  LAPORAN
// ========================================================
const buildReportData = () => {
  const sorted = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const totalIncome = sumByTypeBig("income");
  const totalExpense = sumByTypeBig("expense");
  const balance = totalIncome - totalExpense;

  const rows = sorted
    .map((tx, idx) => {
      const isIncome = tx.type === "income";
      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${formatDateTime(tx.timestamp)}</td>
          <td>${escapeHTML(tx.description || "(Tanpa Keterangan)")}</td>
          <td style="text-align:center; color:${isIncome ? "#198754" : "#dc3545"}; font-weight:600;">
            ${isIncome ? "Masuk" : "Keluar"}
          </td>
          <td style="text-align:right; color:${isIncome ? "#198754" : "#dc3545"}; font-weight:600;">
            ${isIncome ? "+" : "-"} ${formatCurrency(tx.amount)}
          </td>
        </tr>`;
    })
    .join("");

  return { rows, totalIncome, totalExpense, balance };
};

const buildReportFileName = () => {
  const tanggal = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `Laporan-Keuangan_${tanggal.getFullYear()}-${pad(tanggal.getMonth() + 1)}-${pad(tanggal.getDate())}_${pad(tanggal.getHours())}_${pad(tanggal.getMinutes())}`;
};

const reportCSS = `
  * { box-sizing: border-box; }
  html, body { background: #f8f9fa; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #212529; font-size: 13px; }

  .report-shell { max-width: 1000px; margin: 0 auto; }

  /* Fallback tabel saat Bootstrap gagal dimuat (offline) */
  .report-table { width: 100%; border-collapse: collapse; }
  .report-table th, .report-table td { border: 1px solid #dee2e6; padding: 6px 8px; }
  .report-table thead th { background: #f1f3f5; white-space: nowrap; font-weight: 700; }
  .report-table tfoot td { background: #f8f9fa; font-weight: 700; }
  .report-table td, .report-table th { vertical-align: middle; }
  .report-table .desc-cell { word-break: break-word; overflow-wrap: anywhere; min-width: 180px; }

  .floating-print {
    position: fixed; top: 18px; right: 18px; z-index: 1050;
    background: #198754; color: #fff; border: none;
    padding: 10px 18px; border-radius: 50px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    box-shadow: 0 6px 18px rgba(25,135,84,.35);
    display: inline-flex; align-items: center; gap: 8px;
    transition: transform .15s ease, background .15s ease;
  }
  .floating-print:hover { background: #157347; transform: translateY(-2px); }

  @media print {
    html, body { background: #fff !important; margin: 0; padding: 0; font-size: 12px; }
    @page { size: A4; margin: 12mm; }
    .no-print { display: none !important; }
    .report-shell { max-width: 100%; }
    .card { box-shadow: none !important; border: 1px solid #dee2e6 !important; }
    .report-table thead th,
    .report-table tfoot td,
    .text-success, .text-danger,
    [class*="bg-success-subtle"], [class*="bg-danger-subtle"], [class*="bg-primary-subtle"] {
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
  }
`;

const buildReportBodyHTML = () => {
  const { rows, totalIncome, totalExpense, balance } = buildReportData();
  const balanceClass = balance < 0n ? "text-danger" : balance > 0n ? "text-success" : "text-secondary";
  const balanceColor = balance < 0n ? "#dc3545" : "#198754";

  return `
    <div class="report-shell container-fluid py-4 px-3 px-md-4">

      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <div>
          <h1 class="h4 fw-bold mb-1">
            <i class="bi bi-wallet2 text-success me-2"></i>Laporan Keuangan
          </h1>
          <p class="text-muted small mb-0">
            Catatan Kas Harian &middot; Dicetak: ${formatDateTime(new Date().toISOString())}
          </p>
        </div>
        <span class="badge bg-success-subtle text-success-emphasis rounded-pill px-3 py-2 align-self-start align-self-md-center">
          <i class="bi bi-receipt me-1"></i>${transactions.length} Transaksi
        </span>
      </div>

      <div class="row g-2 g-md-3 mb-3">
        <div class="col-4">
          <div class="card border-0 rounded-4 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
                <i class="bi bi-arrow-down-left"></i>
              </div>
              <div>
                <div class="text-muted small">Total Pemasukan</div>
                <div class="fw-bold text-success">${formatCurrency(totalIncome)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-4">
          <div class="card border-0 rounded-4 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
                <i class="bi bi-arrow-up-right"></i>
              </div>
              <div>
                <div class="text-muted small">Total Pengeluaran</div>
                <div class="fw-bold text-danger">${formatCurrency(totalExpense)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-4">
          <div class="card border-0 rounded-4 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
                <i class="bi bi-cash-stack"></i>
              </div>
              <div>
                <div class="text-muted small">Saldo Bersih</div>
                <div class="fw-bold ${balanceClass}">${formatCurrency(balance)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 rounded-4 shadow-sm overflow-hidden">
        <div class="table-responsive">
          <table class="table report-table table-bordered table-sm align-middle mb-0">
            <thead>
              <tr>
                <th style="width:44px; text-align:center;">No</th>
                <th style="width:160px;">Tanggal</th>
                <th>Keterangan</th>
                <th style="width:90px; text-align:center;">Tipe</th>
                <th style="width:150px; text-align:right;">Nominal</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="text-end">Saldo Bersih</td>
                <td class="text-end" style="color:${balanceColor};">${formatCurrency(balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;
};

const handlePreview = () => {
  if (transactions.length === 0) return showToast("error", "Belum ada data transaksi untuk di-preview!");

  const filename = buildReportFileName();
  const filenameJSON = JSON.stringify(filename);

  const content = `
    <!doctype html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${filename}</title>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.9/dist/css/bootstrap.min.css"
        crossorigin="anonymous"
      />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.2/font/bootstrap-icons.min.css">
      <style>${reportCSS}</style>
    </head>
    <body>
      <button class="floating-print no-print" onclick="window.print()">
        <i class="bi bi-printer-fill"></i> Cetak / Simpan PDF
      </button>
      ${buildReportBodyHTML()}
      <script>
        (function(){
          const file_name = ${filenameJSON};
          let titlebeforeprint = document.title;

          window.addEventListener("beforeprint", ()=>{
            titlebeforeprint = document.title;
            document.title = file_name;
          });
          window.addEventListener("afterprint", ()=>{
            document.title = titlebeforeprint || file_name;
          });
          window.addEventListener("keydown",(e)=>{
            if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="p"){
              document.title=file_name;
            }
          });

          document.querySelector(".floating-print").addEventListener("click",()=>{
            document.title = file_name;
          })
        })
      </script>
    </body>
    </html>
  `;

  // Jangan paksa ukuran 700x600 lagi — gunakan ukuran layar agar tidak "memaksakan"
  const w = Math.min(window.innerWidth - 40, 1100);
  const h = Math.min(window.innerHeight - 80, 900);
  const features = `width=${Math.max(w, 360)},height=${Math.max(h, 480)},left=20,top=20,scrollbars=yes,resizable=yes`;

  const win = window.open("", "_blank", features);
  if (!win) return showToast("error", "Gagal membuka preview. Izinkan popup di browser.");
  win.document.open();
  win.document.write(content);
  win.document.close();
  win.focus();
};

previewPrintButton.addEventListener("click", handlePreview);

const handleInfo = () => {
  Swal.fire({
    title: '<i class="fas fa-circle-info text-success me-2"></i>Panduan Penggunaan',
    html: `
      <div class="text-start small" style="line-height: 1.7;">
        <p class="mb-2 fw-bold text-success">📝 Mencatat Transaksi</p>
        <ol class="ps-3 mb-3">
          <li>Isi kolom <b>Keterangan</b> transaksi.</li>
          <li>Masukkan <b>Nominal</b> uang.</li>
          <li>Pilih tipe <b>In</b> (pemasukan) atau <b>Out</b> (pengeluaran).</li>
          <li>Klik tombol <b>Catat Transaksi</b>.</li>
        </ol>

        <p class="mb-2 fw-bold text-success">✏️ Mengubah &amp; Menghapus</p>
        <ul class="ps-3 mb-3">
          <li>Klik ikon <i class="fas fa-pen-to-square text-primary"></i> untuk mengubah transaksi.</li>
          <li>Klik ikon <i class="fas fa-trash-can text-danger"></i> untuk menghapus transaksi.</li>
        </ul>

        <p class="mb-2 fw-bold text-success">🔍 Menyaring &amp; Mencari</p>
        <ul class="ps-3 mb-3">
          <li>Ketik pada kolom <b>pencarian</b> untuk mencari transaksi.</li>
          <li>Gunakan tombol <b>Semua / Masuk / Keluar</b> untuk menyaring data.</li>
        </ul>

        <p class="mb-2 fw-bold text-success">🖨️ Mencetak &amp; Mengatur Ulang</p>
        <ul class="ps-3 mb-3">
          <li>Klik <i class="bi bi-printer-fill"></i> untuk melihat laporan dan mencetaknya.</li>
          <li>Klik <i class="fas fa-rotate-right"></i> untuk menghapus seluruh data.</li>
        </ul>

        <p class="mb-2 fw-bold text-success">📲 Memasang Aplikasi</p>
        <ul class="ps-3 mb-2">
          <li><b>Android:</b> buka menu <b>⋮</b> pada peramban, lalu pilih <b>Install app</b> atau <b>Tambahkan ke layar utama</b>.</li>
          <li><b>iPhone:</b> tekan tombol <b>Bagikan</b>, lalu pilih <b>Tambahkan ke Layar Utama</b>.</li>
          <li><b>Komputer:</b> klik ikon <b>Install</b> pada bilah alamat, atau buka menu <b>⋮</b> lalu pilih <b>Install Buku Keuangan</b>.</li>
        </ul>
        <p class="text-muted mb-3" style="font-size: 0.75rem;">
          Setelah dipasang, aplikasi dapat dibuka langsung dari layar utama sebagaimana aplikasi pada umumnya.
        </p>

        <p class="mb-2 fw-bold text-success">📴 Penggunaan Tanpa Koneksi Internet</p>
        <ul class="ps-3 mb-2">
          <li>Buka aplikasi minimal <b>satu kali</b> saat terhubung internet agar seluruh tampilan tersimpan di perangkat.</li>
          <li>Setelah itu, aplikasi dapat dibuka dan digunakan <b>tanpa koneksi internet</b>.</li>
          <li>Seluruh catatan transaksi tersimpan otomatis di perangkat, sehingga tetap aman saat offline.</li>
          <li>Pratinjau laporan dan pencetakan tetap dapat dilakukan sebagaimana biasa.</li>
        </ul>
        <p class="text-muted mb-3" style="font-size: 0.75rem;">
          Apabila aplikasi belum pernah dibuka saat terhubung internet, penggunaan tanpa koneksi belum dapat dilakukan.
        </p>

        <div class="alert alert-success py-2 px-3 mt-3 mb-0 small border-0" style="border-radius: 10px;">
          <i class="fas fa-shield-halved me-1"></i>
          Seluruh data tersimpan otomatis dan aman di perangkat Anda.
        </div>
      </div>
    `,
    icon: "info",
    confirmButtonText: '<i class="fas fa-check me-1"></i> Mengerti',
    customClass: {
      popup: "rounded-4 shadow-lg",
      confirmButton: "btn btn-gradient-emerald rounded-pill px-4",
    },
    buttonsStyling: false,
    width: "520px",
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
};

infoButton.addEventListener("click", handleInfo);

// ========================================================
//  EVENTS
// ========================================================
transactionForm.addEventListener("submit", handleFormSubmit);

transactionList.addEventListener("click", (e) => {
  const editButton = e.target.closest(".edit-btn");
  const deleteButton = e.target.closest(".delete-btn");
  const itemWrapper = e.target.closest(".transaction-item-wrapper");
  if (!itemWrapper) return;
  const id = parseInt(itemWrapper.dataset.id);
  if (editButton) startEditMode(id);
  else if (deleteButton) handleDelete(id);
});

resetButton.addEventListener("click", handleReset);
cancelEditButton.addEventListener("click", stopEditMode);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTransactions();
  });
});

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value;
    renderTransactions();
  });
}

// ========================================================
//  INIT
// ========================================================
renderTransactions();
renderAmountInput();
