// Blackjack Client - Solo & Multiplayer
// ######################################

let clientId = null;
let gameId = null;
let roomId = null;
let theClient = null;
let storedPlayers = [];
let fixCurrentPlayerLength = 0;
players = [];
spectators = [];
playerSlotHTML = [];

let clicked = null;
let doubleDown = null;
let reload = null;
let cardIndex = null;
let cardIndexJoin = 0;
let playerNaturalIndex = null;
let dealersHiddenCard = "";
let timerStarted = false;
let newPlayer = null;
let offline = null;

let ws = null;

// SOLO MODE VARIABLES
let soloMode = false;
let soloDeck = [];
let soloGameActive = false;

const btnCreate = document.getElementById("btnCreate");
const btnOffline = document.getElementById("btnOffline");
const btnJoin = document.getElementById("btnJoin");

let nickname = document.querySelector("#nickname");
let avatar = document.querySelectorAll(".slideAvatars");
let playersLength = null;
let theSlot = null;
let z = null;
let aPlayer = null;
let joined = false;
let playerSlot = document.querySelectorAll(".players");
let playerCards = document.querySelectorAll(".player-cards");
let dealerCards = document.querySelectorAll(".dealer-cards");
let dealerSlot = document.querySelector("#dealer");
let playerName = document.querySelectorAll(".player-name");
let resetCards = false;

const leaveTable = document.querySelector("#leave-table");

// ==================== SOLO MODE ====================

function initSoloMode() {
    soloMode = true;
    clientId = "solo-" + Date.now();
    let nicknameValue = document.getElementById("nickname").value || "Solo Player";
    avatar = document.querySelectorAll(".slideAvatars");
    let selectedAvatar = avatar[slideIndex - 1].dataset.value;

    theClient = {
        nickname: nicknameValue,
        avatar: selectedAvatar,
        cards: [],
        bet: 0,
        balance: 5000,
        sum: null,
        hasAce: false,
        isReady: false,
        blackjack: false,
        hasLeft: false,
        clientId: clientId
    };

    // Setup player on slot 0
    players = [theClient];
    spectators = [theClient];
    playerSlotHTML = [clientId, {}, {}, {}, {}, {}, {}];

    // Show player on table
    playerSlot[0].firstElementChild.nextElementSibling.remove();
    playerSlot[0].firstElementChild.nextElementSibling.classList.remove("hide-element");
    playerSlot[0].firstElementChild.nextElementSibling.nextElementSibling.classList.remove("hide-element");
    playerSlot[0].firstElementChild.nextElementSibling.innerText = nicknameValue;
    playerSlot[0].firstElementChild.nextElementSibling.innerHTML += `<span><img class="player-avatar" src="/imgs/avatars/${selectedAvatar}.svg" alt="avatar"></span>`;

    // Hide multiplayer-only elements
    $("#invite-link-box").remove();
    $("#users-online-label").text("SOLO MODE");

    // Show game room
    $("#main-menu").addClass("hide-element");
    $("#game-room").removeClass("hide-element");
    $("#bets-container").removeClass("noclick");
    $("#balance").text(theClient.balance);
}

// SOLO DECK FUNCTIONS
function soloCreateDeck() {
    const suits = ["Heart", "Diamond", "Spade", "Club"];
    const values = [
        { card: "A", value: [1, 11], hasAce: true },
        { card: "2", value: 2 },
        { card: "3", value: 3 },
        { card: "4", value: 4 },
        { card: "5", value: 5 },
        { card: "6", value: 6 },
        { card: "7", value: 7 },
        { card: "8", value: 8 },
        { card: "9", value: 9 },
        { card: "10", value: 10 },
        { card: "J", value: 10 },
        { card: "Q", value: 10 },
        { card: "K", value: 10 }
    ];
    soloDeck = [];
    for (const suit of suits) {
        for (const val of values) {
            soloDeck.push({ suit, value: { ...val, hasAce: val.card === "A" } });
        }
    }
    // Shuffle
    for (let i = soloDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [soloDeck[i], soloDeck[j]] = [soloDeck[j], soloDeck[i]];
    }
}

function soloDealCard() {
    return soloDeck.shift();
}

// SOLO ROUND
function soloStartRound() {
    soloCreateDeck();
    soloGameActive = true;
    gameOn = true;

    // Reset dealer
    dealer = { cards: [], hiddenCard: [], sum: null, hasAce: false, hasLeft: null };

    // Reset player
    theClient.cards = [];
    theClient.sum = null;
    theClient.hasAce = false;
    theClient.isReady = false;
    theClient.blackjack = false;

    // Deal initial cards
    theClient.cards.push(soloDealCard());
    dealer.cards.push(soloDealCard());
    theClient.cards.push(soloDealCard());
    dealer.hiddenCard.push(soloDealCard());

    // Update displays
    updateSoloPlayerCards();
    updateSoloDealerCards(false);

    // Check naturals
    setTimeout(function() {
        soloCheckNaturals();
    }, 1000);
}

function updateSoloPlayerCards() {
    playerSlot[0].lastElementChild.innerHTML = "";
    for (let i = 0; i < theClient.cards.length; i++) {
        const card = theClient.cards[i];
        const cardName = card.suit + card.value.card;
        playerSlot[0].lastElementChild.innerHTML += `<img class="cardImg card${i+1} cardAnimation" src="/imgs/${cardName}.svg">`;
    }
    // Show sum
    let sum = soloCalcSum(theClient);
    theClient.sum = sum;
    playerSlot[0].firstElementChild.nextElementSibling.nextElementSibling.style.opacity = "1";
    playerSlot[0].firstElementChild.nextElementSibling.nextElementSibling.style.transform = "scale(1)";
    playerSlot[0].firstElementChild.nextElementSibling.nextElementSibling.innerHTML = typeof sum === 'object' ? sum[1] : sum;
    $("#balance").text(theClient.balance);
}

