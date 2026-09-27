# Générer NexusPlayer sur Mac et l'envoyer à un ami avec TestFlight

TestFlight est la méthode recommandée. Le testeur n'a besoin ni d'Expo, ni de
Xcode, ni d'un Mac, ni d'un compte développeur. Il lui suffit d'avoir un iPhone,
un identifiant Apple et l'application TestFlight.

## 1. Prérequis sur le Mac

- Une adhésion active à l'Apple Developer Program.
- Xcode installé depuis le Mac App Store.
- Node.js, npm et Git installés.
- CocoaPods installé.

Ouvrir Xcode une première fois pour accepter la licence et installer ses
composants, puis vérifier les outils dans Terminal :

```bash
node --version
npm --version
git --version
pod --version
```

Si CocoaPods est absent et que Homebrew est disponible :

```bash
brew install cocoapods
```

## 2. Télécharger le projet

Pour un premier téléchargement :

```bash
cd ~/Documents
git clone https://github.com/brahman1/NexusPlayer.git
cd NexusPlayer
```

Si le projet est déjà présent :

```bash
cd ~/Documents/NexusPlayer
git pull origin main
```

## 3. Installer et vérifier le projet

```bash
npm install --legacy-peer-deps
npm run typecheck
npm test
```

## 4. Générer le projet natif iPhone

`EXPO_TV=0` est indispensable : il sélectionne la cible iPhone/iPad et non
Apple TV.

```bash
EXPO_TV=0 npx expo prebuild --clean --platform ios
npx pod-install ios
```

La commande `prebuild --clean` régénère entièrement le dossier `ios`. Les
modifications natives manuelles placées dans ce dossier peuvent donc être
supprimées.

Cette régénération applique aussi l'autorisation iOS nécessaire aux sources IPTV
HTTP configurées par l'utilisateur. Une simple actualisation JavaScript ne suffit
pas après une modification d'App Transport Security : il faut reconstruire et
réinstaller l'application native.

NexusPlayer utilise également un lecteur VLC natif pour les films et les séries
(notamment MKV et HEVC). Après l'ajout ou la mise à jour de ce lecteur, une simple
actualisation Metro/Expo ne suffit pas non plus : `prebuild`, `pod-install`, puis
une nouvelle compilation Xcode sont obligatoires.

Le curseur tactile, la rotation plein écran et le Picture-in-Picture utilisent
également des modules natifs. Après récupération du commit qui les ajoute, il faut
donc reconstruire l'application ; une actualisation JavaScript de l'ancien build
ne peut pas faire apparaître ces fonctions.

## 5. Ouvrir le projet dans Xcode

```bash
open ios/NexusPlayer.xcworkspace
```

Toujours ouvrir le fichier `.xcworkspace`, et non le fichier `.xcodeproj`.
Attendre la fin de l'indexation de Xcode avant de continuer.

## 6. Configurer la signature Apple

Dans Xcode :

1. Sélectionner le projet **NexusPlayer** dans la colonne de gauche.
2. Sélectionner la cible iOS **NexusPlayer**.
3. Ouvrir **Signing & Capabilities**.
4. Activer **Automatically manage signing**.
5. Dans **Team**, sélectionner l'équipe Apple Developer.
6. Vérifier le Bundle Identifier : `com.brahman1.nexusplayer`.

Si le compte Apple n'apparaît pas :

1. Ouvrir **Xcode > Settings > Accounts**.
2. Cliquer sur `+`.
3. Ajouter l'identifiant Apple lié au compte développeur.
4. Revenir dans **Signing & Capabilities**.

Xcode ne doit plus afficher d'erreur rouge de signature.

## 7. Créer l'application dans App Store Connect

Se connecter à <https://appstoreconnect.apple.com/>, puis :

1. Ouvrir **My Apps**.
2. Cliquer sur `+`, puis **New App**.
3. Choisir la plateforme **iOS**.
4. Nommer l'application **NexusPlayer**.
5. Choisir le français comme langue principale.
6. Sélectionner le Bundle ID `com.brahman1.nexusplayer`.
7. Utiliser par exemple `NEXUSPLAYER-IOS-001` comme SKU.
8. Sélectionner **Full Access**, puis créer l'application.

