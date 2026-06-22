import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================================================
// KONFIGURASI FIREBASE (Masukkan data dari Firebase Console Anda di sini)
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyA2BL9QZwuQmNOB5tyO2PN8ok-9ao8m3Io",
  authDomain: "test-mode-fb88e.firebaseapp.com",
  // CATATAN: Ganti databaseURL ini dengan URL Realtime Database di Firebase Console Anda jika lokasi servernya bukan di US (Default)
  databaseURL: "https://test-mode-fb88e-default-rtdb.firebaseio.com", 
  projectId: "test-mode-fb88e",
  storageBucket: "test-mode-fb88e.firebasestorage.app",
  messagingSenderId: "765554892957",
  appId: "1:765554892957:web:d78d1f8729742d0746b474",
  measurementId: "G-MM82XVSH9K"
};

// Inisialisasi Firebase & database reference
let db = null;
let dataRef = null;
let isFirebaseInitialized = false;

try {
  // Hanya inisialisasi jika apiKey sudah diisi (bukan placeholder)
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "PLACEHOLDER_API_KEY") {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    dataRef = ref(db, "kas_hiling");
    isFirebaseInitialized = true;
    console.log("Firebase Realtime Database berhasil diinisialisasi.");
  } else {
    console.warn("Konfigurasi Firebase belum diatur. Menggunakan penyimpanan lokal (Local Storage) sementara.");
  }
} catch (error) {
  console.error("Gagal menginisialisasi Firebase:", error);
}

// State initialization
let role = sessionStorage.getItem("kas_hiling_role") || "";
let biayaTotal = parseFloat(localStorage.getItem("kas_hiling_biaya_total")) || 0;
let daftarPeserta = JSON.parse(localStorage.getItem("kas_hiling_daftar_peserta")) || [];
let searchQuery = "";
let activeFilter = "all"; // 'all', 'lunas', 'kurang'

const USERS = {
  admin: "admin123",
  member: "member123"
};

// Hubungkan listener Realtime Database untuk mensinkronisasi data secara langsung
if (isFirebaseInitialized && dataRef) {
  onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      biayaTotal = parseFloat(data.biayaTotal) || 0;
      daftarPeserta = data.daftarPeserta || [];
      // Backup data ke Local Storage untuk redundansi
      localStorage.setItem("kas_hiling_biaya_total", biayaTotal);
      localStorage.setItem("kas_hiling_daftar_peserta", JSON.stringify(daftarPeserta));
      update();
    } else {
      // Jika database Firebase masih kosong, namun local storage memiliki data, upload data lokal ke Firebase
      if (biayaTotal > 0 || daftarPeserta.length > 0) {
        console.log("Firebase kosong. Mengunggah data lokal ke Firebase...");
        saveData();
      }
    }
  });
}

// Fungsi helper untuk menyimpan data (Firebase / Local Storage)
function saveData() {
  if (isFirebaseInitialized && dataRef) {
    set(dataRef, {
      biayaTotal: biayaTotal,
      daftarPeserta: daftarPeserta
    }).catch(err => {
      console.error("Gagal menyimpan ke Firebase. Menyimpan ke Local Storage lokal:", err);
      saveLocal();
    });
  } else {
    saveLocal();
  }
}

function saveLocal() {
  localStorage.setItem("kas_hiling_biaya_total", biayaTotal);
  localStorage.setItem("kas_hiling_daftar_peserta", JSON.stringify(daftarPeserta));
  update();
}

// Auto login jika sesi role tersimpan
window.addEventListener("DOMContentLoaded", () => {
  if (role) {
    finishLogin();
  } else {
    document.getElementById("loginPage").classList.remove("hidden");
  }
});

window.login = function () {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorEl = document.getElementById("error");

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (USERS[username] && USERS[username] === password) {
    role = username;
    sessionStorage.setItem("kas_hiling_role", role);
    errorEl.innerText = "";
    usernameInput.value = "";
    passwordInput.value = "";
    finishLogin();
  } else {
    errorEl.innerText = "Username atau password salah!";
  }
};

window.guestLogin = function () {
  role = "guest";
  sessionStorage.setItem("kas_hiling_role", role);
  finishLogin();
};

