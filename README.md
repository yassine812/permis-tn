# Permis TN

Application mobile pour les moniteurs d’auto-école en Tunisie. React Native natif, iOS et Android, **sans Expo**.

## Installer sans câble et sans abonnement

Ouvrir **https://yassine812.github.io/permis-tn/** sur le téléphone.
- iPhone : Safari → Partager → Sur l’écran d’accueil → Ajouter (activer « Ouvrir comme app web » si proposé).
- Android : Chrome → menu → Installer l’application.

Attendre **« Prêt à fonctionner hors connexion »** avant de couper Internet. Les élèves, séances, tarifs, examens et paiements fonctionnent ensuite hors ligne. Cette version web ne nécessite pas de renouvellement de signature tous les 7 jours. Les rappels à 06:00 et avant/après les séances ne sont pas disponibles quand elle est fermée.

Les données restent dans IndexedDB sur chaque appareil, sans serveur ni synchronisation. Exporter régulièrement une sauvegarde JSON dans Réglages : effacer les données du navigateur peut les supprimer. Installer d’abord l’app puis y saisir ses données ; si Safari et l’app installée affichent des données différentes, utiliser l’export/import JSON pour les transférer. Les mises à jour se téléchargent en ligne et prennent effet après fermeture de toutes les fenêtres Permis TN ; elles ne rechargent pas un formulaire ouvert.

## Fonctionnement

- L'accueil est un agenda de travail : semaine sélectionnable, séances de la journée et créneaux libres de 08:00 à 18:00. Toucher un créneau préremplit le jour et l'heure d'une séance d'une heure. Le formulaire permet aussi de choisir d'autres horaires. Les créneaux qui chevauchent une séance existante ne sont pas proposés.
- Ajouter un élève (Code par défaut). Un examen réussi fait automatiquement passer à Conduite, puis Manœuvre. Après les trois examens réussis, le profil affiche « Parcours terminé ».
- Ouvrir la fiche de l’élève : les trois cartes **Code / Conduite / Manœuvre** sont regroupées en haut, avec les heures effectuées, le montant payé, le reste à payer et le résultat d’examen. Toucher une carte affiche ses détails et ses actions en dessous, dont le tarif et le total du niveau. Un résumé global suit les détails.
- Chaque niveau a son compteur et un bouton **Ajouter des heures** pour les heures déjà effectuées hors agenda. Les saisies peuvent être corrigées dans l’historique manuel. Durées par quarts d’heure.
- Le bouton **Planifier** de chaque niveau préremplit l’élève et le type de séance. Les séances marquées effectuées sont automatiquement incluses dans les totaux. Ne pas les ressaisir comme heures manuelles.
- **Réglages → Tarifs horaires de l’auto-école** : saisir une seule fois les trois prix horaires, partagés par tous les élèves actuels et futurs. Le même éditeur est accessible depuis une fiche élève. Aucun prix n’est imposé.
- **Paiements par catégorie** : saisir le total réellement reçu pour chaque catégorie. Une avance de Code reste affectée au Code ; elle ne solde pas automatiquement la Conduite. Le résumé présente le total des soldes et les avances séparément.
- Chaque catégorie possède un résultat d’examen modifiable : **Non passé, Réussi, Échoué**. Réussi fait avancer automatiquement la catégorie en cours ; Échoué la conserve. « Corriger le résultat / nouvelle tentative » permet de rectifier une saisie. Corriger un ancien succès en échec ramène à cette catégorie ; les heures et paiements restent inchangés. Au chargement, les succès enregistrés dans l’ancienne interface sont pris en compte.
- Le profil présente un en-tête de progression, trois cartes de synthèse, puis les actions de la catégorie choisie. Le bilan financier se déplie à la demande. Paiements et planification reviennent au profil après enregistrement ; la planification depuis le calendrier revient au calendrier.
- Toucher un jour du calendrier ouvre directement une nouvelle séance avec cette date. Sélectionner l’heure (00–23), les minutes (00 / 15 / 30 / 45), l’élève et la catégorie, puis enregistrer. Chaque nouvelle séance dure automatiquement une heure et est prévue par défaut : aucun champ Durée ou État de la séance dans le formulaire. Une saisie HH:MM reste possible ; les chevauchements sont refusés. Les anciennes durées sont conservées lors d’une modification pour préserver les comptes.
- Modifier un prix recalcule toutes les heures effectuées du niveau, y compris les anciennes. Les paiements saisis restent fixes. Les calculs utilisent des millimes entiers ; l’arrondi se fait au total de chaque niveau.
- Le montant reçu peut être partiel ou supérieur au total : une avance est alors affichée. Un prix manquant affiche « À renseigner » et bloque le calcul complet ; un prix explicitement égal à zéro est accepté.
- Les séances prévues ou annulées ne sont pas facturées. Les heures saisies manuellement ne créent pas de créneau fictif dans l’agenda.
- La gestion des paiements se trouve dans chaque fiche élève, sans onglet global Paiements.
- Recherche, filtres, archivage, français et arabe tunisien, sauvegarde/restauration JSON.

