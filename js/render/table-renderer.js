import { cardLabel } from "../core/card-engine.js";

export function renderTable(el, game, currentTurnName) {
  const top = game?.state?.topCard;
  el.textContent = `Giliran: ${currentTurnName || "-"} | Kartu meja: ${top ? cardLabel(top) : "(kosong)"}`;
}
