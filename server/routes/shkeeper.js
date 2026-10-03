const crypto = require('crypto');
const express = require('express');
const shkeeper = require('../lib/shkeeper');
const Deposit = require('../models/Deposit');

const router = express.Router();

const FIAT = process.env.SHKEEPER_FIAT || 'USD';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const CRYPTO_NAME_PATTERN = /^[A-Z0-9-]{2,20}$/;

function buildCallbackUrl() {
  if (!PUBLIC_URL) throw new Error('PUBLIC_URL non configure');
  return `${PUBLIC_URL}/api/shkeeper/callback`;
}

function newExternalId() {
  return `bj-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function serialize(deposit) {
  return {
    externalId: deposit.externalId,
    walletAddress: deposit.walletAddress,
    crypto: deposit.crypto,
    fiat: deposit.fiat,
    amount: deposit.amount,
    depositAddress: deposit.depositAddress,
    exchangeRate: deposit.exchangeRate,
    status: deposit.status,
    paid: deposit.paid,
    creditedAmount: deposit.creditedAmount,
    creditedAt: deposit.creditedAt,
  };
}

router.get('/status', (req, res) => {
  res.json({
    configured: shkeeper.isConfigured(),
    fiat: FIAT,
    callbackUrl: PUBLIC_URL ? `${PUBLIC_URL}/api/shkeeper/callback` : null,
  });
});

router.get('/crypto', async (req, res) => {
  try {
    const payload = await shkeeper.listCrypto();
    res.json(payload);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/invoices', async (req, res) => {
  const { walletAddress, crypto: cryptoName, amount } = req.body || {};

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress requis' });
  }
  if (!cryptoName || !CRYPTO_NAME_PATTERN.test(cryptoName)) {
    return res.status(400).json({ error: 'crypto invalide' });
  }

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: 'amount invalide' });
  }

  let callbackUrl;
  try {
    callbackUrl = buildCallbackUrl();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const externalId = newExternalId();

  try {
    const invoice = await shkeeper.createInvoice({
      externalId,
      crypto: cryptoName,
      fiat: FIAT,
      amount: value,
      callbackUrl,
    });

    const deposit = await Deposit.create({
      externalId,
      walletAddress,
      crypto: cryptoName,
      fiat: FIAT,
      amount: value,
      depositAddress: invoice.wallet,
      exchangeRate: invoice.exchange_rate,
      status: 'UNPAID',
    });

    res.status(201).json({
      externalId,
      crypto: cryptoName,
      fiat: FIAT,
      amount: value,
      depositAddress: invoice.wallet,
      cryptoAmount: invoice.amount,
      exchangeRate: invoice.exchange_rate,
      recalculateAfter: invoice.recalculate_after,
      deposit: serialize(deposit),
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.get('/invoices/:externalId', async (req, res) => {
  const { externalId } = req.params;

  try {
    const deposit = await Deposit.findOne({ externalId });
    if (!deposit) return res.status(404).json({ error: 'facture inconnue' });

    let remote = null;
    try {
      remote = await shkeeper.getInvoice(externalId);
    } catch (error) {
      remote = { error: error.message };
    }

    res.json({ deposit: serialize(deposit), remote });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/balance/:walletAddress', async (req, res) => {
  try {
    const deposits = await Deposit.find({
      walletAddress: req.params.walletAddress,
      creditedAt: { $ne: null },
    }).select('creditedAmount');

    const balance = deposits.reduce((total, deposit) => total + (deposit.creditedAmount || 0), 0);
    res.json({ walletAddress: req.params.walletAddress, balance, deposits: deposits.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/callback', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.rawBody)
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

  const check = shkeeper.verifyCallback({
    rawBody: rawBody.toString('utf8'),
    timestamp: req.get('X-Shkeeper-Timestamp'),
    signature: req.get('X-Shkeeper-Signature'),
  });

  if (!check.valid) {
    console.warn(`[shkeeper] callback refuse: ${check.reason}`);
    return res.status(401).json({ error: check.reason });
  }

  const payload = req.body || {};
  const externalId = payload.external_id ? String(payload.external_id) : null;

  if (!externalId) {
    return res.status(400).json({ error: 'external_id manquant' });
  }

  try {
    const creditedAmount = Number(payload.balance_fiat) || 0;
    const paid = Boolean(payload.paid) || payload.status === 'PAID' || payload.status === 'OVERPAID';

    // creditedAt sert de verrou anti-double-credit : SHKeeper rejoue le
    // callback toutes les 60s tant que la reponse n'est pas 202.
    const deposit = await Deposit.findOneAndUpdate(
      { externalId, creditedAt: null },
      {
        $set: {
          status: payload.status || 'UNPAID',
          paid,
          crypto: payload.crypto,
          creditedAmount,
          creditedAt: new Date(),
          rawCallback: payload,
        },
      },
      { new: true }
    );

    if (deposit) {
      console.log(
        `[shkeeper] facture ${externalId} creditee ${creditedAmount} ${deposit.fiat} pour ${deposit.walletAddress}`
      );
    } else {
      const existing = await Deposit.findOne({ externalId });
      if (!existing) {
        console.warn(`[shkeeper] callback pour une facture inconnue: ${externalId}`);
      }
    }

    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    console.error('[shkeeper] callback erreur', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;