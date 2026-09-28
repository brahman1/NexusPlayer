# Reprise immédiate du développement

## Chantier catalogue, reprise et comptes — 28 septembre 2026

- Implémenté : noms d'affichage et clés de tri distincts des valeurs fournisseur
  pour les films, séries et épisodes. La migration SQLite v8 recalcule les
  catalogues existants ; imports, synchronisation, recherche, favoris et reprise
  utilisent maintenant les libellés nettoyés sans casser les identifiants Xtream.
- Implémenté : suppression des préfixes pays/qualité/VIP/VOD et des suffixes de
  format courants, avec conservation intégrale du nom brut en base.
- Implémenté : préchargement depuis la fiche du média et cache mémoire court des
  URL Xtream résolues. Le lecteur natif utilise une tolérance de seek plus large
  et un tampon initial réduit pour privilégier la reprise rapide.
- Implémenté : instrumentation anonyme des étapes `media-ready`, `url-ready`,
  `engine-ready` et `first-progress`. En développement, le journal
  `[NexusPlayer playback]` permet de distinguer le coût SQLite, la résolution et
  le démarrage réel sans révéler de titre, d'identifiant ni d'URL.
- Préparé : identité d'installation stockée dans SecureStore, session de compte,
  contrat API d'appareils et de droits d'abonnement, sans adresse MAC. Architecture
  détaillée dans `docs/ACCOUNT_SUBSCRIPTION_ARCHITECTURE.md`.
- Reste nécessaire pour activer les abonnements : projet Supabase, produits et
  clés publiques RevenueCat, URL de l'API et webhooks serveur. Les secrets privés
  ne doivent jamais entrer dans l'application.
- Validation automatique : TypeScript et ESLint réussis, 29 suites / 92 tests.
- Validation physique suivante : relever les mesures de reprise d'un MP4 et d'un
  MKV sur iPhone ; si `url-ready` est rapide mais `first-progress` reste lent, le
  goulot se situe dans le serveur/conteneur/lecteur et non dans SQLite.

## Identité visuelle NexusPlayer — 28 septembre 2026

- Logo final : monogramme NexusPlayer original combinant un N et le symbole de
  lecture, palette indigo/violet Obsidian sur fond `#070A0F`.
- Livré : icône iOS opaque 1024 px, icône Android classique et adaptative,
  variante monochrome Android 13, favicon et splash screen.
- Livré : icône et bannière Android TV, ainsi que les sept formats Apple TV
  exigés par `@react-native-tvos/config-tv` (icônes et Top Shelf).
- Les sources maîtres sont dans `assets/brand`. Les exports sont reproductibles
  avec `scripts/generate-brand-assets.ps1` et contrôlés par
  `scripts/validate-brand-assets.ps1`.
- Validation : 13 dimensions/formats contrôlés, configuration Expo mobile/TV
  résolue, Expo Doctor 21/21, TypeScript, ESLint et 29 suites / 92 tests réussis.

## Dernier correctif — Live, catalogue complet et seek (28 septembre 2026)

- L'indicateur Live tient compte des timestamps qui avancent ; un événement VLC
  de buffering isolé ne recouvre plus une lecture en cours. Options VLC stables.
- Films/Séries : ancienne limite de 2 000 titres supprimée de l'écran. Recherche
  SQL sur toute la base importée, décompte réel, pagination de 48, « Tout voir »
  pour toutes les catégories, favoris et titres récents. Les rayons sont virtualisés.
- Métadonnées du catalogue mises en cache jusqu'au changement de source ; favoris
  et reprise rafraîchis au retour sans effacer le catalogue visible.
- « Films les plus récents » trie l'année de sortie disponible ; « Derniers titres
  importés » suit l'ordre local. Ce ne sont pas des sorties vérifiées via un service
  externe et aucun classement de popularité Netflix n'est inventé.
- Seek VLC : pressions rapides regroupées (150 ms), pas de relance `play()` à chaque
  seek, sauvegarde limitée à la position confirmée, rejet des anciens timestamps.
  Une bascule de moteur conserve la dernière position lue.
- Vérification reproductible du catalogue : `node scripts/verify-catalog.cjs`
  (Node 22.13+) utilise SQLite en mémoire, 2 505 films, 2 505 séries et 17 catégories
  par type. Ne touche pas aux données utilisateur.
- Validation de ce lot : 27 suites / 86 tests, TypeScript, ESLint et exports JS
  iOS (`dist-ios-catalog-playback-fix`) / Android TV
  (`dist-tv-catalog-playback-fix`) réussis. Ces exports ne remplacent pas une
  compilation native ni une mesure des flux sur appareil réel.
