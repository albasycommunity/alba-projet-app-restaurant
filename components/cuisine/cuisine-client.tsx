'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CookingPotIcon, PartyPopperIcon } from 'lucide-react'
import { STATUTS, type StatutCommande } from '@/lib/data'
import { useAlba } from '@/lib/store'
import { useMaintenant, minutesEcoulees } from '@/lib/horloge'
import { EmptyState, PageHeader, Segments, StatTile } from '@/components/kit'
import { CarteCommande } from '@/components/cuisine/carte-commande'

const COLONNES: StatutCommande[] = ['recue', 'preparation', 'prete']

/**
 * Écran cuisine. Sur mobile : une seule colonne à la fois, choisie par
 * un sélecteur, pour ne jamais scroller latéralement les mains occupées.
 * Sur grand écran : les trois colonnes côte à côte, façon tableau de passe.
 */
export function CuisineClient() {
  const { etat } = useAlba()
  const maintenant = useMaintenant(10_000)
  const [colonne, setColonne] = useState<StatutCommande>('recue')

  const parStatut = useMemo(() => {
    const groupes = new Map<StatutCommande, typeof etat.commandes>()
    for (const s of COLONNES) groupes.set(s, [])
    for (const c of etat.commandes) {
      if (groupes.has(c.statut)) groupes.get(c.statut)!.push(c)
    }
    // Le plus ancien d'abord : c'est lui qui risque de fâcher le client.
    for (const liste of groupes.values()) liste.sort((a, b) => a.recueA - b.recueA)
    return groupes
  }, [etat.commandes])

  const nbRecuesActuel = parStatut.get('recue')?.length ?? 0
  const precedentNbRecues = useRef(nbRecuesActuel)

  useEffect(() => {
    if (nbRecuesActuel > precedentNbRecues.current) {
      // Nouvelle commande reçue !
      jouerSonClochette()
    }
    precedentNbRecues.current = nbRecuesActuel
  }, [nbRecuesActuel])

  const actives = COLONNES.reduce(
    (n, s) => n + (parStatut.get(s)?.length ?? 0),
    0,
  )

  const enRetard = useMemo(
    () =>
      etat.commandes.filter(
        (c) =>
          (c.statut === 'recue' || c.statut === 'preparation') &&
          minutesEcoulees(c.recueA, maintenant) > c.estimation,
      ).length,
    [etat.commandes, maintenant],
  )

  const attenteMoyenne = useMemo(() => {
    const encours = etat.commandes.filter(
      (c) => c.statut === 'recue' || c.statut === 'preparation',
    )
    if (encours.length === 0) return 0
    return Math.round(
      encours.reduce((s, c) => s + minutesEcoulees(c.recueA, maintenant), 0) /
        encours.length,
    )
  }, [etat.commandes, maintenant])

  const options = COLONNES.map((s) => ({
    valeur: s,
    libelle: STATUTS[s].libelle,
    compte: parStatut.get(s)?.length ?? 0,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titre="Cuisine"
        sous="La file du service, du plus pressé au plus tranquille."
      />

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          libelle="En cours"
          valeur={String(actives)}
          detail="commandes à sortir"
        />
        <StatTile
          libelle="Attente moyenne"
          valeur={`${attenteMoyenne}′`}
          detail="depuis la prise"
          ton={attenteMoyenne > 15 ? 'alerte' : 'neutre'}
        />
        <StatTile
          libelle="En retard"
          valeur={String(enRetard)}
          detail="au-delà de l’estimation"
          ton={enRetard > 0 ? 'alerte' : 'succes'}
        />
      </div>

      {/* Mobile : une colonne à la fois */}
      <div className="flex flex-col gap-4 lg:hidden">
        <Segments valeur={colonne} onChange={setColonne} options={options} />
        <ListeColonne
          commandes={parStatut.get(colonne) ?? []}
          statut={colonne}
          maintenant={maintenant}
        />
      </div>

      {/* Grand écran : tableau de passe complet */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        {COLONNES.map((s) => (
          <section key={s} className="flex flex-col gap-3">
            <header className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <h2 className="font-display text-sm font-semibold tracking-tight">
                {STATUTS[s].libelle}
              </h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 font-display text-xs font-semibold tnum">
                {parStatut.get(s)?.length ?? 0}
              </span>
            </header>
            <ListeColonne
              commandes={parStatut.get(s) ?? []}
              statut={s}
              maintenant={maintenant}
            />
          </section>
        ))}
      </div>
    </div>
  )
}

function ListeColonne({
  commandes,
  statut,
  maintenant,
}: {
  commandes: ReturnType<typeof useAlba>['etat']['commandes']
  statut: StatutCommande
  maintenant: number | null
}) {
  if (commandes.length === 0) {
    return (
      <EmptyState
        titre={
          statut === 'recue'
            ? 'Aucune nouvelle commande'
            : statut === 'preparation'
              ? 'Rien sur le feu'
              : 'Rien en attente d’envoi'
        }
        texte={
          statut === 'recue'
            ? 'La cuisine respire. Les prochaines arriveront ici automatiquement.'
            : statut === 'preparation'
              ? 'Lance une commande reçue pour la voir apparaître ici.'
              : 'Les plats prêts s’afficheront ici pour être servis.'
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {commandes.map((c) => (
        <CarteCommande key={c.id} commande={c} maintenant={maintenant} />
      ))}
    </div>
  )
}

function jouerSonClochette() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // Note La (A5)
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1) // Glisse vers A6

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch (e) {
    // Ignorer silencieusement si bloqué par les politiques du navigateur (autoplay)
  }
}
