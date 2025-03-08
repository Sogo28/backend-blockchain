const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// Import all functions
// Import all functions
const { 
    updateTitreFoncierBlockchain,
    transferTitreFoncierBlockchain,
    getAllTitresFonciersBlockchain,
    deleteTitreFoncierBlockchain,
    sauvegarderDansBlockChain,
    getTitreFoncierBlockchain,
    titreFoncierExistsBlockchain,
    getTitresFonciersByProprietaireBlockchain,
    verifierAuthenticiteTitreFoncierBlockchain,
    getHistoriqueTitreFoncierBlockchain
  } = require('./blockchain');
  
const PORT = process.env.PORT || 3000;
const app = express();

// Middleware pour gérer le corps des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:8080', // Autorise les requêtes venant du frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const REPERTOIRE_PARTAGE = process.env.REPERTOIRE_PARTAGE || "/mnt/nfs/titres/";

// Configuration de multer avec des options de sécurité améliorées
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Vérifier si le répertoire existe, sinon le créer
    if (!fs.existsSync(REPERTOIRE_PARTAGE)) {
      fs.mkdirSync(REPERTOIRE_PARTAGE, { recursive: true });
    }
    cb(null, REPERTOIRE_PARTAGE);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier unique avec l'extension d'origine
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Ajouter un filtre pour vérifier les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non pris en charge. Seuls PDF, JPEG et PNG sont acceptés.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite à 10MB
  }
});

