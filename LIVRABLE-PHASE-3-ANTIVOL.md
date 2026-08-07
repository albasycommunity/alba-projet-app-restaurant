# Livrable — Phase 3 : contrôle du coulage / anti-vol (caisse)

Fonctionnalité ajoutée à l'écran Caisse (`/caisse`) pour les environnements à
forte rotation et à forte manipulation d'espèces : traçabilité des sorties de
caisse et des annulations. Ce document couvre le modèle de données, les actions
du store, l'UI, les fichiers modifiés, et les points à durcir avant la
production.

---

## 1. Décaissements (sorties d'espèces tracées)

### Besoin

Le caissier doit pouvoir sortir de l'argent (espèces) pour des dépenses
ponctuelles du jour (glaçons, petite monnaie, achats d'urgence) **tout en
laissant une trace** : montant, motif, auteur, horodatage.

### Flux

1. Bouton **Décaissement** dans l'en-tête de `/caisse`.
2. Sheet `DecaissementSheet` : montant (FCFA) + motif **obligatoire**.
3. Validation → action `ajouterDecaissement` → nouvelle entrée `Decaissement`
   ajoutée à l'état ; notification de confirmation + vibration.

### Règles de calcul

- Les décaissements sont déduits **uniquement** du fond de caisse **Espèces**
  (`socle['Espèces'] = Math.max(0, socle['Espèces'] - totalDecaissements)` dans
  le calcul `indicateurs` de `lib/store.tsx`). Les autres moyens de paiement
  (Wave, Orange Money, Free Money) ne sont pas touchés.
- Validation côté UI : montant entier > 0 et non vide, motif non vide.

### Donnée

```ts
type Decaissement = {
  id: string
  montant: number        // FCFA
  motif: string          // obligatoire
  date: number           // timestamp ms
  parId?: string         // auteur (membre d'équipe sur caisse)
  synchronise: boolean   // false : local uniquement (voir § 4)
}
```

---

## 2. Historique de la journée + annulation par PIN

### Besoin

Le caissier consulte les tickets encaissés de la journée. Une erreur de saisie
ou un ticket refusé doit pouvoir être annulé, mais **uniquement avec le code
secret du manager** — jamais par le caissier seul.

### Flux

1. Bouton **Historique** dans l'en-tête de `/caisse`.
2. `HistoriqueCaisseSheet` affiche les commandes encaissées (celles possédant au
   moins un règlement), triées de la plus récente à la plus ancienne :
   référence du ticket, heure, total.
3. Bouton **Annuler** sur un ticket → dialogue PIN (`PinDialog`).
4. Saisie du PIN manager (`PIN_MANAGER`, `1234` par défaut dans `lib/data.ts`) :
   - correct → action `annulerCommande` : la commande est retirée de l'état ;
   - incorrect → message d'erreur + vibration, le PIN est remis à zéro.

### Règles

- L'annulation **ne peut pas** être librement faite par le caissier : elle est
  volumée-derrière le PIN.
- Après annulation, un encaissement local revient dans les indicateurs
  (`caLocal` est recalculé depuis `etat.commandes`), donc le CA de la session
  et le fond de caisse reflètent l'annulation.

---

## 3. Fichiers modifiés et créés

| Fichier | Changement |
| ------- | ---------- |
| `components/caisse/decaissement-caisse.tsx` | Sheet de décaissement (créé) |
| `components/caisse/historique-caisse.tsx` | Historique des tickets + dialogue PIN (créé) |
| `components/caisse/caisse-client.tsx` | Boutons Historique / Décaissement intégrés à l'en-tête (modifié) |
| `lib/data.ts` | Consultant `PIN_MANAGER`, type `Decaissement` (modifié) |
| `lib/store.tsx` | Actions `ajouterDecaissement`, `annulerCommande`, champ `decaissements`, déduction Espèces (modifié) |
| `LIVRABLE-PHASE-3-ANTIVOL.md` | Ce document (créé) |

---

## 4. Limites à durcir avant la production

1. **Annulation définitive** : `annulerCommande` retire la commande de l'état.
   Il manque un journal d'annulation (ticket original conservé avec mention
   « annulé par PIN ») pour l'audit.
2. **Synchronisation des décaissements** : les décaissements restent en local
   (`synchronise: false`) ; ils ne sont pas encore poussés au cloud contrairement
   aux commandes (`enAttente`).
3. **PIN en dur** : `PIN_MANAGER = '1234'` est présent côté client. Il faut le
   vérifier côté serveur (API) et permettre à l'admin de le changer.
4. **Filtre « jour »** : l'historique liste toutes les commandes encaissées de
   l'état local ; un vrai filtre par journée est à ajouter pour les longues
   sessions.

---

## 5. Tests exécutés (tous vérifiés)

- `npx tsc --noEmit` : aucune erreur.
- `npx next build` : succès — les routes `/caisse` existent et le module compile.
- ESLint : non configuré dans le projet (garde-fous = typecheck + build).

---

## 6. Comptes de démonstration pertinents (seed)

| Rôle | E-mail | Mot de passe | Accès |
| ---- | ------ | ------------ | ----- |
| Admin restaurant | `chef@chezfatou.sn` | `Fatou2026!` | `/back-office` (abo actif) |
| STAFF — caissière | `caissiere@chezfatou.sn` | `Caissiere2026!` | `/caisse`, `/clients` |

PIN manager de démonstration : **1234** (`lib/data.ts`).

---

## 7. Propositions d'extension

1. **Journal d'audit** cohérent : chaque annulation garde une trace lisible
   (ticket, montant, motif, auteur, heure).
2. **PIN serveur** : vérification de l'annulation via une route API dédiée.
3. **Clôture de caisse** : bilan de fin de journée (encaissements −
   décaissements = fond attendu, écart constaté).