import { getDb, ref, update, set, getUser } from "./network.js";
import { roomPath } from "./room-manager.js";

export async function syncHands(roomId, hands) {
  await set(ref(getDb(), `${roomPath(roomId)}/game/hands`), hands);
  const updates = {};
  Object.entries(hands).forEach(([uid, cards]) => {
    updates[`players/${uid}/handCount`] = cards.length;
  });
  await update(ref(getDb(), roomPath(roomId)), updates);
}

export function myUid() {
  return getUser().uid;
}