- Prochaine validation : sur iPhone réel, mesurer démarrage, reprise à 20 min et
  seek ±10 min pour un MP4 puis un MKV autorisé. Relever le délai jusqu'à une image
  qui avance. Les objectifs < 2–3 s ne sont pas encore mesurés ni garantis.
- Si le délai reste long : instrumenter l'accès HTTP/Range et le décodeur sur le
  Mac/iPhone. Les anciens HTTP 460 ne prouvaient pas une cause codec ni une limite
  de connexions ; ne pas présenter ces hypothèses comme diagnostic confirmé.

Ce fichier est le point d'entrée obligatoire quand l'utilisateur dit simplement
« continue les développements ». Ne pas refaire une analyse générale : commencer
directement par la prochaine tâche ci-dessous, puis avancer dans l'ordre indiqué.

## État validé

- Expo SDK 57, TypeScript strict, Expo Router et React Native TV.
- Android TV API 36 configuré dans `NexusPlayer_TV_API_36`.
- Import M3U distant et local fonctionnel sur une vraie playlist de 10 910 chaînes.
- Ajout, renommage, actualisation et suppression des playlists avec confirmation.
- Détection des sources identiques et rapport différentiel de synchronisation.
- Une actualisation en échec conserve la dernière version valide.
- Catalogue virtualisé, recherche, catégories, favoris, récents, logos avec fallback
  et restauration du dernier focus fonctionnels sur l'émulateur TV. Les chaînes
  sont chargées par pages de 250 ; le chargement de 1 000 éléments successifs a
  été validé sur un catalogue réel de 10 916 chaînes.
- Première lecture HLS fonctionnelle sur l'émulateur TV.
- Cache HTTP conditionnel ETag/Last-Modified avec migration SQLite v3.
- Lecteur enrichi validé sur flux réel Android TV : rendu HLS, chargement, diagnostic
  d'erreur et relance. Les commandes TV dédiées sont en place ; le zapping D-pad
  reste à confirmer sur appareil après neutralisation des contrôles natifs du lecteur.
- EPG XMLTV/XMLTV gzip : fuseaux horaires, cache SQLite, expiration, association
  `tvg-id` avec repli par nom et mini-guide maintenant/suivant dans le lecteur.
- Xtream Codes : validation de connexion, secrets dans SecureStore, import des
  catégories Live/VOD/séries et reconstruction des URL de lecture uniquement en mémoire.
- Parser validé sur une playlist synthétique de 50 000 chaînes.
- SQLite corrigé pour les imports massifs : utiliser la connexion persistante avec
  `withTransactionAsync`, pas `withExclusiveTransactionAsync`.
- Fondation IHM Obsidian livrée : jetons adaptatifs, `NexusScreen`, navigation
  latérale TV, navigation basse mobile, primitives d'action, filtres, bannières,
  squelettes, états vides, rails, cartes chaîne et affiches.
- Nouveaux parcours connectés aux données locales : Accueil, entrée Live, Guide
  Maintenant, Films, Séries, recherche universelle, Ma liste, Sources et Réglages.
- Dernière validation : 12 suites / 34 tests, TypeScript, ESLint et bundle
  Android TV `dist-tv-obsidian` réussis.

## Prochaine étape prioritaire — architecture fonctionnelle et IHM Obsidian

Ne pas reprendre les chantiers backend avant d'avoir terminé ce lot. La prochaine
reprise doit commencer directement par la construction du système d'interface
décrit dans `docs/UI_UX_BLUEPRINT.md`, sans refaire d'analyse graphique générale.
La palette Obsidian est la direction officielle ; Aurora et Pulse restent seulement
des références de contraste.

### Lot IHM et architecture fonctionnelle terminé

- Live possède une vue adaptative avec catalogue, panneau d'aperçu et EPG au focus.
- Le lecteur possède la barre compacte, le mini-guide, les options de lecture et
  le diagnostic masqué, tout en conservant le zapping haut/bas prioritaire.
- Sources utilise un menu de gestion unique pour renommer, actualiser,
  diagnostiquer et supprimer.
- Films et Séries ouvrent des fiches détaillées et affichent les saisons/épisodes
  lorsque le fournisseur les a enregistrés.
- La recherche ouvre les chaînes et les fiches média correspondantes.
- Les préférences de contraste, animations, taille de texte et sous-titres sont
  persistées localement.
- Validation finale : ESLint et TypeScript réussis, 12 suites / 34 tests réussis,
  bundle Android TV `dist-tv-obsidian-final` généré.

