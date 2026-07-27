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

## Déploiement

Le backend et le frontend sont servis par le même serveur Express sur Render.
