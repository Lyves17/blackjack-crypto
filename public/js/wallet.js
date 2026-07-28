// ============================================
// WALLET MANAGER - MetaMask/Polygon Integration
// ============================================

const CASINO_WALLET = "0x5B5B6264EF02E701D04c32768c2216080889A2c0";
const POLYGON_CHAIN_ID = 137;

const WalletManager = {
  address: null,
  provider: null,
  signer: null,

  async connect() {
    if (!window.ethereum) {
      throw new Error("Install MetaMask or any Web3 wallet.");
    }

    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

    // Switch to Polygon
    const network = await this.provider.getNetwork();
    if (network.chainId !== POLYGON_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x89" }],
        });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x89",
              chainName: "Polygon Mainnet",
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: ["https://polygon-rpc.com"],
              blockExplorerUrls: ["https://polygonscan.com/"],
            }],
          });
        }
      }
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
    }

    this.signer = this.provider.getSigner();
    this.address = accounts[0];

    // Listen for changes
    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());

    this.updateUI();
    return this.address;
  },

  disconnect() {
    this.address = null;
    this.provider = null;
    this.signer = null;
    this.updateUI();
  },

  isConnected() {
    return this.address !== null;
  },

  getShortAddress() {
    if (!this.address) return "";
    return this.address.slice(0, 6) + "..." + this.address.slice(-4);
  },

  async getBalance() {
    if (!this.provider || !this.address) return "0";
    const bal = await this.provider.getBalance(this.address);
    return ethers.utils.formatEther(bal);
  },

  async sendBet(amountMatic) {
    if (!this.signer) throw new Error("Wallet not connected");
    const tx = await this.signer.sendTransaction({
      to: CASINO_WALLET,
      value: ethers.utils.parseEther(amountMatic.toString()),
    });
    return (await tx.wait()).transactionHash;
  },

  updateUI() {
    const walletStatus = document.getElementById('wallet-status');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');

    if (this.isConnected()) {
      walletStatus.classList.add('hidden');
      walletInfo.classList.remove('hidden');
      walletAddress.textContent = this.getShortAddress();
    } else {
      walletStatus.classList.remove('hidden');
      walletInfo.classList.add('hidden');
    }
  }
};

// ---- Wallet Button Listeners ----
document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connect-wallet');
  const disconnectBtn = document.getElementById('disconnect-wallet');

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;
        await WalletManager.connect();
      } catch (e) {
        alert(e.message || 'Failed to connect');
      } finally {
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.disabled = false;
      }
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      WalletManager.disconnect();
    });
  }
});
