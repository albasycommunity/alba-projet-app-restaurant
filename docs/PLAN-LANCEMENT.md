# Plan de lancement d'Alba — prêt à vendre

Statut : produit fonctionnel (caisse offline-first, multiposte, onboarding,
pilotage en données réelles). Ce plan liste **exactement** ce qui reste
avant d'encaisser le premier client — ordre = priorité.

---

## 1. Encaisser pour de vrai (BLOQUANT — rien ne se vend sans)

Le code de paiement est **terminé** : création de transaction, checkout,
webhook signé HMAC, activation auto, flux manuel de repli. Il ne reste
que du **paramétrage** :

- [ ] **Ouvrir un compte NabooPay** (ou agrégateur équivalent : Wave /
      Orange Money via API) et obtenir :
      - une **clé API** (scope `write` / `read_write`),
      - un **secret de webhook**.
- [ ] **Panel super admin → « Moyens de paiement »** (`/super-admin`) :
      - coller la clé API + le secret,
      - activer l'interrupteur NabooPay.
- [ ] **Env Vercel** : retirer `NABOOPAY_MOCK=mock` (ou le mettre à
      n'importe quelle autre valeur). Ne jamais re-run `mock` en prod.
- [ ] **Dashboard NabooPay** : enregistrer le webhook → pointeurs sur
      `https://<domaine>/api/webhooks/naboopay` (l'URL s'affiche dans le
      panel super admin).
- [ ] **Test réel en préproduction** : payer 5 000 F un Starter, vérifier
      webhook → abonnement `actif`, annulation → `expire`.
- [ ] **Flux manuel (fallback)** : renseigner les numéros Wave / Orange
      Money / Free Money dans le panel ; la validation se fait déjà par
      le super admin.

Rappel sécurité (déjà en place) : les clés ne sont jamais renvoyées au
client, le prix est toujours recalculé côté serveur, la signature est
vérifiée avant tout traitement.

## 2. Label + domaine (très vite)

- [ ] Acheter un nom de domaine propre (ex. `alba.sn`, ~10-15k FCFA/an).
- [ ] Le connecter à Vercel (DNS automatique) — remplacer l'URL
      `*.vercel.app` (actuellement protégée SSO, pas présentable).
- [ ] Reconfigurer le webhook NabooPay avec le nouveau domaine.
- [ ] Vérifier HTTPS + redirection `www` → racine.

---

## 3. Production hardening (avant 1er client)

### Supervision
- [ ] Activer le plan **Vercel Pro** (nécessaire pour une vraie équipe /
      sauvegardes / logs) ou surveiller la page `/api/sante`.
- [ ] Alerter sur les échecs de webhook : le `logger` écrit déjà tout
      (signature invalide, rejets) — brancher une alerte e-mail ou Slack
      sur les logs d'erreurs.
- [ ] **Sauvegardes Supabase** : activer les sauvegardes quotidiennes
      (Plan Pro) — la table `commandes_restaurant`, `decaissements_restaurant`,
      `transactions_paiement`, `parametres_paiement` contiennent la caisse.

### Sécurité
- [ ] Vérifier les **policies RLS** couvrent TOUTES les tables (migrations
      déjà appliquées : commandes, décaissements, onboarding, paiements).
- [ ] `JWT_SECRET` : déjà ≥ 32 caractères — changer si jamais exposé.
- [ ] Taux de rate-limit déjà en place sur les routes sensibles
      (register 5, webhook 60/min, renouvellement 5/min).

### Qualité
- [ ] Commit un vrai parcours d'e2e de vente (le script de test jetable
      `test-e2e-sync.mjs` qui avait servi au déploiement est à reprndre en
      version pérenne + un flux de paiement mock).
- [ ] Un test sur mobile (vrai téléphone, réseau coupé) : caisse →
      cuisine → retour online.

---

## 4. Lois & conformité (obligatoire pour vendre)

- [ ] **CGV** : afficher sur la landing, lier dans le footer.
- [ ] **Politique de confidentialité** (loi sénégalaise n°2021-12 sur les
      données personnelles + RGPD si clients européens).
- [ ] **Mentions légales** : identification de l'éditeur, contact, conditions
      de l'abonnement (paiement, remboursement, résiliation).
- [ ] Droits de rétractation & remboursements — aligner avec la politique
      NabooPay (fees_customer_side=false déjà posé).
- [ ] **Factures/reçus d'abonnement** : générer un PDF simple côté serveur
      après chaque paiement (à ajouter — modèle : `components/caisse/pdf-facture.tsx`).

---

## 5. Support & opérations

- [ ] Créer une boîte e-mail (ex. contact@alba.sn), affichée dans l'app
      (footer/moncompte) + lien WhatsApp.
- [ ] Document fastes « activation manuelle » pour le flux de secours
      (super admin : marquer un paiement reçu sans webhook).
- [ ] MODE DE TEST pour tout nouveau compte : le mode découverte reste
      toute l'expérience d'essai — déjà en place.

---

## 6. Tarifs & chiffres qui restent à décider

- [ ] Valider définitivement les 3 paliers (Starter 15 000 / Pro 35 000 /
      Premium ×, mensuel & annuel avec 2 mois offerts) — valeurs déjà dans
      le code, modifiables d'une constante.
- [ ] Décider du seuil viable (coût Vercel Pro + Supabase Pro ≈ à couvrir :
      ~10 restaurants Pro suffisent).

---

## Prochaine action (recommandée)

1. Préparer le compte NabooPay (ou Wave API) — le formulaire panel est prêt.
2. Acheter le domaine.
3. Quand les clés sont là : ce repo est prêt en 10 minutes (env + panel,
   sans toucher au code) — puis test de paiement en préproduction.

_Note : aucun de ces points ne nécessite de développement ; tout le code
est déjà en place. C'est une liste d'actions opérationnelles._