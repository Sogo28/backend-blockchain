# Backend Blockchain

Ce projet implémente un backend pour un système utilisant des **blockchains** appliquées au domaine foncier. Il gère les informations relatives aux titres fonciers en utilisant une architecture distribuée. Le système prend en charge la gestion des transactions sur la blockchain et le stockage off-chain des fichiers associés.

## Fonctionnalités principales

- **Création de titres fonciers** : Permet de créer un nouveau titre foncier sur la blockchain.
- **Consultation de titres fonciers** : Récupère les informations sur un titre foncier existant.
- **Mise à jour des titres fonciers** : Met à jour les informations d'un titre foncier, avec ou sans fichiers associés.
- **Stockage off-chain** : Les fichiers liés aux titres fonciers sont stockés en dehors de la blockchain pour réduire les coûts de stockage et améliorer l'efficacité.

## Prérequis

Avant de commencer, vous devez avoir installé sur votre machine les outils suivants :

- **Node.js** : Pour exécuter l'application backend.
- **NPM** ou **Yarn** : Pour la gestion des dépendances.
- **Hyperledger Fabric** : Pour interagir avec la blockchain.
  - Suivez la documentation officielle pour installer Hyperledger Fabric : [Installation de Hyperledger Fabric](https://hyperledger-fabric.readthedocs.io/en/release-2.2/build_network.html).

# Installation et configuration

## Prérequis pour l'interaction avec Hyperledger Fabric

## Configuration de Hyperledger Fabric

Copiez le fichier `organizations` :
   - Copiez le contenu du fichier `organizations` depuis le dossier du test sample de Hyperledger Fabric dans le répertoire `crypto-config` de votre projet. Vous pouvez obtenir ce fichier depuis l'exemple de réseau Fabric ou le générer vous-même à partir de votre configuration Fabric.

   Exemple de commande pour copier le fichier :

   ```bash
   cp /path/to/fabric-samples/test-network/organizations/* ./crypto-config/
   ```
### Enrôler l'admin

Pour que le backend puisse interagir avec le réseau Hyperledger Fabric, il faut d'abord enregistrer l'administrateur en exécutant le script enrollAdmin. Ce script crée les certificats nécessaires pour l'administrateur.

Commande à exécuter :
```bash
node enrollAdmin.js
```

Ce script génère les certificats de l'administrateur et configure les clés pour l'accès au réseau Fabric.

### Enrôler l'utilisateur

Après avoir enrôlé l'administrateur, vous devez également enregistrer un utilisateur pour permettre l'exécution des transactions sur le réseau Fabric.

Commande à exécuter :
```bash
node enrollUser.js
```

Ce script génère un utilisateur avec des certificats valides pour interagir avec le réseau.

## Installation du projet

1. Clonez le dépôt :
```bash
git clone https://github.com/Sogo28/backend-blockchain.git
```

2. Allez dans le répertoire du projet :
```bash
cd backend-blockchain
```

3. Installez les dépendances :
   - Si vous utilisez npm :
   ```bash
   npm install
   ```
   - Ou si vous utilisez yarn :
   ```bash
   yarn install
   ```

## Utilisation

### Démarrer l'application

Pour démarrer le serveur backend :
```bash
npm start
```
