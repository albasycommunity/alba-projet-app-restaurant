# Livrable — Phase 2 : rôle STAFF et permissions

Système à **4 rôles** avec permissions granulaires pour le personnel, ajouté à
l'authentification existante (JWT + cookie httpOnly + proxy). Ce document
couvre la correction préalable du bug de connexion (Étape 0), le modèle de
données, la matrice permission → onglet, le contrôle d'accès serveur, la
gestion du personnel, les fichiers modifiés, les tests exécutés et les
recommandations.

---

## 1. Étape 0 — correction du bug de connexion (cause racine)

**Symptôme** : des comptes hérités (créés avant la Phase 2) étaient rejetés à la
connexion avec « Ce compte a été désactivé » alors qu'ils étaient actifs.

**Cause racine** : les comptes hérités n'ont pas le champ `actif`. La garde
`exigerRole` / le login testaient `actif === undefined` comme un compte
désactivé, donc **tout compte sans ce champ était bloqué silencieusement**.

**Correction** (à la lecture, jamais à l'écriture) : `normaliserBdd()` dans
`lib/server/bdd.ts` complète, à chaque lecture de la base, les utilisateurs
existants :

- `actif` absent → `true` (le compte reste utilisable) ;
- `permissions` absent → `[]` (liste vide = pas d'accès STAFF particulier).

Aucune migration d'écriture n'est nécessaire : la normalisation est
**rétrocompatible** (version 2 du schéma) et s'applique aux comptes historiques
comme aux comptes futurs.

**Vérification** : un compte de test simulé sans `actif` ni `permissions`
(`legacy@old.sn`) se connecte désormais (HTTP 200) ; les 3 comptes existants
(`superadmin@alba.sn`, `chef@chezfatou.sn`, `client@demo.sn`) passent toujours.

---

## 2. Modèle de données

### Rôles (4)

| Rôle | Accès |
| ---- | ----- |
| `SUPER_ADMIN` | `/super-admin` (plateforme) |
| `RESTAURANT_ADMIN` | `/back-office` + toutes les zones métier (si abonnement actif) |
| `STAFF` (nouveau) | **uniquement** les zones couvertes par ses permissions |
| `CLIENT` | `/` (menu, commande, fidélité) |

### Permissions (7)

`caisse`, `cuisine`, `stock`, `hygiene`, `equipe`, `clients`, `pilotage` —
avec libellés français (`LIBELLES_PERMISSION`) et ordre d'affichage
(`TOUTES_LES_PERMISSIONS`).

### Champs ajoutés à `Utilisateur`

- `permissions: Permission[]` — définit les accès des comptes STAFF ;
  ignoré pour les autres rôles (toujours `[]` chez eux).
- `actif: boolean` — désactivation logique (un compte désactivé est rejeté au
  login et coupé immédiatement, même en session).

### Rétrocompatibilité

- JWT hérités sans `permissions` restent valides (`permissions: []`) mais le
  serveur ne s'y fie jamais (voir § 5) ;
- `normaliserBdd()` rend les comptes historiques fonctionnels (voir § 1).

---

## 3. Matrice permission → onglet et navigation dynamique

### Correspondance permission → zone

| Permission | Zone | Entrée de navigation |
| ---------- | ---- | -------------------- |
| `caisse` | `/caisse` | Caisse |
| `cuisine` | `/cuisine` | Cuisine |
| `stock` | `/stock` | Stock |
| `hygiene` | `/hygiene` | Hygiène |
| `equipe` | `/equipe` | Équipe |
| `clients` | `/clients` | Clients |
| `pilotage` | `/pilotage` | Pilotage |

### Règles

- Un STAFF ne voit **que** ses zones autorisées : la barre de navigation
  mobile (`PRINCIPAL`), le tiroir secondaire (`SECONDAIRE`) et la palette sont
  filtrés par `permissions` (`entréesVisibles` dans `app-shell.tsx`,
  même logique dans `palette.tsx`). Le dernier échelon est une Entrée
  « Personnel » libellée selon la permission.
- **Jamais** d'accès STAFF à `/back-office`, `/abonnement`, `/super-admin`.
  `ABONNEMENT` n'est ni affiché ni proposé à un STAFF.
- Après connexion (`destinationPour`) : le paramètre `suivant` n'est honoré
  que si la cible est couverte par les permissions du STAFF ; sinon il est
  ramené à sa **première zone autorisée** ; sans aucune permission → page
  « Accès non autorisé » (`/acces-refuse`).
- La page `/acces-refuse` est statique et **ne redirige jamais** (pas de
  boucle de redirection).

---

## 4. Contrôle d'accès serveur (runtime, proxy, API)

### Runtime

Le fichier `proxy.ts` (Next 16) s'exécute en **runtime Node.js** : il peut
importer `lib/server/bdd.ts` et relire le store. C'est la barrière principale.

### Vérification fraîche à chaque requête

Le proxy **et** chaque route API rechargent l'utilisateur depuis le store à
chaque requête (`trouverUtilisateur(session.uid)` puis vérification du rôle,
de l'abonnement et des permissions). Conséquences vérifiées :

- retirer une permission à un STAFF connecté est **effectif à la requête
  suivante** (pas besoin de reconnexion) ;
- désactiver un compte coupe ses accès immédiatement ;
- les champs `role`/`permissions` envoyés par le client sont **toujours
  ignorés** (anti-escalade) : un STAFF qui poste `role: RESTAURANT_ADMIN` est
  quand même traité selon son compte dans le store.

### Parcours d'une requête STAFF dans `proxy.ts`

1. Extraction et vérification du JWT (cookie httpOnly) ;
2. Relecture de l'utilisateur dans le store : inconnu ou `actif === false` →
   déconnexion + retour `/login` ;
3. Branche par rôle : `STAFF` → la zone demandée doit appartenir à
   `zonesStaff(permissions)` (testé **avant** `zoneBackOffice`, car les zones
   métier sont incluses dans `ZONES_BACK_OFFICE` — bug d'ordre corrigé) ;
4. Sinon → redirection vers sa première zone autorisée, ou `/acces-refuse`.

### Gardes API

- `exigerRole(Role.RESTAURANT_ADMIN)` : STAFF → 403 sur toutes les routes
  back-office (menu, commandes, abonnement…).
- `exigerPermission(permission)` (nouveau) : `RESTAURANT_ADMIN` passe
  toujours ; un STAFF doit avoir la permission fraîche du store.

---

## 5. Gestion du personnel (UI + API)

### Routes API (RESTAURANT_ADMIN uniquement)

| Route | Méthode | Comportement |
| ----- | ------- | ------------ |
| `/api/back-office/personnel` | GET | Liste du personnel du restaurant |
| `/api/back-office/personnel` | POST | Création : nom, email, mot de passe (bcrypt), permissions |
| `/api/back-office/personnel/[id]` | PATCH | Modification nom / permissions / `actif` |

Règles serveur :

- **Anti-escalade** : le rôle réel créé est toujours `STAFF`, quelles que
  soient les valeurs envoyées ;
- **Unicité email** : vérifiée sur tous les rôles confondus (409 en cas de
  doublon) ;
- **Validation** : au moins une permission requise (400 sinon) ;
- **IDOR** : l'admin d'un restaurant ne peut lire ni modifier le personnel
  d'un autre restaurant (403 vérifié) ;
- **Désactivation logique** : `actif: false` plutôt que suppression.

### UI (`components/personnel/gestion-personnel.tsx`, intégrée à `/back-office`)

- Liste des membres : nom, email, pastilles de permissions, statut actif ;
- Création dans un Sheet : `GroupePermissions` à **bascule fonctionnelle**
  (les clics rapides sur plusieurs cases se cumulent correctement) ;
- Édition : nom + permissions ; désactivation logique ;
- Zones de gestion réservées aux `RESTAURANT_ADMIN` : un STAFF ne voit ni la
  section, ni ses routes API (403).

---

## 6. Fichiers modifiés et créés

| Fichier | Changement |
| ------- | ---------- |
| `lib/auth.ts` | `Role.STAFF`, enum `Permission`, `LIBELLES_PERMISSION`, `TOUTES_LES_PERMISSIONS`, `ZONE_PAR_PERMISSION`/`PERMISSION_PAR_ZONE`, `zonesStaff`, `zoneDaccueilStaff`, `PAGE_ACCES_REFUSE`, `destinationPour` STAFF, champs `permissions`/`actif` |
| `lib/server/auth.ts` | JWT avec `permissions` (filtrées), `exigerRole`, nouvelle garde `exigerPermission` |
| `lib/server/bdd.ts` | `normaliserBdd()` (fix Étape 0, version 2), `creerPersonnel`/`modifierPersonnel`, seed STAFF |
| `proxy.ts` | Branche STAFF avec vérification fraîche, matcher `/acces-refuse`, ordre zones métier/back-office corrigé |
| `app/api/back-office/personnel/route.ts` | GET/POST personnel (créé) |
| `app/api/back-office/personnel/[id]/route.ts` | PATCH personnel, IDOR, anti-escalade (créé) |
| `app/api/auth/login/route.ts`, `app/api/auth/session/route.ts` | `destinationPour` avec permissions ; session expose `permissions` |
| `components/personnel/gestion-personnel.tsx` | UI de gestion du personnel (créé) |
| `components/app-shell.tsx`, `components/palette.tsx` | Navigation et palette filtrées par permissions |
| `app/(espace-restaurant)/back-office/page.tsx` | Section « Gestion du personnel » intégrée |
| `app/acces-refuse/page.tsx` | Page « Accès non autorisé » (créée) |
| `app/login/page.tsx` | Compte démo STAFF ajouté |
| `data/alba-bdd.json` | Comptes STAFF seedés + comptes de test nettoyés |
| `LIVRABLE-PHASE-2-STAFF.md` | Ce document (créé) |

---

## 7. Tests exécutés (tous vérifiés)

### Étape 0 et connexion

- Compte hérité sans `actif`/`permissions` → login **200** ;
- Les 5 comptes de démonstration → login 200 avec la bonne destination ;
- Login STAFF via le **formulaire réel** en production → arrivée sur sa
  première zone autorisée, aucune erreur JS.

### Navigation dynamique (production, DOM réel)

| Compte | Entrées visibles |
| ------ | ---------------- |
| Caissière (`caisse`+`clients`) | `/caisse`, `/clients` — pas d'autre entrée |
| Admin restaurant | 9 entrées complètes (`/pilotage` … `/abonnement`) |
| STAFF `caisse`+`cuisine`+`pilotage` | Pilotage, Caisse, Cuisine |

### Proxy / accès aux zones (production)

| Scénario | Résultat |
| -------- | -------- |
| Caissière → `/caisse`, `/clients` | 200 |
| Caissière → `/cuisine` | 307 → `/caisse` |
| Cuisinier → `/cuisine` | 200 |
| Cuisinier → `/caisse` | 307 → `/cuisine` |
| Admin r1 → `/back-office` | 200 |
| Admin r2 (abonnement expiré) → `/back-office` | 307 → `/abonnement/renouveler` |

### API personnel

| Scénario | Résultat |
| -------- | -------- |
| STAFF → GET/POST `/api/back-office/personnel` | **403** |
| Admin → création membre | 201, rôle réel `STAFF` (escalade ignorée) |
| Création sans permission | **400** |
| Email déjà utilisé | **409** |
| Admin r1 → PATCH personnel de r2 (IDOR) | **403** |
| Retrait de `caisse` à une caissière connectée → `/caisse` | 307 → `/clients` (frais) |
| Restauration de `caisse` | 200 (frais) |

### Qualité

- `npx tsc --noEmit` : aucune erreur ;
- `npx next build` : succès — routes `/acces-refuse`, `/api/back-office/personnel`
  et `/api/back-office/personnel/[id]` présentes ;
- ESLint : **non configuré dans le projet** (aucun `eslint.config.*`,
  pré-existant — à corriger indépendamment ; le typecheck et le build servent
  de garde-fous).

---

## 8. Comptes de démonstration (seed)

| Rôle | Email | Mot de passe | Accès |
| ---- | ----- | ------------ | ----- |
| Super admin | `superadmin@alba.sn` | `SuperAlba2026!` | `/super-admin` |
| Admin restaurant | `chef@chezfatou.sn` | `Fatou2026!` | `/back-office` |
| **STAFF — caissière** | `caissiere@chezfatou.sn` | `Caissiere2026!` | `/caisse`, `/clients` |
| **STAFF — cuisinier** | `cuisinier@chezfatou.sn` | `Cuisinier2026!` | `/cuisine` |
| Admin (abo expiré, démo) | `gora@baobabbleu.sn` | `Gora2026!` | redirigé vers renouvellement |
| Client | `client@demo.sn` | `Client2026!` | `/` |

**À changer avant toute mise en production.**

---

## 9. Recommandations

1. **Invitation par email** : remplacer la saisie du mot de passe à la création
   du personnel par un lien d'invitation (jeton à usage unique) — le chef ne
   connaîtra plus les mots de passe.
2. **Journal d'audit** : tracer les créations/modifications/désactivations de
   comptes et les changements de permissions (qui, quoi, quand) — requis pour
   la responsabilisation des accès.
3. **ESLint** : ajouter `eslint.config.mjs` et rendre `pnpm lint` effectif
   (configuration absente à ce jour).
4. **Passer à une vraie base** : les contrôles (IDOR, fraîcheur) reposent sur
   le store ; les conserver tels quels lors de la migration vers une BDD
   réelle (`lib/server/bdd.ts` est le seul point d'accès aux données).
5. **JWT_SECRET** : régénérer en production et utiliser des variables
   d'environnement uniquement.
