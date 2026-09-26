# Reprise immédiate du développement

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

1. Ajouter la reprise automatique après interruption et le préchargement de la
   chaîne suivante pour le direct (la reprise VOD est terminée).
2. Relier les options du lecteur aux pistes audio, sous-titres, qualité et format
   effectivement exposés par chaque plateforme.
3. Valider plein écran, orientation et PiP sur Android, iOS et tvOS.
4. Effectuer les sessions de validation sur appareils physiques Android TV et
   Apple TV, puis préparer la livraison J9/J11.

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

Après cette étape : reprise automatique après interruption, préchargement de la
chaîne suivante, validation plein écran/orientation/audio/sous-titres/PiP, puis
finalisation Android TV, Apple TV, appareils mobiles et livraison J9/J11.

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
