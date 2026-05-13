import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  update,
  remove,
  onValue,
  onChildAdded,
  get,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

let app = null;
let auth = null;
let db = null;
let user = null;

const state = {
  roomId: null,
  roomData: null,
  unsubscribers: [],
  isHost: false,
  joined: false
};

function ensureConfig() {
  if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) {
    throw new Error("Isi window.FIREBASE_CONFIG dulu di main.js");
  }
}

export async function initFirebase() {
  ensureConfig();
  try {
    app = initializeApp(window.FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getDatabase(app);
    console.log("Firebase initialized. DB instance:", db);
    
    await signInAnonymously(auth);
    console.log("Anonymous sign-in initiated");
    
    await new Promise((resolve) => {
      onAuthStateChanged(auth, (u) => {
        if (u) {
          user = u;
          window.CURRENT_USER_UID = u.uid;
          console.log("User authenticated:", u.uid);
          resolve();
        }
      });
    });
    console.log("Firebase setup complete. User:", user.uid);
    return { app, auth, db, user };
  } catch (err) {
    console.error("Firebase initialization error:", err);
    throw err;
  }
}

function roomRef(roomId) { return ref(db, `rooms/${roomId}`); }
function roomMetaRef(roomId) { return ref(db, `rooms/${roomId}/meta`); }
function playersRef(roomId) { return ref(db, `rooms/${roomId}/players`); }
function messagesRef(roomId) { return ref(db, `rooms/${roomId}/messages`); }
function gameRef(roomId) { return ref(db, `rooms/${roomId}/gameState`); }
function actionRef(roomId) { return ref(db, `rooms/${roomId}/actions`); }

export function getCurrentUser() {
  return user;
}

export function getCurrentRoomId() {
  return state.roomId;
}

export async function createRoom({ roomName, playerName, password = "", locked = false }) {
  if (!user || !user.uid) {
    throw new Error("User belum terinisialisasi. Silakan refresh halaman.");
  }
  if (!db) {
    throw new Error("Database tidak terinisialisasi. Silakan refresh halaman.");
  }
  
  const roomId = makeRoomCode();
  const me = user;
  const data = {
    meta: {
      roomId,
      roomName: roomName || `Room ${roomId}`,
      locked: !!locked || !!password,
      password: password || "",
      createdAt: Date.now(),
      hostUid: me.uid,
      hostName: playerName || "Player",
      phase: "lobby",
      maxPlayers: 4
    },
    players: {
      [me.uid]: {
        uid: me.uid,
        name: playerName || "Player",
        joinedAt: Date.now(),
        ready: false,
        host: true
      }
    },
    messages: {},
    gameState: null
  };
  
  try {
    console.log("Creating room", roomId, "with data:", data);
    const ref_obj = roomRef(roomId);
    console.log("Room ref created:", ref_obj);
    
    await set(ref_obj, data);
    console.log("Room created and written to Firebase:", roomId);
    return roomId;
  } catch (err) {
    console.error("Error creating room in Firebase:", err);
    throw err;
  }
}

export async function joinRoom(roomId, { playerName, password = "", asAutoJoin = false } = {}) {
  const snap = await get(roomMetaRef(roomId));
  if (!snap.exists()) throw new Error("Room tidak ditemukan");
  const meta = snap.val();
  if (meta.locked && meta.password && meta.password !== password) {
    throw new Error("Password room salah");
  }
  const playersSnapshot = await get(playersRef(roomId));
  const players = playersSnapshot.exists() ? playersSnapshot.val() : {};
  if (Object.keys(players).length >= (meta.maxPlayers || 4)) {
    throw new Error("Room penuh");
  }
  const me = user;
  await update(ref(db, `rooms/${roomId}/players/${me.uid}`), {
    uid: me.uid,
    name: playerName || `Player-${me.uid.slice(0,4)}`,
    joinedAt: Date.now(),
    ready: false,
    host: meta.hostUid === me.uid
  });
  state.roomId = roomId;
  state.isHost = meta.hostUid === me.uid;
  state.joined = true;
  return { roomId, meta, isHost: state.isHost };
}

export async function leaveRoom() {
  if (!state.roomId || !user) return;
  await remove(ref(db, `rooms/${state.roomId}/players/${user.uid}`));
  await push(messagesRef(state.roomId), {
    system: true,
    text: `${user.uid.slice(0,4)} keluar dari room`,
    ts: Date.now()
  });
  detachRoom();
  state.roomId = null;
  state.joined = false;
  state.isHost = false;
}

export async function listOpenRooms() {
  const q = query(ref(db, "rooms"), orderByChild("meta/locked"), equalTo(false), limitToLast(20));
  const snap = await get(q);
  const rooms = [];
  if (snap.exists()) {
    const raw = snap.val();
    for (const [roomId, room] of Object.entries(raw)) {
      const players = room.players || {};
      rooms.push({
        roomId,
        name: room.meta?.roomName || roomId,
        playersCount: Object.keys(players).length,
        locked: !!room.meta?.locked,
        hostName: room.meta?.hostName || "",
        phase: room.meta?.phase || "lobby"
      });
    }
  }
  return rooms.sort((a,b) => b.playersCount - a.playersCount);
}

export async function autoJoinRoom(playerName, password = "") {
  const rooms = await listOpenRooms();
  const room = rooms.find((r) => !r.locked && r.playersCount < 4);
  if (!room) throw new Error("Tidak ada room terbuka");
  return joinRoom(room.roomId, { playerName, password, asAutoJoin: true });
}

export async function sendChat(text) {
  if (!state.roomId || !text.trim()) return;
  await push(messagesRef(state.roomId), {
    uid: user.uid,
    name: user.displayName || "Player",
    text: text.trim(),
    ts: Date.now()
  });
}

export async function toggleLock(nextValue) {
  if (!state.roomId) return;
  await update(roomMetaRef(state.roomId), { locked: !!nextValue });
}

export async function startRoomGame() {
  if (!state.roomId) return;
  await update(roomMetaRef(state.roomId), { phase: "playing" });
}

export async function writeGameState(snapshot) {
  if (!state.roomId || !snapshot) return;
  try {
    // Try to construct ordered UID array from players list
    const playersSnap = await get(playersRef(state.roomId));
    let uidsOrder = [];
    if (playersSnap.exists()) {
      const playersObj = playersSnap.val();
      const arr = Object.values(playersObj);
      arr.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      uidsOrder = arr.map(p => p.uid);
    }
    await set(gameRef(state.roomId), { state: snapshot, uids: uidsOrder });
  } catch (err) {
    console.error('writeGameState error:', err);
    await set(gameRef(state.roomId), snapshot);
  }
}

export function observeRoom(roomId, handlers) {
  detachRoom();
  state.roomId = roomId;
  const metaUnsub = onValue(roomMetaRef(roomId), (snap) => {
    handlers.onMeta && handlers.onMeta(snap.exists() ? snap.val() : null);
  });
  const playersUnsub = onValue(playersRef(roomId), (snap) => {
    handlers.onPlayers && handlers.onPlayers(snap.exists() ? snap.val() : {});
  });
  const gameUnsub = onValue(gameRef(roomId), (snap) => {
    handlers.onGameState && handlers.onGameState(snap.exists() ? snap.val() : null);
  });
  const msgUnsub = onChildAdded(messagesRef(roomId), (snap) => {
    handlers.onMessage && handlers.onMessage({ id: snap.key, ...snap.val() });
  });
  const actionUnsub = onChildAdded(actionRef(roomId), (snap) => {
    handlers.onAction && handlers.onAction({ id: snap.key, ...snap.val() });
  });
  state.unsubscribers = [metaUnsub, playersUnsub, gameUnsub, msgUnsub, actionUnsub].filter(Boolean);
}

export async function sendAction(action) {
  if (!state.roomId) return;
  await push(actionRef(state.roomId), {
    uid: user.uid,
    name: user.displayName || "Player",
    ...action,
    ts: Date.now()
  });
}

export async function upsertPlayerProfile(playerName) {
  if (!state.roomId || !user) return;
  await update(ref(db, `rooms/${state.roomId}/players/${user.uid}`), {
    name: playerName || "Player"
  });
}

export function detachRoom() {
  for (const u of state.unsubscribers) {
    try { typeof u === "function" && u(); } catch (_) {}
  }
  state.unsubscribers = [];
}

export function makeRoomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}