### Nouveau point de reprise exact

Terminé pour la VOD : progression persistante des films et épisodes, reprise
automatique, rail « Continuer à regarder », reprise d'une série sur son épisode
interrompu et passage automatique à l'épisode suivant avec compte à rebours
annulable. Validation : ESLint, TypeScript, 13 suites / 39 tests et bundle Android
TV `dist-tv-resume` réussis.

Ne pas reprendre les fonctions VOD déjà terminées. Continuer directement dans
l'ordre suivant :

### Avancement lecteur Live — 27 septembre 2026

- Implémenté : mémorisation de la dernière chaîne lue, reconnexion automatique
  annulable (1, 2, 4 puis 8 secondes), arrêt des tentatives sur les erreurs
  permanentes et conservation du catalogue pendant les pannes.
- Implémenté : résolution et préchargement en mémoire des chaînes précédente et
  suivante, réutilisation immédiate de la chaîne déjà résolue au zapping et aucun
  affichage ni journalisation des URL sensibles.
- Implémenté : pistes audio, sous-titres activables/désactivables, variantes HLS
  disponibles, format Ajuster/Remplir/Étirer persistant, diagnostic sans URL,
  plein écran et Picture-in-Picture lorsque la plateforme le permet.
- Validé automatiquement : politique de reconnexion, TypeScript et ESLint.
- À confirmer sur appareils physiques dans le lot 7 : absence de flash noir au
  zapping, commandes D-pad, comportement PiP/plein écran et reprise après mise en
  arrière-plan sur Android, iOS, Android TV et tvOS.

Le prochain chantier implémentable est désormais le point 4, **Compléter le
Guide EPG**. Les validations physiques restantes des points 1 à 3 sont regroupées
au point 7 et ne doivent pas bloquer le développement du Guide.

### Reste à faire — ordre de reprise obligatoire

Quand l'utilisateur demande de continuer, reprendre directement cette liste sans
réanalyser les travaux déjà terminés :

1. **Guide EPG complet**
   - construire la grille horaire avec ligne temporelle du direct ;
   - ajouter la navigation par jour et par créneau ;
   - ajouter la fiche détaillée d'un programme ;
   - garantir les performances au toucher et au D-pad sur les grands guides.
2. **Synchronisation Xtream complète**
   - actualiser une source Xtream existante ;
   - synchroniser les ajouts, modifications et suppressions des catégories,
     chaînes, films, séries et épisodes ;
   - préserver les favoris et progressions ;
   - conserver le dernier catalogue valide en cas d'échec ;
   - produire un rapport sans identifiants ni URL sensibles.
3. **Catalogue et imports volumineux — terminé automatiquement**
   - restaurer précisément le défilement et le focus ;
   - rendre le téléchargement M3U réellement progressif ;
   - corriger l'avertissement Expo Doctor causé par le `node_modules` parent.
4. **Validation physique multiplateforme**
   - tester iPhone, iPad, Android TV physique et Apple TV ;
   - vérifier Live, HLS adaptatif, MP4, HEVC compatible, films, séries, audio,
     sous-titres, reprise, épisode suivant, zapping, PiP et plein écran ;
   - vérifier l'arrière-plan, le verrouillage et le changement d'application ;
   - effectuer dix minutes de navigation D-pad sans perte de focus ;
   - confirmer l'absence de flash noir pendant le zapping.
5. **Bêta iPhone avec TestFlight**
   - générer et tester l'archive iOS sur Mac ;
   - envoyer le build dans App Store Connect ;
   - créer le groupe TestFlight, inviter le premier testeur et traiter ses retours.
6. **Livraison finale**
   - terminer l'accessibilité et les scénarios de panne ;
   - générer les builds Android, Android TV, iOS et tvOS ;
   - préparer la politique de confidentialité, les captures, descriptions et
     informations demandées par les stores.

Les quatre premiers points sont les prochains chantiers de développement. Les
points 5 et 6 nécessitent les comptes, appareils et validations de distribution
du propriétaire de l'application.

### Avancement Guide EPG — 27 septembre 2026

- Implémenté : vue Maintenant avec progression du programme en cours.
- Implémenté : grille virtualisée par chaîne sur une fenêtre de quatre heures,
  créneaux de trente minutes et ligne temporelle du direct.
- Implémenté : navigation par jour, retour à aujourd'hui et déplacement de deux
  heures vers l'avant ou l'arrière.
- Implémenté : fiche programme avec horaire, description, chaîne et action de
  lecture, entièrement accessible au toucher et au D-pad.
