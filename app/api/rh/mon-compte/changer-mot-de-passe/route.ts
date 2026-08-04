import { NextRequest, NextResponse } from 'next/server'
import { compareSync } from 'bcryptjs'
import { Role } from '@/lib/auth'
import { exigerRole } from '@/lib/server/auth'
import {
  reinitialiserMotDePasse,
  trouverUtilisateur,
} from '@/lib/server/bdd'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

/** Changement de mot de passe : 5 tentatives / heure / compte — coupe court au brute force. */
const LIMITE_CHANGEMENT = { fenetreMs: 3_600_000, max: 5 }

/**
 * Changement de mot de passe self-service — STAFF et RESTAURANT_ADMIN.
 * L'ancien mot de passe est vérifié via bcrypt AVANT tout changement : un
 * attaquant qui aurait volé la session ne peut pas remplacer le mot de
 * passe sans connaître l'ancien (et se heurte au rate limit par compte).
 */
export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.STAFF, Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const utilisateur = garde.utilisateur

  if (
    !(await requeteAutorisee(
      req,
      `rh-changement-mdp:${utilisateur.id}`,
      LIMITE_CHANGEMENT,
    ))
  ) {
    logger('rh', 'warn', 'Trop de tentatives de changement de mot de passe', {
      utilisateurId: utilisateur.id,
    })
    return reponseTropDeRequetes(
      'Trop de tentatives. Réessaie dans une heure.',
    )
  }

  const corps = await req.json().catch(() => null)
  const motDePasseActuel =
    typeof corps?.motDePasseActuel === 'string' ? corps.motDePasseActuel : ''
  const nouveauMotDePasse =
    typeof corps?.nouveauMotDePasse === 'string' ? corps.nouveauMotDePasse : ''

  if (!motDePasseActuel || !nouveauMotDePasse) {
    return NextResponse.json(
      { erreur: 'L’ancien et le nouveau mot de passe sont requis.' },
      { status: 400 },
    )
  }
  if (nouveauMotDePasse.length < 8) {
    return NextResponse.json(
      { erreur: 'Le nouveau mot de passe doit faire au moins 8 caractères.' },
      { status: 400 },
    )
  }
  if (nouveauMotDePasse === motDePasseActuel) {
    return NextResponse.json(
      { erreur: 'Le nouveau mot de passe doit être différent de l’ancien.' },
      { status: 400 },
    )
  }

  const complet = await trouverUtilisateur(utilisateur.id)
  if (!complet) {
    return NextResponse.json(
      { erreur: 'Compte introuvable.' },
      { status: 404 },
    )
  }
  if (!compareSync(motDePasseActuel, complet.password_hash)) {
    logger('rh', 'warn', 'Ancien mot de passe incorrect', {
      utilisateurId: utilisateur.id,
    })
    return NextResponse.json(
      { erreur: 'L’ancien mot de passe est incorrect.' },
      { status: 400 },
    )
  }

  try {
    // `reinitialiserMotDePasse` accepte un mot de passe fourni : on s'en
    // sert pour poser le nouveau hash. Le mot de passe n'est jamais
    // renvoyé — que le « ok ».
    await reinitialiserMotDePasse(complet, nouveauMotDePasse)
    logger('rh', 'info', 'Mot de passe changé par l’utilisateur', {
      utilisateurId: utilisateur.id,
    })
    return NextResponse.json({ ok: true })
  } catch {
    logger('rh', 'erreur', 'Échec changement de mot de passe', {
      utilisateurId: utilisateur.id,
    })
    return NextResponse.json(
      { erreur: 'Impossible de changer le mot de passe.' },
      { status: 500 },
    )
  }
}