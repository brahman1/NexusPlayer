# Référentiel IHM NexusPlayer

Ce document est la source de vérité pour la future interface de NexusPlayer sur
téléphone, tablette, Android TV et Apple TV. Toute implémentation visuelle doit
rester compatible avec l'architecture fonctionnelle et les règles ci-dessous.

## Direction recommandée : Obsidian

Obsidian est la direction principale. Elle doit donner une sensation premium et
cinématographique sans sacrifier la lisibilité, la vitesse ou le contrôle au D-pad.
L'interface reste sombre, calme et peu décorative. La couleur sert à exprimer un
état ou une action, jamais à remplir artificiellement l'écran.

### Palette principale

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `background` | `#070A0F` | Fond global et lecteur |
| `surface` | `#101621` | Navigation, cartes et champs |
| `surfaceRaised` | `#182131` | Élément surélevé ou focus secondaire |
| `border` | `#29364A` | Séparateurs et contours inactifs |
| `text` | `#F7F9FC` | Texte principal |
| `textMuted` | `#9AA8BA` | Métadonnées et texte secondaire |
| `primary` | `#6C7CFF` | Action principale et sélection |
| `primaryStrong` | `#8D99FF` | Survol, progression et accent renforcé |
| `success` | `#3DDC97` | Source valide et synchronisation réussie |
| `warning` | `#FFB454` | Dégradation ou attention |
| `danger` | `#FF647C` | Erreur et action destructive |
| `focus` | `#FFFFFF` | Focus TV universel |

Contrastes cibles : WCAG AA minimum pour tout texte, WCAG AAA pour les petits
libellés critiques. Le focus blanc ne doit jamais être remplacé uniquement par une
couleur d'accent.

### Palettes exploratoires

`Aurora` est une alternative plus chaleureuse et familiale : fond `#071311`,
surface `#0E1D1B`, surface haute `#162B27`, accent `#35D0BA`, accent chaleureux
`#FFB86B`, texte `#F3FBF8`, texte secondaire `#9AB7AE`, focus `#E8FFF8`.

`Pulse` est une alternative plus dense, adaptée au Live et au sport : fond
`#050B12`, surface `#0C1724`, surface haute `#13243A`, accent Live `#00C2FF`,
accent focus `#B8F23C`, texte `#F4F9FF`, texte secondaire `#91A7BF`.

Ces deux variantes servent à challenger Obsidian. Elles ne doivent pas devenir des
thèmes supplémentaires avant que le produit principal soit terminé.

## Principes d'interface

1. Une action principale évidente par écran.
2. Le contenu apparaît avant les réglages et les informations techniques.
3. Aucun cul-de-sac : Retour mène toujours à un état prévisible.
4. Le focus, la sélection et la lecture sont trois états visuellement distincts.
5. Une erreur explique ce qui s'est passé et propose l'action suivante.
6. Les transitions ne bloquent jamais le zapping ou la navigation.
7. L'expérience tactile et l'expérience TV partagent le même vocabulaire visuel,
   mais pas nécessairement la même disposition.

## Grille et dimensions

- Unité spatiale : 8 px.
- Espacements autorisés : 4, 8, 16, 24, 32 et 48 px.
- Marge TV sûre : 64 px sur les quatre côtés.
- Marge tablette : 24 à 32 px.
- Marge téléphone : 16 à 24 px.
- Cible tactile minimale : 48 × 48 dp.
- Cible D-pad recommandée : 64 × 56 dp au minimum.
- Rayon principal : 14 px ; petit 8 px ; grand 22 px ; pilule 999 px.
- Les rails horizontaux montrent toujours une partie de l'élément suivant.

## Typographie

Utiliser la police système pour la première version afin d'assurer une excellente
lisibilité et un démarrage rapide. Inter peut être adoptée ultérieurement si elle
est embarquée localement et validée sur les appareils TV.

### Échelle TV

- Affichage/hero : 48 px, graisse 800.
- Titre de page : 36 px, graisse 800.
- Titre de section : 24 px, graisse 700.
- Carte ou chaîne : 18 à 20 px, graisse 700.
- Corps : 16 px, graisse 400.
- Métadonnées : 14 px, graisse 500.

### Échelle mobile

- Titre principal : 32 px.
- Titre de section : 22 à 24 px.
- Carte : 16 à 18 px.
- Corps : 16 px minimum.
- Métadonnées : 13 à 14 px.

Limiter une ligne à environ 55–75 caractères. Les titres sont tronqués sur une ou
deux lignes sans réduire la taille de police.

## Focus TV et interaction

- Contour de focus : 3 px blanc, toujours visible.
- Agrandissement : 1,03 à 1,05 sans modifier la disposition des voisins.
- Transition : 140 ms, courbe douce.
- Carte sélectionnée : fond ou accent primaire, sans contour blanc permanent.
- Élément en lecture : pictogramme Lecture et indicateur d'accent.
- Le premier focus est déterministe sur chaque écran.
- Le dernier focus et la dernière position sont restaurés au retour.
- Le D-pad ne doit jamais envoyer le focus derrière une modale ou hors écran.
- Retour ferme successivement : panneau, commandes, lecteur, puis écran.
- Appui long ouvre les actions contextuelles ; il ne remplace jamais l'action OK.

