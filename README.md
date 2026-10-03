# Crypto Blackjack

Blackjack multiplayer et solo avec paris MATIC sur Polygon.

## Fonctionnalités

- **Mode Solo** : Jouez contre le croupier (IA) avec un solde virtuel de 5000 MATIC
- **Mode Multiplayer** : Jouez avec d'autres joueurs en temps réel via WebSocket
- **Wallet MetaMask** : Connexion wallet pour parier en MATIC sur Polygon
- **Provably Fair** : Mélange de cartes vérifiable cryptographiquement
- **Historique** : Sauvegarde des parties en MongoDB

## Stack

- Backend : Node.js + Express + WebSocket (ws)
- Frontend : HTML/CSS/JS vanilla + jQuery + Ethers.js
- Base de données : MongoDB Atlas
- Blockchain : Polygon (MATIC)
- Paiements : SHKeeper (passerelle crypto auto-hébergée)

## Déploiement

Le backend et le frontend sont servis par le même serveur Express sur Render.

Variables d'environnement attendues (voir `server/.env.example`) :

| Variable | Rôle |
| --- | --- |
| `MONGODB_URI` | Chaîne de connexion MongoDB Atlas |
| `PORT` | Port d'écoute |
| `DOMAIN_NAME` | Domaine de déploiement |
| `PUBLIC_URL` | URL publique du jeu, sert à construire l'URL de callback SHKeeper |
| `SHKEEPER_URL` | URL de l'instance SHKeeper |
| `SHKEEPER_API_KEY` | Clé d'API du portefeuille SHKeeper |
| `SHKEEPER_FIAT` | Devise de facturation (`USD` ou `EUR`) |

## Dépôts via SHKeeper

Le serveur expose une passerelle de paiement à `server/lib/shkeeper.js` :

| Route | Méthode | Description |
| --- | --- | --- |
| `/api/shkeeper/status` | GET | Indique si SHKeeper est configuré |
| `/api/shkeeper/crypto` | GET | Liste des cryptos disponibles |
| `/api/shkeeper/invoices` | POST | Crée une facture (`walletAddress`, `crypto`, `amount`) |
| `/api/shkeeper/invoices/:externalId` | GET | État d'une facture |
| `/api/shkeeper/balance/:walletAddress` | GET | Solde crédité (somme des dépôts payés) |
| `/api/shkeeper/callback` | POST | Callback SHKeeper (signature HMAC-SHA256 vérifiée) |

Le callback est authentifié par HMAC-SHA256 sur `{timestamp}.{body brut}`, avec une
tolérance de 5 minutes sur le timestamp. Le crédit est protégé contre les rejeux par
SHKeeper (toutes les 60 s) via le champ `creditedAt`.

### Hébergement de SHKeeper

SHKeeper ne se déploie pas sur Render : l'installation officielle exige k3s + Helm,
un nom de domaine avec TLS, et lance des full nodes blockchain. Un VPS est requis.

## Développement

Le dépôt contient une configuration Codespaces (`.devcontainer/`). Les secrets
Codespaces (`MONGODB_URI`, `SHKEEPER_URL`, `SHKEEPER_API_KEY`…) sont injectés
automatiquement dans `server/.env` par `.devcontainer/setup.sh`.
