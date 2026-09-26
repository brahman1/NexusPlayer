# NexusPlayer

NexusPlayer est un client IPTV multiplateforme destiné aux téléphones, tablettes,
Android TV et Apple TV. L'application ne fournit aucun contenu : l'utilisateur
importe uniquement ses propres sources autorisées.

## Socle technique

- Expo SDK 57 et TypeScript strict
- React Native TV pour Android TV et Apple TV
- Expo Router, basé sur React Navigation 7
- Expo Video
- SQLite, MMKV et SecureStore
- Zustand

Expo Go n'est pas pris en charge. Le projet utilise un Development Build.

## Commandes

```bash
npm install --legacy-peer-deps
npm run doctor
npm run typecheck
npm test
```

### Mobile

```bash
npm run prebuild:mobile
npm run android:mobile
```

### TV

```bash
npm run prebuild:tv
npm run android:tv
```

Le passage entre une cible mobile et TV régénère les dossiers natifs avec
`expo prebuild --clean`. Les dossiers `android` et `ios` sont donc considérés
comme générés.

## État du projet

Les jalons J0 à J2 sont terminés. La gestion multi-playlist permet aussi de
détecter les imports identiques, renommer, actualiser et supprimer une source sans
perdre le dernier catalogue valide en cas d'échec. Le catalogue Live propose la
recherche, les catégories, les favoris, les récents, les logos avec fallback et
une liste virtualisée et paginée utilisable au toucher comme au D-pad. La prochaine
étape valide le zapping et le diagnostic du lecteur sur flux réel, puis finalise
la restauration précise du défilement.

Pour reprendre le développement sans nouvelle analyse, suivre directement
[`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md). Les règles visuelles et les palettes
sont conservées dans [`docs/UI_UX_BLUEPRINT.md`](docs/UI_UX_BLUEPRINT.md).
