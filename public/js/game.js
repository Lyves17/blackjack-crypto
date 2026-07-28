// ============================================
// BLACKJACK GAME ENGINE - Pure Logic
// No DOM manipulation, no side effects
// ============================================

const SUITS = ['Heart', 'Diamond', 'Spade', 'Club'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':10,'Q':10,'K':10,'A':11 };

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.value = RANK_VALUES[rank];
    this.isAce = rank === 'A';
    this.faceUp = true;
  }
  get image() { return `/imgs/${this.suit}${this.rank}.svg`; }
  get name() { return `${this.suit}${this.rank}`; }
}

class Deck {
  constructor(numDecks = 6) {
    this.cards = [];
    for (let d = 0; d < numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(new Card(suit, rank));
        }
      }
    }
    this.shuffle();
  }
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  deal() {
    return this.cards.length > 0 ? this.cards.shift() : null;
  }
  get remaining() { return this.cards.length; }
}

class Hand {
  constructor() { this.cards = []; }
  addCard(card) { this.cards.push(card); }
  clear() { this.cards = []; }
  get length() { return this.cards.length; }

  get score() {
    let sum = 0, aces = 0;
    for (const c of this.cards) {
      if (c.isAce) { aces++; sum += 11; }
      else sum += c.value;
    }
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return sum;
  }

  get softScore() {
    let sum = 0, aces = 0;
    for (const c of this.cards) {
      if (c.isAce) { aces++; sum += 11; }
      else sum += c.value;
    }
    const hasSoftAce = aces > 0 && sum <= 21;
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return { hard: sum, soft: hasSoftAce };
  }

  get isBust() { return this.score > 21; }
  get isBlackjack() { return this.cards.length === 2 && this.score === 21; }
  get isSoft() { return this.softScore.soft; }
}

class BlackjackEngine {
  constructor() {
    this.deck = null;
    this.playerHand = new Hand();
    this.dealerHand = new Hand();
  }

  newRound(numDecks = 6) {
    this.deck = new Deck(numDecks);
    this.playerHand.clear();
    this.dealerHand.clear();
  }

  dealInitial() {
    this.playerHand.addCard(this.deck.deal());
    let d1 = this.deck.deal();
    d1.faceUp = true;
    this.dealerHand.addCard(d1);
    this.playerHand.addCard(this.deck.deal());
    let d2 = this.deck.deal();
    d2.faceUp = false;
    this.dealerHand.addCard(d2);
    return {
      playerCards: [this.playerHand.cards[0], this.playerHand.cards[1]],
      dealerCards: [this.dealerHand.cards[0], this.dealerHand.cards[1]],
      playerScore: this.playerHand.score,
      dealerVisibleScore: this.dealerHand.cards[0].value
    };
  }

  revealDealer() {
    this.dealerHand.cards.forEach(c => c.faceUp = true);
  }

  dealerPlay() {
    this.revealDealer();
    while (this.dealerHand.score < 17) {
      this.dealerHand.addCard(this.deck.deal());
    }
    return this.dealerHand.score;
  }

  getResult() {
    const ps = this.playerHand.score;
    const ds = this.dealerHand.score;
    const pBJ = this.playerHand.isBlackjack;
    const dBJ = this.dealerHand.isBlackjack;
    const pBust = this.playerHand.isBust;
    const dBust = this.dealerHand.isBust;

    if (pBJ && !dBJ) return 'blackjack';
    if (dBJ && !pBJ) return 'dealer_blackjack';
    if (pBJ && dBJ) return 'push';
    if (pBust) return 'bust';
    if (dBust) return 'win';
    if (ps > ds) return 'win';
    if (ps < ds) return 'lose';
    return 'push';
  }

  payout(result, bet) {
    switch (result) {
      case 'blackjack': return bet + Math.floor(bet * 1.5);
      case 'win': return bet * 2;
      case 'push': return bet;
      default: return 0;
    }
  }
}

// Export for use in other scripts
window.BlackjackEngine = BlackjackEngine;
window.Card = Card;
window.Deck = Deck;
window.Hand = Hand;
