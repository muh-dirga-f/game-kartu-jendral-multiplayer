import {
  initFirebase,
  createRoom,
  joinRoom,
  autoJoinRoom,
  leaveRoom,
  listOpenRooms,
  sendChat,
  toggleLock,
  startRoomGame,
  writeGameState,
  observeRoom,
  upsertPlayerProfile,
  getCurrentRoomId,
  sendAction
} from "./multiplayer.js";

const ui = {
  startScreen: document.getElementById("start-screen"),
  lobbyScreen: document.getElementById("lobby-screen"),
  roomScreen: document.getElementById("room-screen"),
  roomList: document.getElementById("room-list"),
  roomTitle: document.getElementById("room-title"),
  roomSubtitle: document.getElementById("room-subtitle"),
  roomPlayers: document.getElementById("room-players"),
  roomChatLog: document.getElementById("room-chat-log"),
  roomChatInput: document.getElementById("room-chat-input"),
  roomChatSend: document.getElementById("room-chat-send"),
  playChatLog: document.getElementById("play-chat-log"),
  playChatInput: document.getElementById("play-chat-input"),
  playChatSend: document.getElementById("play-chat-send")
};

const app = {
  mode: "single",
  roomId: null,
  playerName: localStorage.getItem("jendral_player_name") || "Player",
  roomName: "",
  locked: false,
  password: ""
};

function setVisible(el, yes) {
  if (!el) return;
  el.style.display = yes ? "flex" : "none";
}

function appendChatMessage(target, msg) {
  const item = document.createElement("div");
  item.className = "chat-item";
  const name = msg.system ? "System" : (msg.name || "Player");
  item.innerHTML = `<div><strong>${name}</strong> <span class="muted">${msg.ts ? new Date(msg.ts).toLocaleTimeString() : ""}</span></div><div>${escapeHtml(msg.text || "")}</div>`;
  target.prepend(item);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;" }[s]));
}

async function refreshRooms() {
  const rooms = await listOpenRooms();
  ui.roomList.innerHTML = "";
  if (!rooms.length) {
    ui.roomList.innerHTML = `<div class="muted">Belum ada room terbuka.</div>`;
    return;
  }
  for (const room of rooms) {
    const row = document.createElement("div");
    row.className = "room-item";
    row.innerHTML = `
      <div>
        <div><strong>${escapeHtml(room.name)}</strong> ${room.locked ? "🔒" : ""}</div>
        <div class="room-meta">${room.roomId} • ${room.playersCount}/4 • ${escapeHtml(room.hostName || "")}</div>
      </div>
      <button class="btn btn-primary">Gabung</button>
    `;
    row.querySelector("button").onclick = async () => {
      try {
        app.mode = "multiplayer";
        await joinAndEnter(room.roomId);
      } catch (err) {
        alert(err.message || String(err));
      }
    };
    ui.roomList.appendChild(row);
  }
}

async function joinAndEnter(roomId, opts = {}) {
  localStorage.setItem("jendral_player_name", app.playerName);
  await joinRoom(roomId, { playerName: app.playerName, password: app.password || "", asAutoJoin: !!opts.auto });
  app.roomId = roomId;
  enterRoomUI(roomId);
  observeRoom(roomId, {
    onMeta(meta) {
      if (!meta) return;
      ui.roomTitle.textContent = `${meta.roomName || roomId} ${meta.locked ? "🔒" : ""}`;
      ui.roomSubtitle.textContent = `Room ${roomId} • ${meta.phase || "lobby"}`;
      app.locked = !!meta.locked;
    },
    onPlayers(players) {
      ui.roomPlayers.innerHTML = "";
      const list = Object.values(players || {});
      if (!list.length) {
        ui.roomPlayers.innerHTML = `<div class="muted">Belum ada player.</div>`;
        return;
      }
      list.sort((a,b) => (a.joinedAt || 0) - (b.joinedAt || 0)).forEach((p) => {
        const div = document.createElement("div");
        div.className = "player-item";
        div.textContent = `${p.name}${p.host ? " (host)" : ""}${p.ready ? " • ready" : ""}`;
        ui.roomPlayers.appendChild(div);
      });
    },
    onMessage(msg) {
      appendChatMessage(ui.roomChatLog, msg);
      appendChatMessage(ui.playChatLog, msg);
    },
    onGameState(snapshot) {
      if (snapshot && window.JendralCore) {
        window.JendralCore.restoreState(snapshot);
      }
    }
  });
}

