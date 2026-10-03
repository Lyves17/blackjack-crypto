const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true, index: true },
    walletAddress: { type: String, required: true, index: true },
    crypto: String,
    fiat: String,
    amount: Number,
    depositAddress: String,
    exchangeRate: String,
    status: { type: String, default: 'UNPAID' },
    paid: { type: Boolean, default: false },
    creditedAmount: { type: Number, default: 0 },
    creditedAt: { type: Date, default: null },
    rawCallback: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.models.Deposit || mongoose.model('Deposit', DepositSchema);