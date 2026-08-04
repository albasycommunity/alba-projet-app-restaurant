/**
 * Vérification manuelle de la Phase 3 — exécution contre un serveur de
 * dev DÉMARRÉ :
 *
 *   1.  pnpm dev          (dans un terminal, avec .env.local chargé)
 *   2.  pnpm verif:rh      (dans un autre terminal)
 *
 * Couvre la checklist de non-régression + les exigences RH :
 *   - connexion sur les comptes de démo ;
 *   - /api/sante ;
 *   - pointage réel, déclaration d'absence, changement de mot de passe
 *     (self-service, ancien mot de passe vérifié) ;
 *   - IDOR explicite : une gérante ne voit/traite JAMAIS l'équipe ni les
 *     absences d'un autre restaurant, même en manipulant la requête ;
 *   - STAFF bloqué sur les routes RH sensibles et le back-office ;
 *   - verrou Starter (limite 1 STAFF) à la création du personnel ;
 *   - fiche RH créée avec le compte (champ « poste » obligatoire) ;
 *   - paiement NabooPay simulé (activation automatique d'abonnement),
 *     testé uniquement si le serveur tourne en NABOOPAY_MOCK=mock.
 *
 * Aucune dépendance : fetch natif + gestion manuelle du cookie de session.
 */

import { createClient } from '@supabase/supabase-js'

const BASE = process.env.VERIF_BASE ?? 'http://localhost:3000'

let reussites = 0
let echecs = 0
const detailEchecs: string[] = []

function verifier(nom: string, condition: boolean, detail?: string) {
  if (condition) {
    reussites += 1
    console.log(`  ✔ ${nom}`)
  } else {
    echecs += 1
    detailEchecs.push(`${nom}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✘ ${nom}${detail ? ` — ${detail}` : ''}`)
  }
}

/* ----------------------------- client HTTP ----------------------------- */

type Client = {
  requete: (
    chemin: string,
    options?: { methode?: string; corps?: unknown },
  ) => Promise<{ statut: number; donnees: any }>
}

function nouveauClient(): Client {
  const cookies = new Map<string, string>()
  return {
    requete: async (chemin, options = {}) => {
      const entetes: Record<string, string> = {
        'Sec-Fetch-Site': 'same-origin',
        Cookie: [...cookies.entries()]
          .map(([cle, valeur]) => `${cle}=${valeur}`)
          .join('; '),
      }
      if (options.corps !== undefined) entetes['Content-Type'] = 'application/json'
      const reponse = await fetch(`${BASE}${chemin}`, {
        method: options.methode ?? 'GET',
        headers: entetes,
        body:
          options.corps !== undefined
            ? JSON.stringify(options.corps)
            : undefined,
      }).catch(() => null)
      if (reponse === null) {
        return { statut: 0, donnees: null }
      }
      for (const cle of reponse.headers.getSetCookie?.() ?? []) {
        const [morceau] = cle.split(';')
        const [nom, val] = morceau.split('=')
        if (nom) cookies.set(nom.trim(), val ?? '')
      }
      const donnees = await reponse.json().catch(() => null)
      return { statut: reponse.status, donnees }
    },
  }
}

async function connecter(client: Client, email: string, motDePasse: string) {
  const { statut } = await client.requete('/api/auth/login', {
    methode: 'POST',
    corps: { email, motDePasse },
  })
  return statut === 200
}

/* --------------------------------- main --------------------------------- */

