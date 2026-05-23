// ==========================================
// CONFIGURATION FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyFakeKey_BiarLangsungJalanDulu",
    authDomain: "signspeak-app.firebaseapp.com",
    projectId: "signspeak-app",
    storageBucket: "signspeak-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:12345:web:abcd"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// ==========================================

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const textOutput = document.getElementById('translation-text');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');

let hands;
let kameraAktif = false;

// 1. Fungsi Mengaktifkan Kamera
async function startProject() {
    try {
        textOutput.innerText = "Memuat AI & Kamera... Mohon tunggu.";
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            kameraAktif = true;
            btnStart.classList.add('hidden');
            btnStop.classList.remove('hidden');
            
            // Nyalakan AI MediaPipe
            initAI();
        };
    } catch (err) {
        console.error(err);
        alert("Gagal akses kamera. Pastikan izin diberikan!");
    }
}

// 2. Inisialisasi MediaPipe Hands
function initAI() {
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // Jalankan fungsi jika AI berhasil mendeteksi tangan
    hands.onResults(onResults);

    textOutput.innerText = "Posisikan tangan Anda di depan kamera";
    
    // Mulai kirim frame video ke AI
    predictFrame();
}

// 3. Mengirim Frame Video ke AI secara Terus Menerus
async function predictFrame() {
    if (!kameraAktif) return;

    if (videoElement.videoWidth > 0) {
        try {
            await hands.send({ image: videoElement });
        } catch (err) {
            console.error("AI Error:", err);
        }
    }
    // Lanjut ke frame berikutnya
    requestAnimationFrame(predictFrame);
}

// 4. Menggambar Titik & Menerjemahkan Gerakan
function onResults(results) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (videoElement.videoWidth > 0) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            
            // Gambar 21 titik koordinat di layar (Sudah Diperbaiki untuk Kamera Mirror)
            for (const landmark of landmarks) {
                // RUMUS MIRROR: Membalik koordinat X agar pas dengan video scale-x-[-1]
                const x = canvasElement.width - (landmark.x * canvasElement.width);
                const y = landmark.y * canvasElement.height;
                
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
                canvasCtx.fillStyle = '#01f7c5'; // Warna teal glowing
                canvasCtx.fill();
            }

            // Jalankan mesin penerjemah kata
            textOutput.innerText = analisaGerakan(landmarks);
        }
    } else {
        textOutput.innerText = "Posisikan tangan Anda di depan kamera";
    }
}

// 5. Rumus Jarak & Logika Isyarat
function hitungJarak(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function analisaGerakan(landmarks) {
    const jempol = landmarks[4];
    const telunjuk = landmarks[8];
    const tengah = landmarks[12];
    const manis = landmarks[16];
    const kelingking = landmarks[20];

    const telunjukTegak = telunjuk.y < landmarks[6].y;
    const tengahTegak = tengah.y < landmarks[10].y;
    const manisTegak = manis.y < landmarks[14].y;
    const kelingkingTegak = kelingking.y < landmarks[18].y;

    // 1. Isyarat I Love You (🤟)
    if (telunjukTegak && kelingkingTegak && !tengahTegak && !manisTegak) {
        return "🤟 I Love You / Sayang";
    }
    // 2. Isyarat OKE (👌)
    if (hitungJarak(jempol, telunjuk) < 0.05 && tengahTegak && manisTegak && kelingkingTegak) {
        return "👌 OKE";
    }
    // 3. Isyarat HALO (👋)
    if (telunjukTegak && tengahTegak && manisTegak && kelingkingTegak) {
        return "👋 HALO / HAI";
    }

    return "Membaca gerakan...";
}

// 6. Fungsi Mematikan Kamera
function stopProject() {
    kameraAktif = false;
    const stream = videoElement.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
    textOutput.innerText = "Kamera belum aktif...";
}

// Pasang Event Listener ke Tombol UI
btnStart.addEventListener('click', startProject);
btnStop.addEventListener('click', stopProject);

// Ambil elemen tombol simpan dari HTML
const btnSave = document.getElementById('btn-save');

// Fungsi untuk menyimpan hasil ke database
async function simpanKeFirebase() {
    const teksHasil = textOutput.innerText;

    // Validasi: Jangan simpan kalau AI belum menerjemahkan apa-apa
    if (teksHasil === "Kamera belum aktif..." || teksHasil === "Posisikan tangan Anda di depan kamera" || teksHasil === "Membaca gerakan...") {
        alert("Waduh, belum ada hasil terjemahan yang valid nih buat disimpan!");
        return;
    }

    try {
        btnSave.innerText = "⏳ Menyimpan...";
        btnSave.disabled = true;

        // Kirim data ke Firestore
        await db.collection("riwayat_terjemahan").add({
            hasil: teksHasil,
            waktu: firebase.firestore.FieldValue.serverTimestamp() // Mengambil waktu server real-time
        });

        alert(`Berhasil menyimpan "${teksHasil}" ke riwayat database! 🎉`);
    } catch (error) {
        console.error("Error simpan data:", error);
        alert("Gagal menyimpan ke database. Cek koneksi internet atau config Firebase lo!");
    } finally {
        // Kembalikan status tombol
        btnSave.innerText = "💾 Simpan ke Riwayat";
        btnSave.disabled = false;
    }
}

// Pasang fungsi klik ke tombol simpan
btnSave.addEventListener('click', simpanKeFirebase);