- Validé automatiquement : calculs de créneaux, troncature des programmes aux
  limites de la grille, détection du direct, TypeScript et ESLint.
- À confirmer au point 4 de la liste de reprise : fluidité et restauration du
  focus avec un guide XMLTV réel très volumineux sur appareils physiques.

Le prochain chantier implémentable est désormais le point 2 de la liste de
reprise, **Synchronisation Xtream complète**.

### Avancement synchronisation Xtream — 27 septembre 2026

- Implémenté : bouton Actualiser actif pour les sources Xtream existantes et
  récupération des identifiants exclusivement depuis SecureStore.
- Implémenté : upsert transactionnel des catégories, chaînes, films et séries,
  avec détection des ajouts, modifications, suppressions et éléments inchangés.
- Implémenté : resynchronisation des épisodes des séries déjà consultées ; les
  séries jamais ouvertes continuent à charger leurs épisodes à la demande afin
  d'éviter des milliers de requêtes et le blocage du fournisseur.
- Préservé : favoris, dernières chaînes regardées et progressions grâce aux
  identifiants stables des chaînes, films, séries et épisodes.
- Sécurisé : préparation complète avant mutation, rollback SQLite en cas d'erreur,
  conservation du dernier catalogue valide et rapport agrégé sans URL ni
  identifiants.
- Validé automatiquement : calcul des rapports Xtream, TypeScript et ESLint.
- À confirmer sur source réelle : suppressions et modifications massives ainsi
  que le comportement d'un fournisseur qui coupe la connexion pendant la synchro.

### Avancement catalogue et imports volumineux — 27 septembre 2026

- Implémenté : restauration directe de la page contenant la dernière chaîne,
  repositionnement précis du défilement et restitution du focus mémorisé.
- Implémenté : pagination bidirectionnelle par blocs de 250 chaînes sans charger
  tout le catalogue en mémoire.
- Implémenté : téléchargement M3U par flux avec décodage UTF-8 progressif, limite
  de 25 Mio et annulation immédiate si la taille maximale est dépassée.
- Isolé : la résolution Metro est alignée sur l'autolinking avec l'option
  officielle `autolinkingModuleResolution`. Expo Doctor continue toutefois à
  signaler le React d'un projet web externe lorsqu'il inspecte les dossiers
  ancêtres ; les dépendances de NexusPlayer sont conformes et n'ont pas été
  modifiées pour masquer ce diagnostic environnemental.
- Validé automatiquement : découpage UTF-8 entre deux blocs, limite de taille,
  parser M3U, TypeScript, ESLint, 20 suites / 62 tests et bundle Android TV
  `dist-tv-large-catalog`. Expo Doctor valide 20 contrôles sur 21 ; son seul
  diagnostic restant est le React 19.2.4 de l'autre projet situé dans le dossier
  parent, tandis que NexusPlayer utilise la version 19.2.3 attendue par Expo 57.

### Corrections lecteur VOD mobile — 27 septembre 2026

- Implémenté : curseur natif tactile permettant d'avancer ou reculer précisément,
  en complément des boutons de saut rapide.
- Implémenté : commandes Lire/Pause, Stop, plein écran avec verrouillage paysage
  et sortie explicite du plein écran.
- Implémenté : démarrage manuel du Picture-in-Picture et tentative automatique
  lors du passage de l'application en arrière-plan.
- Implémenté : détection et sélection réelles des pistes VLC audio et sous-titres,
  avec désactivation explicite des sous-titres.
- Corrigé : l'en-tête affiche maintenant le nom du film ou celui de la série avec
  la saison et l'épisode, au lieu du chemin technique Expo Router.
- Validé automatiquement : TypeScript, ESLint, 20 suites / 62 tests, bundle iOS
  `dist-ios-vod-controls` et bundle Android TV `dist-tv-vod-controls`.
- À confirmer sur le nouvel exécutable iPhone : démarrage automatique du PiP,
  rotation plein écran et sélection des pistes sur plusieurs conteneurs vidéo.

### Organisation du catalogue Live — 27 septembre 2026

- Corrigé : le Live n'affiche plus les catégories films/séries Xtream ni les
  catégories ne contenant aucune chaîne.
- Implémenté : conservation du nom fournisseur brut pour l'EPG et ajout séparé
  d'un nom d'affichage nettoyé pour ne pas casser les associations techniques.
- Implémenté : retrait des préfixes décoratifs et techniques courants, espaces et
  séparateurs incohérents, avec noms de pays explicites dans les catégories.
