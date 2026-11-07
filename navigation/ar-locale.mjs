const copy = {
  "↶ 轉身後繼續": {
    "en": "↶ Turn around to continue",
    "id": "↶ Berbalik untuk melanjutkan"
  },
  "→ 朝右方通道前進": {
    "en": "→ Follow the passage to the right",
    "id": "→ Ikuti lorong ke kanan"
  },
  "← 朝左方通道前進": {
    "en": "← Follow the passage to the left",
    "id": "← Ikuti lorong ke kiri"
  },
  "迴轉": {
    "en": "turn around",
    "id": "putar balik"
  },
  "右轉": {
    "en": "turn right",
    "id": "belok kanan"
  },
  "左轉": {
    "en": "turn left",
    "id": "belok kiri"
  },
  "前方": {
    "en": "Ahead: ",
    "id": "Di depan: "
  },
  "依站內標示通過設施，到達後按「到了」。": {
    "en": "Follow station signs through the facility, then confirm arrival.",
    "id": "Ikuti petunjuk melewati fasilitas, lalu konfirmasi tiba."
  },
  "路線已完成。": {
    "en": "Your route is complete.",
    "id": "Rute telah selesai."
  },
  "面向第一段通道，按「開始步伐引導」。": {
    "en": "Face the first passage and tap Start step guidance.",
    "id": "Hadapkan ponsel ke lorong pertama, lalu tekan Mulai panduan langkah."
  },
  "估算已到。看到地標或轉角後，請按「到了」。": {
    "en": "Estimated arrival. Confirm when you see the landmark or corner.",
    "id": "Perkiraan sudah tiba. Konfirmasi saat melihat penanda atau tikungan."
  },
  " · 到了實際轉角再轉。": {
    "en": " · Turn at the actual corner.",
    "id": " · Berbelok di tikungan yang sebenarnya."
  },
  "將手機稍向下。到達轉角或地標後按「到了」。": {
    "en": "Tilt your phone slightly down. Confirm at the corner or landmark.",
    "id": "Miringkan ponsel sedikit ke bawah. Konfirmasi di tikungan atau penanda."
  },
  "步伐偵測中": {
    "en": "Detecting steps",
    "id": "Mendeteksi langkah"
  },
  "尚未收到步伐感測 · 可手動補步": {
    "en": "No step data yet · Add steps manually",
    "id": "Belum ada data langkah · Tambahkan langkah manual"
  },
  " · 本段約 ": {
    "en": " · This segment: ",
    "id": " · Segmen ini: "
  },
  "重設朝向": {
    "en": "Reset direction",
    "id": "Atur ulang arah"
  },
  "開始步伐引導": {
    "en": "Start step guidance",
    "id": "Mulai panduan langkah"
  },
  "正在開啟後置鏡頭…": {
    "en": "Opening rear camera…",
    "id": "Membuka kamera belakang…"
  },
  "相機已中斷，可以重新開啟。": {
    "en": "Camera disconnected. You can retry.",
    "id": "Kamera terputus. Silakan coba lagi."
  },
  "相機權限未開啟。請確認 App 或瀏覽器的相機權限；仍可關閉 AR，使用地圖導航。": {
    "en": "Camera access is not allowed. Check app or browser permissions, or close AR and use the map.",
    "id": "Akses kamera belum diizinkan. Periksa izin aplikasi atau browser, atau tutup AR dan gunakan peta."
  },
  "無法開啟相機。請確認裝置有可用相機，並以 HTTPS 開啟；仍可使用地圖導航。": {
    "en": "Camera unavailable. Check your camera and HTTPS connection. Map guidance is still available.",
    "id": "Kamera tidak tersedia. Periksa kamera dan koneksi HTTPS. Panduan peta tetap tersedia."
  },
  "沿通道走到下一個轉角": {
    "en": "Follow the passage to the next corner",
    "id": "Ikuti lorong ke tikungan berikutnya"
  },
  "到了 · 通道轉角": {
    "en": "Here · Passage corner",
    "id": "Sudah tiba · Tikungan"
  },
  "到了 · 下一個地標": {
    "en": "Here · Next landmark",
    "id": "Sudah tiba · Penanda berikutnya"
  }
};
Object.assign(copy,{"抵達轉角": {"en": "At the corner", "id": "Tiba di tikungan"}, "抵達地標": {"en": "At the landmark", "id": "Tiba di penanda"}, "請允許相機，或關閉 AR 使用地圖。": {"en": "Allow the camera, or close AR to use the map.", "id": "Izinkan kamera, atau tutup AR untuk memakai peta."}, "相機無法使用，可回到地圖繼續導航。": {"en": "Camera unavailable. You can use the map.", "id": "Kamera tidak tersedia. Gunakan peta."}, "相機已中斷": {"en": "Camera disconnected", "id": "Kamera terputus"}});
Object.assign(copy,{
 '相機權限被拒絕。請在模擬器設定中允許 TownPass 使用相機，再重試；若仍被拒絕，請改用地圖。':{en:'Camera permission denied. Allow camera access for TownPass in emulator settings and retry. If still denied, use the map.',id:'Izin kamera ditolak. Izinkan kamera untuk TownPass di pengaturan emulator, lalu coba lagi. Jika masih ditolak, gunakan peta.'},
 '相機需要 HTTPS 或 localhost 安全來源，請改用安全網址開啟。':{en:'Camera requires HTTPS or localhost. Open a secure URL.',id:'Kamera memerlukan HTTPS atau localhost. Buka URL yang aman.'},
 '模擬器找不到相機，請檢查虛擬裝置的相機設定。':{en:'No camera found. Check the virtual device camera settings.',id:'Kamera tidak ditemukan. Periksa pengaturan kamera perangkat virtual.'}
});
export const arText=(zh,lang)=>lang==='zh'?zh:(copy[zh]?.[lang]||zh);
