# Tester NexusPlayer sur iPhone

La compilation iOS peut être réalisée depuis Windows grâce à EAS Build. Un compte
Expo et une adhésion payante à l'Apple Developer Program sont nécessaires pour
installer l'application sur l'iPhone d'un autre testeur.

## Option recommandée : TestFlight

Cette méthode évite de collecter l'UDID de l'iPhone du testeur.

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
```

Lors de la première exécution, suivre les questions d'EAS pour relier le projet au
compte Expo, se connecter au compte Apple Developer et laisser EAS gérer les
certificats. Une fois le binaire traité dans App Store Connect :

1. Ouvrir l'onglet TestFlight de NexusPlayer.
2. Créer un groupe de testeurs externes.
3. Ajouter l'adresse e-mail du testeur ou activer un lien public.
4. Envoyer l'invitation ; le testeur installe ensuite l'application TestFlight.

Le premier build proposé à des testeurs externes passe par la Beta App Review
d'Apple. Les membres de l'équipe App Store Connect peuvent tester sans cette
étape externe.

## Option rapide : distribution interne ad hoc

Cette méthode produit un lien d'installation, mais l'iPhone doit être enregistré
avant la compilation :

```powershell
npx eas-cli@latest login
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

Envoyer au testeur le lien affiché par `device:create`. Il l'ouvre sur son iPhone
et autorise l'enregistrement de l'appareil. Une nouvelle compilation `preview`
doit ensuite inclure cet appareil. Sur iOS 16 ou ultérieur, une application ad hoc
peut demander l'activation du mode développeur.

## Cibles Apple

- Les profils ci-dessus fixent `EXPO_TV=0` et génèrent l'application iPhone/iPad.
- Pour Apple TV, utiliser une configuration EAS distincte avec `EXPO_TV=1` ; une
  compilation iPhone ne peut pas être installée telle quelle sur Apple TV.