window.logout = function () {
  sessionStorage.removeItem("kas_hiling_role");
  location.reload();
};

function finishLogin() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  applyRole();
}

function applyRole() {
  document.getElementById("roleText").innerText = role;

  // Toggle input khusus admin
  document.querySelectorAll(".admin-only").forEach(el => {
    if (role === "admin") {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });

  update();
}

window.setBiaya = function () {
  const biayaInput = document.getElementById("pengeluaran");
  const val = parseFloat(biayaInput.value);

  if (isNaN(val) || val < 0) {
    alert("Masukkan jumlah biaya total yang valid!");
    return;
  }

  biayaTotal = val;
  saveData();
  biayaInput.value = "";
};

window.tambahPeserta = function () {
  const namaInput = document.getElementById("nama");
  const bayarInput = document.getElementById("bayar");

  const nama = namaInput.value.trim();
  const bayar = parseFloat(bayarInput.value) || 0;

  if (!nama) {
    alert("Nama peserta tidak boleh kosong!");
    return;
  }

  if (bayar < 0) {
    alert("Jumlah pembayaran tidak boleh negatif!");
    return;
  }

  // Validasi duplikat nama
  const isDuplicate = daftarPeserta.some(p => p.nama.toLowerCase() === nama.toLowerCase());
  if (isDuplicate) {
    if (!confirm(`Peserta dengan nama "${nama}" sudah ada. Tetap tambahkan?`)) {
      return;
    }
  }

  daftarPeserta.push({ nama, bayar });
  saveData();

  namaInput.value = "";
  bayarInput.value = "";
};

window.hapusPeserta = function (index) {
  if (role !== "admin") return;

  if (confirm(`Apakah Anda yakin ingin menghapus ${daftarPeserta[index].nama}?`)) {
    daftarPeserta.splice(index, 1);
    saveData();
  }
};

// Fungsi Pencarian & Filter
window.filterPeserta = function () {
  const searchInput = document.getElementById("searchPeserta");
  searchQuery = searchInput.value.toLowerCase().trim();
  update();
};

window.setFilter = function (filter) {
  activeFilter = filter;

  // Toggle kelas tombol tab aktif
  document.getElementById("tabAll").classList.toggle("active", filter === "all");
  document.getElementById("tabLunas").classList.toggle("active", filter === "lunas");
  document.getElementById("tabKurang").classList.toggle("active", filter === "kurang");

  update();
};

// Fungsi Modal Edit
window.bukaEditModal = function (index) {
  if (role !== "admin") return;
  const peserta = daftarPeserta[index];
  document.getElementById("editIndex").value = index;
  document.getElementById("editNama").value = peserta.nama;
  document.getElementById("editBayar").value = peserta.bayar;

  document.getElementById("editModal").classList.add("active");
};

window.tutupEditModal = function () {
  document.getElementById("editModal").classList.remove("active");
};

window.simpanEditPembayaran = function () {
  const index = parseInt(document.getElementById("editIndex").value);
  const bayarInput = document.getElementById("editBayar");
  const val = parseFloat(bayarInput.value);

  if (isNaN(val) || val < 0) {
    alert("Masukkan jumlah pembayaran yang valid!");
    return;
  }

  daftarPeserta[index].bayar = val;
  saveData();

  tutupEditModal();
};

// Bagikan Laporan ke WhatsApp
window.bagikanLaporan = function () {
  const jumlahPeserta = daftarPeserta.length;
  const perOrang = jumlahPeserta > 0 ? Math.round(biayaTotal / jumlahPeserta) : 0;
  let terkumpul = 0;
  daftarPeserta.forEach(p => terkumpul += p.bayar);
  const sisa = biayaTotal - terkumpul;

  let text = `*💸 LAPORAN KAS HILING PRO 💸*\n\n`;
  text += `📊 *Ringkasan Finansial:*\n`;
  text += `• Total Biaya: Rp ${biayaTotal.toLocaleString("id-ID")}\n`;
  text += `• Jumlah Peserta: ${jumlahPeserta} Orang\n`;
  text += `• Tanggungan Per Orang: Rp ${perOrang.toLocaleString("id-ID")}\n`;
  text += `• Total Terkumpul: Rp ${terkumpul.toLocaleString("id-ID")}\n`;
  text += `• Sisa Kekurangan: Rp ${sisa.toLocaleString("id-ID")}\n\n`;

  text += `📋 *Daftar Pembayaran Peserta:*\n`;
  if (daftarPeserta.length === 0) {
    text += `_Belum ada data peserta._\n`;
  } else {
    daftarPeserta.forEach((p, idx) => {
      const statusText = p.bayar >= perOrang
        ? `✅ Lunas`
        : `❌ Kurang Rp ${(perOrang - p.bayar).toLocaleString("id-ID")}`;
      text += `${idx + 1}. *${p.nama}* - Rp ${p.bayar.toLocaleString("id-ID")} (${statusText})\n`;
    });
  }

  text += `\n_Laporan dikirim via Kas Hiling Pro_`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(whatsappUrl, '_blank');
};

window.update = function () {
  const jumlahPeserta = daftarPeserta.length;
  const perOrang = jumlahPeserta > 0 ? Math.round(biayaTotal / jumlahPeserta) : 0;

  let terkumpul = 0;
  daftarPeserta.forEach(p => terkumpul += p.bayar);
  const sisa = biayaTotal - terkumpul;

  // Perbarui UI Ringkasan Finansial
  document.getElementById("totalBiaya").innerText = biayaTotal.toLocaleString("id-ID");
  document.getElementById("jumlahPeserta").innerText = jumlahPeserta;
  document.getElementById("perOrang").innerText = perOrang.toLocaleString("id-ID");
  document.getElementById("terkumpul").innerText = terkumpul.toLocaleString("id-ID");

  const sisaEl = document.getElementById("sisa");
  sisaEl.innerText = sisa.toLocaleString("id-ID");

  // Highlight sisa: hijau jika lunas/surplus, merah jika kurang
  if (sisa <= 0) {
    sisaEl.style.color = "#34d399";
  } else {
    sisaEl.style.color = "#f87171";
  }

  // Perbarui Progress Bar
  const persentase = biayaTotal > 0 ? Math.min(Math.round((terkumpul / biayaTotal) * 100), 100) : 0;
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  if (progressBar && progressText) {
    progressBar.style.width = `${persentase}%`;
    progressText.innerText = `Terkumpul ${persentase}% (Rp ${terkumpul.toLocaleString("id-ID")} / Rp ${biayaTotal.toLocaleString("id-ID")})`;
  }

  // Render Tabel dengan Filter & Pencarian
  const tbody = document.getElementById("pesertaBody");
  tbody.innerHTML = "";

  const filteredPeserta = daftarPeserta
    .map((peserta, originalIndex) => ({ ...peserta, originalIndex }))
    .filter(peserta => {
      const matchSearch = peserta.nama.toLowerCase().includes(searchQuery);

      const isLunas = peserta.bayar >= perOrang;
      let matchFilter = true;
      if (activeFilter === "lunas") {
        matchFilter = isLunas;
      } else if (activeFilter === "kurang") {
        matchFilter = !isLunas;
      }

      return matchSearch && matchFilter;
    });

  if (filteredPeserta.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 25px;">Tidak ada data peserta yang cocok.</td></tr>`;
    return;
  }

  filteredPeserta.forEach((peserta, index) => {
    const statusClass = peserta.bayar >= perOrang ? "badge-success" : "badge-danger";
    const statusText = peserta.bayar >= perOrang
      ? "Lunas"
      : `Kurang Rp ${(perOrang - peserta.bayar).toLocaleString("id-ID")}`;

    let actionBtn = `<span style="color: var(--text-muted);">-</span>`;

    if (role === "admin") {
      actionBtn = `
        <button class="btn-edit" onclick="bukaEditModal(${peserta.originalIndex})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Edit
        </button>
        <button class="btn-delete" onclick="hapusPeserta(${peserta.originalIndex})">Hapus</button>
      `;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td style="font-weight: 500;">${escapeHTML(peserta.nama)}</td>
      <td>Rp ${peserta.bayar.toLocaleString("id-ID")}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td>${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
};

// Helper untuk mencegah XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
