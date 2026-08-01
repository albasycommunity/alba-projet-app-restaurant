import { compareSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import {
  ACCUEIL_PAR_ROLE,
  Role,
} from '@/lib/auth'
import {
  abonnementDeRestaurant,
  trouverUtilisateurParEmail,
} from '@/lib/server/bdd'
import { cookieSession, signerSession } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const corps = await req.json().catch(() => null)
  const email = typeof corps?.email === 'string' ? corps.email : ''
  const motDePasse = typeof corps?.motDePasse === 'string' ? corps.motDePasse : ''

  if (!email || !motDePasse) {
    return NextResponse.json(
      { erreur: 'Email et mot de passe sont requis.' },
      { status: 400 },
    )
  }

  const utilisateur = await trouverUtilisateurParEmail(email)
  if (!utilisateur || !compareSync(motDePasse, utilisateur.password_hash)) {
    return NextResponse.json(
      { erreur: 'Email ou mot de passe incorrect.' },
      { status: 401 },
    )
  }
  if (!utilisateur.actif) {
    return NextResponse.json(
      { erreur: 'Ce compte a été désactivé. Contacte l’administration.' },
      { status: 403 },
    )
  }

  const token = await signerSession({
    id: utilisateur.id,
    email: utilisateur.email,
    nom: utilisateur.nom,
    role: utilisateur.role,
    restaurantId: utilisateur.restaurantId,
  })

  const reponse = NextResponse.json({
    destination: ACCUEIL_PAR_ROLE[utilisateur.role],
    utilisateur: {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      role: utilisateur.role,
      restaurantId: utilisateur.restaurantId,
    },
  })
  cookieSession(reponse, token)
  return reponse
}