- Implémenté : tri naturel des chaînes (`France 2` avant `France 10`) et ordre
  fonctionnel des catégories : généralistes, information, sport, cinéma,
  jeunesse, documentaires, musique, locales puis autres.
- Implémenté : regroupement des catégories ayant le même nom nettoyé et affichage
  de la catégorie lisible sous chaque chaîne.
- La migration SQLite v6 recalcule automatiquement ces noms et tris pour les
  sources déjà présentes, sans demander une nouvelle importation.
- Validé : normalisation, ordre naturel, migration, import M3U, synchronisation
  Xtream, TypeScript, ESLint, 21 suites / 66 tests, bundle iOS
  `dist-ios-live-order` et bundle Android TV `dist-tv-live-order`.

Le prochain chantier est désormais le point 4 de la liste de reprise,
**Validation physique multiplateforme**. Il nécessite les appareils du
propriétaire ; commencer par reconstruire l'application iPhone, puis valider ce
lecteur avant l'envoi TestFlight. Continuer ensuite sur Android TV physique et
Apple TV.

### Finition Obsidian et audit adaptatif — 27 septembre 2026

- Ajouté : fond dégradé Obsidian partagé sur tous les écrans, hero Accueil plus
  profond et actions principales avec dégradé violet/indigo cohérent.
- Corrigé : zones sûres de la barre mobile, marges compactes, boutons longs,
  retours à la ligne, panneaux VOD, liste d'épisodes, Guide, Recherche et Sources.
- Corrigé : largeur des cartes Films/Séries sur TV en tenant compte de la barre
  latérale, ainsi que la largeur des cartes Live sur petits téléphones et TV.
- Validé automatiquement : TypeScript, ESLint, 21 suites / 66 tests, bundles
  Android mobile, iOS mobile, Android TV et tvOS.
- À confirmer pendant la validation physique : rendu avec taille de texte iOS et
  Android agrandie, zones de surbalayage TV, focus aux quatre bords et orientations
  portrait/paysage sur les appareils réels ciblés.

### Correctifs lecteur VOD iPhone — 28 septembre 2026

- Corrigé : après déplacement du curseur, le lecteur relance explicitement la
  lecture à la position choisie au lieu de rester bloqué en chargement.
- Corrigé : l'indicateur de chargement est temporisé et disparaît dès que VLC
  signale une progression ou reprend effectivement la lecture.
- Refait : commandes principales toujours visibles sur une rangée et options
  Audio, Sous-titres, PiP et plein écran sur une grille adaptative sans bouton
  tronqué ; ce composant partagé couvre les films et les épisodes.
- Corrigé : en portrait, le lecteur commence directement sous l'en-tête au lieu
  d'être centré trop bas dans la page.
- Validé automatiquement : TypeScript, ESLint, 21 suites / 66 tests, bundle iOS
  mobile et bundle Android TV.
- À confirmer sur l'iPhone réel : seek court et seek de plus d'une heure sur un
  film et un épisode provenant du fournisseur utilisé pour le test.

### Deuxième passe lecteur VOD iPhone — 28 septembre 2026

- Optimisé : seek VLC par position relative, option de recherche rapide et cache
  VOD ramené à une seconde pour réduire l'attente après un déplacement.
- Corrigé : en plein écran, les commandes disparaissent automatiquement après
  3,5 secondes ; toucher l'image les affiche ou les masque sans quitter la vidéo.
- Corrigé : nettoyage des pistes audio/sous-titres dupliquées, réapplication de la
  piste choisie et confirmation visible du choix.
- Clarifié : si le fournisseur n'intègre aucune piste dans la vidéo, le panneau
  indique désormais explicitement « Aucun sous-titre intégré détecté ».
- Validé automatiquement : TypeScript, ESLint, 21 suites / 66 tests, bundle iOS
  mobile et bundle Android TV.
- À confirmer sur source réelle : rapidité du seek dépend encore de l'indexation
  du fichier et du serveur ; tester plusieurs films et épisodes du fournisseur.

### Continuité séries et PiP Live — 28 septembre 2026

- Corrigé : « Continuer à regarder » ne présente plus plusieurs épisodes d'une
  même série ; seul l'épisode interrompu le plus récemment est affiché sous le
  nom de la série.
- Sécurisé : à chaque nouvelle progression d'épisode, les anciennes reprises de
  la même série sont supprimées dans la même transaction SQLite.
- Ajouté : bouton « Épisode suivant » disponible immédiatement dans les commandes
  du lecteur, y compris avant la fin et en plein écran, avec libellé accessible.
