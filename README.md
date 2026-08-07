# alba — gestion de restaurant (système d'authentification et de rôles)

App Next.js 16 (App Router, offline-first) étendue avec un système à **4 rôles** :

1. **Super admin** (`/super-admin`) — vue globale de la plateforme, gestion des abonnements et des comptes.
2. **Admin restaurant** (`/back-office`, `/pilotage`, `/caisse`, …) — back-office de son établissement, accessible **uniquement si son abonnement est actif**.
3. **Personnel (STAFF)** — accès limité aux onglets couverts par ses permissions (`caisse`, `cuisine`, `stock`, `hygiene`, `equipe`, `clients`, `pilotage`), géré depuis `/back-office` → « Gestion du personnel ». Un membre sans permission est redirigé vers `/acces-refuse`.
4. **Client** (`/`) — menu, commande en ligne, Carte de Fidélité (pas d'abonnement).

## Démarrage

```bash
cp .env.example .env.local   # puis remplace JWT_SECRET par une clé aléatoire
pnpm install
pnpm dev
```

> Ce projet a été déplacé vers **pnpm 11** avec `node-linker=hoisted` (voir `.npmrc`),
> nécessaire sous Windows : `pnpm` est fourni via `corepack pnpm` si non installé.

La base de données est un fichier JSON (`data/alba-bdd.json`) créé et seedé au
premier lancement — remplaçable par une vraie base (les fonctions de
`lib/server/bdd.ts` sont le seul point d'accès aux données).

## Comptes de démonstration (seed)

| Rôle            | Email                    | Mot de passe    | Accès                    |
| --------------- | ------------------------ | --------------- | ------------------------ |
| Super admin     | `superadmin@alba.sn`     | `SuperAlba2026!` | `/super-admin`          |
| Admin restaurant | `chef@chezfatou.sn`     | `Fatou2026!`    | `/back-office` (abo actif, expire dans ~17 j) |
| Personnel (STAFF) | `caissiere@chezfatou.sn` | `Caissiere2026!` | `/caisse`, `/clients`  |
| Personnel (STAFF) | `cuisinier@chezfatou.sn` | `Cuisinier2026!` | `/cuisine`            |
| Admin restaurant | `gora@baobabbleu.sn`    | `Gora2026!`     | redirigé vers `/abonnement/renouveler` (abonnement expiré — scénario de démo) |
| Admin restaurant | `adama@teranga.sn`      | `Adama2026!`    | `/back-office` (abo annuel actif) |
| Client          | `client@demo.sn`         | `Client2026!`   | `/` (menu + fidélité)    |

**À changer avant toute mise en production.**

## Redirection après connexion

- `SUPER_ADMIN` → `/super-admin`
- `RESTAURANT_ADMIN` → `/back-office` (ou `/abonnement/renouveler` si abonnement non actif)
- `STAFF` → sa première zone autorisée (ou `/acces-refuse` si aucune permission)
- `CLIENT` → `/`

## Architecture

```
proxy.ts                          → barrière par rôle (Next 16, runtime Node) :
                                    vérifie le JWT + re-lit l'abonnement dans le store
lib/auth.ts                       → modèle : Role, Utilisateur, Abonnement, Paiement, plans
lib/server/bdd.ts                 → store JSON (seed + CRUD) — server-only
lib/server/auth.ts                → JWT (jose), cookie httpOnly, garde exigerRole()
lib/auth-contexte.tsx             → session côté client (useAuth)
components/menu-store.tsx         → menu éditable (back-office ↔ carte client)
app/(espace-restaurant)/          → back-office : pilotage, caisse, cuisine, stock,
                                    hygiène, équipe, clients, abonnement
app/                              → accueil client (/) — menu, panier, fidélité
app/login, app/register   → connexion / inscription client
app/acces-refuse/         → page « Accès non autorisé » (STAFF sans permission)
app/super-admin/          → plateforme : vue d'ensemble, restaurants,
                            abonnements, comptes
app/api/back-office/personnel → gestion du personnel (STAFF) — admin uniquement
app/api/                          → routes protégées (rôle + abonnement + permissions revalidés)
```

### Sécurité

- Mots de passe **bcrypt** (jamais en clair, `password_hash` uniquement).
- Session **JWT signé (HS256)** dans un cookie **httpOnly** (24 h).
- `proxy.ts` **et** chaque route API revalident le rôle, le statut
  d'abonnement **et les permissions** depuis le store : un `CLIENT` ne peut
  pas appeler une route de gestion du menu, un STAFF n'atteint que ses zones
  autorisées, un abonnement suspendu coupe le back-office immédiatement.
- Anti-escalade : `role` et `permissions` sont toujours déterminés côté
  serveur, jamais à partir des champs envoyés par le client ; l'email reste
  unique sur tous les rôles.
- Tous les secrets passent par les variables d'environnement (`.env.local`).

### Flux d'abonnement

1. Le chef paie le super admin par Wave / Orange Money / Free Money (`/abonnement/renouveler`).
2. L'abonnement passe en `en_attente`, un paiement est enregistré.
3. Le super admin confirme la réception dans `/super-admin` → statut `actif`, nouvelle échéance.
4. Bannière d'alerte dans le back-office quand l'échéance approche (< 7 jours).

### Contrôle du coulage / anti-vol (caisse)

Deux garde-fous dans `/caisse`, en plus de l'encaissement :

- **Décaissement** : sortie d'espèces tracée (montant + motif obligatoire, auteur
  enregistré). Le total est soustrait **uniquement** du fond de caisse Espèces
  (`component.caisse.decaissement-caisse.tsx` → `lib/store.tsx` action
  `ajouterDecaissement`). Les décaissements restent en local pour l'instant
  (pas encore poussés au cloud, volontairement).
- **Historique + annulation par PIN** : `HistoriqueCaisseSheet` liste les
  tickets encaissés (heure + total). Annuler un ticket ouvre un dialogue qui
  exige le **PIN manager** (`PIN_MANAGER`, `1234` par défaut dans
  `lib/data.ts`) avant de retirer la commande de la caisse (action
  `annulerCommande`).

> **Sécurité** : le PIN est en dur dans `lib/data.ts` pour ce prototype. En
> production, le déplacer du côté serveur (vérifié via API, jamais exposé au
> client) et permettre son changement par l'admin.

## Commandes utiles

```bash
pnpm dev       # serveur de développement
pnpm build     # build de production
pnpm lint      # ESLint
```

## Rendu sur v0 / GitHub

Ce dépôt reste lié à [v0](https://v0.app/chat/projects/prj_azmiYgaleY0N2JY8Yi9Nkk8AaAU9).
