# Jendral Multiplayer Refactor

Refactor ini menghapus arsitektur campuran lokal/realtime dan menggantinya dengan arsitektur multiplayer modular berbasis host-authoritative.

## Struktur Baru

- `js/core/`
  - `game-state.js`
  - `rules.js`
  - `turn-manager.js`
  - `card-engine.js`
- `js/multiplayer/`
  - `network.js`
  - `room-manager.js`
  - `sync-engine.js`
  - `player-sync.js`
- `js/render/`
  - `table-renderer.js`
  - `player-renderer.js`
  - `hand-renderer.js`
  - `animation.js`
- `js/main.js`

## Perubahan Arsitektur Utama

- Sistem chat dihapus total (UI + listener + node data).
- Sistem room password/lock dihapus total.
- Host menjadi authoritative untuk:
  - inisialisasi game
  - deal kartu
  - validasi move
  - pergantian turn
  - update state global
- Client hanya render state room/game dari Firebase.
- State Firebase disederhanakan ke:
  - `rooms/{roomId}/players`
  - `rooms/{roomId}/game`

## Skema Player

Setiap player menyimpan:
- `id`
- `name`
- `avatar`
- `connected`
- `ready`
- `handCount`
- `position`

## Setup

Isi `window.FIREBASE_CONFIG` di `js/config.js`.

## Catatan

Gameplay rules dipertahankan dalam bentuk single-card flow yang stabil untuk sinkronisasi realtime. Struktur modular memudahkan ekspansi aturan kombinasi tanpa mencampur networking dan rendering.