// Gestionnaire d'erreurs pour multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Le fichier dépasse la taille maximale autorisée (10MB).' });
    }
    return res.status(400).json({ error: `Erreur lors du téléchargement: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

/**
 * Route pour créer un nouveau titre foncier
 * @route POST /titresFonciers
 */
app.post('/titresFonciers', upload.single('document'), handleMulterError, async (req, res) => {
  console.log("Création de titre");
  try {
    const { proprietaire, description, adresse } = req.body;

    // Validation améliorée
    if (!proprietaire) {
      return res.status(400).json({ error: 'Le propriétaire est requis.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Le document est requis.' });
    }

    const cheminFichier = req.file.path;
    const fileContent = fs.readFileSync(cheminFichier);
    const hash = crypto.createHash('sha256');
    hash.update(fileContent);
    const hashFichier = hash.digest('hex');

    const stats = fs.statSync(cheminFichier);
    const tailleFichier = stats.size;

    const metadata = {
      nom: req.file.originalname,
      type: req.file.mimetype,
      taille: tailleFichier,
      hash: hashFichier,
      description: description || '',
      adresse: adresse || '',
      proprietaire
    };

    // Enregistrer les informations dans la blockchain
    await sauvegarderDansBlockChain(hashFichier, cheminFichier, metadata);

    console.log(`Titre foncier créé: ${hashFichier}`);
    res.status(201).json({
      message: 'Titre foncier créé avec succès',
      id: hashFichier
    });
  } catch (error) {
    console.error('Erreur lors du traitement du fichier:', error);
    res.status(500).json({ error: 'Erreur lors du traitement du fichier.' });
  }
});

/**
 * Route pour récupérer un titre foncier par son ID
 * @route GET /titresFonciers/:id
 */
app.get('/titresFonciers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID du titre foncier requis.' });
    }

    const titreFoncier = await getTitreFoncierBlockchain(id);

    if (titreFoncier.error) {
      console.warn(`Titre foncier non trouvé: ${id}`);
      return res.status(404).json({ error: titreFoncier.error });
    }

    console.log(`Titre foncier récupéré: ${id}`);
    res.status(200).json(titreFoncier);
  } catch (error) {
    console.error('Erreur lors de la récupération du titre foncier:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du titre foncier.' });
  }
});

/**
 * Route pour récupérer tous les titres fonciers
 * @route GET /titresFonciers
 */
app.get('/titresFonciers', async (req, res) => {
  try {
    const titresFonciers = await getAllTitresFonciersBlockchain();
    if(titresFonciers.length ===0) console.log("Aucun titre foncier");
    console.log('Tous les titres fonciers récupérés');
    res.status(200).json(titresFonciers);
  } catch (error) {
    console.error('Erreur lors de la récupération des titres fonciers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des titres fonciers.' });
  }
});

/**
 * Route pour mettre à jour un titre foncier (métadonnées et/ou document)
 * @route PUT /titresFonciers/:id
 */
app.put('/titresFonciers/:id', upload.single('fichier'), handleMulterError, async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID du titre foncier requis.' });
    }
    
    if (!metadata || Object.keys(metadata).length === 0) {
      return res.status(400).json({ error: 'Métadonnées requises pour la mise à jour.' });
    }
    
    // Vérifier d'abord si le titre existe
    const existingTitre = await getTitreFoncierBlockchain(id);
    if (existingTitre.error) {
      return res.status(404).json({ error: 'Titre foncier non trouvé.' });
    }
    
    // Si un nouveau fichier est fourni, traiter le fichier
    if (req.file) {
      const cheminFichier = req.file.path;
      const fileContent = fs.readFileSync(cheminFichier);
      const hash = crypto.createHash('sha256');
      hash.update(fileContent);
      const hashFichier = hash.digest('hex');
      const stats = fs.statSync(cheminFichier);
      const tailleFichier = stats.size;
      
      // Ajouter les informations du fichier aux métadonnées
      metadata.nom = req.file.originalname;
      metadata.type = req.file.mimetype;
      metadata.taille = tailleFichier;
      metadata.hash = hashFichier;
      
      // Optionnellement, sauvegarder le nouveau fichier dans la blockchain
      await sauvegarderDansBlockChain(hashFichier, cheminFichier, metadata);
      console.log(`Nouveau fichier ajouté au titre foncier: ${id}, hash: ${hashFichier}`);
    }
    
    // Mettre à jour les métadonnées dans la blockchain
    const result = await updateTitreFoncierBlockchain(id, metadata);
    console.log(`Titre foncier mis à jour: ${id}`);
    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du titre foncier:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du titre foncier.' });
  }
});

/**
 * Route pour supprimer un titre foncier
 * @route DELETE /titresFonciers/:id
 */
app.delete('/titresFonciers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID du titre foncier requis.' });
    }

    // Vérifier d'abord si le titre existe
    const existingTitre = await getTitreFoncierBlockchain(id);
    if (existingTitre.error) {
      return res.status(404).json({ error: 'Titre foncier non trouvé.' });
    }

    const result = await deleteTitreFoncierBlockchain(id);
    console.log(`Titre foncier supprimé: ${id}`);
    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur lors de la suppression du titre foncier:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du titre foncier.' });
  }
});


/**
 * Route pour transférer un titre foncier à un nouveau propriétaire
 * @route POST /titresFonciers/:id/transfert
 */
app.post('/titresFonciers/:id/transfert', express.json(), async (req, res) => {
  try {
    const { id } = req.params;
    const { nouveauProprietaire, prix } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID du titre foncier requis.' });
    }

    if (!nouveauProprietaire) {
      return res.status(400).json({ error: 'Le nouveau propriétaire est requis.' });
    }

    // Vérifier d'abord si le titre existe
    const existingTitre = await getTitreFoncierBlockchain(id);
    if (existingTitre.error) {
      return res.status(404).json({ error: 'Titre foncier non trouvé.' });
    }

    const result = await transferTitreFoncierBlockchain(id, nouveauProprietaire, prix || "0");
    console.log(`Titre foncier transféré: ${id} à ${nouveauProprietaire}`);
    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur lors du transfert du titre foncier:', error);
    res.status(500).json({ error: 'Erreur lors du transfert du titre foncier.' });
  }
});

/**
 * Route pour vérifier si un titre foncier existe
 * @route GET /titresFonciers/:id/exists
 */
app.get('/titresFonciers/:id/exists', async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        return res.status(400).json({ error: 'ID du titre foncier requis.' });
      }
  
      const exists = await titreFoncierExistsBlockchain(id);
      console.log(`Vérification d'existence du titre foncier: ${id}, Résultat: ${exists}`);
      res.status(200).json({ id, exists });
    } catch (error) {
      console.error('Erreur lors de la vérification d\'existence:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification d\'existence du titre foncier.' });
    }
  });
  
  /**
   * Route pour récupérer tous les titres fonciers d'un propriétaire
   * @route GET /titresFonciers/proprietaire/:proprietaire
   */
  app.get('/titresFonciers/proprietaire/:proprietaire', async (req, res) => {
    try {
      const { proprietaire } = req.params;
  
      if (!proprietaire) {
        return res.status(400).json({ error: 'ID du propriétaire requis.' });
      }
  
      const titresFonciers = await getTitresFonciersByProprietaireBlockchain(proprietaire);
      console.log(`Titres fonciers récupérés pour le propriétaire: ${proprietaire}`);
      res.status(200).json(titresFonciers);
    } catch (error) {
      console.error('Erreur lors de la récupération des titres fonciers par propriétaire:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des titres fonciers.' });
    }
  });
  
  /**
   * Route pour vérifier l'authenticité d'un titre foncier
   * @route GET /titresFonciers/:id/authenticity
   */
  app.get('/titresFonciers/:id/authenticity', async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        return res.status(400).json({ error: 'ID du titre foncier requis.' });
      }
  
      const resultat = await verifierAuthenticiteTitreFoncierBlockchain(id);
      console.log(`Vérification d'authenticité du titre foncier: ${id}, Résultat: ${resultat.estAuthentique}`);
      res.status(200).json(resultat);
    } catch (error) {
      console.error('Erreur lors de la vérification d\'authenticité:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification d\'authenticité du titre foncier.' });
    }
  });
  
  /**
   * Route pour récupérer l'historique des transactions d'un titre foncier
   * @route GET /titresFonciers/:id/history
   */
  app.get('/titresFonciers/:id/history', async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        return res.status(400).json({ error: 'ID du titre foncier requis.' });
      }
  
      // Vérifier d'abord si le titre existe
      const exists = await titreFoncierExistsBlockchain(id);
      if (!exists) {
        return res.status(404).json({ error: 'Titre foncier non trouvé.' });
      }
  
      const historique = await getHistoriqueTitreFoncierBlockchain(id);
      console.log(`Historique du titre foncier récupéré: ${id}`);
      res.status(200).json(historique);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique du titre foncier.' });
    }
  });

  // Simple route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

