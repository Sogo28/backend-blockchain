// enrollAdmin.js
const { Wallets } = require('fabric-network');
const path = require('path');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');

async function main() {
    try {
        // Charger le profil de connexion
        const ccpPath = path.resolve(__dirname, 'connection-profile.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Créer une instance du CA
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const ca = new FabricCAServices(caInfo.url);

        // Définir le chemin du répertoire du wallet
        const walletPath = path.join(__dirname, 'wallet');

        // Créer un wallet basé sur le système de fichiers
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet créé à l'emplacement : ${walletPath}`);

        // Vérifier si l'identité d'administrateur existe déjà dans le wallet
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('L\'identité d\'administrateur existe déjà dans le wallet.');
            return;
        }

        // Enrôler l'administrateur
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // Ajouter l'identité d'administrateur au wallet
        await wallet.put('admin', x509Identity);
        console.log('Identité d\'administrateur ajoutée au wallet avec succès.');

    } catch (error) {
        console.error(`Erreur lors de l'enrôlement de l'administrateur : ${error}`);
        process.exit(1);
    }
}

main();
