import { getDb, getUser, ref, get, set, update, runTransaction, serverTimestamp, onDisconnect } from "./network.js";

export function roomPath(roomId) { return `rooms/${roomId}`; }
export function playerPath(roomId, uid) { return `${roomPath(roomId)}/players/${uid}`; }

export async function createRoom(roomId, playerName, avatar) {
  const me = getUser();
  await set(ref(getDb(), roomPath(roomId)), {
    players: {},
    game: { started: false, currentTurn: null, deck: [], discardPile: [], winnerOrder: [], state: {} },
    createdAt: serverTimestamp()
  });
  await joinRoom(roomId, playerName, avatar);
}

export async function joinRoom(roomId, playerName, avatar) {
  const me = getUser();
  const position = await assignPosition(roomId);
  const payload = {
    id: me.uid,
    name: playerName,
    avatar,
    connected: true,
    ready: false,
    handCount: 0,
    position
  };
  await set(ref(getDb(), playerPath(roomId, me.uid)), payload);
  onDisconnect(ref(getDb(), `${playerPath(roomId, me.uid)}/connected`)).set(false);
  return payload;
}

async function assignPosition(roomId) {
  const snap = await get(ref(getDb(), `${roomPath(roomId)}/players`));
  const used = new Set(Object.values(snap.val() || {}).map((p) => p.position));
  for (let i = 0; i < 4; i += 1) if (!used.has(i)) return i;
  throw new Error("Room penuh");
}

export async function setReady(roomId, ready) {
  const me = getUser();
  await update(ref(getDb(), playerPath(roomId, me.uid)), { ready });
}

export async function claimHost(roomId) {
  const hostRef = ref(getDb(), `${roomPath(roomId)}/hostId`);
  const me = getUser();
  const result = await runTransaction(hostRef, (curr) => curr || me.uid);
  return result.snapshot.val() === me.uid;
}