function updateSoloDealerCards(showAll) {
    dealerSlot.lastElementChild.lastElementChild.innerHTML = "";

    if (showAll) {
        // Show all dealer cards
        for (let i = 0; i < dealer.cards.length; i++) {
            const card = dealer.cards[i];
            const cardName = card.suit + card.value.card;
            dealerSlot.lastElementChild.lastElementChild.innerHTML += `<img class="dealerCardImg" src="/imgs/${cardName}.svg">`;
        }
    } else {
        // Show first card face up, rest face down
        if (dealer.cards.length > 0) {
            const card = dealer.cards[0];
            const cardName = card.suit + card.value.card;
            dealerSlot.lastElementChild.lastElementChild.innerHTML += `<img class="dealerCardImg" src="/imgs/${cardName}.svg">`;
        }
        // Hidden card
        dealerSlot.lastElementChild.lastElementChild.innerHTML += `
        <div class="flip-card">
            <div class="flip-card-inner">
                <div class="flip-card-front">
                    <img class="dealerCardImg" src="/imgs/Card_back.svg">
                </div>
                <div class="flip-card-back">
                    <img class="dealerCardImg" src="/imgs/Card_back.svg">
                </div>
            </div>
        </div>`;
    }

    // Show dealer sum
    if (showAll) {
        let dsum = soloCalcSum(dealer);
        dealer.sum = dsum;
        dealerSlot.firstElementChild.nextElementSibling.style.opacity = "1";
        dealerSlot.firstElementChild.nextElementSibling.style.transform = "scale(1)";
        dealerSlot.firstElementChild.nextElementSibling.innerHTML = typeof dsum === 'object' ? dsum[1] : dsum;
    }
}

function soloCalcSum(entity) {
    let sumLow = 0;
    let sumHigh = 0;
    let hasAce = false;

    for (const card of entity.cards) {
        if (card.value.hasAce) {
            hasAce = true;
            sumLow += 1;
            sumHigh += 11;
        } else {
            const v = Array.isArray(card.value.value) ? card.value.value[0] : card.value.value;
            sumLow += v;
            sumHigh += v;
        }
    }

    if (hasAce) {
        if (sumHigh <= 21) return sumHigh;
        if (sumLow <= 21) return sumLow;
        return sumLow;
    }
    return sumLow;
}

function soloCheckNaturals() {
    let pSum = soloCalcSum(theClient);
    let dSum = soloCalcSum(dealer);

    // Player blackjack
    if (pSum === 21 && theClient.cards.length === 2) {
        theClient.blackjack = true;
        theClient.sum = 21;
        // Reveal dealer card
        dealer.cards.push(dealer.hiddenCard[0]);
        dealer.hiddenCard = [];
        updateSoloDealerCards(true);

        // 3:2 payout
        let payout = Math.floor(theClient.bet * 2.5);
        theClient.balance += payout;

        showSoloResult("BLACKJACK!", payout, true);
        setTimeout(soloResetRound, 3000);
        return;
    }

    // Dealer blackjack
    if (dSum === 21 && dealer.cards.length + dealer.hiddenCard.length === 2) {
        // Reveal
        dealer.cards.push(dealer.hiddenCard[0]);
        dealer.hiddenCard = [];
        updateSoloDealerCards(true);

        showSoloResult("DEALER BLACKJACK", theClient.bet, false);
        setTimeout(soloResetRound, 3000);
        return;
    }

    // No blackjack - player's turn
    soloPlayerTurn();
}

function soloPlayerTurn() {
    showSoloActions(true);
}

function soloPlayerHit() {
    const newCard = soloDealCard();
    theClient.cards.push(newCard);

    if (newCard.value.hasAce) {
        theClient.hasAce = true;
    }

    updateSoloPlayerCards();
    let sum = soloCalcSum(theClient);

    if (sum > 21) {
        // Bust
        showSoloActions(false);
        showSoloResult("BUST!", theClient.bet, false);
        setTimeout(soloResetRound, 3000);
    } else if (sum === 21) {
        // Auto stand on 21
        soloPlayerStand();
    } else {
        // Continue playing
        soloPlayerTurn();
    }
}

function soloPlayerDoubleDown() {
    if (theClient.balance >= theClient.bet) {
        theClient.balance -= theClient.bet;
        theClient.bet *= 2;
        updateSoloPlayerCards();

        // Deal one more card
        const newCard = soloDealCard();
        theClient.cards.push(newCard);
        updateSoloPlayerCards();

        let sum = soloCalcSum(theClient);
        if (sum > 21) {
            showSoloActions(false);
            showSoloResult("BUST!", theClient.bet, false);
        } else {
            soloPlayerStand();
        }
    }
}

function soloPlayerStand() {
    showSoloActions(false);
    // Flip dealer card
    dealer.cards.push(dealer.hiddenCard[0]);
    dealer.hiddenCard = [];
    updateSoloDealerCards(false);

    // Reveal flip
    setTimeout(function() {
        $(".flip-card-inner").css("transform", "rotateY(-180deg)");
    }, 100);

    // Dealer plays
    setTimeout(soloDealerTurn, 1000);
}

function soloDealerTurn() {
    let dSum = soloCalcSum(dealer);

    if (dSum < 17) {
        // Dealer hits
        const newCard = soloDealCard();
        dealer.cards.push(newCard);
        dealingSound.play();

        // Update display - add card to visible cards
        const cardName = newCard.suit + newCard.value.card;
        dealerSlot.lastElementChild.lastElementChild.innerHTML += `<img class="dealerCardImg cardAnimationDealer" src="/imgs/${cardName}.svg">`;

        let newSum = soloCalcSum(dealer);
        dealer.sum = newSum;
        dealerSlot.firstElementChild.nextElementSibling.innerHTML = typeof newSum === 'object' ? newSum[1] : newSum;

        setTimeout(soloDealerTurn, 800);
    } else {
        // Dealer stands - compare
        setTimeout(soloFinalCompare, 500);
    }
}

