// Ambil elemen UI secara aman
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement ? canvasElement.getContext('2d') : null;
const translationText = document.getElementById('translation-text');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnSave = document.getElementById('btn-save');

let hands;
let kameraAktif = false;

// ====================================================================
// CONFIGURATION FIREBASE (SUDAH FIX MENGGUNAKAN KUNCI ROFIL)
// ====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDUsKPw6zX0bX0dAzJH3WuPaZq9Z2dbLXA", 
    authDomain: "signspeak-app-d8230.firebaseapp.com",
    projectId: "signspeak-app-d8230",
    storageBucket: "signspeak-app-d8230.firebasestorage.app",
    messagingSenderId: "952845294212",
    appId: "1:952845294212:web:138c3e648af504084400d1",
    measurementId: "G-X12B9XNQX9"
};

// Inisialisasi Firebase secara aman agar tidak memicu error duplikasi
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
// ====================================================================

// 1. Fungsi Mengaktifkan Kamera & Inisialisasi AI
async function startCamera() {
    try {
        if (translationText) translationText.innerText = "Memuat AI & Kamera... Mohon tunggu.";
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        if (video) video.srcObject = stream;
        
        if (video) {
            video.onloadedmetadata = () => {
                video.play();
                kameraAktif = true;
                
                // Ubah UI Tombol
                if (btnStart) btnStart.classList.add('hidden');
                if (btnStop) btnStop.classList.remove('hidden');
                
                // Jalankan AI pendeteksi tangan
                initAI();
            };
        }
    } catch (err) {
        console.error("Gagal mengakses kamera: ", err);
        alert("Waduh, izin kamera ditolak atau kamera tidak terdeteksi!");
    }
}

// 2. Inisialisasi MediaPipe Hands
function initAI() {
    if (typeof Hands !== 'undefined') {
        hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);
        if (translationText) translationText.innerText = "Posisikan tangan Anda di depan kamera";
        
        // Mulai looping deteksi frame kamera
        predictFrame();
    } else {
        if (translationText) translationText.innerText = "Error: Library MediaPipe belum terload!";
    }
}

// 3. Mengirim Frame Video ke AI secara Terus Menerus
async function predictFrame() {
    if (!kameraAktif || !hands || !video) return;

    if (video.videoWidth > 0) {
        try {
            await hands.send({ image: video });
        } catch (err) {
            console.error("AI Error:", err);
        }
    }
    requestAnimationFrame(predictFrame);
}

// 4. Menggambar Titik & Menerjemahkan Gerakan
function onResults(results) {
    if (!canvasCtx || !canvasElement || !video) return;

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (video.videoWidth > 0) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            
            // Gambar 21 titik koordinat di layar (Menggunakan Rumus Kalibrasi Mirror)
            for (const landmark of landmarks) {
                const x = canvasElement.width - (landmark.x * canvasElement.width);
                const y = landmark.y * canvasElement.height;
                
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
                canvasCtx.fillStyle = '#00ffcc'; // Warna teal glowing
                canvasCtx.fill();
            }

            // Jalankan penerjemah gerakan
            if (translationText) translationText.innerText = analisaGerakan(landmarks);
        }
    } else {
        if (translationText) translationText.innerText = "Posisikan tangan Anda di depan kamera";
    }
}

