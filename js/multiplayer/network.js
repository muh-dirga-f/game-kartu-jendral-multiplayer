import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, get, update, onValue, runTransaction, serverTimestamp, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

let db;
let auth;
let user;

export async function initNetwork(config) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getDatabase(app);
  await signInAnonymously(auth);
  await new Promise((resolve) => onAuthStateChanged(auth, (u) => { if (u) { user = u; resolve(); } }));
  return user;
}

export function getDb() { return db; }
export function getUser() { return user; }
export { ref, set, get, update, onValue, runTransaction, serverTimestamp, onDisconnect };