function soloFinalCompare() {
    let pSum = soloCalcSum(theClient);
    let dSum = soloCalcSum(dealer);

    if (theClient.blackjack) {
        // Already handled
        return;
    }

    if (dSum > 21) {
        let payout = theClient.bet * 2;
        theClient.balance += payout;
        showSoloResult("YOU WIN!", payout, true);
    } else if (pSum > dSum) {
        let payout = theClient.bet * 2;
        theClient.balance += payout;
        showSoloResult("YOU WIN!", payout, true);
    } else if (pSum === dSum) {
        theClient.balance += theClient.bet;
        showSoloResult("PUSH", theClient.bet, true);
    } else {
        showSoloResult("DEALER WINS", 0, false);
    }

    setTimeout(soloResetRound, 3000);
}

function showSoloResult(message, amount, isWin) {
    let el = document.getElementById("player-result-big");
    let answer = document.getElementById("player-result-big-answer");
    let sumBox = document.getElementById("player-result-sum-box");
    let plusMinus = document.getElementById("player-result-big-plus-minus");
    let sumEl = document.getElementById("player-result-big-sum");

    el.classList.remove("hide-element");
    answer.textContent = message;
    sumBox.classList.remove("color-green", "color-red");

    if (isWin) {
        sumBox.classList.add("color-green");
        plusMinus.textContent = "+";
        sumEl.textContent = amount;
    } else {
        sumBox.classList.add("color-red");
        plusMinus.textContent = "-";
        sumEl.textContent = theClient.bet;
    }

    // Save game to server
    saveSoloGame(message, amount, isWin);
}

function showSoloActions(show) {
    let container = document.querySelector(".user-action-container");
    if (show) {
        container.classList.remove("hide-element");
        $("#dark-overlay").css("opacity", "1");

        // Re-bind click handlers
        const standBtn = document.getElementById("stand");
        const hitBtn = document.getElementById("hit");
        const ddBtn = document.getElementById("doubleDown");

        standBtn.onclick = function() {
            actionClick.play();
            container.classList.add("hide-element");
            $("#dark-overlay").css("opacity", "");
            soloPlayerStand();
        };
        hitBtn.onclick = function() {
            actionClick.play();
            container.classList.add("hide-element");
            $("#dark-overlay").css("opacity", "");
            soloPlayerHit();
        };
        ddBtn.onclick = function() {
            if (theClient.balance >= theClient.bet) {
                actionClick.play();
                container.classList.add("hide-element");
                $("#dark-overlay").css("opacity", "");
                soloPlayerDoubleDown();
            }
        };
    } else {
        container.classList.add("hide-element");
        $("#dark-overlay").css("opacity", "");
    }
}

function soloResetRound() {
    soloGameActive = false;
    gameOn = false;

    // Reset UI
    $(".player-result").addClass("hide-element");
    $(".player-result").removeClass("result-lose result-draw result-win result-blackjack");
    $("#player-result-big").addClass("hide-element");
    $("#player-result-sum-box").removeClass("color-green color-red");
    $("#player-result-big-answer").text("");
    $("#player-result-big-sum").text("");
    $("#player-result-big-plus-minus").text("");

    // Clear cards
    playerSlot[0].lastElementChild.innerHTML = "";
    dealerSlot.lastElementChild.lastElementChild.innerHTML = `<div class="visibleCards"></div>`;
    dealerSlot.firstElementChild.nextElementSibling.innerHTML = "";
    $(".player-sum").css({ opacity: "", transform: "" });
    $("#dealerSum").css({ opacity: "", transform: "" });

    // Reset player state
    theClient.cards = [];
    theClient.bet = 0;
    theClient.isReady = false;
    theClient.blackjack = false;
    theClient.hasAce = false;
    theClient.sum = null;

    // Reset dealer
    dealer = { cards: [], hiddenCard: [], sum: null, hasAce: false, hasLeft: null };

    // Reset deck
    soloDeck = [];

    // Re-enable betting
    $("#bets-container").removeClass("noclick");
    $("#total-bet").text("0");
    $("#balance").text(theClient.balance);
}

async function saveSoloGame(result, payout, isWin) {
    try {
        await fetch("/api/game/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                walletAddress: theClient.nickname,
                mode: "solo",
                betAmount: theClient.bet,
                result: isWin ? "win" : (result === "PUSH" ? "push" : "lose"),
                payout: payout,
                playerCards: theClient.cards.map(c => c.suit + c.value.card),
                dealerCards: dealer.cards.map(c => c.suit + c.value.card),
                playerSum: soloCalcSum(theClient),
                dealerSum: soloCalcSum(dealer),
                timestamp: new Date()
            })
        });
    } catch(e) {}
}

// ==================== MULTIPLAYER MODE (Original) ====================

function initMultiplayerMode() {
    soloMode = false;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    let HOST = location.origin.replace(/^http/, "ws");
    ws = new WebSocket(HOST);

    ws.addEventListener("open", () => {
        console.log("WebSocket connected!");
    });

    ws.onmessage = handleWsMessage;

    ws.addEventListener("error", (e) => {
        console.error("WebSocket error:", e);
    });

    ws.addEventListener("close", () => {
        console.log("WebSocket closed, reconnecting in 3s...");
        setTimeout(() => { ws = null; initMultiplayerMode(); }, 3000);
    });
}

