require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors());
app.use(express.json());

// ---- MongoDB ----
let dbConnected = false;
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { dbConnected = true; console.log('MongoDB connected'); })
    .catch(err => console.error('MongoDB error:', err.message));
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
  timestamp: { type: Date, default: Date.now }
});
const Game = mongoose.model('Game', GameSchema);

// ---- API Routes ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: dbConnected });
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

// ---- Static Files ----
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// ---- WebSocket (for multiplayer later) ----
const wss = new WebSocket.Server({ server });
const clients = {};
const games = {};

wss.on('connection', (ws) => {
  const clientId = guid();
  clients[clientId] = { ws };

  ws.send(JSON.stringify({ method: 'connect', clientId }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      // Multiplayer handlers will go here
    } catch(e) {}
  });

  ws.on('close', () => {
    delete clients[clientId];
  });
});

// ---- Start Server ----
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ---- Utils ----
function guid() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}
