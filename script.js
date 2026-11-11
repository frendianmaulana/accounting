document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
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

  // --- State Application ---
  let transactions = JSON.parse(localStorage.getItem("transactions_wa")) || [];
  let editingId = null;
  let currentFilter = "all"; // 'all' | 'income' | 'expense'
  let currentSearchQuery = "";

  // --- FORMATTERS ---
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
      return date.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      console.error("Error formatting date:", isoString, e);
      return new Date().toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  };

  // --- SweetAlert2 Toast Helper ---
  const showToast = (icon, title) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: "rounded-4 shadow-lg border-0",
      },
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });

    Toast.fire({
      icon: icon, // 'success', 'error', 'warning', 'info'
      title: title,
    });
  };

  window.showToast = showToast;

  // --- RENDER FUNCTIONS (Bootstrap 5.3 Based) ---
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

    item.innerHTML = `
      <div class="card transaction-card rounded-4 p-3 ${borderAccent} shadow-sm position-relative">
        <div class="d-flex align-items-center justify-content-between">
          <!-- Kiri: Icon & Info -->
          <div class="d-flex align-items-center gap-3 overflow-hidden">
            <div class="icon-badge rounded-circle d-flex align-items-center justify-content-center ${iconBg}">
              <i class="bi ${directionIcon}"></i>
            </div>
            <div class="text-truncate">
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge ${badgeColor} rounded-pill px-2 py-0" style="font-size: 0.65rem;">
                  ${badgeLabel}
                </span>
                <span class="text-muted small d-inline-flex align-items-center gap-1" style="font-size: 0.7rem;">
                  <i class="far fa-clock"></i>
                  ${formatDateTime(timestamp)}
                </span>
              </div>
              <h6 class="fw-bold mb-0 text-dark text-truncate" title="${description || "(Tanpa Keterangan)"}">
                ${description || "(Tanpa Keterangan)"}
              </h6>
            </div>
          </div>

          <!-- Kanan: Nominal & Tombol Aksi -->
          <div class="text-end ps-2 flex-shrink-0">
            <div class="fw-bolder fs-6 ${amountColor}">
              ${amountSign} ${formatCurrency(amount)}
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
    transactionList.innerHTML = ""; // Bersihkan list

    // Sorting berdasarkan waktu terbaru
    let filtered = [...transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filter berdasarkan Kategori (Semua, Income, Expense)
    if (currentFilter !== "all") {
      filtered = filtered.filter((tx) => tx.type === currentFilter);
    }

    // Filter berdasarkan Search Query
    if (currentSearchQuery.trim() !== "") {
      const q = currentSearchQuery.toLowerCase();
      filtered = filtered.filter((tx) => (tx.description || "").toLowerCase().includes(q));
    }

    // Kondisi List Kosong
    if (transactions.length === 0) {
      transactionList.innerHTML = `
        <div class="text-center py-5 text-muted opacity-75">
          <div class="mb-3">
            <i class="fas fa-receipt fa-3x text-secondary opacity-50"></i>
          </div>
          <h6 class="fw-bold text-secondary mb-1">Belum Ada Transaksi</h6>
          <p class="small text-muted mb-0">Silakan isi data</p>
        </div>
      `;
    } else if (filtered.length === 0) {
      transactionList.innerHTML = `
        <div class="text-center py-5 text-muted opacity-75">
          <i class="fas fa-magnifying-glass fa-2x text-secondary opacity-50 mb-2"></i>
          <h6 class="fw-semibold text-secondary mb-1">Data Tidak Ditemukan</h6>
          <p class="small text-muted mb-0">Coba cek kata kunci pencarian atau ganti filter antum.</p>
        </div>
      `;
    } else {
      filtered.forEach((transaction) => {
        transactionList.appendChild(renderTransactionItem(transaction));
      });
    }

    updateSummary();
    saveToLocalStorage();
  };

  // --- UPDATE SUMMARY (Saldo, In, Out) ---
  const updateSummary = () => {
    const income = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);

    const expense = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);

    const balance = income - expense;

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpenseEl.textContent = formatCurrency(expense);
    balanceEl.textContent = formatCurrency(balance);

    // Styling dinamis saldo: merah jika defisit, hijau jika surplus
    balanceEl.classList.remove("text-danger", "text-success", "text-secondary");
    if (balance < 0) {
      balanceEl.classList.add("text-danger");
    } else if (balance > 0) {
      balanceEl.classList.add("text-success");
    } else {
      balanceEl.classList.add("text-secondary");
    }
  };

  // --- LOCAL STORAGE ---
  const saveToLocalStorage = () => {
    localStorage.setItem("transactions_wa", JSON.stringify(transactions));
  };

  // --- FORM SUBMIT HANDLER ---
  const handleFormSubmit = (e) => {
    e.preventDefault();

    const description = descriptionInput.value.trim();
    const amountStr = amountInput.value.replace(/\./g, ""); // Hapus titik separator ribuan
    const typeChecked = document.querySelector('input[name="type"]:checked');

    // Validasi Manual
    if (!description) {
      showToast("error", "Keterangan transaksi wajib diisi ya!");
      // descriptionInput.focus();
      return;
    }

    if (amountStr === "" || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) {
      showToast("error", "Nominal harus berupa angka lebih dari 0!");
      // amountInput.focus();
      return;
    }

    if (!typeChecked) {
      showToast("error", "Pilih tipe transaksi dulu (In / Out).");
      return;
    }

    const amount = parseFloat(amountStr);
    const type = typeChecked.value;

    // Validasi Saldo saat Pengeluaran
    if (type === "expense") {
      const currentIncome = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
      const currentExpense = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
      let availableBalance = currentIncome - currentExpense;

      // Jika edit mode, sesuaikan saldo dengan data lama
      if (editingId !== null) {
        const oldTx = transactions.find((tx) => tx.id === editingId);
        if (oldTx && oldTx.type === "expense") {
          availableBalance += oldTx.amount;
        } else if (oldTx && oldTx.type === "income") {
          availableBalance -= oldTx.amount;
        }
      }

      if (amount > availableBalance) {
        showToast("error", "Maaf, saldo antum tidak mencukupi!");
        return;
      }
    }

    if (editingId !== null) {
      // Mode Edit (Update data yang ada)
      const index = transactions.findIndex((tx) => tx.id === editingId);
      if (index > -1) {
        transactions[index] = {
          ...transactions[index],
          description,
          amount,
          type,
        };
        showToast("success", "Alhamdulillah, transaksi berhasil diperbarui!");
      } else {
        showToast("error", "Gagal memperbarui: Data tidak ditemukan.");
      }
      stopEditMode();
    } else {
      // Mode Tambah Baru
      const newTransaction = {
        id: Date.now(),
        description,
        amount,
        type,
        timestamp: new Date().toISOString(),
      };
      transactions.push(newTransaction);
      showToast("success", "Alhamdulillah, transaksi berhasil dicatat!");
    }

    renderTransactions();
    transactionForm.reset();
    // descriptionInput.focus();
    // Default radio balik ke pemasukan
    const incomeRadio = document.querySelector('input[name="type"][value="income"]');
    if (incomeRadio) incomeRadio.checked = true;
  };

  // --- EDIT MODE HANDLERS ---
  const startEditMode = (id) => {
    const transaction = transactions.find((tx) => tx.id === id);
    if (!transaction) return;

    editingId = id;
    editIdInput.value = id;
    descriptionInput.value = transaction.description;
    amountInput.value = new Intl.NumberFormat("id-ID").format(transaction.amount);

    const radio = document.querySelector(`input[name="type"][value="${transaction.type}"]`);
    if (radio) radio.checked = true;

    // Ganti Tampilan Tombol Simpan
    addButton.innerHTML = '<i class="fas fa-floppy-disk me-1"></i> <span>Simpan Perubahan</span>';
    addButton.className = "btn btn-primary text-white fw-bold py-2 px-4 rounded-pill flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow-sm";
    addButton.title = "Simpan Perubahan";

    // Munculkan Tombol Batal Edit
    cancelEditButton.classList.remove("d-none");
    cancelEditButton.classList.add("d-inline-flex");

    descriptionInput.focus();
    descriptionInput.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const stopEditMode = () => {
    editingId = null;
    editIdInput.value = "";
    transactionForm.reset();

    const incomeRadio = document.querySelector('input[name="type"][value="income"]');
    if (incomeRadio) incomeRadio.checked = true;

    // Kembalikan Tombol ke Default Tambah
    addButton.innerHTML = '<i class="fas fa-circle-plus me-1"></i> <span>Catat Transaksi</span>';
    addButton.className = "btn btn-gradient-emerald text-white fw-bold py-2 px-4 rounded-pill flex-grow-1 d-flex align-items-center justify-content-center gap-2 shadow-sm";
    addButton.title = "Catat Transaksi";

    // Sembunyikan Tombol Batal
    cancelEditButton.classList.remove("d-inline-flex");
    cancelEditButton.classList.add("d-none");
  };

  // --- DELETE & RESET HANDLERS ---
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
        if (editingId === id) {
          stopEditMode();
        }
        renderTransactions();
        showToast("success", "Transaksi berhasil dihapus.");
      }
    });
  };

  const handleReset = () => {
    if (transactions.length === 0) {
      showToast("info", "Belum ada data untuk direset");
      return;
    }

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

  const buildReportData = () => {
    const sorted = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const totalIncome = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    const balance = totalIncome - totalExpense;

    const rows = sorted
      .map((tx, idx) => {
        const isIncome = tx.type === "income";
        return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${formatDateTime(tx.timestamp)}</td>
          <td>${tx.description || "(Tanpa Keterangan)"}</td>
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

  // --- SHARED: CSS laporan (dipakai preview & pdf) ---
  const reportCSS = `
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 20px;
    color: #212529;
    font-size: 12px;
    background: #fff;
  }
  h1 { font-size: 18px; margin: 0 0 4px 0; }
  p.sub { font-size: 11px; color: #6c757d; margin: 0 0 16px 0; }
  .summary {
    display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
  }
  .summary div {
    border: 1px solid #dee2e6; padding: 8px 12px;
    border-radius: 6px; font-size: 12px;
  }
  .income { color: #198754; font-weight: 700; }
  .expense { color: #dc3545; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td {
    border: 1px solid #dee2e6; padding: 7px 9px;
    font-size: 12px; vertical-align: middle;
  }
  thead th {
    background: #f1f3f5; text-align: left; font-weight: 700;
  }
  tfoot td { font-weight: 700; background: #f8f9fa; }
  @media print {
    body { margin: 10px; }
    @page { size: A4; margin: 12mm; }
    .no-print { display: none !important; }
  }
`;

  // --- SHARED: Bangun body HTML laporan (h1, summary, tabel) ---
  const buildReportBodyHTML = () => {
    const { rows, totalIncome, totalExpense, balance } = buildReportData();
    const balanceColor = balance < 0 ? "#dc3545" : "#198754";

    return `
    <h1>Laporan Keuangan - Buku Kas</h1>
    <p class="sub">
      Catatan Kas Harian &middot;
      Dicetak: ${formatDateTime(new Date().toISOString())}
    </p>

    <div class="summary">
      <div>Total Pemasukan: <span class="income">${formatCurrency(totalIncome)}</span></div>
      <div>Total Pengeluaran: <span class="expense">${formatCurrency(totalExpense)}</span></div>
      <div>Saldo Bersih: <span style="color:${balanceColor}; font-weight:700;">${formatCurrency(balance)}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px; text-align:center;">No</th>
          <th style="width:150px;">Tanggal</th>
          <th>Keterangan</th>
          <th style="width:80px; text-align:center;">Tipe</th>
          <th style="width:130px; text-align:right;">Nominal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right;">Saldo Bersih</td>
          <td style="text-align:right; color:${balanceColor};">${formatCurrency(balance)}</td>
        </tr>
      </tfoot>
    </table>
  `;
  };

  // --- HANDLER 1: Preview Laporan ---
  const handlePreview = () => {
    if (transactions.length === 0) {
      showToast("error", "Belum ada data transaksi untuk di-preview!");
      return;
    }

    const body = buildReportBodyHTML();

    const content = `
    <!doctype html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Preview Laporan</title>
      <style>
        ${reportCSS}
        /* Tombol print melayang khusus di jendela preview */
        .floating-print {
          position: fixed; top: 16px; right: 16px;
          background: #198754; color: #fff; border: none;
          padding: 10px 16px; border-radius: 50px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: inline-flex; align-items: center; gap: 8px;
        }
        .floating-print:hover { background: #157347; }
      </style>
    </head>
    <body>
      <button class="floating-print no-print" onclick="window.print()">
        Cetak PDF
      </button>
      ${body}
    </body>
    </html>
  `;

    const win = window.open("", "_blank", "width=700,height=600");
    if (!win) {
      showToast("error", "Gagal membuka preview. Izinkan popup di browser.");
      return;
    }
    win.document.write(content);
    win.document.close();
    win.focus();

    // ❗ TIDAK auto-print — biar user preview dulu, klik tombol "Cetak / Simpan PDF" di jendela itu
  };

  previewPrintButton.addEventListener("click", handlePreview);

  const handleInfo = () => {
    Swal.fire({
      title: '<i class="fas fa-circle-info text-success me-2"></i>Cara Pakai',
      html: `
      <div class="text-start small" style="line-height: 1.7;">
        <p class="mb-2 fw-bold text-success">📝 Mencatat Transaksi</p>
        <ol class="ps-3 mb-3">
          <li>Isi kolom <b>Keterangan</b> transaksi.</li>
          <li>Masukkan <b>Nominal</b> uang.</li>
          <li>Pilih tipe <b>In</b> (pemasukan) atau <b>Out</b> (pengeluaran).</li>
          <li>Klik tombol <b>Catat Transaksi</b>.</li>
        </ol>

        <p class="mb-2 fw-bold text-success">✏️ Edit &amp; Hapus</p>
        <ul class="ps-3 mb-3">
          <li>Klik ikon <i class="fas fa-pen-to-square text-primary"></i> untuk mengubah transaksi.</li>
          <li>Klik ikon <i class="fas fa-trash-can text-danger"></i> untuk menghapus transaksi.</li>
        </ul>

        <p class="mb-2 fw-bold text-success">🔍 Filter &amp; Cari</p>
        <ul class="ps-3 mb-3">
          <li>Ketik pada kolom <b>pencarian</b> untuk mencari transaksi.</li>
          <li>Gunakan tombol <b>Semua / Masuk / Keluar</b> untuk menyaring data.</li>
        </ul>

        <p class="mb-2 fw-bold text-success">🖨️ Cetak &amp; Reset</p>
        <ul class="ps-3 mb-0">
          <li>Klik <i class="bi bi-printer-fill"></i> untuk preview laporan dan cetak PDF.</li>
          <li>Klik <i class="fas fa-rotate-right"></i> untuk menghapus semua data.</li>
        </ul>

        <div class="alert alert-success py-2 px-3 mt-3 mb-0 small border-0" style="border-radius: 10px;">
          <i class="fas fa-shield-halved me-1"></i>
          Data tersimpan otomatis di perangkat anda.
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
      width: "500px",
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
  };

  infoButton.addEventListener("click", handleInfo);

  // --- EVENT LISTENERS ---
  transactionForm.addEventListener("submit", handleFormSubmit);

  transactionList.addEventListener("click", (e) => {
    const editButton = e.target.closest(".edit-btn");
    const deleteButton = e.target.closest(".delete-btn");
    const itemWrapper = e.target.closest(".transaction-item-wrapper");

    if (!itemWrapper) return;
    const id = parseInt(itemWrapper.dataset.id);

    if (editButton) {
      startEditMode(id);
    } else if (deleteButton) {
      handleDelete(id);
    }
  });

  resetButton.addEventListener("click", handleReset);
  cancelEditButton.addEventListener("click", stopEditMode);

  // Auto Thousands Separator on Amount Input
  amountInput.addEventListener("input", (e) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue) {
      e.target.value = new Intl.NumberFormat("id-ID").format(rawValue);
    } else {
      e.target.value = "";
    }
  });

  // Filter Buttons
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTransactions();
    });
  });

  // Real-time Search Input
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value;
      renderTransactions();
    });
  }

  // --- INITIALIZATION ---
  renderTransactions();
});