- Ajouté : entrée automatique en Picture-in-Picture du lecteur Live lorsque
  l'utilisateur change d'application sur iOS et Android compatibles.
- À confirmer sur appareils physiques : PiP Live avec HLS et flux direct TS,
  ainsi que passage manuel à l'épisode suivant pendant une lecture réelle.

### Accélération de la reprise VOD — 28 septembre 2026

- Corrigé : la progression est maintenant fournie à VLC avec `start-time` dès
  l'ouverture du média, au lieu de démarrer à zéro puis d'effectuer un second
  chargement pour rejoindre l'épisode interrompu.
- Optimisé : cache réseau VOD ramené à 750 ms tout en conservant la recherche
  rapide et la reconnexion HTTP.
- Optimisé : endpoint et identifiants Xtream sont conservés uniquement en mémoire
  pendant la session ; SecureStore et SQLite ne sont plus relus pour chaque
  épisode de la même source.
- La vitesse finale reste dépendante du support des requêtes partielles, de
  l'indexation du fichier et de la charge du serveur du fournisseur.

1. **Fiabiliser le lecteur Live**
   - enregistrer la chaîne en cours et relancer automatiquement la lecture après
     une interruption réseau récupérable ;
   - ajouter une stratégie de reconnexion avec temporisation et annulation ;
   - précharger la chaîne précédente/suivante sans exposer les URL sensibles ;
   - confirmer le zapping haut/bas et précédent/suivant sur appareil Android TV
     physique, avec retour visuel immédiat et sans flash noir.
2. **Relier les options vidéo aux capacités réelles du lecteur**
   - afficher et sélectionner les pistes audio disponibles ;
   - afficher, sélectionner et désactiver les sous-titres ;
   - exposer la qualité disponible lorsque le flux est adaptatif ;
   - appliquer le format d'image choisi et conserver la préférence ;
   - conserver des erreurs compréhensibles pour les codecs incompatibles, dont
     HEVC/H.265 4K 10 bits.
3. **Terminer les comportements par plateforme**
   - valider plein écran, orientation et Picture-in-Picture sur Android et iOS ;
   - valider les équivalents compatibles sur Android TV et tvOS ;
   - vérifier la reprise après arrière-plan, verrouillage et changement
     d'application sans enregistrer de progression incorrecte.
4. **Compléter le Guide EPG**
   - ajouter une grille horaire détaillée avec ligne temporelle ;
   - ajouter la fiche d'un programme et la navigation par jour/créneau ;
   - préserver une navigation fluide au toucher et au D-pad avec de grands EPG.
5. **Finaliser la synchronisation Xtream**
   - permettre l'actualisation d'une source Xtream existante ;
   - traiter les catégories, chaînes, films, séries et épisodes ajoutés, modifiés
     ou supprimés sans perdre les favoris ni la progression ;
   - conserver le dernier catalogue valide en cas d'erreur du fournisseur ;
   - fournir un rapport de synchronisation sans journaliser les identifiants.
6. **Fermer les dettes de catalogue et d'import**
   - restaurer précisément le défilement et le focus dans les grands catalogues ;
   - rendre le téléchargement M3U réellement progressif pour les fichiers très
     volumineux ;
   - corriger l'avertissement Expo Doctor lié au `node_modules` parent dans
     l'environnement local, sans modifier les dépendances valides du projet.
7. **Effectuer la validation physique complète**
   - tester iPhone, iPad, Android TV physique et Apple TV ;
   - vérifier HLS adaptatif, MP4, HEVC compatible, audio, sous-titres, reprise,
     zapping, télécommande et focus ;
   - effectuer au moins dix minutes de navigation D-pad sans perte de focus ;
   - mesurer démarrage, recherche, zapping et stabilité, puis corriger les défauts
     bloquants.
8. **Préparer et distribuer la bêta iPhone**
   - suivre `docs/IOS_BETA.md` sur le Mac avec `EXPO_TV=0` ;
   - compiler l'archive iOS, l'envoyer dans App Store Connect et créer le groupe
     TestFlight externe ;
   - inviter le premier testeur, recueillir ses retours et corriger les problèmes
     avant la préparation des stores.
9. **Finaliser la livraison J9/J11**
   - terminer l'accessibilité et les scénarios de panne ;
   - générer les builds Android, Android TV, iOS et tvOS ;
   - préparer la politique de confidentialité, les captures, descriptions et
     informations nécessaires aux stores.

### Lot IHM 1 — fondations adaptatives