### Conservation des données existantes

Le schéma v4 migre automatiquement les données v2/v3 et conserve les anciennes copies locales. Élèves, étapes, heures et séances sont conservés. Les anciens tarifs individuels restent dans les sauvegardes pour référence ; un tarif commun est repris uniquement si tous les tarifs individuels renseignés concordent pour cette catégorie. Sinon, renseigner le nouveau tarif partagé dans Réglages.

Les anciens montants payés ne sont pas attribués arbitrairement à une catégorie : ils apparaissent comme **Ancien paiement à répartir**. Les répartir dans les trois champs de paiement, puis réduire le montant restant à répartir pour éviter un double comptage. Les anciens indicateurs « Payée » seuls ne permettent pas de connaître un montant et doivent être renseignés. Les sauvegardes v2/v3 restent importables ; les nouvelles sauvegardes utilisent v4.

## Données et gratuité

### Notifications locales

Dans **Réglages → Rappels & notifications → Activer les rappels**, autorisez les notifications du téléphone. Android demande aussi l'accès « Alarmes et rappels » pour la programmation à l'heure. Les trois rappels peuvent être désactivés séparément :

- Chaque matin à **06:00** : ouvrir l'agenda du jour, même lorsqu'aucune séance n'est prévue.
- **15 minutes avant** une séance prévue : nom de l'élève, catégorie et heure.
- **À la fin prévue** de la séance : vérifier si elle est payée ou non payée. La notification ouvre la séance ; elle ne confirme pas automatiquement sa réalisation.

Les heures de séance utilisent le fuseau de Tunisie. Les notifications utilisent Notifee, sans serveur, Firebase ni abonnement. Elles sont recalculées après modification des données et au retour dans l'app. Annuler une séance ou archiver son élève supprime ses rappels ; vérifier le paiement supprime son rappel de fin. Le statut Payée / Non payée sert au suivi de la séance ; les montants restent saisis dans la fiche élève, sans ajout automatique qui pourrait compter deux fois un paiement existant.

La file réserve une place au rappel quotidien et programme les **49 prochains rappels de séances** (avant/après), afin de respecter la limite de notifications en attente. Android renouvelle aussi la file lors de la réception d'un rappel. Sur iPhone, il faut rouvrir l'app pour renouveler les rappels éloignés ; si la file est pleine, Réglages affiche jusqu'à quand les rappels sont programmés. Les options système (notifications refusées, mode Concentration, arrêt forcé, restrictions constructeur ou téléphone éteint) peuvent empêcher ou retarder leur affichage. Le navigateur est un aperçu : il n'envoie pas ces notifications natives.

