const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// Variables d'environnement pour la configuration
const PORT = process.env.PORT || 3000;
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'mychannel';
const CONTRACT_NAME = process.env.CONTRACT_NAME || 'basic';
const WALLET_PATH = process.env.WALLET_PATH || path.join(__dirname, 'wallet');
const IDENTITY_NAME = process.env.IDENTITY_NAME || 'appUser';

/**
 * Met à jour les métadonnées d'un titre foncier sur la blockchain
 * @param {string} fileHash - Hash du fichier à mettre à jour
 * @param {Object} metadata - Nouvelles métadonnées
 * @returns {Object} Les informations du titre foncier mis à jour
 */
async function updateTitreFoncierBlockchain(fileHash, metadata) {
  let gateway;
  try {
    gateway = await getBlockchainConnection();

    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CONTRACT_NAME);

    const result = await contract.submitTransaction(
      'UpdateTitreFoncier',
      fileHash,
      JSON.stringify(metadata)
    );
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('Erreur lors de la mise à jour sur la blockchain:', error);
    throw new Error(`Erreur blockchain: ${error.message}`);
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}

/**
 * Transfère un titre foncier à un nouveau propriétaire
 * @param {string} fileHash - Hash du fichier à transférer
 * @param {string} nouveauProprietaire - Identifiant du nouveau propriétaire
 * @param {string} prix - Prix de la transaction (optionnel)
 * @returns {Object} Les informations du titre foncier transféré
 */
async function transferTitreFoncierBlockchain(fileHash, nouveauProprietaire, prix = "0") {
  let gateway;
  try {
    gateway = await getBlockchainConnection();

    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CONTRACT_NAME);

    const result = await contract.submitTransaction(
      'TransferTitreFoncier',
      fileHash,
      nouveauProprietaire,
    );
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('Erreur lors du transfert sur la blockchain:', error);
    throw new Error(`Erreur blockchain: ${error.message}`);
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}

/**
 * Récupère tous les titres fonciers depuis la blockchain
 * @returns {Array} Liste de tous les titres fonciers
 */
async function getAllTitresFonciersBlockchain() {
  let gateway;
  try {
    gateway = await getBlockchainConnection();
    console.log("connecion établie");
    const network = await gateway.getNetwork(CHANNEL_NAME);
    console.log("réseau récupéré");
    const contract = network.getContract(CONTRACT_NAME);
    const result = await contract.evaluateTransaction('GetAllTitresFonciers');
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('Erreur lors de la récupération sur la blockchain:', error);
    throw new Error(`Erreur blockchain: ${error.message}`);
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}

/**
 * Supprime un titre foncier de la blockchain
 * @param {string} fileHash - Hash du fichier à supprimer
 * @returns {Object} Message de confirmation
 */
async function deleteTitreFoncierBlockchain(fileHash) {
  let gateway;
  try {
    gateway = await getBlockchainConnection();

    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CONTRACT_NAME);

    const result = await contract.submitTransaction('DeleteTitreFoncier', fileHash);
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('Erreur lors de la suppression sur la blockchain:', error);
    throw new Error(`Erreur blockchain: ${error.message}`);
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}

/**
 * Enregistre les informations du titre foncier dans la blockchain
 * @param {string} hashFichier - Hash SHA-256 du fichier
 * @param {string} cheminFichier - Chemin d'accès au fichier
 * @param {Object} metadata - Métadonnées du titre foncier
 */
async function sauvegarderDansBlockChain(hashFichier, cheminFichier, metadata) {
  let gateway;
  try {
    gateway = await getBlockchainConnection();

    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CONTRACT_NAME);

    await contract.submitTransaction(
      'creerFichier',
      hashFichier,
      cheminFichier,
      JSON.stringify(metadata)
    );
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement sur la blockchain:', error);
    throw new Error(`Erreur blockchain: ${error.message}`);
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}

/**
 * Récupère un titre foncier depuis la blockchain
 * @param {string} fileHash - Hash du fichier à récupérer
 * @returns {Object} Les informations du titre foncier
 */
async function getTitreFoncierBlockchain(fileHash) {
  let gateway;
  try {
    gateway = await getBlockchainConnection();

    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CONTRACT_NAME);

    const result = await contract.evaluateTransaction('ReadTitreFoncier', fileHash);
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('Erreur lors de la récupération sur la blockchain:', error);
    return { error: 'Titre foncier non trouvé ou erreur lors de la récupération' };
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}

/**
 * Établit une connexion à la blockchain Hyperledger Fabric
 * @param {string} identityName - Nom de l'identité à utiliser
 * @returns {Gateway} Instance de la passerelle connectée
 */
async function getBlockchainConnection(identityName = IDENTITY_NAME) {
  try {
    // Charger le profil de connexion
    const ccpPath = path.resolve(__dirname, 'connection-profile.json');
    if (!fs.existsSync(ccpPath)) {
      throw new Error('Fichier de profil de connexion non trouvé');
    }

    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Vérifier si le wallet existe
    if (!fs.existsSync(WALLET_PATH)) {
      throw new Error(`Wallet non trouvé: ${WALLET_PATH}`);
    }

    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

     // Vérifier si l'identité existe
     const identity = await wallet.get(identityName);
     if (!identity) {
       throw new Error(`L'utilisateur "${identityName}" n'existe pas dans le wallet`);
     }

    // Connecter à la blockchain
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: identityName,
      discovery: { enabled: true, asLocalhost: true },
      eventHandlerOptions: {
        commitTimeout: 30 // secondes
      }
    });

    return gateway;
  } catch (error) {
    console.error('Erreur lors de la connexion à la blockchain:', error);
    throw error;
  }
}

