// Elemen UI Khusus Mode Belajar
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement ? canvasElement.getContext('2d') : null;

// Pastikan di HTML lo ada ID ini untuk menampilkan target kuis & status
const targetText = document.getElementById('target-text'); 
const statusText = document.getElementById('status-text'); 

const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnNext = document.getElementById('btn-next'); // Tombol skip manual

let hands;
let kameraAktif = false;

// DAFTAR TANTANGAN BELAJAR (Menyesuaikan dengan output fungsi analisaGerakan lo)
const daftarTantangan = [
    { info: "Coba tiru gerakan ini:", kunci: "✌️ PISS" },
    { info: "Coba tiru gerakan ini:", kunci: "👍 MANTAP" },
    { info: "Coba tiru gerakan ini:", kunci: "👌 OKE" },
    { info: "Coba tiru gerakan ini:", kunci: "🤟 I Love You Sayang" },
    { info: "Coba tiru gerakan ini:", kunci: "✊ SEMANGAT" },
    { info: "Coba tiru gerakan ini:", kunci: "🖐️ HALO BROO" }
];

let indexTantangan = 0;
let tantanganSelesai = false;

// Fungsi untuk mengganti target gerakan di layar
function tampilkanTantangan() {
    if (indexTantangan < daftarTantangan.length) {
        tantanganSelesai = false;
        if (targetText) {
            targetText.innerText = daftarTantangan[indexTantangan].kunci;
            targetText.style.color = "#ffffff"; // Kembalikan warna putih asli
        }
        if (statusText) statusText.innerText = "Ayo, posisikan tangan lo sesuai target!";
    } else {
        if (targetText) {
            targetText.innerText = "🎉 LO SELESAI BELAJAR!";
            targetText.style.color = "#00ffcc";
        }
        if (statusText) statusText.innerText = "Hebat! Semua gerakan dasar udah lo kuasai.";
        indexTantangan = 0; // Balik ke awal kalau mau mengulang
    }
}

// 1. Fungsi Mengaktifkan Kamera
async function startCameraBelajar() {
    try {
        if (statusText) statusText.innerText = "Memuat AI & Kamera... Mohon tunggu.";
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        if (video) video.srcObject = stream;
        
        if (video) {
            video.onloadedmetadata = () => {
                video.play();
                kameraAktif = true;
                
                if (btnStart) btnStart.classList.add('hidden');
                if (btnStop) btnStop.classList.remove('hidden');
                
                initAIBelajar();
                tampilkanTantangan();
            };
        }
    } catch (err) {
        console.error("Gagal mengakses kamera: ", err);
        alert("Waduh, izin kamera ditolak!");
    }
}

// 2. Inisialisasi MediaPipe Hands
function initAIBelajar() {
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

        hands.onResults(onResultsBelajar);
        predictFrameBelajar();
    } else {
        if (statusText) statusText.innerText = "Error: Library MediaPipe belum terload!";
    }
}

async function predictFrameBelajar() {
    if (!kameraAktif || !hands || !video) return;
    if (video.videoWidth > 0) {
        try {
            await hands.send({ image: video });
        } catch (err) {
            console.error("AI Error:", err);
        }
    }
    requestAnimationFrame(predictFrameBelajar);
}