Le code et la programmation sont testés ; la réception réelle, le redémarrage du téléphone et les actions depuis l'écran verrouillé doivent encore être vérifiés sur des appareils Android/iPhone. Références : [déclencheurs Notifee](https://notifee.app/react-native/docs/triggers/), [événements](https://notifee.app/react-native/docs/events/).

Pas de compte, serveur, abonnement, publicité ni service payant. Les données sont enregistrées sur l’appareil avec AsyncStorage 3 (stockage natif local). L’application ne synchronise pas les téléphones. Les sauvegardes système iOS restent soumises aux réglages du téléphone ; la sauvegarde automatique Android est désactivée.

Un premier lancement ne contient aucune donnée de démonstration. Les tests de l’aperçu utilisent une base navigateur séparée des appareils mobiles. Exportez une sauvegarde avant de désinstaller ou changer de téléphone.

Le code est sous licence MIT. L’utilisation de l’app est gratuite. La distribution par les boutiques dépend de leurs conditions : publier sur l’App Store nécessite généralement l’adhésion payante Apple Developer. Le test personnel depuis Xcode est possible avec un compte Apple gratuit, avec les limites de signature Apple. Voir https://developer.apple.com/help/account/basics/about-your-developer-account/ . Android peut être installé directement par APK, sans boutique.

## Démarrage

Node.js >= 22.11.0. Depuis ce dossier :

```sh
npm ci
npm start
```

Dans un deuxième terminal, avec Android Studio/SDK et un appareil ou émulateur configuré :

```sh
npm run android
```

Le build de développement utilise Metro. Pour un APK personnel qui fonctionne réellement sans Metro et sans internet :

```powershell
cd android
.\gradlew.bat assembleOffline
```

Sur macOS/Linux : `cd android && ./gradlew assembleOffline`.

Sur ce poste Windows, les outils sont installés dans `%USERPROFILE%\ptn-tools` : JDK 21, SDK Android, NDK et Gradle. Depuis le dossier du projet, `powershell -File scripts/build-android.ps1` reconstruit un APK ARM64 et le copie dans `artifacts/`. Le script configure l'environnement pour son processus uniquement. Il utilise IPv4 pour éviter les transferts Java interrompus observés sur ce poste.

Résultat : `android/app/build/outputs/apk/offline/app-offline.apk`. Ce build embarque le JavaScript, utilise la clé de développement pour faciliter le test personnel et retire la permission INTERNET. Une publication doit utiliser une identité de signature propre ; le build `release` est volontairement non signé. Les versions SDK/NDK sont fixées dans `android/build.gradle` (SDK 37, Build Tools 37.0.0, NDK 27.1.12297006).

Pour iOS depuis Windows, un workflow manuel **Build iPhone IPA** utilise un Mac GitHub Actions et prépare un IPA non signé pour AltStore Classic. Le propriétaire a choisi un dépôt **public**, dont les sources sont visibles par tous. Les Macs standard sont gratuits pour les dépôts publics ; un dépôt privé utilise le quota du compte. Voir [IPHONE-GITHUB.md](IPHONE-GITHUB.md) pour l'envoi des sources, le quota gratuit et le renouvellement de signature tous les 7 jours. La [compilation native Release](https://github.com/yassine812/permis-tn/actions/runs/38735271202) a réussi sur macOS le 15 octobre 2026. [Télécharger l'IPA iPhone et l'APK Android](https://github.com/yassine812/permis-tn/releases/tag/v1.0.0-personal).

Pour compiler directement sur un **Mac avec Xcode**, Ruby/Bundler et CocoaPods :

