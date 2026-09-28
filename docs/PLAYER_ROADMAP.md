# Feuille de route — lecteur adaptatif NexusPlayer

## Objectif

Construire une couche de lecture plus fiable qu’un lecteur IPTV à moteur unique :
choix automatique entre le moteur natif et LibVLC, démarrage rapide, seek réactif,
fallback transparent et commandes identiques pour le Live, les films et les séries.

## Situation actuelle

- Le Live utilise `expo-video`.
- Les films et séries utilisent `expo-libvlc-player`.
- Les deux chemins ont des états, erreurs et commandes différents.
- Sur iOS, certains marqueurs Live `.ts` sont transformés en `.m3u8` sans vérifier
  que le serveur accepte réellement cette variante.
- Un seek VOD peut rester longtemps en chargement lorsque le serveur, le conteneur
  ou le moteur ne répond pas correctement.

## Architecture cible

`Écran → PlayerController → StreamResolver → NativeEngine | VlcEngine`

- `PlayerController` expose une API unique : charger, lire, pause, stop, seek,
  pistes audio, sous-titres, plein écran, PiP et destruction.
- `StreamResolver` construit et teste les variantes sûres du flux sans journaliser
  les identifiants.
- `NativeEngine` privilégie `expo-video` pour HLS/MP4 standards et les fonctions
  système (PiP, AirPlay, plein écran).
- `VlcEngine` prend en charge les flux TS, conteneurs/codecs atypiques et sert de
  moteur de secours.
- Le moteur fonctionnel est mémorisé localement par serveur et type de média.

## Ordre d’implémentation

### Lot 1 — Diagnostic reproductible

- Ajouter un écran de diagnostic développeur sans URL ni secret en clair.
- Tester un HLS public, un MP4 public et un flux utilisateur pour chaque moteur.
- Mesurer : résolution DNS, réponse HTTP, première image, état seekable, durée du
  seek, codec/conteneur connu et catégorie d’erreur.
- Distinguer serveur indisponible, authentification, blocage HTTP/TLS, format non
  pris en charge, timeout et erreur du décodeur.

**Validation :** une panne Live/VOD doit produire une cause exploitable plutôt que
le seul message « Lecture impossible ».

### Lot 2 — Résolution et qualification des flux

- Créer `StreamResolver` pour les URL M3U et Xtream.
- Tester proprement les variantes Live `.m3u8` puis `.ts` au lieu de convertir
  systématiquement l’extension.
- Gérer redirections, type MIME, requêtes `Range`, timeout, en-têtes autorisés et
  URL HTTP/HTTPS.
- Détecter `seekable`, diffusion en direct et durée connue.
- Masquer systématiquement serveur, identifiant et mot de passe dans les logs.

**Validation :** la variante retenue doit être prouvée accessible avant d’être
transmise au lecteur, sans télécharger le média complet.

### Lot 3 — Contrôleur et moteurs interchangeables

- Définir l’interface commune `PlayerEngine` et la machine d’états
  `idle/loading/ready/playing/paused/buffering/ended/error`.
- Adapter `expo-video` dans `NativeEngine`.
- Adapter `expo-libvlc-player` dans `VlcEngine`.
- Unifier progression, buffering, erreurs, pistes, PiP, plein écran et nettoyage.
- Migrer d’abord les films, puis les épisodes, puis le Live.

**Validation :** les trois types de médias utilisent les mêmes commandes et le
même modèle d’état, sans régression de reprise de lecture.

### Lot 4 — Seek VOD rapide et fiable

- Pendant le glissement, mettre à jour uniquement l’aperçu de position.
- Envoyer une seule commande de seek au relâchement du curseur.
- Annuler ou ignorer toute réponse appartenant à un seek précédent.
- Utiliser d’abord un seek rapide vers l’image-clé la plus proche, puis proposer
  un seek précis lorsque le flux le permet.
- Ne montrer l’indicateur de chargement qu’après un court délai et le retirer dès
  la première nouvelle image/position confirmée.
- Après timeout, réessayer une fois avec l’autre moteur à la même position.
- Signaler clairement les médias dont le serveur ne prend pas en charge `Range`.

**Objectifs :** interface mise à jour en moins de 100 ms ; seek médian inférieur
à 2 s sur un MP4/HLS correctement indexé ; aucun chargement infini.

### Lot 5 — Sélection et fallback automatiques

- Choisir le moteur avec la matrice suivante : HLS/MP4 standard → natif ; TS,
  MKV ou format atypique → VLC ; erreur récupérable → moteur alternatif.
- Déclencher le fallback si aucune première image n’arrive dans le délai défini
  ou lors d’une erreur de format/décodage.
- Limiter la bascule à une tentative par lecture pour éviter les boucles.
- Reprendre sur le moteur alternatif à la dernière position confirmée.
- Mémoriser le moteur gagnant par hôte, plateforme et type Live/VOD.

**Objectifs :** première image en moins de 3 s sur réseau stable ; fallback en
moins de 8 s ; aucune URL sensible visible dans l’interface ou les journaux.

### Lot 6 — Fonctions de lecture complètes

- Audio et sous-titres intégrés, sous-titres externes autorisés et mémorisation de
  la langue préférée.
- PiP automatique pour Live et VOD sur les plateformes compatibles.
- Plein écran avec commandes masquées automatiquement et accessibles au toucher
  comme au D-pad.
- Épisode suivant manuel et automatique, reprise et marquage de fin fiables.
- AirPlay sur Apple et fonctions équivalentes disponibles sur Android.

### Lot 7 — Validation appareils et publication

- iPhone/iPad : Wi-Fi, réseau mobile, arrière-plan/PiP, rotation et interruption.
- Android téléphone/tablette : mêmes scénarios avec Media3 et VLC.
- Apple TV/Android TV : navigation D-pad, focus, changement de chaîne et zapping.
- Matrice média : HLS, MPEG-TS, MP4 H.264/H.265, MKV, pistes audio multiples,
  sous-titres intégrés/externes et serveur lent.
- Tester démarrage, seek début/milieu/fin, reprise, épisode suivant, fallback et
  perte/récupération réseau.
- Exécuter typecheck, lint, tests unitaires, bundles iOS/Android TV puis une session
  réelle d’au moins 30 minutes par plateforme.

## Garde-fous

- Ne jamais multiplier les tentatives réseau sans limite.
- Ne jamais contourner une erreur d’authentification par fallback.
- Ne jamais enregistrer une URL Xtream complète.
- Conserver SQLite uniquement pour catalogue, progression et préférences : aucune
  opération SQLite ne doit bloquer le démarrage ou le seek.
- Déployer lot par lot derrière une option interne jusqu’à validation complète.

## Définition de terminé

Le chantier est terminé lorsque Live, films et séries passent par le contrôleur
commun, que la sélection de moteur est invisible pour l’utilisateur, qu’un seek
ne peut plus rester bloqué indéfiniment et que les objectifs de délai sont validés
sur au moins un appareil réel de chaque famille ciblée.
