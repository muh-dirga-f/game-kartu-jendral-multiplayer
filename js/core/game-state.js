import { createDeck, shuffleDeck } from "./card-engine.js";

export function createInitialState(players) {
  return {
    started: false,
    winnerOrder: [],
    currentTurn: players[0]?.id || null,
    deck: [],
    discardPile: [],
    state: {
      passCount: 0,
      topCard: null,
      lastAction: null
    }
  };
}

export function buildStartedState(players) {
  const deck = shuffleDeck(createDeck());
  const hands = {};
  players.forEach((p) => {
    hands[p.id] = [];
  });
  deck.forEach((card, index) => {
    const owner = players[index % players.length];
    hands[owner.id].push(card);
  });
  return { deck: [], hands };
}
