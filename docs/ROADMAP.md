# Feuille de route NexusPlayer

Ce document est la référence durable du projet. NexusPlayer cible les téléphones,
les tablettes, Android TV et Apple TV à partir d'un socle TypeScript partagé.

## Principes produit

- Aucun contenu IPTV n'est fourni avec l'application.
- L'utilisateur importe uniquement des sources qu'il est autorisé à utiliser.
- L'expérience mobile est tactile ; l'expérience TV est entièrement utilisable à
  la télécommande avec un focus visible.
- Les secrets ne sont jamais consignés dans les logs.
- Le catalogue existant reste disponible si une synchronisation échoue.

## Architecture retenue

- Expo SDK 57 et Development Builds
- React Native TV 0.86 pour les quatre familles d'appareils
- Expo Router, basé sur React Navigation 7
- Expo Video
- SQLite pour les catalogues et l'EPG
- MMKV pour les préférences rapides
- SecureStore pour les identifiants
- Zustand pour l'état applicatif

Sur Apple TV, la base SQLite est traitée comme un cache reconstructible, car tvOS
peut purger son répertoire. Les préférences et identifiants indispensables restent
donc séparés dans MMKV et SecureStore.

## Jalons

### J0 — Socle multi-plateforme

- [x] Projet Expo et TypeScript strict
- [x] Alias React Native TV et plugin de génération TV
- [x] Navigation mobile et pile commune
- [x] Thème sombre et composants compatibles avec le focus TV
- [x] Écran d'accueil vierge et choix d'une source
- [x] Tests et builds Android mobile/TV
- [ ] Diagnostic Expo sans dépendance React héritée du dossier parent
- [x] Validation visuelle sur émulateur Android TV

### J1 — Domaine et persistance

- [x] Modèles Playlist, Channel, Category et SourceCredentials
- [x] Schéma SQLite et première migration
- [x] Préférences MMKV
- [x] Coffre SecureStore
- [x] Contrat de repository et implémentation SQLite des playlists
- [x] Initialisation contrôlée de la base au démarrage

### J2 — Import M3U

- [x] URL distante avec timeout, annulation et progression par étape
- [x] Fichier local via Document Picker
- [x] Parser Extended M3U parcourant le texte ligne par ligne
- [x] Déduplication et rapport d'import
- [x] Test automatisé sur 10 000 entrées
- [ ] Téléchargement réseau réellement progressif pour les très gros fichiers

### J3 — Xtream Codes

- [x] Validation de connexion
- [x] Stockage sécurisé des identifiants
- [x] Catégories Live, VOD et séries
- [ ] Synchronisation et gestion des erreurs

### J4 — Catalogue Live TV

- [x] Liste des chaînes d'une playlist et recherche locale
- [x] Catégories, favoris et récents
- [x] Listes tactiles et TV virtualisées
- [x] Logos avec fallback
- [x] Restauration du dernier focus
- [x] Pagination incrémentale du catalogue
- [x] Parser validé sur une playlist synthétique de 50 000 chaînes
- [ ] Restauration précise du défilement sur un grand catalogue

### J5 — Lecteur

- [x] Première lecture Live/HLS avec Expo Video et contrôles natifs
- [ ] Validation des formats HLS adaptatif et MP4 sur appareils
- [ ] Plein écran, orientation, PiP et format d'image
- [x] États de chargement, diagnostic d'erreur et relance
- [ ] Reprise automatique après une interruption réseau
- [ ] Pistes audio et sous-titres disponibles
- [x] Changement précédent/suivant au D-pad
- [ ] Préchargement pour accélérer le zapping

### J6 — EPG

- [x] XMLTV et XMLTV gzip
- [x] Fuseaux horaires, cache et expiration
- [x] Association tvg-id avec correspondance de secours
- [x] Maintenant/suivant dans le lecteur
- [ ] Guide détaillé

### J7 — Multi-playlist

- [x] Ajouter, renommer, actualiser et supprimer
- [x] Détection des imports identiques et rapport différentiel
- [x] Synchronisation conditionnelle avec ETag/Last-Modified
- [x] Conservation de la dernière version valide

### J8 — VOD et séries

- [ ] Fiches, saisons et épisodes
- [ ] Favoris, historique et reprise de lecture
- [ ] Continuer à regarder

### J9 — Finalisation TV

- [ ] Navigation directionnelle complète
- [ ] Retour, menu, appui long et restauration du focus
- [ ] Validation Android TV physique
- [ ] Validation Apple TV sur macOS/Xcode ou appareil

### J10 — Stalker optionnel

- [ ] Spécification du portail autorisé
- [ ] Authentification et cycle de session
- [ ] Aucun contournement ni falsification d'appareil

### J11 — Livraison

- [ ] Tests unitaires, intégration et scénarios de panne
- [ ] Mesures de performance et accessibilité
- [ ] Builds Android, Android TV, iOS et tvOS
- [ ] Documentation et préparation des stores

## Critères du MVP

Le MVP est atteint quand un utilisateur peut importer une source M3U ou Xtream,
parcourir et rechercher ses chaînes, gérer ses favoris, lire un flux HLS, consulter
le programme actuel et utiliser l'ensemble au toucher comme à la télécommande.

## Objectif concurrentiel — Dépasser IBO Player

NexusPlayer doit d'abord terminer les jalons existants, dans cet ordre :

1. J7 et J4 : gestion des playlists, détection des doublons, catégories, favoris,
   récents, logos, virtualisation et restauration du focus.
2. J5 et J6 : lecteur TV avancé, zapping rapide, erreurs compréhensibles et EPG.
3. J3 et J8 : Xtream Codes, VOD, séries, saisons, épisodes et reprise de lecture.
4. J9 et J11 : finition télécommande, appareils physiques, accessibilité, qualité
   et publication sur les stores.

### Fonctions concurrentielles à ajouter

- [ ] Contrôle parental par PIN et masquage des catégories
- [ ] Interface multilingue
- [ ] Profils utilisateur
- [ ] Personnalisation des sous-titres
- [ ] Lecture automatique de l'épisode suivant
- [ ] Passer l'introduction
- [ ] Sélection de qualité et format d'image
- [ ] Import et export des réglages
- [ ] Diagnostic de source avec données sensibles masquées
- [ ] Synchronisation multi-appareil facultative et chiffrée

### Différenciation NexusPlayer

- Fonctionnement local sans portail ni compte obligatoire.
- Identifiants protégés dans SecureStore et URLs sensibles masquées.
- Conservation de la dernière version valide après un échec de synchronisation.
- Synchronisation non bloquante avec rapport des ajouts, modifications, suppressions
  et flux inaccessibles.
- Recherche globale Live, VOD et séries.
- Mini-guide EPG dans le lecteur, chaîne précédente et zapping haut/bas.
- Favoris accessibles rapidement et restauration exacte du dernier focus.
- Diagnostic réseau exploitable sans divulguer les secrets de la source.

### Objectifs de qualité

- Recherche inférieure à 100 ms sur 10 000 chaînes.
- Défilement fluide jusqu'à 50 000 éléments.
- Import et synchronisation sans blocage visible de l'interface.
- Démarrage à chaud inférieur à deux secondes sur les appareils cibles.
- Zapping inférieur à deux secondes lorsque la source le permet.
- Plus de 99,5 % des sessions sans crash.
