/**
 * Journal structuré JSON sur stdout/stderr : horodatage ISO, niveau,
 * domaine et métadonnées — lisible tel quel par n'importe quel collecteur
 * de logs (Docker, systemd, services de logs).
 */

import 'server-only'

type Niveau = 'info' | 'warn' | 'erreur'

export function logger(
  domaine: string,
  niveau: Niveau,
  message: string,
  extra: Record<string, unknown> = {},
) {
  const ligne = JSON.stringify({
    t: new Date().toISOString(),
    niveau,
    domaine,
    message,
    ...extra,
  })
  if (niveau === 'erreur') console.error(ligne)
  else if (niveau === 'warn') console.warn(ligne)
  else console.log(ligne)
}