// 3. Menggambar Titik & Logika Evaluasi Jawaban User
function onResultsBelajar(results) {
    if (!canvasCtx || !canvasElement || !video) return;

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (video.videoWidth > 0) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            
            // Gambar koordinat tangan (Mirror Mode)
            for (const landmark of landmarks) {
                const x = canvasElement.width - (landmark.x * canvasElement.width);
                const y = landmark.y * canvasElement.height;
                
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
                canvasCtx.fillStyle = '#00ffcc';
                canvasCtx.fill();
            }

            // Ambil deteksi gerakan real-time user
            const gerakanUser = analisaGerakan(landmarks);
            
            if (statusText && !tantanganSelesai) {
                statusText.innerText = `Terdeteksi: ${gerakanUser}`;
            }

            // VALIDASI: Apakah gerakan user SAMA dengan target kuis?
            const targetKunci = daftarTantangan[indexTantangan].kunci;
            if (gerakanUser === targetKunci && !tantanganSelesai) {
                tantanganSelesai = true; // Kunci biar gak kepicu berkali-kali
                
                if (targetText) {
                    targetText.innerText = "✅ COCOK! MANTAP!";
                    targetText.style.color = "#00ffcc";
                }
                if (statusText) statusText.innerText = "Bagus banget! Lanjut dalam 2 detik...";

                // Efek Suara Google instan memberi pujian
                const suaraPujian = new SpeechSynthesisUtterance("Bagus sekali");
                suaraPujian.lang = 'id-ID';
                window.speechSynthesis.speak(suaraPujian);

                // Delay otomatis pindah soal berikutnya
                setTimeout(() => {
                    indexTantangan++;
                    tampilkanTantangan();
                }, 2000);
            }
        }
    } else {
        if (statusText && !tantanganSelesai) statusText.innerText = "Posisikan tangan lo di depan kamera";
    }
}

// 4. Rumus Jarak & Algoritma Utama Sendi (PERSIS dari camera.js lo)
function hitungJarak(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function analisaGerakan(landmarks) {
    const jari = {
        telunjuk: [8, 6, 5],
        tengah: [12, 10, 9],
        manis: [16, 14, 13],
        kelingking: [20, 18, 17]
    };

    const isLurus = (titik) => {
        const keUjung = hitungJarak(landmarks[titik[0]], landmarks[titik[2]]);
        const keTengah = hitungJarak(landmarks[titik[1]], landmarks[titik[2]]);
        return keUjung > keTengah;
    };

    const telunjukLurus = isLurus(jari.telunjuk);
    const tengahLurus = isLurus(jari.tengah);
    const manisLurus = isLurus(jari.manis);
    const kelingkingLurus = isLurus(jari.kelingking);

    const jempol = landmarks[4];
    const jempolTerbuka = hitungJarak(jempol, landmarks[5]) > 0.05;

    if (hitungJarak(jempol, landmarks[8]) < 0.05 && tengahLurus && manisLurus && kelingkingLurus) {
        return "👌 OKE";
    }
    if (telunjukLurus && kelingkingLurus && !tengahLurus && !manisLurus) {
        return "🤟 I Love You Sayang";
    }
    if (jempolTerbuka && !telunjukLurus && !tengahLurus && !manisLurus && !kelingkingLurus) {
        return "👍 MANTAP";
    }
    if (telunjukLurus && tengahLurus && !manisLurus && !kelingkingLurus) {
        return "✌️ PISS";
    }
    if (!telunjukLurus && !tengahLurus && !manisLurus && !kelingkingLurus && !jempolTerbuka && hitungJarak(landmarks[8], landmarks[20]) < 0.12) {
        return "✊ SEMANGAT";
    }
    if (telunjukLurus && tengahLurus && manisLurus && kelingkingLurus && jempolTerbuka) {
        return "🖐️ HALO BROO";
    }

    return "Membaca gerakan...";
}

// 5. Fungsi Mematikan Kamera
function stopCameraBelajar() {
    kameraAktif = false;
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (canvasCtx && canvasElement) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
    
    if (btnStart) btnStart.classList.remove('hidden');
    if (btnStop) btnStop.classList.add('hidden');
    if (statusText) statusText.innerText = "Kamera belum aktif...";
}

// Pasang Event Listener ke Elemen UI
if (btnStart) btnStart.addEventListener('click', startCameraBelajar);
if (btnStop) btnStop.addEventListener('click', stopCameraBelajar);
if (btnNext) btnNext.addEventListener('click', () => { indexTantangan++; tampilkanTantangan(); });