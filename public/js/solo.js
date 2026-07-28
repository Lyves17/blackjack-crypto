// ============================================
// SOLO MODE - Game Loop + UI Controller
// ============================================

const SoloGame = {
  engine: null,
  balance: 5000,
  bet: 0,
  state: 'menu', // menu, betting, dealing, playing, dealer, result
  canBet: false,

  // DOM refs
  els: {},

  // Chip values
  chips: [
    { value: 10, class: 'chip-10' },
    { value: 50, class: 'chip-50' },
    { value: 100, class: 'chip-100' },
    { value: 500, class: 'chip-500' },
    { value: 1000, class: 'chip-1k' },
    { value: 5000, class: 'chip-5k' },
    { value: 10000, class: 'chip-10k' },
    { value: 50000, class: 'chip-50k' },
    { value: 100000, class: 'chip-100k' }
  ],

  init() {
    this.cacheElements();
    this.bindEvents();
    this.showScreen('menu');
  },

  cacheElements() {
    this.els = {
      menuScreen: document.getElementById('menu-screen'),
      gameScreen: document.getElementById('game-screen'),
      balanceEl: document.getElementById('balance'),
      betEl: document.getElementById('total-bet'),
      playerCards: document.getElementById('player-cards'),
      dealerCards: document.getElementById('dealer-cards'),
      playerScore: document.getElementById('player-score'),
      dealerScore: document.getElementById('dealer-score'),
      actionBtns: document.getElementById('action-btns'),
      resultOverlay: document.getElementById('result-overlay'),
      resultText: document.getElementById('result-text'),
      resultAmount: document.getElementById('result-amount'),
      btnHit: document.getElementById('btn-hit'),
      btnStand: document.getElementById('btn-stand'),
      btnDouble: document.getElementById('btn-double'),
      btnNewRound: document.getElementById('btn-new-round'),
      btnPlay: document.getElementById('btn-play'),
      chipContainer: document.getElementById('chip-tray'),
      btnClear: document.getElementById('btn-clear'),
      btnMax: document.getElementById('btn-max'),
      btnDeal: document.getElementById('btn-deal'),
      dealingCards: document.getElementById('dealing-cards'),
    };
  },

  bindEvents() {
    // Play button
    this.els.btnPlay.addEventListener('click', () => this.startBetting());

    // Chip clicks
    this.els.chipContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || !this.canBet) return;
      const val = parseInt(chip.dataset.value);
      if (val <= this.balance) {
        this.bet += val;
        this.balance -= val;
        this.updateDisplay();
        this.playSound('chipPlace');
      }
    });

    // Clear bet
    this.els.btnClear.addEventListener('click', () => {
      if (!this.canBet) return;
      this.balance += this.bet;
      this.bet = 0;
      this.updateDisplay();
      this.playSound('defaultClick');
    });

    // Max bet
    this.els.btnMax.addEventListener('click', () => {
      if (!this.canBet) return;
      this.bet += this.balance;
      this.balance = 0;
      this.updateDisplay();
      this.playSound('defaultClick');
    });

    // Deal
    this.els.btnDeal.addEventListener('click', () => {
      if (this.bet <= 0 || this.state !== 'betting') return;
      this.playSound('chipPlace');
      this.dealRound();
    });

    // Action buttons
    this.els.btnHit.addEventListener('click', () => this.playerHit());
    this.els.btnStand.addEventListener('click', () => this.playerStand());
    this.els.btnDouble.addEventListener('click', () => this.playerDouble());

    // New round
    this.els.btnNewRound.addEventListener('click', () => this.newRound());

    // Chip hover
    this.els.chipContainer.addEventListener('mouseover', (e) => {
      if (e.target.closest('.chip')) this.playSound('chipHover');
    });
  },

  showScreen(screen) {
    this.els.menuScreen.classList.toggle('hidden', screen !== 'menu');
    this.els.gameScreen.classList.toggle('hidden', screen !== 'game');
    if (screen === 'game') {
      this.els.balanceEl.textContent = this.balance;
      this.els.betEl.textContent = '0';
    }
  },

  startBetting() {
    this.state = 'betting';
    this.canBet = true;
    this.bet = 0;
    this.balance = 5000;
    this.showScreen('game');
    this.clearTable();
    this.updateDisplay();
    this.els.actionBtns.classList.add('hidden');
    this.els.resultOverlay.classList.add('hidden');
    this.els.btnDeal.classList.remove('hidden');
    this.els.chipContainer.classList.remove('disabled');
  },

  clearTable() {
    this.els.playerCards.innerHTML = '';
    this.els.dealerCards.innerHTML = '';
    this.els.playerScore.textContent = '';
    this.els.dealerScore.textContent = '';
    this.els.playerScore.classList.add('hidden');
    this.els.dealerScore.classList.add('hidden');
    // Reset card container margins
    this.els.playerCards.style.justifyContent = 'center';
    this.els.dealerCards.style.justifyContent = 'center';
  },

  updateDisplay() {
    this.els.balanceEl.textContent = this.balance;
    this.els.betEl.textContent = this.bet;

    // Show/hide deal button
    if (this.bet > 0 && this.state === 'betting') {
      this.els.btnDeal.classList.remove('hidden');
    } else if (this.state === 'betting') {
      this.els.btnDeal.classList.add('hidden');
    }

    // Enable/disable double based on balance
    if (this.els.btnDouble) {
      this.els.btnDouble.disabled = this.balance < this.bet;
    }
  },

  // ---- DEALING ----

  async dealRound() {
    this.state = 'dealing';
    this.canBet = false;
    this.els.chipContainer.classList.add('disabled');
    this.els.btnDeal.classList.add('hidden');

    this.engine = new BlackjackEngine();
    this.engine.newRound(6);
    const deal = this.engine.dealInitial();

    // Animate cards one by one
    this.clearTable();
    await this.sleep(300);

    // Player card 1
    await this.animateCard(deal.playerCards[0], this.els.playerCards, false);
    this.els.playerScore.textContent = this.engine.playerHand.score;
    this.els.playerScore.classList.remove('hidden');

    // Dealer card 1 (face up)
    await this.animateCard(deal.dealerCards[0], this.els.dealerCards, false);
    this.els.dealerScore.textContent = deal.dealerVisibleScore;
    this.els.dealerScore.classList.remove('hidden');

    // Player card 2
    await this.animateCard(deal.playerCards[1], this.els.playerCards, false);
    this.els.playerScore.textContent = this.engine.playerHand.score;

    // Dealer card 2 (face down)
    await this.animateCard(deal.dealerCards[1], this.els.dealerCards, true);

    await this.sleep(400);

    // Check for blackjacks
    const pBJ = this.engine.playerHand.isBlackjack;
    const dVisible = this.engine.dealerHand.cards[0];
    const dBJ = this.engine.dealerHand.cards.length === 2 && this.engine.dealerHand.score === 21;

    if (pBJ || dBJ) {
      // Reveal dealer
      this.engine.revealDealer();
      await this.revealDealerCard();
      await this.sleep(500);
      this.showResult();
      return;
    }

    // Player's turn
    this.state = 'playing';
    this.showActions(true);
  },

  async animateCard(cardData, container, faceDown) {
    const img = document.createElement('img');
    img.className = 'card-img card-deal';
    if (faceDown) {
      img.src = '/imgs/Card_back.svg';
      img.dataset.realImage = cardData.image;
      img.classList.add('face-down');
    } else {
      img.src = cardData.image;
    }
    img.alt = cardData.name || 'Card';
    container.appendChild(img);
    this.playSound('dealing');
    await this.sleep(350);
    // Remove animation class after it plays
    setTimeout(() => img.classList.remove('card-deal'), 300);
  },

  async revealDealerCard() {
    const faceDown = this.els.dealerCards.querySelector('.face-down');
    if (faceDown) {
      faceDown.classList.add('card-flip');
      await this.sleep(200);
      faceDown.src = faceDown.dataset.realImage;
      faceDown.classList.remove('face-down');
      setTimeout(() => faceDown.classList.remove('card-flip'), 400);
    }
    // Update dealer score
    this.els.dealerScore.textContent = this.engine.dealerHand.score;
  },

  // ---- PLAYER ACTIONS ----

  showActions(show) {
    this.els.actionBtns.classList.toggle('hidden', !show);
    if (show) {
      this.els.btnDouble.disabled = this.balance < this.bet;
    }
  },

  async playerHit() {
    this.showActions(false);
    this.playSound('actionClick');

    const card = this.engine.deck.deal();
    this.engine.playerHand.addCard(card);
    await this.animateCard(card, this.els.playerCards, false);
    this.els.playerScore.textContent = this.engine.playerHand.score;

    if (this.engine.playerHand.isBust) {
      await this.sleep(600);
      this.showResult();
    } else if (this.engine.playerHand.score === 21) {
      await this.sleep(300);
      await this.stand();
    } else {
      this.showActions(true);
    }
  },

  async playerStand() {
    this.playSound('actionClick');
    await this.stand();
  },

  async playerDouble() {
    if (this.balance < this.bet) return;
    this.playSound('actionClick');

    this.balance -= this.bet;
    this.bet *= 2;
    this.updateDisplay();

    this.showActions(false);
    const card = this.engine.deck.deal();
    this.engine.playerHand.addCard(card);
    await this.animateCard(card, this.els.playerCards, false);
    this.els.playerScore.textContent = this.engine.playerHand.score;

    if (this.engine.playerHand.isBust) {
      await this.sleep(600);
      this.showResult();
    } else {
      await this.sleep(300);
      await this.stand();
    }
  },

  async stand() {
    this.state = 'dealer';
    this.showActions(false);

    // Reveal dealer card
    this.engine.revealDealer();
    await this.revealDealerCard();
    await this.sleep(500);

    // Dealer draws cards
    while (this.engine.dealerHand.score < 17) {
      const card = this.engine.deck.deal();
      this.engine.dealerHand.addCard(card);
      await this.animateCard(card, this.els.dealerCards, false);
      this.els.dealerScore.textContent = this.engine.dealerHand.score;
      await this.sleep(600);
    }

    await this.sleep(400);
    this.showResult();
  },

  // ---- RESULT ----

  showResult() {
    this.state = 'result';
    this.showActions(false);

    const result = this.engine.getResult();
    const payout = this.engine.payout(result, this.bet);
    const profit = payout - this.bet;

    this.balance += payout;

    // Result messages
    const messages = {
      'blackjack': 'BLACKJACK!',
      'win': 'YOU WIN!',
      'push': 'PUSH',
      'bust': 'BUST!',
      'lose': 'DEALER WINS',
      'dealer_blackjack': 'DEALER BLACKJACK'
    };

    const isWin = result === 'win' || result === 'blackjack';
    const isPush = result === 'push';
    const isLose = result === 'lose' || result === 'bust' || result === 'dealer_blackjack';

    this.els.resultText.textContent = messages[result] || result;
    this.els.resultAmount.textContent = isWin ? `+${profit}` : (isPush ? `+0` : `-${this.bet}`);
    this.els.resultAmount.className = isWin ? 'result-win' : (isPush ? 'result-push' : 'result-lose');

    this.els.resultOverlay.classList.remove('hidden');

    // Play sound
    if (isWin) this.playSound('youWin');
    else if (isLose) this.playSound('youLose');

    // Update balance display
    this.els.balanceEl.textContent = this.balance;
    this.els.betEl.textContent = '0';

    // Save to server
    this.saveGame(result, payout);

    // Check bankrupt
    if (this.balance <= 0) {
      this.els.resultText.textContent = 'BANKRUPT!';
      this.els.resultAmount.textContent = 'You lost everything';
      this.els.btnNewRound.textContent = 'Back to Menu';
      this.els.btnNewRound.onclick = () => {
        this.els.btnNewRound.textContent = 'New Round';
        this.els.btnNewRound.onclick = () => this.newRound();
        this.showScreen('menu');
      };
    }
  },

  newRound() {
    this.els.resultOverlay.classList.add('hidden');
    this.bet = 0;
    this.clearTable();
    this.state = 'betting';
    this.canBet = true;
    this.els.chipContainer.classList.remove('disabled');
    this.els.btnDeal.classList.add('hidden');
    this.updateDisplay();
  },

  // ---- UTILITIES ----

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  playSound(name) {
    try {
      if (window.Sounds && window.Sounds[name]) {
        window.Sounds[name].play();
      }
    } catch(e) {}
  },

  async saveGame(result, payout) {
    try {
      await fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'solo',
          betAmount: this.bet,
          result: result,
          payout: payout,
          playerCards: this.engine.playerHand.cards.map(c => c.name),
          dealerCards: this.engine.dealerHand.cards.map(c => c.name),
          playerSum: this.engine.playerHand.score,
          dealerSum: this.engine.dealerHand.score,
          timestamp: new Date()
        })
      });
    } catch(e) {}
  }
};

