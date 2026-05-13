export const SUITS = ["club", "diamond", "heart", "spade"];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 3; rank <= 15; rank += 1) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, isJoker: false });
    }
  }
  deck.push({ id: "joker-black", suit: "joker_black", rank: 16, isJoker: true, red: false });
  deck.push({ id: "joker-red", suit: "joker_red", rank: 17, isJoker: true, red: true });
  return deck;
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardLabel(card) {
  if (card.isJoker) return card.red ? "🃏R" : "🃏B";
  const rank = { 11: "J", 12: "Q", 13: "K", 14: "A", 15: "2" }[card.rank] || String(card.rank);
  const suit = { club: "♣", diamond: "♦", heart: "♥", spade: "♠" }[card.suit] || "?";
  return `${rank}${suit}`;
}