async function principal() {
  console.log(`\n[verif-rh] base : ${BASE}\n`)

  /* ------------------------- 1. santé + connexions ------------------------- */
  console.log('[1] Santé et connexions des comptes de démo')
  const clientSante = nouveauClient()
  const sante = await clientSante.requete('/api/sante')
  verifier(
    'GET /api/sante → 200 ok',
    sante.statut === 200 && sante.donnees?.ok === true,
    `statut=${sante.statut}`,
  )

  const comptes = [
    ['superadmin@alba.sn', 'SuperAlba2026!'],
    ['chef@chezfatou.sn', 'Fatou2026!'],
    ['gora@baobabbleu.sn', 'Gora2026!'],
    ['adama@teranga.sn', 'Adama2026!'],
    ['caissiere@chezfatou.sn', 'Caissiere2026!'],
    ['cuisinier@chezfatou.sn', 'Cuisinier2026!'],
    ['client@demo.sn', 'Client2026!'],
  ] as const
  for (const [email] of comptes) {
    const client = nouveauClient()
    verifier(
      `Connexion ${email}`,
      await connecter(client, email, comptes.find(([e]) => e === email)![1]),
    )
  }

  /* -------------------- 2. espaces personnels (STAFF) -------------------- */
  console.log('\n[2] Espace personnel de la caissière (STAFF)')
  const caissiere = nouveauClient()
  verifier(
    'Connexion caissiere@chezfatou.sn',
    await connecter(caissiere, 'caissiere@chezfatou.sn', 'Caissiere2026!'),
  )

  const monCompte = await caissiere.requete('/api/rh/mon-compte')
  verifier(
    'GET /api/rh/mon-compte → 200 (accessible sans permission Équipe)',
    monCompte.statut === 200,
    `statut=${monCompte.statut}`,
  )
  verifier(
    'Fiche RH présente ou « null » explicite, jamais d’erreur 500',
    monCompte.statut === 200 &&
      (monCompte.donnees?.fiche === null ||
        typeof monCompte.donnees?.fiche?.poste === 'string'),
  )

  const pointer = await caissiere.requete('/api/rh/pointer', {
    methode: 'POST',
    corps: { type: 'arrivee' },
  })
  verifier(
    'POST /api/rh/pointer → 200 (pointage réel persisté)',
    pointer.statut === 200 && pointer.donnees?.ok === true,
    `statut=${pointer.statut}`,
  )

  const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const absence = await caissiere.requete('/api/rh/absences', {
    methode: 'POST',
    corps: { date: demain, type: 'retard', motif: 'Test de vérification RH' },
  })
  verifier(
    'POST /api/rh/absences → 200 (déclaration pour soi-même)',
    absence.statut === 200 && absence.donnees?.ok === true,
    `statut=${absence.statut}`,
  )
  const idAbsence = absence.donnees?.absence?.id

  const mdp = await caissiere.requete(
    '/api/rh/mon-compte/changer-mot-de-passe',
    {
      methode: 'POST',
      corps: { motDePasseActuel: 'MauvaisMotDePasse', nouveauMotDePasse: 'Nouveau2026!' },
    },
  )
  verifier(
    'Changement de mot de passe : ancien mauvais → 400 (rien n’a changé)',
    mdp.statut === 400,
    `statut=${mdp.statut}`,
  )

  /* ----------------- 3. STAFF bloqué sur le RH sensible ----------------- */
  console.log('\n[3] STAFF bloqué sur les routes RH sensibles')
  const equipeStaff = await caissiere.requete('/api/rh/equipe')
  verifier(
    'GET /api/rh/equipe (STAFF) → 403',
    equipeStaff.statut === 403,
    `statut=${equipeStaff.statut}`,
  )
  const personnelStaff = await caissiere.requete('/api/back-office/personnel')
  verifier(
    'GET /api/back-office/personnel (STAFF) → 403',
    personnelStaff.statut === 403,
    `statut=${personnelStaff.statut}`,
  )
  const cuisinier = nouveauClient()
  await connecter(cuisinier, 'cuisinier@chezfatou.sn', 'Cuisinier2026!')
  const equipeCuisinier = await cuisinier.requete('/api/rh/equipe')
  verifier(
    'GET /api/rh/equipe (cuisinier, permission Cuisine seule) → 403',
    equipeCuisinier.statut === 403,
    `statut=${equipeCuisinier.statut}`,
  )

  /* ------------------- 4. vue équipe de la gérante (IDOR) ------------------- */
  console.log('\n[4] Vue RH de la gérante de Chez Fatou (r1)')
  const chef = nouveauClient()
  verifier(
    'Connexion chef@chezfatou.sn',
    await connecter(chef, 'chef@chezfatou.sn', 'Fatou2026!'),
  )
  const vueChef = await chef.requete('/api/rh/equipe')
  verifier(
    'GET /api/rh/equipe (cheffe) → 200',
    vueChef.statut === 200,
    `statut=${vueChef.statut}`,
  )
  const nomsChef = (vueChef.donnees?.employes ?? []).map(
    (e: { utilisateur: { nom: string } }) => e.utilisateur.nom,
  )
  verifier(
    'La cheffe voit SA caissière (Aïssatou Diallo)',
    nomsChef.some((n: string) => n.includes('Aïssatou')),
    nomsChef.join(', '),
  )
  verifier(
    'La cheffe voit SON cuisinier (Moussa Sow)',
    nomsChef.some((n: string) => n.includes('Moussa')),
    nomsChef.join(', '),
  )
  verifier(
    'IDOR : la cheffe ne voit AUCUN employé des autres restaurants (Gora, Adama…)',
    !nomsChef.some(
      (n: string) => n.includes('Gora') || n.includes('Adama'),
    ),
    nomsChef.join(', '),
  )
  const attenteChef = vueChef.donnees?.absencesEnAttente ?? []
  verifier(
    'L’absence déclarée par la caissière apparaît dans la file d’attente',
    attenteChef.some((a: { id: string }) => a.id === idAbsence),
  )

  /* ---------------------- 5. gérante d'un autre restaurant ---------------------- */
  console.log('\n[5] La gérante du Baobab Bleu (r2) ne touche pas Chez Fatou')
  const gora = nouveauClient()
  verifier(
    'Connexion gora@baobabbleu.sn',
    await connecter(gora, 'gora@baobabbleu.sn', 'Gora2026!'),
  )
  const vueGora = await gora.requete('/api/rh/equipe')
  verifier(
    'GET /api/rh/equipe (r2) → 200',
    vueGora.statut === 200,
    `statut=${vueGora.statut}`,
  )
  const nomsGora = (vueGora.donnees?.employes ?? []).map(
    (e: { utilisateur: { nom: string } }) => e.utilisateur.nom,
  )
  verifier(
    'IDOR : r2 ne voit PAS l’équipe de r1',
    !nomsGora.some(
      (n: string) => n.includes('Aïssatou') || n.includes('Moussa'),
    ),
    nomsGora.join(', '),
  )
  if (idAbsence) {
    const traite = await gora.requete(`/api/rh/absences/${idAbsence}`, {
      methode: 'PATCH',
      corps: { statut: 'refusee' },
    })
    verifier(
      'IDOR : r2 ne peut PAS traiter une absence de r1 (404)',
      traite.statut === 404,
      `statut=${traite.statut}`,
    )
  }
  const resetGora = await gora.requete(
    '/api/rh/personnel/u-caissiere/reinitialiser-mot-de-passe',
    { methode: 'POST' },
  )
  verifier(
    'IDOR : r2 ne peut PAS réinitialiser le mot de passe d’un membre de r1 (403)',
    resetGora.statut === 403,
    `statut=${resetGora.statut}`,
  )

  /* --------------------------- 6. verrou Starter (r3) --------------------------- */
  console.log('\n[6] Verrou Starter : limite de 1 STAFF actif (Teranga Grill, r3)')
  const adama = nouveauClient()
  verifier(
    'Connexion adama@teranga.sn',
    await connecter(adama, 'adama@teranga.sn', 'Adama2026!'),
  )
  const em1 = await adama.requete('/api/back-office/personnel', {
    methode: 'POST',
    corps: {
      nom: 'Test Vérif Un',
      email: 'verif-un@teranga.sn',
      motDePasse: 'Verif2026!',
      poste: 'Commis',
      permissions: ['cuisine'],
    },
  })
  verifier(
    '1er STAFF de r3 → 201 (compte + fiche RH)',
    em1.statut === 201,
    `statut=${em1.statut}`,
  )
  const em2 = await adama.requete('/api/back-office/personnel', {
    methode: 'POST',
    corps: {
      nom: 'Test Vérif Deux',
      email: 'verif-deux@teranga.sn',
      motDePasse: 'Verif2026!',
      poste: 'Caissière',
      permissions: ['caisse'],
    },
  })
  verifier(
    '2e STAFF de r3 → 403 limite-staff (verrou Starter intact)',
    em2.statut === 403 && em2.donnees?.raison === 'limite-staff',
    `statut=${em2.statut}`,
  )
  await nettoyerComptesVerification()

  /* ------------------- 7. NabooPay simulé (si mock activé) ------------------- */
  console.log('\n[7] Paiement NabooPay simulé (activation automatique)')
  const probe = await chef.requete('/api/back-office/abonnement/mock-paiement', {
    methode: 'POST',
    corps: { orderId: 'probe-inconnu' },
  })
  if (probe.statut === 404 && probe.donnees?.erreur === 'Mode simulation désactivé.') {
    console.log('  ⚠ Mode simulation non activé (NABOOPAY_MOCK=mock requis) — vérification NabooPay ignorée.')
  } else {
    const renouvellement = await chef.requete('/api/back-office/abonnement/renouveler', {
      methode: 'POST',
      corps: { naboopay: true, plan: 'mensuel', palier: 'pro' },
    })
    if (renouvellement.statut === 200 && renouvellement.donnees?.ok && renouvellement.donnees?.orderId) {
      const mock = await chef.requete('/api/back-office/abonnement/mock-paiement', {
        methode: 'POST',
        corps: { orderId: renouvellement.donnees.orderId },
      })
      verifier(
        'Paiement simulé → abonnement activé automatiquement',
        mock.statut === 200 && mock.donnees?.ok === true,
        `statut=${mock.statut} corps=${JSON.stringify(mock.donnees)}`,
      )
      const session = await chef.requete('/api/auth/session')
      verifier(
        'Abonnement de la cheffe de nouveau « actif » après confirmation',
        session.donnees?.abonnement?.statut === 'actif',
        JSON.stringify(session.donnees?.abonnement),
      )
    } else {
      verifier(
        'Renouvellement NabooPay initié (mock)',
        false,
        `statut=${renouvellement.statut} corps=${JSON.stringify(renouvellement.donnees)}`,
      )
    }
  }

  /* ------------------------------- bilan ------------------------------- */
  console.log(`\n[verif-rh] Bilan : ${reussites} ✔ / ${echecs} ✘`)
  if (echecs > 0) {
    console.log('Échecs :')
    for (const d of detailEchecs) console.log(`  - ${d}`)
    process.exitCode = 1
  } else {
    console.log('[verif-rh] Aucune régression détectée — la phase 3 est prête pour la revue manuelle.')
  }
}

/* ----------------------- nettoyage des comptes de test ----------------------- */

async function nettoyerComptesVerification() {
  const URL = process.env.SUPABASE_URL ?? ''
  const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!URL || !CLE) return
  try {
    const supabase = createClient(URL, CLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: utilisateurs } = await supabase
      .from('utilisateurs')
      .select('id')
      .in('email', ['verif-un@teranga.sn', 'verif-deux@teranga.sn'])
    const ids = (utilisateurs ?? []).map((u: { id: string }) => u.id)
    if (ids.length > 0) {
      await supabase.from('fiches_rh').delete().in('utilisateur_id', ids)
      await supabase.from('utilisateurs').delete().in('id', ids)
      console.log('  ℹ comptes de test r3 nettoyés (fiches + comptes).')
    }
  } catch (erreur) {
    console.warn(
      '  ⚠ nettoyage des comptes de test impossible :',
      erreur instanceof Error ? erreur.message : erreur,
    )
  }
}

principal().catch((erreur) => {
  console.error('[verif-rh] ÉCHEC :', erreur instanceof Error ? erreur.message : erreur)
  process.exitCode = 1
})