```sh
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

Ouvrir `ios/PermisTN.xcworkspace`, choisir son équipe de signature pour un iPhone physique. Utiliser la configuration **Release** pour un fonctionnement autonome sans Metro. La connexion internet est nécessaire pour installer les outils et dépendances, pas pour utiliser l’app installée.

## Aperçu de l’interface sur ordinateur

```sh
npm run preview
```

Ouvrir http://127.0.0.1:5189/ pour le développement. Pour vérifier la PWA, exécuter `npm run web:build`, puis `npm run web:serve` et ouvrir http://127.0.0.1:5190/. Le build produit `preview-dist/` avec manifeste, icônes et service worker. `.github/workflows/web.yml` publie ce dossier sur GitHub Pages. Aucun fichier d’élève n’est publié. Le service worker précharge uniquement les fichiers statiques du build et conserve les autres caches du domaine.

## Vérification

```sh
npm run typecheck
npm test -- --runInBand --testTimeout=15000
npm run lint -- --quiet
npm run web:build
node --test web/offline.test.mjs
npm run bundle:android -- --max-workers 2
npm run bundle:ios -- --max-workers 2
```

Les 48 tests couvrent le parcours, les numéros tunisiens, le calendrier, les conflits, les heures par niveau, les prix, les soldes et les migrations, les sauvegardes, les erreurs de stockage et les rappels (horaires tunisiens, annulations, autorisations, limite de file et ouverture de la bonne séance). Les bundles JavaScript des deux plateformes peuvent être vérifiés sur Windows ; cela ne compile pas à lui seul les applications natives.

Le SDK Android et le JDK sont installés sur ce poste Windows ; `scripts/build-android.ps1` produit le paquet personnel ARM64. L'IPA iOS 15.1+ ARM64 a été compilé sur le Mac GitHub ; son contenu et son bundle hors ligne ont été vérifiés. Aucun essai sur téléphone physique n'a encore été effectué. L'IPA doit être signé lors de son installation avec AltStore Classic. Tester l’installation, le redémarrage en mode avion, les notifications écran verrouillé, le clavier, les sauvegardes et le rendu arabe sur téléphone avant distribution.

**APK construit et vérifié :** `artifacts/permis-tn-android-arm64.apk` (21,9 Mio), Android 7+ / ARM64. La compilation `assembleOffline` et les vérifications release passent. La signature APK v2 est valide, le bundle et le module natif de notifications sont embarqués, et la permission INTERNET est absente. Voir `INSTALLER.md` pour l'installation. Ces vérifications ne remplacent pas un essai de réception sur téléphone.

La vérification Android AGP 9.2 signale à tort `MainActivity must extend android.app.Activity`. Le bytecode compilé a été contrôlé avec `javap` : constructeur public sans argument et chaîne `MainActivity → ReactActivity → AppCompatActivity → FragmentActivity → ComponentActivity → android.app.Activity`. Seul ce diagnostic est ignoré sur l'entrée MainActivity du manifeste ; les autres vérifications release restent actives. Le relevé local est dans `artifacts/activity-inheritance.txt`.

`npm audit` signale actuellement deux familles d’avis dans l’outillage transitif (`braces` et `sprintf-js`), propagées dans les résultats. Aucun correctif compatible n’était publié dans les versions vérifiées. Ne pas appliquer `npm audit fix --force`, qui propose de rétrograder React Native. Ces outils ne traitent pas les saisies des élèves dans l’application native. Recontrôler les mises à jour avant distribution.

## Structure

- `src/domain.ts` : règles métier et validation des sauvegardes.
- `src/storage.ts` : lecture/écriture locale, schéma v4 avec migration v2/v3.
- `src/Application.tsx` : écrans et navigation.
- `src/planner.tsx` : agenda hebdomadaire et créneaux libres.
- `src/profile.tsx` : progression et cartes de catégories.
- `src/forms.tsx` : formulaires.
- `src/i18n.ts` : français et tunisien.
- `android/`, `ios/` : vrais projets natifs et icônes.
- `__tests__/` : tests métier, persistance et rendu initial.

Vérification PWA : cache hors ligne testé (5 tests), rechargement réel dans le navigateur après arrêt du serveur, persistance d’un élève de test et téléchargement de sa sauvegarde JSON. Installation depuis Safari sur iPhone physique encore à vérifier.
