# Jendral Deluxe Refactor

Struktur file:
- `index.html` : markup utama + lobby multiplayer
- `styles.css` : seluruh style dipisah dari HTML
- `js/game-core.js` : logic game lokal hasil pemisahan dari file asli
- `js/multiplayer.js` : layer Firebase untuk lobby, room, dan chat
- `js/main.js` : penghubung mode singleplayer / multiplayer

## Yang sudah dipisah
- HTML, CSS, dan JS sudah tidak lagi campur dalam satu file.
- Fungsi game inti tetap berada di `game-core.js`.
- Fungsi multiplayer, room list, room terkunci, join acak, join manual, dan chat dipindah ke `multiplayer.js`.

## Yang perlu diisi
Buka `js/main.js`, lalu isi `window.FIREBASE_CONFIG` dengan config Firebase Anda:
- apiKey
- authDomain
- databaseURL
- projectId
- appId

## Catatan penting
Refactor ini fokus pada struktur + lobby realtime + chat.
Bagian sinkronisasi turn-by-turn dari engine kartu yang sangat kompleks masih perlu disambungkan lebih lanjut bila ingin permainan multiplayer penuh dengan state yang benar-benar authoritative.