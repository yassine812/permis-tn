# Installer Permis TN

## Installation directe depuis Safari ou Chrome — gratuite

1. Ouvrir https://permis-tn.vercel.app/ dans Safari sur iPhone.
2. Toucher **Partager → Sur l’écran d’accueil → Ajouter**. Activer « Ouvrir comme app web » si proposé.
3. Ouvrir l’icône Permis TN et attendre **Prêt à fonctionner hors connexion** avant de couper Internet.

Sur Android, ouvrir le même lien dans Chrome puis **menu → Installer l’application**. Aucun câble, compte Apple Developer ou renouvellement hebdomadaire n’est nécessaire.

Les élèves, heures, examens, calendrier et paiements restent disponibles hors ligne. Cette version n’envoie pas les rappels lorsque l’app est fermée. Sauvegarder régulièrement via **Réglages → Exporter une sauvegarde → Télécharger la sauvegarde .json**. Pour restaurer, choisir le fichier dans **Restaurer une sauvegarde**, puis confirmer l’import. Les données sont locales à l’appareil et ne sont pas publiées sur GitHub.

## Android natif

Le fichier `artifacts/permis-tn-android-arm64.apk` (21,9 Mio) est destiné aux téléphones Android 7 ou plus récents, 64 bits ARM. Sa compilation et sa signature ont été vérifiées. Copiez-le sur le téléphone par câble USB ou un autre moyen de votre choix, ouvrez-le et autorisez l'installation depuis l'application utilisée si Android le demande.

Une fois installé, Permis TN fonctionne sans serveur, sans Expo et sans Metro. Les élèves et les séances sont enregistrés sur le téléphone. Il n'y a pas de compte ni d'abonnement. La première ouverture présente une base vide.

Pour commencer :

1. Ajoutez un élève et renseignez son tarif horaire unique en DT.
2. Ce prix vaut pour le Code, la Conduite et la Manœuvre de cet élève ; il commence au Code.
3. Dans l'accueil, choisissez un jour de la semaine puis touchez une heure disponible. Choisissez l'élève et enregistrez : la séance dure une heure. Choisissez ensuite « Payé » ou « Non payé » pour enregistrer.
4. Après la séance, ouvrez-la et marquez-la effectuée pour l'inclure dans les comptes.
5. Dans la fiche élève, les trois cartes affichent heures effectuées, montants payés et restes à payer. Sélectionnez une carte pour ajouter des heures déjà faites, consulter les montants reçus automatiquement ou saisir d’autres versements ou enregistrer le résultat de l'examen. Réussi fait passer automatiquement à l'étape suivante.
6. Dans **Réglages → Rappels & notifications**, activez les rappels et accordez les autorisations demandées. Vous recevrez le rappel d'agenda à **06:00**, un rappel **15 minutes avant** chaque séance, puis un rappel de paiement à sa fin. Toucher une notification ouvre l'agenda ou la séance concernée. Revenez régulièrement dans l'app pour renouveler la file des prochains rappels, particulièrement sur iPhone.

Avant de changer de téléphone ou de désinstaller l'app, exportez une sauvegarde JSON depuis Réglages et conservez-la ailleurs. Les téléphones ne se synchronisent pas automatiquement. Une sauvegarde de l'aperçu navigateur peut être restaurée sur le téléphone.

Cet APK personnel utilise la clé de développement fournie avec le projet. Conservez la même identité de signature pour les mises à jour. Une distribution publique nécessite une signature de publication propre.

## iPhone

Le dossier `ios/` contient le projet natif. Le fichier `artifacts/PermisTN-unsigned.ipa` (7,4 Mio) pour iOS 15.1 ou plus récent est disponible sur la [page de téléchargement](https://github.com/yassine812/permis-tn/releases/tag/v1.0.0-personal). Depuis Windows, vous pouvez utiliser un **Mac GitHub Actions**, puis installer l'IPA avec AltStore Classic : suivez [IPHONE-GITHUB.md](IPHONE-GITHUB.md). La compilation native Release sur le Mac GitHub et le contenu du paquet ont été vérifiés ; l'installation et les notifications restent à tester sur téléphone. La méthode gratuite exige un renouvellement de signature tous les 7 jours.

Avec un Mac et Xcode, installez les dépendances CocoaPods comme indiqué dans README, ouvrez `ios/PermisTN.xcworkspace`, choisissez votre équipe de signature et compilez en configuration Release. Cette configuration embarque le JavaScript pour fonctionner sans Metro.

L'application elle-même reste gratuite. Les conditions et éventuels frais de distribution Apple sont distincts. Documentation : https://reactnative.dev/docs/set-up-your-environment .
