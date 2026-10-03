// ============================================
// SHKEEPER - DEPÔTS CRYPTO
// ============================================

const DepositManager = {
  FIAT: 'USD',
  polling: null,

  async init() {
    const openBtn = document.getElementById('btn-deposit');
    if (!openBtn) return;

    openBtn.addEventListener('click', () => this.open());

    document.getElementById('deposit-close').addEventListener('click', () => this.close());
    document.getElementById('deposit-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'deposit-overlay') this.close();
    });
    document.getElementById('deposit-submit').addEventListener('click', () => this.createInvoice());
  },

  async open() {
    this.reset();
    document.getElementById('deposit-overlay').classList.remove('hidden');

    const form = document.getElementById('deposit-form');
    const alertBox = document.getElementById('deposit-alert');

    try {
      const status = await this.request('/api/shkeeper/status');
      this.FIAT = status.fiat || 'USD';
      if (!status.configured) {
        form.classList.add('hidden');
        alertBox.classList.remove('hidden');
        alertBox.textContent = 'SHKeeper non configure sur le serveur.';
        return;
      }

      const payload = await this.request('/api/shkeeper/crypto');
      const select = document.getElementById('deposit-crypto');
      select.innerHTML = '';
      for (const item of payload.crypto_list || []) {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.display_name || item.name;
        select.appendChild(option);
      }
    } catch (error) {
      form.classList.add('hidden');
      alertBox.classList.remove('hidden');
      alertBox.textContent = error.message;
    }
  },

  close() {
    document.getElementById('deposit-overlay').classList.add('hidden');
    this.stopPolling();
  },

  reset() {
    this.stopPolling();
    document.getElementById('deposit-form').classList.remove('hidden');
    document.getElementById('deposit-result').classList.add('hidden');
    document.getElementById('deposit-alert').classList.add('hidden');
    document.getElementById('deposit-amount').value = '50';
    document.getElementById('btn-deposit').disabled = false;
  },

  async createInvoice() {
    if (!WalletManager || !WalletManager.isConnected()) {
      alert('Connecte ton wallet d\'abord.');
      return;
    }

    const button = document.getElementById('btn-deposit');
    button.disabled = true;

    try {
      const invoice = await this.request('/api/shkeeper/invoices', {
        method: 'POST',
        body: {
          walletAddress: WalletManager.address,
          crypto: document.getElementById('deposit-crypto').value,
          amount: document.getElementById('deposit-amount').value,
        },
      });

      document.getElementById('deposit-form').classList.add('hidden');
      document.getElementById('deposit-result').classList.remove('hidden');
      document.getElementById('deposit-address').textContent = invoice.depositAddress;
      document.getElementById('deposit-amount-due').textContent = `${invoice.cryptoAmount} ${invoice.crypto}`;
      document.getElementById('deposit-status').textContent = invoice.deposit.status;

      this.startPolling(invoice.externalId);
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  },

  startPolling(externalId) {
    this.stopPolling();
    this.polling = setInterval(async () => {
      try {
        const result = await this.request(`/api/shkeeper/invoices/${externalId}`);
        const status = result.deposit.status;
        document.getElementById('deposit-status').textContent = status;

        if (status === 'PAID' || status === 'OVERPAID') {
          this.stopPolling();
          document.getElementById('deposit-amount-due').textContent =
            `Crédité ${result.deposit.creditedAmount} ${result.deposit.fiat}`;
        }
      } catch (error) {
        this.stopPolling();
      }
    }, 10000);
  },

  stopPolling() {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
    }
  },

  async request(url, options = {}) {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  DepositManager.init();
});