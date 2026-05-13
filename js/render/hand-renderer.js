import { cardLabel } from "../core/card-engine.js";

export function renderHands(container, players, hands, me, selectedCardId, onSelect) {
  container.innerHTML = "";
  const mine = hands[me] || [];
  const title = document.createElement("h3");
  title.textContent = "Kartu Anda";
  container.appendChild(title);

  const row = document.createElement("div");
  row.className = "hand-row";
  mine.forEach((card) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = cardLabel(card);
    if (selectedCardId === card.id) {
      btn.style.outline = "2px solid #22c55e";
      btn.style.transform = "translateY(-2px)";
    }
    btn.onclick = () => onSelect(card.id);
    row.appendChild(btn);
  });
  container.appendChild(row);

  const others = document.createElement("div");
  others.className = "muted";
  others.textContent = players
    .filter((p) => p.id !== me)
    .map((p) => `${p.name}: ${"🂠".repeat(Math.min(p.handCount, 12))} (${p.handCount})`)
    .join(" | ");
  container.appendChild(others);
}
