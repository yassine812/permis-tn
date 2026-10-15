# Construire l'app iPhone depuis Windows

État : workflow préparé et syntaxe vérifiée sous Windows. La compilation native sur le Mac GitHub et l'installation sur iPhone restent à vérifier. Aucun IPA n'est encore fourni.

## 1. Créer le dépôt

Connectez-vous à votre compte sur https://github.com/login (pas à la page d'inscription).
Ouvrez https://github.com/new, nommez le dépôt `permis-tn` et choisissez sa visibilité. Le propriétaire de ce projet a choisi **Public** : les sources sont visibles par tous. **Private** convient également, avec un quota de compilation limité.
Ne cochez pas l'ajout d'un README, d'une licence ou d'un gitignore ; ils sont fournis.
Cliquez sur **Create repository**. La visibilité ne donne pas aux visiteurs le droit de modifier le dépôt.

## 2. Ajouter les fichiers

Extrayez `artifacts/permis-tn-source.zip` sur votre PC. Ouvrez le dossier `permis-tn` extrait.
Dans le dépôt vide, choisissez **uploading an existing file**. Déposez tous les fichiers et dossiers situés **à l'intérieur** du dossier extrait, y compris `.github` et les fichiers commençant par un point. Activez l'affichage des éléments masqués dans l'Explorateur si nécessaire.

N'envoyez pas le ZIP lui-même : GitHub ne le décompresse pas. `package.json`, `ios`, `scripts` et `.github` doivent apparaître directement à la racine du dépôt, sans dossier `permis-tn` intermédiaire. Cliquez sur **Commit changes**. Seul ce paquet source est à envoyer, pas le dossier parent `job startup`.

## 3. Lancer le Mac de compilation

Les compilations sur les Macs standard sont gratuites pour les dépôts publics. Pour un dépôt privé, avant le premier lancement, vérifiez votre quota dans **Settings → Billing and licensing** de votre compte GitHub. Les dépôts privés utilisent le quota gratuit partagé du compte. Si vous avez un moyen de paiement enregistré, configurez un budget Actions avec arrêt de l'utilisation à la limite ; ne lancez pas le build si vous ne pouvez pas confirmer qu'il reste couvert par le quota. Sans moyen de paiement, GitHub indique que l'usage est bloqué à l'épuisement du quota.

Dans le dépôt : **Actions → Build iPhone IPA → Run workflow → Run workflow**. Si GitHub propose d'activer Actions, activez-le pour ce dépôt. Le workflow utilise un Mac standard, ne se lance que manuellement, a une limite de 60 minutes et conserve les fichiers pendant un jour. Il ne demande ni mot de passe Apple ni certificat de signature.

Attendez le résultat. S'il est rouge, ouvrez l'étape en échec et conservez son message pour corriger le problème avant de relancer. Un workflow préparé ne garantit pas encore que la compilation réussira.

## 4. Télécharger puis installer

Si le build est vert, ouvrez l'exécution puis **Artifacts → PermisTN-iPhone**. Téléchargez et extrayez le ZIP : il contient `PermisTN-unsigned.ipa` et sa somme SHA-256.

Installez AltServer sur Windows et AltStore Classic sur votre iPhone en suivant le guide officiel ci-dessous (iTunes/iCloud, connexion USB, confiance, mode développeur). Utilisez votre compte Apple directement dans AltServer/AltStore, jamais dans le chat ou dans les secrets GitHub. Importez ensuite l'IPA dans AltStore Classic.

L'IPA est destiné à être signé par AltStore lors de l'installation : le télécharger dans Safari seul ne l'installe pas. Cette méthode gratuite nécessite de renouveler la signature au moins tous les **7 jours** avec AltServer accessible. L'app fonctionne hors ligne entre ces renouvellements. Sauvegardez les données depuis Réglages avant toute désinstallation. Testez ensuite les notifications et le fonctionnement en mode avion sur votre iPhone.

Sources officielles :
- [Macs GitHub](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Quota et facturation Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Installer AltStore depuis Windows](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)
- [IPA et compte Apple gratuit](https://faq.altstore.io/developers/distribute-with-altstore-classic)
- [Renouvellement tous les 7 jours](https://faq.altstore.io/altstore-classic/your-altstore)