// 5. Rumus Jarak & Logika Isyarat (ANTI BENTROK & PAS 8 GERAKAN)
function hitungJarak(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function analisaGerakan(landmarks) {
    // Definisi titik ujung, tengah, dan pangkal untuk 4 jari (Telunjuk s/d Kelingking)
    // Format: [Ujung, Tengah, Pangkal]
    const jari = {
        telunjuk: [8, 6, 5],
        tengah: [12, 10, 9],
        manis: [16, 14, 13],
        kelingking: [20, 18, 17]
    };

    // Fungsi lokal untuk cek apakah jari lurus berdasarkan struktur sendinya sendiri
    // Mengukur apakah ujung jari lebih jauh dari sendi pangkal dibanding sendi tengahnya
    const isLurus = (titik) => {
        const keUjung = hitungJarak(landmarks[titik[0]], landmarks[titik[2]]);
        const keTengah = hitungJarak(landmarks[titik[1]], landmarks[titik[2]]);
        return keUjung > keTengah;
    };

    const telunjukLurus = isLurus(jari.telunjuk);
    const tengahLurus = isLurus(jari.tengah);
    const manisLurus = isLurus(jari.manis);
    const kelingkingLurus = isLurus(jari.kelingking);

    // Deteksi khusus Jempol (Jarak ujung jempol ke sendi pangkal kelingking/telunjuk)
    const jempol = landmarks[4];
    const jempolTerbuka = hitungJarak(jempol, landmarks[5]) > 0.05;

    // =========================================================
    // LOGIKA IF-ELSE DETEKSI 8 GERAKAN (VERSI VEKTOR SENDI)
    // =========================================================

    // 1. Isyarat OKE (👌)
    if (hitungJarak(jempol, landmarks[8]) < 0.05 && tengahLurus && manisLurus && kelingkingLurus) {
        return "👌 OKE";
    }

    // 2. Isyarat I Love You (🤟)
    if (telunjukLurus && kelingkingLurus && !tengahLurus && !manisLurus) {
        return "🤟 I Love You Sayang";
    }

    // 3. Isyarat MANTAP / BAGUS (👍)
    if (jempolTerbuka && !telunjukLurus && !tengahLurus && !manisLurus && !kelingkingLurus) {
        return "👍 MANTAP";
    }

    // 4. Isyarat DUA / PIECE (✌️)
    if (telunjukLurus && tengahLurus && !manisLurus && !kelingkingLurus) {
        return "✌️ PISS";
    }

    // 6. Isyarat SEMANGAT / TINJU (✊) -> Aman dari bug karena dikunci jarak antar ujung jarinya
    if (!telunjukLurus && !tengahLurus && !manisLurus && !kelingkingLurus && !jempolTerbuka && hitungJarak(landmarks[8], landmarks[20]) < 0.12) {
        return "✊ SEMANGAT";
    }

    // 7. Isyarat LIMA / BUKA (🖐️)
    if (telunjukLurus && tengahLurus && manisLurus && kelingkingLurus && jempolTerbuka) {
        return "🖐️ HALO BROO";
    }

    return "Membaca gerakan...";
}

// 6. Fungsi Mematikan Kamera
function stopCamera() {
    kameraAktif = false;
    if (video && video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    if (canvasCtx && canvasElement) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
    
    // Kembalikan UI Tombol & Teks
    if (btnStart) btnStart.classList.remove('hidden');
    if (btnStop) btnStop.classList.add('hidden');
    if (translationText) translationText.innerText = "Kamera belum aktif...";
}

// 7. Fungsi untuk menyimpan hasil ke database asli Firestore
async function simpanKeFirebase() {
    if (!translationText || !db || !btnSave) return;
    
    const teksHasil = translationText.innerText;

    if (teksHasil === "Kamera belum aktif..." || teksHasil === "Mencari gerakan tangan..." || teksHasil === "Posisikan tangan Anda di depan kamera" || teksHasil === "Memuat AI & Kamera... Mohon tunggu." || teksHasil === "Membaca gerakan...") {
        alert("Waduh, belum ada hasil terjemahan yang valid nih buat disimpan!");
        return;
    }

    try {
        btnSave.innerText = "⏳ Menyimpan...";
        btnSave.disabled = true;

        // Menyimpan data secara real-time ke collection 'riwayat_terjemahan'
        await db.collection("riwayat_terjemahan").add({
            hasil: teksHasil,
            waktu: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`Berhasil menyimpan "${teksHasil}" ke riwayat database! 🎉`);
    } catch (error) {
        console.error("Error simpan data:", error);
        alert("Gagal menyimpan! Periksa kembali apakah Firestore lo sudah diaktifkan dalam Test Mode di Firebase Console.");
    } finally {
        btnSave.innerText = "💾 Simpan ke Riwayat";
        btnSave.disabled = false;
    }
}

// 8. Fitur Mengubah Hasil Terjemahan Jadi Suara (Text-to-Speech)
const btnSpeak = document.getElementById('btn-speak');

if (btnSpeak) {
    btnSpeak.addEventListener('click', () => {
        const teks = translationText ? translationText.innerText : "";
        if (teks && teks !== "Kamera belum aktif..." && teks !== "Posisikan tangan Anda di depan kamera" && teks !== "Membaca gerakan...") {
            const suara = new SpeechSynthesisUtterance(teks.replace(/[^a-zA-Z0-9 ]/g, "")); // Bersihkan emoji bawaan teks
            suara.lang = 'id-ID'; // Mengatur aksen pelafalan Bahasa Indonesia
            window.speechSynthesis.speak(suara);
        } else {
            alert("Belum ada kata terjemahan yang bisa disuarakan, Fil!");
        }
    });
}

// 9. Pasang Event Listener ke Tombol UI
if (btnStart) btnStart.addEventListener('click', startCamera);
if (btnStop) btnStop.addEventListener('click', stopCamera);
if (btnSave) btnSave.addEventListener('click', simpanKeFirebase);