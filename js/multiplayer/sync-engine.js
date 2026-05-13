import { getDb, ref, onValue, update, set, getUser } from "./network.js";
import { roomPath } from "./room-manager.js";
import { createInitialState, buildStartedState } from "../core/game-state.js";
import { nextTurn } from "../core/turn-manager.js";
import { canPlay } from "../core/rules.js";
import { syncHands } from "./player-sync.js";

export function observeRoom(roomId, cb) {
  return onValue(ref(getDb(), roomPath(roomId)), (snap) => cb(snap.val() || null));
}

export async function startGameAsHost(roomId, room) {
  const players = Object.values(room.players || {}).sort((a, b) => a.position - b.position);
  const base = createInitialState(players);
  const deal = buildStartedState(players);
  await syncHands(roomId, deal.hands);
  await update(ref(getDb(), `${roomPath(roomId)}/game`), {
    ...base,
    started: true,
    currentTurn: players[0].id,
    deck: deal.deck,
    discardPile: []
  });
}

export async function playCardAsHost(roomId, room, uid, cardId) {
  const game = room.game || {};
  if (game.currentTurn !== uid) return;
  const hands = game.hands || {};
  const hand = [...(hands[uid] || [])];
  const card = hand.find((c) => c.id === cardId);
  if (!card) return;
  const topCard = game.state?.topCard || null;
  if (!canPlay([card], topCard)) return;
  const newHands = { ...hands, [uid]: hand.filter((c) => c.id !== cardId) };
  const players = Object.values(room.players || {}).sort((a, b) => a.position - b.position);
  await syncHands(roomId, newHands);
  await update(ref(getDb(), `${roomPath(roomId)}/game`), {
    currentTurn: nextTurn(players, uid),
    discardPile: [...(game.discardPile || []), card],
    state: { ...(game.state || {}), topCard: card, passCount: 0, lastAction: `play:${uid}` }
  });
}

export async function passAsHost(roomId, room, uid) {
  const game = room.game || {};
  if (game.currentTurn !== uid) return;
  const players = Object.values(room.players || {}).sort((a, b) => a.position - b.position);
  await update(ref(getDb(), `${roomPath(roomId)}/game`), {
    currentTurn: nextTurn(players, uid),
    state: { ...(game.state || {}), passCount: (game.state?.passCount || 0) + 1, lastAction: `pass:${uid}` }
  });
}
