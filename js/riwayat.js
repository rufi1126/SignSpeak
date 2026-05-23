// Import fungsi yang dibutuhkan dari SDK Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuration Firebase Asli Rofil
const firebaseConfig = {
  apiKey: "AIzaSyDUsKPw6zX0bX0dAZJh3WuPaZq9z2dbLXA",
  authDomain: "signspeak-app-d8230.firebaseapp.com",
  projectId: "signspeak-app-d8230",
  storageBucket: "signspeak-app-d8230.firebasestorage.app",
  messagingSenderId: "952845294212",
  appId: "1:952845294212:web:138c3e648af504084400d1",
  measurementId: "G-X12B9XNQX9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fungsi untuk menarik data dari Cloud Firestore
async function muatRiwayat() {
    const tabelBody = document.getElementById("tabel-riwayat");
    if (!tabelBody) return;
    
    try {
        // Ambil data dari collection 'riwayat_terjemahan', urutkan berdasarkan waktu paling baru
        const q = query(collection(db, "riwayat_terjemahan"), orderBy("waktu", "desc"));
        const querySnapshot = await getDocs(q);
        
        // Bersihkan teks loading awal
        tabelBody.innerHTML = "";
        
        if (querySnapshot.empty) {
            tabelBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-500">Belum ada riwayat terjemahan yang disimpan.</td></tr>`;
            return;
        }
        
        let nomor = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Konversi format waktu Firebase Timestamp menjadi waktu lokal komputer lo
            const waktuLokal = data.waktu ? data.waktu.toDate().toLocaleString('id-ID') : '-';
            
            // Masukkan data baris ke dalam tabel HTML (Sudah ditambahkan style Tailwind v4)
            const row = `
                <tr class="hover:bg-slate-900/50 transition border-b border-slate-800">
                    <td class="p-4 text-center font-medium text-slate-500">${nomor++}</td>
                    <td class="p-4 font-bold text-teal-300">${data.hasil}</td>
                    <td class="p-4 text-slate-400">${waktuLokal} WIB</td>
                </tr>
            `;
            tabelBody.innerHTML += row;
        });
        
    } catch (error) {
        console.error("Gagal mengambil data riwayat: ", error);
        tabelBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-rose-400">Gagal memuat data. Periksa koneksi internet atau rules Firestore lo!</td></tr>`;
    }
}

// Jalankan fungsi otomatis saat halaman dibuka
window.onload = muatRiwayat;
