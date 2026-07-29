'use client'

import { useState } from 'react'
import {
  CakeIcon,
  CoinsIcon,
  CrownIcon,
  GiftIcon,
  HeartIcon,
  PhoneIcon,
  SendIcon,
  SparklesIcon,
  UsersRoundIcon,
} from 'lucide-react'
import {
  PALIERS,
  RECOMPENSES,
  RESTAURANT,
  fcfa,
  pointsPour,
  prochainPalier,
  type ClientFidele,
} from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import {
  Badge,
  Card,
  CardTitle,
  Contenu,
  PageHeader,
  Progress,
  Segments,
  Sheet,
  StatTile,
  Stepper,
} from '@/components/kit'
import { CarteFidelite } from '@/components/clients/carte-fidelite'
import { MenuPartage } from '@/components/clients/menu-partage'
import { cn } from '@/lib/utils'

type Vue = 'fidelite' | 'menu'

/**
 * Clients. La fidélité se crédite en un geste au comptoir, et la carte
 * du restaurant part sur WhatsApp comme n'importe quel message.
 */
export function ClientsClient() {
  const { etat, indicateurs, envoyer, notifier } = useAlba()
  const [vue, setVue] = useState<Vue>('fidelite')
  const [fiche, setFiche] = useState<ClientFidele | null>(null)

  // La fiche ouverte suit l'état du store : les points se mettent à jour
  // sous les yeux, sans refermer la feuille.
  const ouverte = fiche
    ? (etat.clients.find((c) => c.id === fiche.id) ?? null)
    : null

  const anniversaires = etat.clients.filter((c) => c.anniversaire)

  return (
    <div className="flex flex-col gap-6 pb-6">
      <PageHeader
        titre="Clients"
        sous="Ceux qui reviennent, ce qu’ils préfèrent, et la carte prête à envoyer sur WhatsApp."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2">
            <CoinsIcon className="size-4 text-primary" />
            <span className="text-sm font-medium tnum">
              {indicateurs.pointsEnCirculation} points en circulation
            </span>
          </div>
        }
      />

      <Contenu className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          libelle="Fidèles"
          icone={<UsersRoundIcon className="size-3.5" />}
          valeur={String(etat.clients.length)}
          detail="cartes actives"
        />
        <StatTile
          libelle="Clients Or"
          icone={<CrownIcon className="size-3.5" />}
          valeur={String(indicateurs.clientsOr)}
          detail="10 % à vie"
          ton={indicateurs.clientsOr > 0 ? 'succes' : 'neutre'}
        />
        <StatTile
          libelle="À relancer"
          icone={<SendIcon className="size-3.5" />}
          valeur={String(indicateurs.aRelancer.length)}
          detail="anniversaire ou absence"
          ton={indicateurs.aRelancer.length > 0 ? 'primaire' : 'neutre'}
        />
        <StatTile
          libelle="Récompenses"
          icone={<GiftIcon className="size-3.5" />}
          valeur={String(etat.echanges.length)}
          detail="échangées aujourd’hui"
        />
      </Contenu>

      {anniversaires.length > 0 && (
        <Contenu>
          <Card className="flex flex-wrap items-center gap-3 border-primary/30 bg-primary/6">
            <CakeIcon className="size-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-pretty">
              <span className="font-medium">
                {anniversaires.map((c) => c.nom.split(' ')[0]).join(' et ')} fête
                {anniversaires.length > 1 ? 'nt' : ''} son anniversaire
                {anniversaires.length > 1 ? 's' : ''}.
              </span>{' '}
              <span className="text-muted-foreground">
                Un message maintenant vaut mieux qu’une promotion demain.
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                const texte = anniversaires
                  .map(
                    (c) =>
                      `Bonne fête ${c.nom.split(' ')[0]} ! Chez ${RESTAURANT.nom}, ton dessert est offert cette semaine. À très vite.`,
                  )
                  .join('\n\n')
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(texte)}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
            >
              <SendIcon className="size-4" />
              Souhaiter sur WhatsApp
            </button>
          </Card>
        </Contenu>
      )}

      <Contenu>
        <Segments
          valeur={vue}
          onChange={setVue}
          options={[
            { valeur: 'fidelite', libelle: 'Fidélité' },
            { valeur: 'menu', libelle: 'Menu à partager' },
          ]}
        />
      </Contenu>

      {vue === 'fidelite' && (
        <>
          <Contenu className="grid gap-3 lg:grid-cols-2">
            {etat.clients
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((c, index) => (
                <CarteClient
                  key={c.id}
                  client={c}
                  index={index}
                  onOuvrir={() => setFiche(c)}
                />
              ))}
          </Contenu>

          <Contenu className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardTitle
                aside={
                  <span className="text-[11px] text-muted-foreground">
                    100 F dépensés = 1 point
                  </span>
                }
              >
                Les paliers, expliqués simplement
              </CardTitle>
              <ul className="flex flex-col divide-y divide-border">
                {PALIERS.map((p) => {
                  const combien = etat.clients.filter(
                    (c) => c.niveau === p.niveau,
                  ).length
                  return (
                    <li
                      key={p.niveau}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg font-display text-[11px] font-bold',
                          p.niveau === 'Or'
                            ? 'bg-primary/20 text-primary'
                            : p.niveau === 'Argent'
                              ? 'bg-secondary text-secondary-foreground'
                              : 'bg-accent/15 text-accent',
                        )}
                      >
                        {p.niveau.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">
                          {p.niveau}
                          <span className="ml-1.5 text-xs text-muted-foreground tnum">
                            dès {p.seuil} pts
                          </span>
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {p.avantage}
                        </span>
                      </div>
                      <span className="shrink-0 font-display text-sm font-semibold tnum">
                        {combien}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card>
              <CardTitle
                aside={
                  <span className="text-[11px] text-muted-foreground">
                    journal du jour
                  </span>
                }
              >
                Récompenses échangées
              </CardTitle>
              {etat.echanges.length === 0 ? (
                <p className="py-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                  Rien d’échangé encore aujourd’hui — les points continuent de
                  s’accumuler tranquillement.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {etat.echanges.slice(0, 8).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <span className="font-display text-xs font-semibold text-muted-foreground tnum">
                        {e.heure}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{e.libelle}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {e.client}
                        </span>
                      </div>
                      <Badge ton="primaire">−{e.cout} pts</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Contenu>
        </>
      )}

      {vue === 'menu' && (
        <Contenu>
          <MenuPartage />
        </Contenu>
      )}

      <FicheClient
        client={ouverte}
        onFermer={() => setFiche(null)}
        onCrediter={(montant) => {
          if (!ouverte) return
          envoyer({ type: 'crediterVisite', id: ouverte.id, montant })
          vibrer(14)
          const gagnes = pointsPour(montant)
          const apres = ouverte.points + gagnes
          const change =
            apres >= 1000
              ? ouverte.points < 1000
              : apres >= 600
                ? ouverte.points < 600
                : false
          notifier({
            ton: 'succes',
            titre: `+${gagnes} points pour ${ouverte.nom.split(' ')[0]}`,
            detail: change
              ? 'Nouveau palier atteint. Annonce-le, ça fait toujours plaisir.'
              : `Visite de ${fcfa(montant)} enregistrée sur sa carte.`,
          })
        }}
        onRecompenser={(libelle, cout) => {
          if (!ouverte) return
          envoyer({ type: 'recompenser', id: ouverte.id, libelle, cout })
          vibrer([14, 40, 14])
          notifier({
            ton: 'succes',
            titre: `${libelle} — offert`,
            detail: `${cout} points débités de la carte de ${ouverte.nom.split(' ')[0]}.`,
          })
        }}
      />
    </div>
  )
}

/* ------------------------------ Carte client ------------------------------ */

function CarteClient({
  client,
  index,
  onOuvrir,
}: {
  client: ClientFidele
  index: number
  onOuvrir: () => void
}) {
  const palier = prochainPalier(client.points)
  const progression = palier
    ? Math.round(
        ((client.points - (PALIERS.find((p) => p.niveau === client.niveau)?.seuil ?? 0)) /
          Math.max(
            1,
            palier.seuil -
              (PALIERS.find((p) => p.niveau === client.niveau)?.seuil ?? 0),
          )) *
          100,
      )
    : 100

  return (
    <button
      type="button"
      onClick={onOuvrir}
      className="animate-rise flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.01] active:scale-[0.99]"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-semibold',
            client.niveau === 'Or'
              ? 'bg-primary/20 text-primary'
              : client.niveau === 'Argent'
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-accent/15 text-accent',
          )}
        >
          {client.nom
            .split(' ')
            .map((m) => m[0])
            .join('')
            .slice(0, 2)}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold tracking-tight">
              {client.nom}
            </h3>
            {client.niveau === 'Or' && (
              <Badge ton="primaire">
                <CrownIcon className="size-3" />
                Or
              </Badge>
            )}
            {client.anniversaire && (
              <Badge ton="attention">
                <CakeIcon className="size-3" />
                {client.anniversaire}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground tnum">
            {client.visites} visites · panier {fcfa(client.panierMoyen)} ·{' '}
            {client.derniereVisite}
          </p>
          {client.favori && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <HeartIcon className="size-3 shrink-0 text-primary" />
              Prend presque toujours {client.favori}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <span className="font-display text-xl font-semibold tnum">
            {client.points}
          </span>
          <span className="text-[10px] text-muted-foreground">points</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Progress
          valeur={progression}
          ton={client.niveau === 'Or' ? 'succes' : 'primaire'}
        />
        <span className="text-[11px] text-muted-foreground tnum">
          {palier
            ? `${palier.manque} points avant ${palier.niveau}`
            : 'Palier maximum atteint'}
        </span>
      </div>
    </button>
  )
}

/* ------------------------------ Fiche client ------------------------------ */

function FicheClient({
  client,
  onFermer,
  onCrediter,
  onRecompenser,
}: {
  client: ClientFidele | null
  onFermer: () => void
  onCrediter: (montant: number) => void
  onRecompenser: (libelle: string, cout: number) => void
}) {
  const [montant, setMontant] = useState(3500)

  return (
    <Sheet
      ouvert={client !== null}
      onFermer={onFermer}
      large
      titre={client?.nom ?? ''}
      sous={
        client
          ? `${client.niveau} · ${client.visites} visites · ${client.telephone}`
          : undefined
      }
      pied={
        client && (
          <button
            type="button"
            onClick={() => onCrediter(montant)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-display text-base font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
          >
            <SparklesIcon className="size-5" />
            Créditer la visite · +{pointsPour(montant)} points
          </button>
        )
      }
    >
      {client && (
        <div className="flex flex-col gap-5">
          <CarteFidelite client={client} />

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground text-pretty">
            Incline le téléphone ou passe le curseur : la carte suit le
            mouvement, comme dans un portefeuille.
          </p>

          <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Montant de la visite
            </span>
            <Stepper
              libelle="Montant de la visite"
              valeur={montant}
              unite=" F"
              pas={500}
              min={500}
              max={100000}
              onChange={setMontant}
            />
            <p className="text-center text-xs text-muted-foreground tnum">
              {pointsPour(montant)} points gagnés · un ticket encaissé à son nom
              en caisse crédite déjà tout seul
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Échanger des points
            </span>
            <ul className="flex flex-col gap-2">
              {RECOMPENSES.map((r) => {
                const possible = client.points >= r.cout
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onRecompenser(r.libelle, r.cout)}
                      disabled={!possible}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                        possible
                          ? 'border-border hover:border-primary/40'
                          : 'border-border opacity-40',
                      )}
                    >
                      <GiftIcon
                        className={cn(
                          'size-4 shrink-0',
                          possible ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">
                          {r.libelle}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {possible
                            ? r.detail
                            : `Il manque ${r.cout - client.points} points`}
                        </span>
                      </div>
                      <span className="shrink-0 font-display text-sm font-semibold tnum">
                        {r.cout}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <button
            type="button"
            onClick={() =>
              window.open(
                `https://wa.me/${client.telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Bonjour ${client.nom.split(' ')[0]}, c’est ${RESTAURANT.nom}. Tu as ${client.points} points sur ta carte — de quoi te faire plaisir à ta prochaine visite.`,
                )}`,
                '_blank',
                'noopener,noreferrer',
              )
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3.5 text-sm font-medium transition-colors hover:bg-secondary/60"
          >
            <PhoneIcon className="size-4" />
            Écrire à {client.nom.split(' ')[0]} sur WhatsApp
          </button>
        </div>
      )}
    </Sheet>
  )
}
