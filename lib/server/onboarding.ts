/**
 * Onboarding découverte (Sprint 5) — calcul côté serveur de la progression
 * du gérant, en UN SEUL aller-retour. Le front n'a qu'à AFFICHER : jamais
 * à recalculer une étape.
 *
 * Règle de fail-closed : un restaurant sans l'un des champs (ligne créée
 * avant la migration) ou au masquage levé répond NON visible — l'existant
 * ne voit jamais le parcours sans un geste explicite « reprise ».
 */

import 'server-only'
import {
  ETAPES_ONBOARDING,
  Role,
  type ProgressionOnboarding,
} from '@/lib/auth'
import { lireBdd } from '@/lib/server/bdd'

const AUCUNE_PROGRESSION: ProgressionOnboarding = {
  visible: false,
  etapes: {
    profil: false,
    plat: false,
    vente: false,
    stock: false,
    equipe: false,
    stats: false,
  },
  accomplies: 0,
}

/**
 * Progression réelle d'un restaurant — chaque étape est DÉDUITE des
 * données, jamais déclarée par l'interface :
 *
 * - profil : la fiche restaurant (nom + quartier), posée à l'inscription ;
 * - plat   : le menu vit côté client (store local, pas de table serveur),
 *            le front certifie donc son premier plat créé — jamais un
 *            calcul serveur de substitution ;
 * - vente  : encaissements réels de la session (contribution locale) OU
 *            commande de la carte client déjà persistée en base ;
 * - equipe : au moins un STAFF actif rattaché au restaurant (hors gérant) ;
 * - stats  : seul flag — le pilotage a réellement été visité.
 *
 * `contributions` ne sont que des FAITS constatés côté client (plat créé,
 * vente encaissée pendant la session) : le serveur reste l'autorité pour
 * les autres étapes et pour le compteur final.
 */
export async function progressionOnboarding(
  restaurantId: string,
  contributions?: { platCree?: boolean; venteEncaisee?: boolean; stockConfigure?: boolean },
): Promise<ProgressionOnboarding> {
  const bdd = await lireBdd()

  // Fail-closed : restaurant inconnu ou au masquage levé → rien à montrer.
  const restaurant = bdd.restaurants.find((r) => r.id === restaurantId)
  if (!restaurant || restaurant.onboarding_masque) {
    return AUCUNE_PROGRESSION
  }

  const profil =
    (restaurant.nom ?? '').trim().length > 0 &&
    (restaurant.quartier ?? '').trim().length > 0

  const plat = contributions?.platCree === true

  const vente =
    contributions?.venteEncaisee === true ||
    bdd.commandesClients.some((c) => c.restaurantId === restaurantId)

  // IC-05 : étape stock — le gérant a ajouté au moins un ingrédient à son
  // stock. Sans cette étape, les alertes de sous-seuil ne se déclenchaient
  // jamais sur un compte réel (stock vide par défaut).
  const stock = contributions?.stockConfigure === true

  const equipe = bdd.utilisateurs.some(
    (u) =>
      u.role === Role.STAFF &&
      u.restaurantId === restaurantId &&
      u.actif,
  )

  const stats = restaurant.onboarding_stats_consultees

  const etapes: ProgressionOnboarding['etapes'] = {
    profil,
    plat,
    vente,
    stock,
    equipe,
    stats,
  }
  const accomplies = ETAPES_ONBOARDING.reduce(
    (n, cle) => n + (etapes[cle] ? 1 : 0),
    0,
  )

  return { visible: true, etapes, accomplies }
}