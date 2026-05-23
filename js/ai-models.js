const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const videoElement = document.getElementById('webcam');
const textOutput = document.getElementById('translation-text');

let handpose;
let prediksiTangan = [];

// Inisialisasi model Handpose dari ml5.js
console.log("Memuat AI...");
handpose = ml5.handpose(videoElement, () => {
    console.log("AI Model Siap!");
    textOutput.innerText = "Posisikan tangan Anda di depan kamera";
});

// Setiap kali AI mendeteksi tangan, simpan koordinatnya
handpose.on('predict', results => {
    prediksiTangan = results;
});

// Fungsi pembantu menghitung jarak koordinat jari
function hitungJarak(p1, p2) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

// Logika pembacaan gerakan tangan
function analisaGerakan(landmarks) {
    // Ambil titik ujung jari (0 = pergelangan, 4 = jempol, 8 = telunjuk, 12 = tengah, 16 = manis, 20 = kelingking)
    const jempol = landmarks[4];
    const telunjuk = landmarks[8];
    const tengah = landmarks[12];
    const manis = landmarks[16];
    const kelingking = landmarks[20];

    // Cek apakah jari tegak ke atas (koordinat Y ujung jari lebih kecil dari sendi di bawahnya)
    const telunjukTegak = telunjuk[1] < landmarks[6][1];
    const tengahTegak = tengah[1] < landmarks[10][1];
    const manisTegak = manis[1] < landmarks[14][1];
    const kelingkingTegak = kelingking[1] < landmarks[18][1];

    // 1. Isyarat I Love You (🤟)
    if (telunjukTegak && kelingkingTegak && !tengahTegak && !manisTegak) {
        return "🤟 I Love You / Sayang";
    }

    // 2. Isyarat OKE (👌)
    const jarakJempolTelunjuk = hitungJarak(jempol, telunjuk);
    if (jarakJempolTelunjuk < 30 && tengahTegak && manisTegak && kelingkingTegak) {
        return "👌 OKE";
    }

    // 3. Isyarat HALO (👋)
    if (telunjukTegak && tengahTegak && manisTegak && kelingkingTegak) {
        return "👋 HALO / HAI";
    }

    return "Membaca gerakan...";
}

// Looping untuk menggambar titik-titik di layar
function predictFrame() {
    // Bersihkan canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Samakan ukuran canvas dengan video
    if (videoElement.videoWidth > 0) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
    }

    // Jika ada tangan terdeteksi
    if (prediksiTangan.length > 0) {
        const landmarks = prediksiTangan[0].landmarks;

        // Gambar 21 titik di tangan
        for (let i = 0; i < landmarks.length; i++) {
            const x = landmarks[i][0];
            const y = landmarks[i][1];

            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 6, 0, 2 * Math.PI);
            canvasCtx.fillStyle = '#00ffcc'; // Warna teal glowing sesuai tema UI lo
            canvasCtx.fill();
        }

        // Jalankan mesin penerjemah
        const hasil = analisaGerakan(landmarks);
        textOutput.innerText = hasil;
    }

    // Ulangi terus frame-by-frame
    requestAnimationFrame(predictFrame);
}