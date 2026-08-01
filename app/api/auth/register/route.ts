import { hashSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { Role, nouveauId, dateIso } from '@/lib/auth'
import { muterBdd, trouverUtilisateurParEmail } from '@/lib/server/bdd'
import { cookieSession, signerSession } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const corps = await req.json().catch(() => null)
  const nom = typeof corps?.nom === 'string' ? corps.nom.trim() : ''
  const email = typeof corps?.email === 'string' ? corps.email.trim() : ''
  const motDePasse =
    typeof corps?.motDePasse === 'string' ? corps.motDePasse : ''

  if (nom.length < 2) {
    return NextResponse.json(
      { erreur: 'Indique ton nom complet.' },
      { status: 400 },
    )
  }
  if (!EMAIL_VALIDE.test(email)) {
    return NextResponse.json(
      { erreur: 'Adresse email invalide.' },
      { status: 400 },
    )
  }
  if (motDePasse.length < 8) {
    return NextResponse.json(
      { erreur: 'Le mot de passe doit faire au moins 8 caractères.' },
      { status: 400 },
    )
  }
  if (await trouverUtilisateurParEmail(email)) {
    return NextResponse.json(
      { erreur: 'Un compte existe déjà avec cet email.' },
      { status: 409 },
    )
  }

  const utilisateur = {
    id: nouveauId('u'),
    email: email.toLowerCase(),
    password_hash: hashSync(motDePasse, 10),
    nom,
    role: Role.CLIENT,
    restaurantId: null,
    actif: true,
    creeLe: dateIso(new Date()),
  }

  await muterBdd((bdd) => {
    bdd.utilisateurs.push(utilisateur)
    bdd.fidelite.push({
      userId: utilisateur.id,
      points: 0,
      visites: 0,
      panierMoyen: 0,
    })
  })

  const token = await signerSession({
    id: utilisateur.id,
    email: utilisateur.email,
    nom: utilisateur.nom,
    role: utilisateur.role,
    restaurantId: null,
  })
  const reponse = NextResponse.json(
    { destination: '/', utilisateur: { ...utilisateur, password_hash: undefined } },
    { status: 201 },
  )
  cookieSession(reponse, token)
  return reponse
}
