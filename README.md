# alba — gestion de restaurant (système d'authentification et de rôles)

App Next.js 16 (App Router, offline-first) étendue avec un système à **3 rôles** :

1. **Super admin** (`/super-admin`) — vue globale de la plateforme, gestion des abonnements et des comptes.
2. **Admin restaurant** (`/back-office`, `/pilotage`, `/caisse`, …) — back-office de son établissement, accessible **uniquement si son abonnement est actif**.
3. **Client** (`/`) — menu, commande en ligne, Carte de Fidélité (pas d'abonnement).

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
| Admin restaurant | `gora@baobabbleu.sn`    | `Gora2026!`     | redirigé vers `/abonnement/renouveler` (abonnement expiré — scénario de démo) |
| Admin restaurant | `adama@teranga.sn`      | `Adama2026!`    | `/back-office` (abo annuel actif) |
| Client          | `client@demo.sn`         | `Client2026!`   | `/` (menu + fidélité)    |

**À changer avant toute mise en production.**

## Redirection après connexion

- `SUPER_ADMIN` → `/super-admin`
- `RESTAURANT_ADMIN` → `/back-office` (ou `/abonnement/renouveler` si abonnement non actif)
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
app/login, app/register           → connexion / inscription client
app/super-admin/                  → plateforme : vue d'ensemble, restaurants,
                                    abonnements, comptes
app/api/                          → routes protégées (rôle + abonnement revalidés)
```

### Sécurité

- Mots de passe **bcrypt** (jamais en clair, `password_hash` uniquement).
- Session **JWT signé (HS256)** dans un cookie **httpOnly** (24 h).
- `proxy.ts` **et** chaque route API revalident le rôle et le statut
  d'abonnement depuis le store : un `CLIENT` ne peut pas appeler une route de
  gestion du menu, un abonnement suspendu coupe le back-office immédiatement.
- Tous les secrets passent par les variables d'environnement (`.env.local`).

### Flux d'abonnement

1. Le chef paie le super admin par Wave / Orange Money / Free Money (`/abonnement/renouveler`).
2. L'abonnement passe en `en_attente`, un paiement est enregistré.
3. Le super admin confirme la réception dans `/super-admin` → statut `actif`, nouvelle échéance.
4. Bannière d'alerte dans le back-office quand l'échéance approche (< 7 jours).

## Commandes utiles

```bash
pnpm dev       # serveur de développement
pnpm build     # build de production
pnpm lint      # ESLint
```

## Rendu sur v0 / GitHub

Ce dépôt reste lié à [v0](https://v0.app/chat/projects/prj_azmiYgaleY0N2JY8Yi9Nkk8AaAU9).