function handleWsMessage(message) {
    const response = JSON.parse(message.data);

    if (response.method === "connect") {
        clientId = response.clientId;
        theClient = response.theClient;
    }

    if (response.method === "leave") {
        game = response.game;
        players = response.players;
        spectators = response.spectators;
        playerSlotHTML = response.playerSlotHTML;
        playerSlotIndex = response.playerSlotIndex;
        reload = false;
        oldPlayerIndex = response.oldPlayerIndex;
        gameOn = response.gameOn;

        if (spectators[oldPlayerIndex] === undefined) {
            $(".users-list-box:eq(" + oldPlayerIndex + ")").remove();
        }

        for (let i = 0; i < players.length; i++) {
            if (players[i].hasLeft === true) {
                if (playersCanPlay === false && players[i].clientId === clientDeal) {
                    resetGameState();
                }
            }
        }

        if (gameOn === false) {
            if (playerSlotIndex === undefined || playerSlotIndex === null) {
                return;
            } else {
                playerSlot[playerSlotIndex].innerHTML = `
                <div><button class="ready hide-element">PLACE BET</button></div>
                <div class="empty-slot"><i class="fas fa-user-plus"></i></div>
                <div class="player-name hide-element"><span class="hide-element"><img class="player-avatar" src="" alt="avatar"></span></div>
                <div class="player-sum"></div>
                <div class="player-coin hide-element"><div class="player-bet hide-element"></div></div>
                <div class="player-result hide-element"></div>
                <div class="player-cards"></div>
                `;
            }
        }

        if (players.some((e) => e.clientId === clientId)) {
            if (!$(".empty-slot").is("noclick")) {
                $(".empty-slot").addClass("noclick");
            }
        }

        if (gameOn === true) {
            $(".empty-slot").addClass("noclick");
            if (playerSlotIndex === undefined || playerSlotIndex === null) {
                return;
            } else {
                playerSlot[playerSlotIndex].classList.add("player-left", "plug");
            }
        }

        if (game.players.length === 0 && $("#dealerSum").text().length > 0) {
            dealersTurn = true;
            sendDealersTurn();
            dealerPlay();
        }

        if (gameOn === false && players.length > 0 && players.every((player) => player.isReady)) {
            if (players[0].clientId === clientId && gameOn === false) startDeal();
        }
    }

    if (response.method === "create") {
        gameId = response.game.id;
        roomId = response.roomId;
        offline = response.offline;
        if (offline === true) {
            window.history.pushState("offline_page", "Offline Mode", "/");
            $("#invite-link-box").remove();
            $("#users-online-label").text("OFFLINE MODE");
        }
    }

    if (response.method === "join") {
        game = response.game;
        player = game.player;
        spectators = game.spectators;
        playerSlotHTML = response.playerSlotHTML;
        roomId = gameId.substring(gameId.length - 6);
        if (offline !== true) {
            window.history.pushState("game", "Title", "/" + roomId);
        }
    }

    if (response.method === "joinClient") {
        theClient = response.theClient;
        game = response.game;
        players = response.players;
        spectators = game.spectators;
        playerSlotHTML = response.playerSlotHTML;
        $("#invite-link").val(gameId);

        setTimeout(function () {
            for (let i = 0; i < playerSlotHTML.length; i++) {
                for (let x = 0; x < spectators.length; x++) {
                    if (spectators[x].clientId === playerSlotHTML[i]) {
                        z = playerSlotHTML.indexOf(playerSlotHTML[i]);
                        if (spectators[x].nickname === "") spectators[x].nickname = "Player";
                        playerSlot[z].firstElementChild.nextElementSibling.innerText = spectators[x].nickname;
                        playerSlot[z].firstElementChild.nextElementSibling.innerHTML += `<span><img class="player-avatar" src="/imgs/avatars/${spectators[x].avatar}.svg" alt="avatar"></span>`;
                    }
                }
            }
        }, 50);

        for (let i = 0; i < spectators.length; i++) {
            if (spectators[i].nickname === "") spectators[i].nickname = "Player";
            $("#users-online-container").append(`
            <li class="users-list-box">
                <div class="users-list-info">
                    <div class="user-list-name">${spectators[i].nickname}</div>
                    <div>Balance: <span class="users-list-balance">${spectators[i].balance}</span></div>
                </div>
                <div class="users-list-img">
                    <img src="/imgs/avatars/${spectators[i].avatar}.svg" alt="avatar">
                </div>
            </li>
            `);
            if (spectators[i].clientId === clientId) {
                $(".user-list-name:eq(" + i + ")").addClass("highlight");
            }
        }
    }

    if (response.method === "updateClientArray") {
        players = response.players;
        newPlayer = response.newPlayer;
        playerSlotHTML = response.playerSlotHTML;
        if (spectators.length > $("#users-online-container").children().length) {
            if (newPlayer.nickname === "") newPlayer.nickname = "Player";
            $("#users-online-container").append(`
            <li class="users-list-box">
                <div class="users-list-info">
                    <div class="user-list-name">${newPlayer.nickname}</div>
                    <div>Balance: <span class="users-list-balance">${newPlayer.balance}</span></div>
                </div>
                <div class="users-list-img">
                    <img src="/imgs/avatars/${newPlayer.avatar}.svg" alt="avatar">
                </div>
            </li>
            `);
        }
    }

    if (response.method === "bet") {
        players = response.players;
        for (let i = 0; i < spectators.length; i++) {
            for (let x = 0; x < players.length; x++) {
                if (spectators[i].clientId === players[x].clientId) {
                    spectators[i].balance = players[x].balance;
                }
            }
            $(".users-list-balance:eq(" + i + ")").text(spectators[i].balance);
            if (spectators[i].balance === 0) $(".users-list-balance:eq(" + i + ")").addClass("color-red");
        }
    }

    if (response.method === "deck") {
        players = mapOrder(players, playerSlotHTML, "clientId");
        deck = response.deck;
        clientDeal = response.clientDeal;
        gameOn = response.gameOn;
        if (gameOn) {
            for (let i = 0; i < players.length; i++) {
                if (players[i].clientId === clientId) {
                    $("#bets-container").addClass("noclick");
                }
            }
            $(".empty-slot").addClass("noclick");
            $("#leave-table").addClass("noclick");
            $("#deal-start-label").addClass("hide-element");
        }
    }

    if (response.method === "isReady") {
        players = response.players;
        setPlayersBet();
        if (players.length > 1 && players.every((player) => player.isReady) === false && timerStarted === false) {
            timerStarted = true;
            startTimer();
        }
    }

    if (response.method === "hasLeft") {
        players = response.players;
        spectators = response.spectators;
    }

    if (response.method === "currentPlayer") {
        player = response.player;
    }

    if (response.method === "updatePlayerCards") {
        dealingSound.play();
        resetCards = response.resetCards;
        players = response.players;
        player = response.player;
        if (player !== undefined) cardIndex = player.cards.length;
        for (let i = 0; i < playerSlotHTML.length; i++) {
            if (player.clientId === playerSlotHTML[i]) {
                z = playerSlotHTML.indexOf(playerSlotHTML[i]);
                for (let c = 0; c < deckImg.length; c++) {
                    if (player.cards.slice(-1)[0].suit + player.cards.slice(-1)[0].value.card === deckImg[c]) {
                        playerSlot[z].lastElementChild.innerHTML += `<img class="cardImg card${cardIndex} cardAnimation" src="/imgs/${deckImg[c]}.svg">`;
                    }
                }
                setTimeout(function () {
                    $(".players:eq(" + playerSlotHTML.indexOf(playerSlotHTML[i]) + ") .player-cards").children().removeClass("cardAnimation");
                }, 50);
            }
        }
    }

    if (response.method === "updateDealerCards") {
        dealingSound.play();
        dealersTurn = response.dealersTurn;
        if (dealersTurn === false) {
            dealer = response.dealer;
        } else {
            player = response.player;
            dealer = player;
        }
        if (dealer.hiddenCard.length === 0 || dealer.hiddenCard.length === undefined) {
            if ($(".flip-card-inner").css("transform") !== "none" || dealer.cards.length === 1) {
                for (let c = 0; c < deckImg.length; c++) {
                    if (dealer.cards.slice(-1)[0].suit + dealer.cards.slice(-1)[0].value.card === deckImg[c]) {
                        dealerSlot.lastElementChild.firstElementChild.innerHTML += `<img class="dealerCardImg cardAnimationDealer" src="/imgs/${deckImg[c]}.svg">`;
                    }
                }
            }
            setTimeout(function () {
                $(".visibleCards").children().removeClass("cardAnimationDealer");
            }, 50);
            if (dealer.hiddenCard.length === 0 && dealer.cards.length === 2) {
                $(".flip-card-inner").css("transform", "rotateY(-180deg)");
            } else {
                $(".dealer-cards").css("margin-left", "-=45px");
            }
        } else {
            dealerSlot.lastElementChild.firstElementChild.innerHTML += `
            <div class="flip-card cardAnimationDealer">
                <div class="flip-card-inner">
                    <div class="flip-card-front"></div>
                    <div class="flip-card-back"></div>
                </div>
            </div>`;
            $(".flip-card-front").html(`<img class="dealerCardImg" src="/imgs/Card_back.svg">`);
            $(".flip-card-back").html(`<img class="dealerCardImg" src="/imgs/${dealer.hiddenCard[0].suit + dealer.hiddenCard[0].value.card}.svg">`);
            dealersHiddenCard = dealer.hiddenCard[0].suit + dealer.hiddenCard[0].value.card;
            setTimeout(function () {
                $(".flip-card").removeClass("cardAnimationDealer");
            }, 50);
            $(".dealer-cards").css("margin-left", "-=45px");
            setTimeout(function () {
                $(".hiddenCard").removeClass("cardAnimationDealer");
            }, 50);
        }
    }

    if (response.method === "update") {
        players = response.players;
        dealer = response.dealer;
        deck = response.deck;
        gameOn = response.gameOn;
        setTimeout(function () {
            if (players.every((player) => player.hasLeft)) {
                resetGame();
            }
        }, 50);
    }

    if (response.method === "thePlay") {
        player = response.player;
        currentPlayer = response.currentPlayer;
        playersCanPlay = true;
        $(".player-sum").removeClass("current-player-highlight");
        $(".players-timer circle").removeClass("circle-animation");
        for (let i = 0; i < playerSlotHTML.length; i++) {
            if (playerSlotHTML[i] === player.clientId) {
                $(".player-sum:eq(" + i + ")").addClass("current-player-highlight");
                setTimeout(function () {
                    $(".players-timer:eq(" + i + ") circle").addClass("circle-animation");
                }, 50);
            }
        }
        if (dealersTurn) {
            return;
        } else {
            if ((player.clientId === clientId && player.sum < 21) || (player.clientId === clientId && theClient.sum.length > 1)) {
                clicked = false;
                thePlay();
            } else if (player.clientId === clientId && player.sum >= 21) {
                sendPlayerNext();
            } else {
                clicked = true;
            }
        }
        for (let i = 0; i < players.length; i++) {
            if (players[currentPlayer] !== undefined && players[currentPlayer].hasLeft === true) {
                currentPlayer = currentPlayer + 1;
                player = players[currentPlayer];
            } else {
                break;
            }
        }
    }

    if (response.method === "showSum") {
        players = response.players;
        for (let i = 0; i < playerSlotHTML.length; i++) {
            playerSlot[i].firstElementChild.nextElementSibling.nextElementSibling.style.opacity = "1";
            playerSlot[i].firstElementChild.nextElementSibling.nextElementSibling.style.transform = "scale(1)";
        }
        dealerSlot.firstElementChild.nextElementSibling.style.opacity = "1";
        dealerSlot.firstElementChild.nextElementSibling.style.transform = "scale(1)";
    }

    if (response.method === "joinTable") {
        game = response.game;
        spectators = response.spectators;
        players = response.players;
        theSlot = response.theSlot;
        user = response.user;
        playerSlotHTML = response.playerSlotHTML;
        for (let i = 0; i < playerSlotHTML.length; i++) {
            for (let x = 0; x < players.length; x++) {
                if (players[x].clientId === playerSlotHTML[i]) {
                    z = playerSlotHTML.indexOf(playerSlotHTML[i]);
                    if (players[x].nickname === "") players[x].nickname = "Player";
                    playerSlot[z].firstElementChild.nextElementSibling.nextElementSibling.innerText = players[x].nickname;
                    playerSlot[z].firstElementChild.nextElementSibling.nextElementSibling.innerHTML += `<span><img class="player-avatar" src="/imgs/avatars/${players[x].avatar}.svg" alt="avatar"></span>`;
                }
            }
        }
    }

    if (response.method === "dealersTurn") {
        dealersTurn = response.dealersTurn;
        playersCanPlay = false;
        if (dealersTurn === true) {
            $(".players-timer circle").removeClass("circle-animation");
            $(".player-sum").removeClass("current-player-highlight");
            $("#dealerSum").addClass("current-player-highlight");
        }
    }

    if (response.method === "playersLength") {
        playersLength = response.playersLength;
    }

    if (response.method === "playerResultNatural") {
        players = response.players;
        playerNaturalIndex = response.playerNaturalIndex;
        $(".player-result:eq(" + playerNaturalIndex + ")").removeClass("hide-element");
        $(".player-result:eq(" + playerNaturalIndex + ")").addClass("result-blackjack");
        $(".player-result:eq(" + playerNaturalIndex + ")").text("BJ");
    }

    if (response.method === "finalCompare") {
        finalCompareGo();
    }

    if (response.method === "resetGameState") {
        game = response.game;
        resetGame();
    }

    if (response.method === "redirect") {
        window.location.href = "/";
    }

    if (response.method === "startTimer") {
        startTimer();
    }

    if (response.method === "joinMidGame") {
        theClient = response.theClient;
        game = response.game;
        players = game.players;
        playerSlotHTML = game.playerSlotHTML;
        gameOn = game.gameOn;
        $("#invite-link").val(gameId);
        $("#join-mid-game-label").removeClass("hide-element");

        setTimeout(function () {
            for (let i = 0; i < spectators.length; i++) {
                if (spectators[i].nickname === "") spectators[i].nickname = "Player";
                $("#users-online-container").append(`
                <li class="users-list-box">
                    <div class="users-list-info">
                        <div class="user-list-name">${spectators[i].nickname}</div>
                        <div>Balance: <span class="users-list-balance">${spectators[i].balance}</span></div>
                    </div>
                    <div class="users-list-img">
                        <img src="/imgs/avatars/${spectators[i].avatar}.svg" alt="avatar">
                    </div>
                </li>
                `);
                if (spectators[i].clientId === clientId) {
                    $(".user-list-name:eq(" + i + ")").addClass("highlight");
                }
            }
        }, 200);

        for (let x = 0; x < players.length; x++) {
            for (let i = 0; i < playerSlotHTML.length; i++) {
                if (players[x].clientId === playerSlotHTML[i]) {
                    z = playerSlotHTML.indexOf(playerSlotHTML[i]);
                    if (playerSlot[z].firstElementChild.nextElementSibling.classList.contains("empty-slot"))
                        playerSlot[z].firstElementChild.nextElementSibling.remove();
                }
            }
        }

        for (let i = 0; i < playerSlotHTML.length; i++) {
            for (let x = 0; x < players.length; x++) {
                if (players[x].clientId === playerSlotHTML[i]) {
                    z = playerSlotHTML.indexOf(playerSlotHTML[i]);
                    if (players[x].nickname === "") players[x].nickname = "Player";
                    playerSlot[z].firstElementChild.nextElementSibling.innerText = players[x].nickname;
                    playerSlot[z].firstElementChild.nextElementSibling.innerHTML += `<span><img class="player-avatar" src="/imgs/avatars/${players[x].avatar}.svg" alt="avatar"></span>`;
                }
            }
        }

        setPlayersBet();
        if (game.players.length === 0) {
            resetGame();
        }
    }

    if (response.method === "joinMidGameUpdate") {
        spectators = response.spectators;
        newPlayer = response.newPlayer;
        if (players.length > 0) {
            const payLoad = { method: "dealersHiddenCard", spectators: spectators, dealersHiddenCard: dealersHiddenCard };
            if (players[players.findIndex((players) => players.hasLeft === false)].clientId === clientId) {
                ws.send(JSON.stringify(payLoad));
            }
            if (players.length === 1 && players[0].hasLeft === true) {
                for (let i = 0; i < players.length; i++) {
                    for (let s = 0; s < spectators.length; s++) {
                        if (players[i].hasLeft === true) {
                            if (spectators[s].clientId === players[i].clientId) {
                                spectators[s].hasLeft = true;
                            }
                        }
                    }
                }
                resetGame();
            }
        } else {
            resetGame();
        }
        if (newPlayer.clientId !== clientId) {
            if (spectators.length > $("#users-online-container").children().length) {
                if (newPlayer.nickname === "") newPlayer.nickname = "Player";
                $("#users-online-container").append(`
                <li class="users-list-box">
                    <div class="users-list-info">
                        <div class="user-list-name">${newPlayer.nickname}</div>
                        <div>Balance: <span class="users-list-balance">${newPlayer.balance}</span></div>
                    </div>
                    <div class="users-list-img">
                        <img src="/imgs/avatars/${newPlayer.avatar}.svg" alt="avatar">
                    </div>
                </li>
                `);
            }
        }
    }

    if (response.method === "dealersHiddenCard") {
        dealersHiddenCard = response.dealersHiddenCard;
    }

    if (response.method === "leave") {
        game = response.game;
        players = response.players;
        spectators = response.spectators;
        playerSlotHTML = response.playerSlotHTML;
        playerSlotIndex = response.playerSlotIndex;
        reload = false;
        oldPlayerIndex = response.oldPlayerIndex;
        gameOn = response.gameOn;
    }

    if (
        response.method === "connect" || response.method === "create" ||
        response.method === "joinClient" || response.method === "join" ||
        response.method === "playersLength" || response.method === "playerResult" ||
        response.method === "playerResultNatural" || response.method === "getRoute"
    ) {
        return;
    } else {
        updateAllPlayers();
        syncTheGame();
    }
}