## Mouvement

- Micro-interaction : 120 à 160 ms.
- Changement de panneau : 180 à 220 ms.
- Ouverture d'un écran : 220 à 280 ms maximum.
- Aucun mouvement décoratif continu.
- Respect obligatoire de « Réduire les animations ».
- Pendant le zapping, conserver la dernière image ou afficher un fond neutre avec
  un indicateur discret ; éviter un flash noir complet.

## Navigation

### TV

Navigation latérale rétractable : Accueil, Live, Guide, Films, Séries, Recherche,
Ma liste, Sources et Réglages. Elle affiche d'abord des icônes, puis les libellés
lorsqu'elle reçoit le focus.

### Mobile et tablette

Barre inférieure : Accueil, Live, Explorer, Ma liste et Profil. Les écrans
secondaires utilisent une pile standard. Sur tablette paysage, la barre peut
devenir une navigation latérale compacte.

## Écrans de référence

### Accueil

- Salutation et profil actif.
- Hero contextuel limité à un seul programme.
- Reprendre, En direct maintenant, Favoris et Prochainement.
- Chaque rail conserve sa position indépendamment.
- Aucun carrousel automatique.

### Live TV

Sur TV : catégories à gauche, chaînes au centre, aperçu et EPG à droite. Sur
mobile : catégories en onglets, liste des chaînes puis lecteur plein écran.
L'aperçu ne démarre qu'après une courte stabilisation du focus pour éviter les
requêtes inutiles pendant un déplacement rapide.

### Lecteur

La première pression affiche une barre compacte : chaîne, programme, progression,
lecture/pause et programme suivant. Une seconde action ouvre le mini-guide. Audio,
sous-titres, qualité, format et diagnostic sont regroupés dans un panneau unique.

### Guide TV

Trois vues : Maintenant, Grille et Programme. La ligne temporelle, l'heure courante
et la chaîne sélectionnée restent visibles. La grille n'utilise pas la couleur
seule pour distinguer passé, direct et futur.

### Films et séries

Affiche, titre et action Reprendre dominent. Les métadonnées secondaires restent
compactes. Les saisons utilisent un sélecteur simple ; les épisodes affichent
durée, progression et état vu/non vu.

### Recherche

Une recherche universelle avec résultats groupés par Chaînes, Programmes, Films et
Séries. Sur TV, proposer la dictée lorsque la plateforme la fournit. Conserver les
recherches récentes localement par profil.

### Sources

Une carte par source : nom, type, état, dernière synchronisation et volume. Les
actions Renommer, Actualiser, Diagnostiquer et Supprimer sont dans un menu
contextuel. La suppression requiert une confirmation explicite.

## Composants obligatoires

- `NexusScreen` : zones sûres et arrière-plan.
- `NexusSidebar` / `NexusBottomNav` : navigation adaptative.
- `NexusFocusCard` : focus, pression et appui long unifiés.
- `ContentRail` : liste virtualisée et restauration de position.
- `ChannelRow` : logo, nom, EPG, état Live et favori.
- `MediaPoster` : progression, disponibilité et métadonnées.
- `PrimaryButton`, `SecondaryButton`, `IconButton`.
- `FilterChip` : sélection persistante, distincte du focus.
- `StatusBanner` : succès, avertissement et erreur actionnable.
- `EmptyState` : explication et action principale.
- `LoadingSkeleton` : géométrie stable, sans spinner plein écran prolongé.
- `ConfirmDialog` et `BottomSheet`/panneau TV.

## États à concevoir pour chaque écran

Chaque composant et écran doit avoir : chargement initial, contenu, contenu vide,
hors ligne, erreur récupérable, erreur bloquante, focus, sélection, désactivation et
contenu très long. Aucun écran n'est considéré terminé si seul l'état nominal a
été implémenté.

## Accessibilité

- Lecteur d'écran et libellé accessible pour chaque commande.
- Ordre de lecture identique à l'ordre visuel.
- Sous-titres personnalisables : taille, fond, couleur et opacité.
- Mode contraste renforcé.
- Taille de texte ajustable sans chevauchement.
- Information jamais portée uniquement par la couleur.
- Retour haptique léger sur mobile, désactivable.

## Critères de validation IHM

- Accéder au Live en deux actions maximum depuis l'accueil.
- Reprendre le dernier contenu en une action.
- Aucune perte de focus durant dix minutes de navigation au D-pad.
- Action principale identifiable en moins de deux secondes.
- Interface utilisable à trois mètres sur un téléviseur 1080p.
- Aucun secret ni URL complète visible dans un message ou diagnostic.
- Navigation fluide avec 50 000 contenus virtualisés.
- État visible dans les 100 ms après toute action utilisateur.

## Décision enregistrée

Construire d'abord Obsidian. Utiliser Aurora et Pulse comme références de contraste
pour les écrans Famille et Live, sans fragmenter le produit en plusieurs thèmes.
Avant de développer un nouvel écran, vérifier ce document, les états nécessaires,
la navigation D-pad et l'équivalent mobile/tablette.