function enterRoomUI(roomId) {
  setVisible(ui.lobbyScreen, false);
  setVisible(ui.roomScreen, true);
  setVisible(ui.startScreen, false);
  if (window.APP_MODE === "multiplayer") {
    document.getElementById("ui").style.display = "block";
  }
  ui.roomChatLog.innerHTML = "";
  ui.playChatLog.innerHTML = "";
}

async function sendRoomChat() {
  const text = ui.roomChatInput.value.trim();
  if (!text) return;
  ui.roomChatInput.value = "";
  await sendChat(text);
}

async function sendPlayChat() {
  const text = ui.playChatInput.value.trim();
  if (!text) return;
  ui.playChatInput.value = "";
  await sendChat(text);
}

async function initLobby() {
  await initFirebase();
  await refreshRooms();
}

document.getElementById("start-game-btn").addEventListener("click", () => {
  window.APP_MODE = "single";
});

document.getElementById("multiplayer-btn").addEventListener("click", async () => {
  window.APP_MODE = "multiplayer";
  app.mode = "multiplayer";
  setVisible(ui.lobbyScreen, true);
  await refreshRooms();
});

document.getElementById("close-lobby-btn").addEventListener("click", () => setVisible(ui.lobbyScreen, false));
document.getElementById("auto-join-btn").addEventListener("click", async () => {
  try {
    app.playerName = (document.getElementById("player-name").value || app.playerName).trim();
    app.password = (document.getElementById("room-password").value || "").trim();
    const result = await autoJoinRoom(app.playerName, app.password);
    await joinAndEnter(result.roomId, { auto: true });
  } catch (err) {
    alert(err.message || String(err));
  }
});

document.getElementById("manual-join-btn").addEventListener("click", async () => {
  try {
    app.playerName = (document.getElementById("player-name").value || app.playerName).trim();
    const code = (document.getElementById("manual-room-code").value || "").trim().toUpperCase();
    if (!code) throw new Error("Kode room kosong");
    await joinAndEnter(code);
  } catch (err) {
    alert(err.message || String(err));
  }
});

document.getElementById("create-room-btn").addEventListener("click", async () => {
  try {
    app.playerName = (document.getElementById("player-name").value || app.playerName).trim();
    app.roomName = (document.getElementById("room-name").value || "").trim();
    app.password = (document.getElementById("room-password").value || "").trim();
    app.locked = document.getElementById("room-locked").checked;
    const roomId = await createRoom({
      roomName: app.roomName,
      playerName: app.playerName,
      password: app.password,
      locked: app.locked
    });
    await joinAndEnter(roomId);
  } catch (err) {
    alert(err.message || String(err));
  }
});

document.getElementById("leave-room-btn").addEventListener("click", async () => {
  await leaveRoom();
  setVisible(ui.roomScreen, false);
  setVisible(ui.lobbyScreen, true);
  await refreshRooms();
});

document.getElementById("room-chat-send").addEventListener("click", sendRoomChat);
document.getElementById("play-chat-send").addEventListener("click", sendPlayChat);
ui.roomChatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendRoomChat(); });
ui.playChatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendPlayChat(); });

document.getElementById("toggle-lock-btn").addEventListener("click", async () => {
  app.locked = !app.locked;
  await toggleLock(app.locked);
});

document.getElementById("start-room-btn").addEventListener("click", async () => {
  await startRoomGame();
  if (window.JendralCore) {
    window.JendralCore.notifyStateChange();
  }
  setVisible(ui.roomScreen, false);
  setVisible(ui.lobbyScreen, false);
});

document.getElementById("toggle-chat-btn").addEventListener("click", () => {
  const box = document.getElementById("room-chat-float");
  box.style.display = box.style.display === "none" ? "block" : "none";
});

window.addEventListener("jendral:state-change", async (e) => {
  if (window.APP_MODE !== "multiplayer") return;
  if (!getCurrentRoomId()) return;
  await writeGameState(e.detail);
});

window.addEventListener("jendral:open-lobby", async () => {
  setVisible(ui.lobbyScreen, true);
  await refreshRooms();
});

window.addEventListener("jendral:state-change", async (e) => {
  if (window.APP_MODE !== "multiplayer") return;
  if (!getCurrentRoomId()) return;
  await writeGameState(e.detail);
});

await initLobby();
setVisible(ui.lobbyScreen, false);
setVisible(ui.roomScreen, false);