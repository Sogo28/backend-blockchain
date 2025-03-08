// registerUser.js
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
        console.log(`Wallet chargé à partir de : ${walletPath}`);

        // Vérifier si l'identité de l'utilisateur existe déjà dans le wallet
        const userIdentity = await wallet.get('appUser');
        if (userIdentity) {
            console.log('L\'identité "appUser" existe déjà dans le wallet.');
            return;
        }

        // Vérifier si l'identité d'administrateur existe dans le wallet
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('L\'identité d\'administrateur est requise pour enregistrer un utilisateur.');
            return;
        }

        // Créer un fournisseur d'identités pour l'administrateur
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Enregistrer et enrôler le nouvel utilisateur
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
        }, adminUser);
        const enrollment = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // Ajouter l'identité de l'utilisateur au wallet
        await wallet.put('appUser', x509Identity);
        console.log('Identité "appUser" ajoutée au wallet avec succès.');

    } catch (error) {
        console.error(`Erreur lors de l'enregistrement de l'utilisateur : ${error}`);
        process.exit(1);
    }
}

main();
