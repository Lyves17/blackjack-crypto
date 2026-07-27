const crypto = require('crypto');

const SUITS = ['Heart', 'Diamond', 'Spade', 'Club'];
const VALUES = [
    { card: '2', value: 2 },
    { card: '3', value: 3 },
    { card: '4', value: 4 },
    { card: '5', value: 5 },
    { card: '6', value: 6 },
    { card: '7', value: 7 },
    { card: '8', value: 8 },
    { card: '9', value: 9 },
    { card: '10', value: 10 },
    { card: 'J', value: 10 },
    { card: 'Q', value: 10 },
    { card: 'K', value: 10 },
    { card: 'A', value: [1, 11] }
];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const val of VALUES) {
            deck.push({
                suit,
                value: { ...val, hasAce: val.card === 'A' },
                image: `${suit}${val.card}.svg`
            });
        }
    }
    return deck;
}

function shuffleDeck(deck, serverSeed, clientSeed) {
    const combinedSeed = `${serverSeed}:${clientSeed}:${Date.now()}`;
    const hash = crypto.createHmac('sha256', combinedSeed).digest('hex');

    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const seedHex = hash + crypto.createHmac('sha256', `${i}:${combinedSeed}`).digest('hex');
        const rand = parseInt(seedHex.substring(0, 8), 16) / 0xFFFFFFFF;
        const j = Math.floor(rand * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return { deck: shuffled, hash };
}

function generateServerSeed() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = { createDeck, shuffleDeck, generateServerSeed };