1. Remplacer les composants visuels provisoires par les jetons Obsidian complets :
   couleurs, typographies, espacements, rayons, tailles tactiles et focus TV.
2. Créer `NexusScreen`, `NexusFocusCard`, `PrimaryButton`, `SecondaryButton`,
   `IconButton`, `FilterChip`, `StatusBanner`, `EmptyState`, `LoadingSkeleton`,
   `ConfirmDialog` et le panneau adaptatif TV/mobile.
3. Mettre en place la navigation fonctionnelle adaptative :
   - TV : barre latérale rétractable Accueil, Live, Guide, Films, Séries,
     Recherche, Ma liste, Sources et Réglages ;
   - mobile : barre inférieure Accueil, Live, Explorer, Ma liste et Profil ;
   - tablette paysage : navigation latérale compacte.
4. Garantir dès ce lot les zones sûres, le premier focus déterministe, le retour
   prévisible, les cibles tactiles et D-pad minimales, ainsi que la distinction
   visuelle entre focus, sélection et lecture.

### Lot IHM 2 — parcours principaux

5. Refaire l'Accueil : profil actif, hero unique, Reprendre, En direct maintenant,
   Favoris et Prochainement, sans carrousel automatique.
6. Refaire le Live avec `ChannelRow` et une disposition adaptative : trois panneaux
   catégories/chaînes/aperçu-EPG sur TV, onglets/liste/lecteur sur mobile.
7. Refaire le lecteur : commandes compactes au premier appui, mini-guide au second,
   programme actuel/suivant et panneau Audio, Sous-titres, Qualité, Format et
   Diagnostic. Conserver le zapping prioritaire et éviter tout flash noir.
8. Construire le Guide TV avec les vues Maintenant, Grille et Programme, une ligne
   temporelle persistante et une représentation du direct qui ne repose pas
   uniquement sur la couleur.
9. Refaire Sources : carte d'état par source et menu contextuel Renommer,
   Actualiser, Diagnostiquer et Supprimer avec confirmation explicite.

### Lot IHM 3 — catalogue et découverte

10. Construire Films et Séries avec `MediaPoster`, fiches détaillées, saisons,
    épisodes, progression et action Reprendre. Les écrans peuvent d'abord exploiter
    les données Xtream déjà stockées ; ne pas inventer de contenu de démonstration.
11. Construire la recherche universelle groupée par Chaînes, Programmes, Films et
    Séries, puis Ma liste et les écrans Profil/Réglages nécessaires à la navigation.
12. Créer `ContentRail` avec virtualisation et restauration indépendante du focus
    et de la position de chaque rail ou liste.

### Lot IHM 4 — états, accessibilité et validation

13. Implémenter pour chaque écran : chargement initial, contenu, vide, hors ligne,
    erreur récupérable, erreur bloquante, focus, sélection, désactivation et textes
    très longs.
14. Ajouter les libellés de lecteur d'écran, l'ordre de lecture, le contraste
    renforcé, la taille de texte adaptable, la réduction des animations et les
    préférences de sous-titres prévues par le blueprint.
15. Valider les dispositions téléphone, tablette et TV, puis effectuer au moins dix
    minutes de navigation D-pad sans perte de focus. Vérifier l'accès au Live en
    deux actions, la reprise en une action et un retour visible sous 100 ms.

### Ordre d'implémentation obligatoire

- Construire d'abord les jetons et composants partagés, puis le shell de navigation.
- Migrer ensuite les écrans existants un par un, dans l'ordre Accueil, Live,
  Lecteur, Guide, Sources, Films/Séries, Recherche, Ma liste et Réglages.
- Préserver les repositories, imports, EPG, Xtream et règles de sécurité existants ;
  ce chantier est une refonte fonctionnelle et visuelle, pas une réécriture backend.
- Faire des tests ciblés pendant chaque lot et une validation complète unique à la
  fin de l'ensemble IHM.

Après ces étapes, les fonctions différenciantes non bloquantes pourront être
prises dans `docs/ROADMAP.md` : contrôle parental par PIN, profils, interface
multilingue, passage d'introduction, export des réglages et synchronisation
multi-appareil chiffrée.

## Règles permanentes

- NexusPlayer ne fournit aucun contenu.
- Ne jamais journaliser une URL contenant des identifiants.
- Les secrets restent dans SecureStore.
- Une synchronisation en échec ne doit jamais détruire le catalogue valide.
- Toute interface TV doit fonctionner entièrement au D-pad avec un focus visible.
- Après chaque lot : `npm run lint`, `npm run typecheck`, `npm test`, puis bundle TV.