/**
 * Vérifie si un titre foncier existe dans la blockchain
 * @param {string} fileHash - Hash du fichier à vérifier
 * @returns {boolean} Vrai si le titre existe, faux sinon
 */
async function titreFoncierExistsBlockchain(fileHash) {
    let gateway;
    try {
      gateway = await getBlockchainConnection();
  
      const network = await gateway.getNetwork(CHANNEL_NAME);
      const contract = network.getContract(CONTRACT_NAME);
  
      const result = await contract.evaluateTransaction('titreFoncierExists', fileHash);
      return result.toString() === 'true';
    } catch (error) {
      console.error('Erreur lors de la vérification sur la blockchain:', error);
      return false;
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }
  
  /**
   * Récupère tous les titres fonciers appartenant à un propriétaire spécifique
   * @param {string} proprietaire - Identifiant du propriétaire
   * @returns {Array} Liste des titres fonciers du propriétaire
   */
  async function getTitresFonciersByProprietaireBlockchain(proprietaire) {
    let gateway;
    try {
      gateway = await getBlockchainConnection();
  
      const network = await gateway.getNetwork(CHANNEL_NAME);
      const contract = network.getContract(CONTRACT_NAME);
  
      const result = await contract.evaluateTransaction('GetTitresFonciersByProprietaire', proprietaire);
      return JSON.parse(result.toString());
    } catch (error) {
      console.error('Erreur lors de la récupération des titres par propriétaire:', error);
      throw new Error(`Erreur blockchain: ${error.message}`);
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }
  
  /**
   * Vérifie l'authenticité d'un titre foncier
   * @param {string} fileHash - Hash du fichier à vérifier
   * @returns {Object} Résultat de la vérification d'authenticité
   */
  async function verifierAuthenticiteTitreFoncierBlockchain(fileHash) {
    let gateway;
    try {
      gateway = await getBlockchainConnection();
  
      const network = await gateway.getNetwork(CHANNEL_NAME);
      const contract = network.getContract(CONTRACT_NAME);
  
      const result = await contract.evaluateTransaction('VerifierAuthenticiteTitreFoncier', fileHash);
      return JSON.parse(result.toString());
    } catch (error) {
      console.error('Erreur lors de la vérification d\'authenticité:', error);
      return { 
        hashFichier: fileHash,
        estAuthentique: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }
  
  /**
   * Récupère l'historique des transactions pour un titre foncier
   * @param {string} fileHash - Hash du fichier
   * @returns {Array} Historique des transactions
   */
  async function getHistoriqueTitreFoncierBlockchain(fileHash) {
    let gateway;
    try {
      gateway = await getBlockchainConnection();
  
      const network = await gateway.getNetwork(CHANNEL_NAME);
      const contract = network.getContract(CONTRACT_NAME);
  
      const result = await contract.evaluateTransaction('GetHistoriqueTitreFoncier', fileHash);
      return JSON.parse(result.toString());
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw new Error(`Erreur blockchain: ${error.message}`);
    } finally {
      if (gateway) {
        await gateway.disconnect();
      }
    }
  }

module.exports = {
    updateTitreFoncierBlockchain,
    transferTitreFoncierBlockchain,
    getAllTitresFonciersBlockchain,
    deleteTitreFoncierBlockchain,
    sauvegarderDansBlockChain,
    getTitreFoncierBlockchain,
    getBlockchainConnection,
    // Nouvelles fonctions exportées
    titreFoncierExistsBlockchain,
    getTitresFonciersByProprietaireBlockchain,
    verifierAuthenticiteTitreFoncierBlockchain,
    getHistoriqueTitreFoncierBlockchain
  };
