# Comptes, abonnements et appareils

## Principe

L'accès est lié à un compte et à un droit d'abonnement vérifié côté serveur. Il
n'est jamais lié à une adresse MAC : celle-ci n'est ni stable, ni portable, ni
accessible de façon fiable sur les plateformes Apple.

Chaque installation possède un identifiant aléatoire conservé dans
`expo-secure-store`. Le serveur associe cet identifiant au compte après connexion
et applique la limite d'appareils du forfait.

## Architecture retenue

- Supabase Auth : e-mail avec lien magique, Apple et Google.
- RevenueCat : validation des achats App Store / Play Store et restauration.
- API NexusPlayer : source de vérité pour les droits et la liste des appareils.
- SecureStore : jeton de session et identifiant d'installation uniquement.
- SQLite : favoris et progression locaux ; la synchronisation distante viendra
  après l'authentification et restera tolérante au mode hors ligne.

## Contrat API déjà préparé dans l'application

- `POST /v1/devices` : enregistrer l'installation courante ;
- `GET /v1/devices` : afficher les appareils du compte ;
- `DELETE /v1/devices/:id` : libérer une place ;
- `GET /v1/entitlement` : retourner le forfait, l'expiration et la limite.

Toutes les routes exigent un jeton Bearer. Le client n'envoie ni adresse MAC, ni
URL IPTV, ni identifiants de fournisseur.

## Étapes serveur restantes

1. Créer le projet Supabase et les tables `profiles`, `devices`, `entitlements`.
2. Créer le projet RevenueCat et les produits Apple/Google.
3. Relier les webhooks RevenueCat à l'API pour actualiser `entitlements`.
4. Configurer `EXPO_PUBLIC_NEXUS_API_URL` pour les builds.
5. Ajouter l'écran de connexion et la gestion des appareils après fourniture des
   identifiants publics Supabase et RevenueCat.
6. Tester achat, restauration, expiration, dépassement de limite et révocation.

Les clés privées RevenueCat, Supabase service-role et App Store Connect doivent
rester exclusivement sur le serveur.

## Modèle commercial retenu

| Formule | Prix de référence | Appareils | Lectures | Publicité | Cloud |
| --- | ---: | ---: | ---: | --- | --- |
| Gratuit | 0 € | 1 | 1 | Oui | Non |
| Premium | 19,99 €/an | 3 | 1 | Non | Oui |
| Family | 34,99 €/an | 6 | 3 | Non | Oui |
| Local à vie | 29,99 € | 1 | 1 | Non | Non |

La limite de lecture NexusPlayer contrôle uniquement les sessions de l'application.
Elle ne remplace jamais la limite de connexions imposée par la source de
l'utilisateur. Les prix affichés dans l'application devront provenir de l'App
Store ou de Google Play au moment de l'achat ; les valeurs ci-dessus servent au
positionnement produit et ne doivent pas être codées comme preuve d'un achat.

## État du client mobile

- Réalisé sur `feature/accounts-subscriptions` : catalogue central des formules,
  résolution d'un droit serveur avec expiration, limites d'appareils et de
  lectures, écran bilingue Compte et abonnement, appareil local anonyme et gestion
  des appareils distants.
- Le mode gratuit local reste le repli obligatoire lorsque le compte, le réseau ou
  le serveur est indisponible.
- Aucun bouton d'achat actif ne doit apparaître avant l'intégration RevenueCat et
  la validation des produits réels dans les deux stores.
- Prochain lot : authentification Supabase, restauration de session, puis achats et
  restauration RevenueCat avec validation serveur des webhooks.