// ==================== SHARED FUNCTIONS ====================

function updateAllPlayers() {
    for (let i = 0; i < spectators.length; i++) {
        if (spectators[i].clientId === clientId) {
            spectators[i].bet = theClient.bet;
            theClient = spectators[i];
        }
    }
    for (let i = 0; i < players.length; i++) {
        if (players[i].clientId === clientId) {
            players[i].bet = theClient.bet;
            theClient = players[i];
        }
    }
    for (let i = 0; i < playerSlotHTML.length; i++) {
        if (playerSlotHTML[i] === clientId) clientId = playerSlotHTML[i];
        for (let x = 0; x < players.length; x++) {
            if (players[x].clientId === playerSlotHTML[i]) {
                z = playerSlotHTML.indexOf(playerSlotHTML[i]);
                if (playerSlot[z].firstElementChild.nextElementSibling.classList.contains("empty-slot"))
                    playerSlot[z].firstElementChild.nextElementSibling.remove();
                playerSlot[z].firstElementChild.nextElementSibling.classList.remove("hide-element");
                playerSlot[z].firstElementChild.nextElementSibling.nextElementSibling.nextElementSibling.classList.remove("hide-element");
                playerSlot[z].firstElementChild.nextElementSibling.nextElementSibling.innerHTML = players[x].sum;
                if (players[x].sum > 21) {
                    $(".player-result:eq(" + z + ")").removeClass("hide-element");
                    $(".player-result:eq(" + z + ")").addClass("result-lose");
                    $(".player-result:eq(" + z + ")").text("BUST");
                }
            }
        }
    }
    dealerSlot.firstElementChild.nextElementSibling.innerHTML = dealer.sum;
    player = players[currentPlayer];
    if (theClient.blackjack === false) $("#balance").text(theClient.balance);
}

