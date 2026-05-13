export function renderPlayers(container, players, me) {
  container.innerHTML = "";
  players.forEach((p) => {
    const el = document.createElement("div");
    el.className = "player-item";
    el.innerHTML = `<span>${p.avatar || "🙂"}</span> <strong>${p.name}</strong> ${p.id === me ? "(Anda)" : ""} <small>${p.handCount} kartu</small>`;
    container.appendChild(el);
  });
}
