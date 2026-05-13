import { initNetwork, getUser } from "./multiplayer/network.js";
import { createRoom, joinRoom, claimHost } from "./multiplayer/room-manager.js";
import { observeRoom, startGameAsHost, playCardAsHost, passAsHost } from "./multiplayer/sync-engine.js";
import { renderPlayers } from "./render/player-renderer.js";
import { renderHands } from "./render/hand-renderer.js";
import { renderTable } from "./render/table-renderer.js";
import { pulse } from "./render/animation.js";

const state = { roomId: null, room: null, isHost: false, selectedCardId: null };

const ui = {
  lobby: document.getElementById("lobby-screen"),
  room: document.getElementById("room-screen"),
  playerName: document.getElementById("player-name"),
  roomCode: document.getElementById("manual-room-code"),
  players: document.getElementById("room-players"),
  gameState: document.getElementById("status"),
  hand: document.getElementById("hand")
};

function roomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
async function init() { await initNetwork(window.FIREBASE_CONFIG); }

function render() {
  if (!state.room) return;
  const players = Object.values(state.room.players || {}).sort((a, b) => a.position - b.position);
  const me = getUser().uid;

  const myHand = state.room.game?.hands?.[me] || [];
  if (state.selectedCardId && !myHand.some((c) => c.id === state.selectedCardId)) state.selectedCardId = null;

  renderPlayers(ui.players, players, me);
  renderTable(ui.gameState, state.room.game, players.find((p) => p.id === state.room.game?.currentTurn)?.name);
  renderHands(ui.hand, players, state.room.game?.hands || {}, me, state.selectedCardId, (cardId) => {
    state.selectedCardId = cardId;
    render();
  });
  pulse(ui.players);
}

function bindRoom(roomId) {
  state.roomId = roomId;
  observeRoom(roomId, (room) => {
    state.room = room;
    render();
  });
}

document.getElementById("multiplayer-btn").onclick = () => { ui.lobby.style.display = "flex"; };
document.getElementById("create-room-btn").onclick = async () => {
  const code = roomCode();
  await createRoom(code, ui.playerName.value || "Player", "🛡️");
  state.isHost = await claimHost(code);
  bindRoom(code);
  ui.room.style.display = "flex";
  ui.lobby.style.display = "none";
};
document.getElementById("manual-join-btn").onclick = async () => {
  const code = (ui.roomCode.value || "").toUpperCase();
  await joinRoom(code, ui.playerName.value || "Player", "🎴");
  state.isHost = await claimHost(code);
  bindRoom(code);
  ui.room.style.display = "flex";
  ui.lobby.style.display = "none";
};
document.getElementById("auto-join-btn").onclick = () => alert("Auto join dihapus demi arsitektur stabil.");
document.getElementById("toggle-lock-btn").remove();

document.getElementById("start-room-btn").onclick = async () => {
  if (!state.isHost || !state.room) return;
  await startGameAsHost(state.roomId, state.room);
};

document.getElementById("playBtn").onclick = async () => {
  if (!state.isHost || !state.room || !state.selectedCardId) return;
  await playCardAsHost(state.roomId, state.room, getUser().uid, state.selectedCardId);
};

document.getElementById("passBtn").onclick = async () => {
  if (!state.isHost || !state.room) return;
  await passAsHost(state.roomId, state.room, getUser().uid);
};

document.getElementById("leave-room-btn").onclick = () => window.location.reload();
document.getElementById("close-lobby-btn").onclick = () => (ui.lobby.style.display = "none");

init();