function syncTheGame() {
    if (soloMode || !ws) return;
    const syncGame = {
        method: "syncGame",
        gameId: gameId,
        player: player,
        players: players,
        spectators: spectators,
        playerSlotHTML: playerSlotHTML,
        dealer: dealer,
        gameOn: gameOn,
    };
    ws.send(JSON.stringify(syncGame));
}

function sendWs(payload) {
    if (!soloMode && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function sendPlayerBets() { sendWs({ method: "bet", players: players, spectators: spectators }); }
function updatePlayerCards() { sendWs({ method: "updatePlayerCards", players: players, spectators: spectators, player: player, resetCards: resetCards }); }
function updateDealerCards() { sendWs({ method: "updateDealerCards", players: players, spectators: spectators, player: player, dealer: dealer, dealersTurn: dealersTurn }); }
function sendPlayerDeck() { sendWs({ method: "deck", players: players, spectators: spectators, deck: deck, clientDeal: clientDeal, gameOn: gameOn }); }
function clientIsReady() { sendWs({ method: "isReady", players: players, spectators: spectators, theClient: theClient }); }
function clientHasLeft() { sendWs({ method: "hasLeft", players: players, spectators: spectators, theClient: theClient }); }
function updatePlayers() { sendWs({ method: "update", players: players, spectators: spectators, dealer: dealer, deck: deck, gameOn: gameOn }); }
function updateCurrentPlayer() { sendWs({ method: "currentPlayer", players: players, spectators: spectators, player: player, dealersTurn: dealersTurn }); }
function sendPlayerThePlay() { sendWs({ method: "thePlay", players: players, spectators: spectators, player: player, currentPlayer: currentPlayer, theClient: theClient, dealersTurn: dealersTurn, gameId: gameId }); }
function sendShowSum() { sendWs({ method: "showSum", players: players, spectators: spectators }); }
function joinTable() { sendWs({ method: "joinTable", players: players, spectators: spectators, theClient: theClient, theSlot: theSlot, playerSlotHTML: playerSlotHTML, gameId: gameId }); }
function sendDealersTurn() { sendWs({ method: "dealersTurn", players: players, spectators: spectators, dealersTurn: dealersTurn }); }
function terminatePlayer() { sendWs({ method: "terminate", spectators: spectators, theClient: theClient, gameId: gameId, playerSlotHTML: playerSlotHTML, players: players, reload: reload, clientDeal: clientDeal, playersCanPlay: playersCanPlay, player: player, gameOn: gameOn }); }
function resetRound() { sendWs({ method: "resetRound", spectators: spectators, theClient: theClient }); }
function playerResult() { sendWs({ method: "playerResult", spectators: spectators, players: players }); }
function playerResultNatural() { sendWs({ method: "playerResultNatural", spectators: spectators, players: players, playerNaturalIndex: playerNaturalIndex }); }
function finalCompare() { sendWs({ method: "finalCompare", gameId: gameId, spectators: spectators, players: players }); }
function resetGameState() { sendWs({ method: "resetGameState", gameId: gameId, spectators: spectators, players: players }); }

// ==================== EVENT LISTENERS ====================

window.addEventListener("load", function () {
    setTimeout(function () {
        if (window.location.href.length - 1 > window.origin.length) {
            // Has room ID in URL - multiplayer join flow
            $("#btnJoin").removeClass("noclick-nohide");
        }
        $("#btnCreate").removeClass("noclick-nohide");
        $("#btnOffline").removeClass("noclick-nohide");

        btnCreate.addEventListener("click", (e) => {
            if (soloMode) return;
            initMultiplayerMode();
            function tryCreate() {
                if (!ws || ws.readyState !== WebSocket.OPEN || !clientId) {
                    setTimeout(tryCreate, 100);
                    return;
                }
                $("#loading-screen").removeClass("hide-element");
                const payLoad = {
                    method: "create", clientId: clientId, theClient: theClient,
                    playerSlot: playerSlot, playerSlotHTML: playerSlotHTML, roomId: roomId,
                };
                ws.send(JSON.stringify(payLoad));
                setTimeout(function () {
                    playerJoin();
                    $("#loading-screen").addClass("hide-element");
                    $("#main-menu").addClass("hide-element");
                    $("#game-room").removeClass("hide-element");
                }, 300);
            }
            tryCreate();
        });

        btnOffline.addEventListener("click", (e) => {
            if (soloMode) return;
            initMultiplayerMode();
            function tryOffline() {
                if (!ws || ws.readyState !== WebSocket.OPEN || !clientId) {
                    setTimeout(tryOffline, 100);
                    return;
                }
                let offline = true;
                $("#loading-screen").removeClass("hide-element");
                const payLoad = {
                    method: "create", clientId: clientId, theClient: theClient,
                    playerSlot: playerSlot, playerSlotHTML: playerSlotHTML, roomId: roomId, offline: offline,
                };
                ws.send(JSON.stringify(payLoad));
                setTimeout(function () {
                    playerJoin();
                    $("#loading-screen").addClass("hide-element");
                    $("#main-menu").addClass("hide-element");
                    $("#game-room").removeClass("hide-element");
                }, 300);
            }
            tryOffline();
        });
    }, 200);
});

leaveTable.addEventListener("click", (e) => {
    if (soloMode) {
        soloResetRound();
        return;
    }
    joined = false;
    theClient.balance = theClient.balance + theClient.bet;
    theClient.bet = 0;
    $("#total-bet").text(theClient.bet);
    $("#balance").text(theClient.balance);
    $("#bets-container").addClass("noclick");
    $("#leave-table").addClass("noclick");
    $(".empty-slot").removeClass("noclick");
    if (players.length > 1) {
        let playersMinusOne = players;
        playersMinusOne.splice(players.findIndex((players) => players.clientId === clientId), 1);
        for (let i = 0; i < playersMinusOne.length; i++) {
            if (playersMinusOne.every((playersMinuesOne) => playersMinuesOne.isReady === true)) {
                $(".empty-slot").addClass("noclick");
            } else {
                $(".empty-slot").removeClass("noclick");
            }
        }
    }
    terminatePlayer();
});

function playerJoin() {
    nickname = nickname.value;
    theClient.nickname = nickname.value;
    avatar = avatar[slideIndex - 1].dataset.value;
    theClient.avatar = avatar;
    const payLoad = {
        method: "join", clientId: clientId, gameId: gameId, roomId: roomId, theClient: theClient,
        playerSlot: playerSlot, playerSlotHTML: playerSlotHTML, players: players, spectators: spectators,
        nickname: nickname, avatar: avatar,
    };
    ws.send(JSON.stringify(payLoad));
}

// Player joins a slot on the table
for (let s = 0; s < playerSlot.length; s++) {
    (function (index) {
        playerSlot[s].addEventListener("click", function () {
            if (soloMode) return;
            if (joined === false && this.firstElementChild.nextElementSibling.classList.value === "empty-slot" && gameOn === false) {
                joined = true;
                theSlot = index;
                joinTable();
                $(this).children("div:nth-child(3)").addClass("highlight");
                $("#bets-container").removeClass("noclick");
                $("#leave-table").removeClass("noclick");
                $(".empty-slot").addClass("noclick");
            }
        });
    })(s);
}

function setPlayersBet() {
    for (let s = 0; s < playerSlotHTML.length; s++) {
        for (let i = 0; i < players.length; i++) {
            if (players[i].isReady && players[i].clientId === playerSlotHTML[s]) {
                if (players[i].bet >= 10 && players[i].bet < 50) chipIndex = "White";
                else if (players[i].bet >= 50 && players[i].bet < 100) chipIndex = "Red";
                else if (players[i].bet >= 100 && players[i].bet < 500) chipIndex = "Blue";
                else if (players[i].bet >= 500 && players[i].bet < 1000) chipIndex = "Green";
                else if (players[i].bet >= 1000 && players[i].bet < 5000) chipIndex = "Gray";
                else if (players[i].bet >= 5000 && players[i].bet < 10000) chipIndex = "Orange";
                else if (players[i].bet >= 10000 && players[i].bet < 50000) chipIndex = "Purple";
                else if (players[i].bet >= 50000 && players[i].bet < 100000) chipIndex = "Brown";
                else if (players[i].bet >= 100000) chipIndex = "Black";
                $(".players:eq(" + s + ") .player-bet").text(players[i].bet);
                $(".players:eq(" + s + ") .player-coin").css("background", "url(/imgs/chips/Casino_Chip_" + chipIndex + ".svg)");
                if (players[i].bet > 999) {
                    $(".players:eq(" + s + ") .player-coin").html($(".players:eq(" + s + ") .player-bet").text().slice(0, -3) + "K" + `<div class="player-bet hide-element"></div>`);
                } else {
                    $(".players:eq(" + s + ") .player-coin").html($(".players:eq(" + s + ") .player-bet").text() + `<div class="player-bet hide-element"></div>`);
                }
                $(".players:eq(" + s + ") .player-bet").text(players[i].bet);
                setTimeout(function () {
                    $(".players:eq(" + s + ") .player-coin").addClass("player-coin-animation");
                }, 50);
            }
        }
    }
}

setTimeout(joinByUrl, 200);
function joinByUrl() {
    if (window.location.href.length - 1 > window.origin.length) {
        const str = window.location.href;
        roomId = str.substring(str.length - 6);
        gameId = `${location.origin}/` + roomId;
        playerSlotIndex = [];
    }
}

window.addEventListener("beforeunload", function () {
    reload = true;
    theClient.hasLeft = true;
    if (!soloMode && playersCanPlay === true && player.clientId === clientId && players.length > 1) {
        sendPlayerNext();
    }
    if (!soloMode) terminatePlayer();
});
