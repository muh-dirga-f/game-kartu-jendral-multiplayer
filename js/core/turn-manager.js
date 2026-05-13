export function nextTurn(players, currentTurn) {
  const ids = players.map((p) => p.id);
  const idx = ids.indexOf(currentTurn);
  if (idx === -1) return ids[0] || null;
  return ids[(idx + 1) % ids.length] || null;
}