// ---- AVATAR SELECTOR ----
const AvatarSelector = {
  current: 0,
  avatars: ['user','mafia','casino','baby','terrorist','detective','work-out','manager'],

  init() {
    this.container = document.getElementById('avatar-box');
    this.prevBtn = document.getElementById('avatar-prev');
    this.nextBtn = document.getElementById('avatar-next');
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.navigate(-1));
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.navigate(1));
    this.update();
  },

  navigate(dir) {
    this.current = (this.current + dir + this.avatars.length) % this.avatars.length;
    this.update();
    if (window.Sounds && window.Sounds.defaultClick) window.Sounds.defaultClick.play();
  },

  update() {
    const items = document.querySelectorAll('.avatar-item');
    items.forEach((item, i) => {
      item.classList.toggle('hidden', i !== this.current);
    });
  },

  getSelected() {
    return this.avatars[this.current];
  }
};

// ---- MODE SWITCHER ----
const ModeSwitcher = {
  current: 'solo',

  init() {
    const soloBtn = document.getElementById('mode-solo');
    const multiBtn = document.getElementById('mode-multi');
    if (soloBtn) soloBtn.addEventListener('click', () => this.setMode('solo'));
    if (multiBtn) multiBtn.addEventListener('click', () => this.setMode('multi'));
  },

  setMode(mode) {
    this.current = mode;
    document.getElementById('mode-solo').classList.toggle('active', mode === 'solo');
    document.getElementById('mode-multi').classList.toggle('active', mode === 'multi');
    document.getElementById('btn-play').classList.toggle('hidden', mode !== 'solo');
    document.getElementById('btn-create').classList.toggle('hidden', mode !== 'multi');
    document.getElementById('btn-join').classList.toggle('hidden', mode !== 'multi');

    // Wallet visibility
    const walletStatus = document.getElementById('wallet-status');
    const freePlayBadge = document.getElementById('free-play-badge');
    if (mode === 'solo') {
      walletStatus.classList.add('hidden');
      freePlayBadge.classList.remove('hidden');
    } else {
      walletStatus.classList.remove('hidden');
      freePlayBadge.classList.add('hidden');
    }
  }
};

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  SoloGame.init();
  AvatarSelector.init();
  ModeSwitcher.init();
});
