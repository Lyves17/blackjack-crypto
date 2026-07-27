require('dotenv').config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const PORT = process.env.PORT || 3000;
const WebSocket = require("ws");
const { createDeck, shuffleDeck, generateServerSeed } = require('./lib/deck');

const WEB_URL = process.env.NODE_ENV === "production"
    ? `https://${process.env.DOMAIN_NAME || 'blackjack-crypto.onrender.com'}/`
    : `http://localhost:${PORT}/`;

app.use(cors());
app.use(express.json());

let dbConnected = false;

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => { dbConnected = true; console.log('MongoDB connected'); })
        .catch(err => { console.error('MongoDB error:', err.message); });
} else {
    console.log('No MONGODB_URI - running without database');
}

const GameSchema = new mongoose.Schema({
    walletAddress: String,
    mode: String,
    betAmount: Number,
    result: String,
    payout: Number,
    playerCards: Array,
    dealerCards: Array,
    playerSum: Number,
    dealerSum: Number,
    serverSeedHash: String,
    clientSeed: String,
    timestamp: { type: Date, default: Date.now }
});
const Game = mongoose.model('Game', GameSchema);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: dbConnected });
});

app.post('/api/deck/shuffle', (req, res) => {
    const { clientSeed } = req.body;
    const serverSeed = generateServerSeed();
    const serverSeedHash = require('crypto').createHash('sha256').update(serverSeed).digest('hex');
    const { deck } = shuffleDeck(createDeck(), serverSeed, clientSeed || 'default');
    res.json({ serverSeedHash, deck });
});

app.post('/api/game/save', async (req, res) => {
    if (!dbConnected) return res.json({ saved: false });
    try {
        const game = new Game(req.body);
        await game.save();
        res.json({ saved: true });
    } catch (e) {
        res.json({ saved: false, error: e.message });
    }
});

const cacheDuration = 1000 * 60 * 60 * 24 * 365;
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: cacheDuration,
    setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', `public, max-age=${cacheDuration}`);
    }
}));

const wss = new WebSocket.Server({ server: server });
const clients = {};
const games = {};

wss.on("connection", (ws) => {
    const clientId = guid();
    clients[clientId] = { ws };

    const theClient = {
        nickname: "",
        avatar: "",
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

    ws.send(JSON.stringify({ method: "connect", clientId, theClient }));

    ws.on("message", (message) => {
        const result = JSON.parse(message);

        if (result.method === "create") {
            const roomId = partyId();
            const gameId = WEB_URL + roomId;
            games[gameId] = {
                id: gameId, clients: [], players: [], dealer: null,
                gameOn: null, spectators: [], playerSlot: result.playerSlot,
                playerSlotHTML: [{},{},{},{},{},{},{}]
            };
            ws.send(JSON.stringify({ method: "create", game: games[gameId], roomId, offline: result.offline }));
        }

        if (result.method === "join") {
            const game = games[result.gameId];
            if (!game) return;
            const theClient = result.theClient;
            theClient.clientId = clientId;
            game.spectators.push(theClient);

            ws.send(JSON.stringify({ method: "joinClient", theClient, game }));
            broadcast(result.gameId, { method: "join", game, spectators: game.spectators });
            broadcast(result.gameId, { method: "updateClientArray", players: game.players, spectators: game.spectators, playerSlotHTML: game.playerSlotHTML });
        }

        if (result.method === "joinTable") {
            const game = games[result.gameId];
            if (!game) return;
            game.players.push(result.theClient);
            game.playerSlotHTML[result.theSlot] = clientId;
            broadcast(result.gameId, { method: "joinTable", game, players: game.players, spectators: game.spectators, playerSlotHTML: game.playerSlotHTML });
        }

        const relayMethods = ["bet", "deck", "isReady", "hasLeft", "currentPlayer", "update", "thePlay", "showSum", "updatePlayerCards", "updateDealerCards", "dealersTurn", "dealersHiddenCard", "startTimer", "resetRound", "playerResult", "playerResultNatural", "finalCompare", "resetGameState"];
        if (relayMethods.includes(result.method)) {
            const game = games[result.gameId] || {};
            const spectators = result.spectators || game.spectators || [];
            broadcast(result.gameId, result);
        }

        if (result.method === "syncGame") {
            const game = games[result.gameId];
            if (game) {
                game.gameOn = result.gameOn;
                game.players = result.players;
                game.spectators = result.spectators;
                game.playerSlotHTML = result.playerSlotHTML;
            }
        }

        if (result.method === "terminate") {
            const game = games[result.gameId];
            if (!game) return;
            const idx = game.spectators.findIndex(s => s.clientId === clientId);
            if (idx > -1) game.spectators.splice(idx, 1);
            broadcast(result.gameId, { method: "leave", spectators: game.spectators, game });
        }
    });
});

function broadcast(gameId, payload) {
    const game = games[gameId];
    if (!game) return;
    const data = JSON.stringify(payload);
    game.spectators.forEach(c => {
        if (clients[c.clientId]) {
            clients[c.clientId].ws.send(data);
        }
    });
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const guid = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
};

function partyId() {
    let result = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}