## Commandes de reprise

```powershell
cd D:\.gemini\antigravity\scratch\NexusPlayerNext
npm run start:tv -- --lan
```

Si l'émulateur n'est pas ouvert :

```powershell
C:\Users\brahi\AppData\Local\Android\Sdk\emulator\emulator.exe -avd NexusPlayer_TV_API_36
```

La stratégie complète et les objectifs pour dépasser IBO Player restent dans
`docs/ROADMAP.md`. Le référentiel visuel à appliquer pendant le développement de
l'IHM est enregistré dans `docs/UI_UX_BLUEPRINT.md` ; la direction Obsidian y est
la référence principale.

## Catalogue éditorial Films/Séries — réalisé le 28 septembre 2026

- Recherche immédiate dédiée dans chaque catalogue.
- Mise en avant éditoriale, reprise de lecture, nouvelles sorties/ajouts récents,
  favoris (« Ma liste ») et rayons issus des catégories Xtream réelles.
- Résultats en grille adaptative et rayons horizontaux utilisables au tactile et
  au D-pad sur téléphone, tablette et TV.
- Aucun contenu de démonstration : les écrans exploitent uniquement les données
  importées depuis les sources de l'utilisateur.
- Pour les séries, « Ajouts récents » suit l'ordre d'import local car Xtream ne
  fournit pas systématiquement une date de sortie exploitable.

## Prochaine priorité — lecteur adaptatif

La prochaine étape de développement est le chantier décrit dans
[`PLAYER_ROADMAP.md`](PLAYER_ROADMAP.md). Respecter l’ordre des lots : diagnostic,
résolution des flux, contrôleur commun, seek rapide, fallback automatique,
fonctions complètes, puis validation multi-appareil. Ne pas commencer une autre
fonction majeure avant la validation des lots 1 à 5.

## Performance catalogue et synchronisation — réalisé le 28 septembre 2026

- Les aperçus de toutes les catégories Films/Séries sont maintenant chargés par
  une requête SQLite groupée, au lieu d'une requête et d'un comptage par rayon.
- Le dernier catalogue résolu reste en mémoire entre les changements d'onglet :
  le contenu connu s'affiche immédiatement pendant la vérification de révision.
- Les index SQLite V9 couvrent le tri par catégorie et les favoris sur les grands
  catalogues.
- Les sources Xtream et M3U distantes se synchronisent en arrière-plan après
  l'ouverture et au retour dans l'app, sans bloquer l'interface. L'intervalle est
  réglable dans Réglages (manuel, 1 h, 6 h par défaut, 12 h ou 24 h).
- Une erreur fournisseur conserve le dernier catalogue valide. Les nouvelles
  chaînes, films et séries apparaissent après la prochaine synchronisation réussie.

## Classement mondial des contenus — lot 1 réalisé le 28 septembre 2026

- La valeur originale du fournisseur reste intacte ; les noms et catégories
  présentés sont calculés séparément.
- Une taxonomie commune reconnaît les principales catégories Live et les genres
  Films/Séries dans plusieurs langues, notamment français, anglais, turc,
  espagnol, allemand, russe et arabe.
- Les préfixes, drapeaux et noms de pays alimentent une détection pays/langue avec
  niveau de confiance. Les métadonnées M3U explicites gardent toujours la priorité.
- Les catégories fournisseur équivalentes sont fusionnées dans un seul rayon
  canonique, sans supprimer les contenus ni empêcher la recherche par nom original.
- À pertinence égale, le pays correspondant à la région de l'appareil passe avant
  les autres pays ; le reste du catalogue demeure accessible.
- La migration SQLite V10 reclasse également les sources déjà présentes.

Prochain lot : écran de préférences pays/langues par profil, filtres visibles,
corrections manuelles et conservation facultative de la vue brute du fournisseur.

### Navigation Live et compatibilité Xtream

- Les chaînes sont présentées en deux niveaux : thème canonique, puis pays. Par
  exemple, « Sport » ouvre France, Turquie, États-Unis, etc., sans dupliquer le
  thème principal.
- Sur iOS/tvOS avec un serveur HTTP, le Live utilise VLC et essaie successivement
  le flux TS, l'URL sans extension puis HLS. La variante HLS n'est plus essayée en
  premier lorsqu'un fournisseur la refuse avec une erreur serveur.
- Le délai de bascule VLC est ramené à dix secondes et aucun essai natif inutile
  n'est lancé pour les Live HTTP Apple, ce qui évite aussi d'exposer l'URL complète
  dans les avertissements AVFoundation.
