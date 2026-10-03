const crypto = require('crypto');

const SHKEEPER_URL = (process.env.SHKEEPER_URL || '').replace(/\/+$/, '');
const SHKEEPER_API_KEY = process.env.SHKEEPER_API_KEY || '';
const CALLBACK_MAX_AGE_SECONDS = 300;

function isConfigured() {
  return Boolean(SHKEEPER_URL && SHKEEPER_API_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  if (!isConfigured()) {
    throw new Error('SHKeeper non configure (SHKEEPER_URL / SHKEEPER_API_KEY manquants)');
  }

  const headers = { Accept: 'application/json' };
  if (auth) headers['X-Shkeeper-Api-Key'] = SHKEEPER_API_KEY;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${SHKEEPER_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { status: 'error', message: text.slice(0, 200) };
  }

  if (!response.ok || payload.status === 'error') {
    const error = new Error(payload.message || `SHKeeper HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function listCrypto() {
  return request('/api/v1/crypto', { auth: false });
}

function createInvoice({ externalId, crypto: cryptoName, fiat, amount, callbackUrl }) {
  return request(`/api/v1/${encodeURIComponent(cryptoName)}/payment_request`, {
    method: 'POST',
    body: {
      external_id: String(externalId),
      fiat,
      amount: String(amount),
      callback_url: callbackUrl,
    },
  });
}

function getInvoice(externalId) {
  return request(`/api/v1/invoices/${encodeURIComponent(externalId)}`);
}

function verifyCallback({ rawBody, timestamp, signature }) {
  if (!isConfigured()) return { valid: false, reason: 'SHKeeper non configure' };
  if (!timestamp || !signature) return { valid: false, reason: 'en-tetes de signature manquants' };

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return { valid: false, reason: 'timestamp invalide' };

  const age = Math.abs(Math.floor(Date.now() / 1000) - seconds);
  if (age > CALLBACK_MAX_AGE_SECONDS) {
    return { valid: false, reason: 'timestamp hors tolerance' };
  }

  const expected = crypto
    .createHmac('sha256', SHKEEPER_API_KEY)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  const computed = Buffer.from(expected, 'utf8');
  const received = Buffer.from(String(signature).toLowerCase(), 'utf8');

  if (computed.length !== received.length || !crypto.timingSafeEqual(computed, received)) {
    return { valid: false, reason: 'signature invalide' };
  }

  return { valid: true };
}

module.exports = {
  isConfigured,
  listCrypto,
  createInvoice,
  getInvoice,
  verifyCallback,
  CALLBACK_MAX_AGE_SECONDS,
};