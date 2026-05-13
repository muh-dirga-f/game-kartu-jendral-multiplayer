export function compareCards(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return String(a.suit).localeCompare(String(b.suit));
}

export function canPlay(cards, topCard) {
  if (!cards.length) return false;
  if (cards.length !== 1) return false;
  if (!topCard) return true;
  return compareCards(cards[0], topCard) > 0;
}