Si le Bundle ID n'est pas proposé, le créer dans le portail Apple Developer,
section **Certificates, Identifiers & Profiles > Identifiers > App IDs**, avec la
valeur `com.brahman1.nexusplayer`.

## 8. Tester sur son propre iPhone

Cette étape est recommandée avant l'envoi à Apple :

1. Brancher l'iPhone au Mac et le déverrouiller.
2. Accepter **Faire confiance à cet ordinateur**.
3. Sélectionner l'iPhone comme destination dans Xcode.
4. Cliquer sur le bouton de lecture `▶`.

Pour cette installation locale uniquement, iOS peut demander d'activer
**Réglages > Confidentialité et sécurité > Mode développeur**.

## 9. Créer l'archive TestFlight

Dans Xcode :

1. Sélectionner le scheme **NexusPlayer**.
2. Choisir **Any iOS Device (arm64)** ou **Generic iOS Device** comme destination.
3. Ouvrir **Product > Archive**.
4. Attendre l'ouverture de la fenêtre **Organizer**.

Si **Archive** est désactivé, vérifier qu'un simulateur iPhone n'est pas
sélectionné.

## 10. Envoyer le build à Apple

Dans Organizer :

1. Sélectionner la dernière archive NexusPlayer.
2. Cliquer sur **Distribute App**.
3. Choisir **App Store Connect**.
4. Choisir **Upload**.
5. Conserver la gestion automatique de la signature.
6. Lancer la validation, puis cliquer sur **Upload**.

Le build peut nécessiter plusieurs minutes avant d'apparaître dans App Store
Connect.

## 11. Préparer TestFlight

Dans **App Store Connect > My Apps > NexusPlayer > TestFlight** :

1. Attendre la fin du traitement du build.
2. Ouvrir le build.
3. Répondre aux questions de conformité concernant le chiffrement.
4. Renseigner la description bêta, l'adresse de retour, le contact et la rubrique
   **What to Test**.

Exemple pour **What to Test** :

```text
Tester l'import d'une source M3U ou Xtream autorisée, la navigation,
la lecture des chaînes, des films et des séries, les favoris,
la reprise de lecture et le passage automatique à l'épisode suivant.

NexusPlayer ne fournit aucun contenu.
```

Ne jamais placer de véritables identifiants IPTV dans les notes TestFlight.
Apple peut demander une source de test légale ou une explication sur les droits
d'accès au contenu.

## 12. Inviter le testeur externe

1. Ouvrir **External Testing**.
2. Créer un groupe, par exemple **Testeurs NexusPlayer**.
3. Ajouter le build au groupe.
4. Cliquer sur **Add Testers**.
5. Saisir l'adresse e-mail associée à l'identifiant Apple du testeur.
6. Envoyer le build en **Beta App Review**.

Le premier build destiné à un testeur externe doit être contrôlé par Apple.

## 13. Étapes pour le testeur

Le testeur doit uniquement :

1. Installer TestFlight depuis l'App Store.
2. Ouvrir l'e-mail d'invitation envoyé par Apple.
3. Appuyer sur **View in TestFlight**.
4. Accepter l'invitation.
5. Appuyer sur **Installer**.

Avec TestFlight, le testeur n'a besoin ni d'Expo, ni de Xcode, ni d'un Mac, ni
du mode développeur, ni d'un câble.

## 14. Publier une nouvelle version de test

Récupérer les modifications puis régénérer le projet iOS :

```bash
cd ~/Documents/NexusPlayer
git pull origin main
npm install --legacy-peer-deps
EXPO_TV=0 npx expo prebuild --clean --platform ios
npx pod-install ios
open ios/NexusPlayer.xcworkspace
```

Dans Xcode, augmenter le **Build Number**, par exemple de `1` à `2`, puis refaire
**Product > Archive > Distribute App > App Store Connect > Upload**. Les testeurs
verront ensuite le bouton de mise à jour dans TestFlight.

## Documentation officielle

- TestFlight avec Expo : <https://docs.expo.dev/submit/testflight/>
- Envoi iOS : <https://docs.expo.dev/submit/ios/>
- App Store Connect : <https://appstoreconnect.apple.com/>
