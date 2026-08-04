'use client'

import { useState } from 'react'
import {
  AwardIcon,
  BanknoteIcon,
  CheckIcon,
  GraduationCapIcon,
  LogOutIcon,
  QrCodeIcon,
  ScanBarcodeIcon,
  TriangleAlertIcon,
  UserCheckIcon,
  UsersIcon,
} from 'lucide-react'
import {
  FORMATIONS,
  LIBELLE_POINTAGE,
  STATUTS_EQUIPE,
  fcfa,
  type Employe,
} from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { useAuth } from '@/lib/auth-contexte'
import { Role } from '@/lib/auth'
import {
  Badge,
  Card,
  CardTitle,
  Contenu,
  EmptyState,
  PageHeader,
  Progress,
  Segments,
  Sheet,
  StatTile,
} from '@/components/kit'
import { BadgeQr } from '@/components/equipe/badge-qr'
import { Planning } from '@/components/equipe/planning'
import { OngletRh } from '@/components/equipe/onglet-rh'
import { cn } from '@/lib/utils'

type Vue = 'presence' | 'planning' | 'formation' | 'performance' | 'rh'

/**
 * Équipe. Une seule question par onglet : qui est là, qui vient quand,
 * qui sait faire quoi, qui vend combien. Tout se fait en un geste.
 * L'onglet RH, lui, n'appartient qu'à la gérante.
 */
export function EquipeClient() {
  const { etat, indicateurs, envoyer, notifier } = useAlba()
  const { utilisateur } = useAuth()
  const [vue, setVue] = useState<Vue>('presence')
  const [fiche, setFiche] = useState<Employe | null>(null)

  const estGerante = utilisateur?.role === Role.RESTAURANT_ADMIN

  const presents = etat.equipe.filter((e) => e.statut === 'present')
  const enPause = etat.equipe.filter((e) => e.statut === 'pause')
  const absents = etat.equipe.filter((e) => e.statut === 'absent')
  const caissier = etat.equipe.find((e) => e.caisse && e.statut !== 'absent')
  const formationMoyenne = Math.round(
    indicateurs.performance.reduce((s, p) => s + p.formation, 0) /
      Math.max(1, indicateurs.performance.length),
  )

  const pointer = (employe: Employe) => {
    const arrive = employe.statut !== 'present'
    envoyer({ type: 'pointer', id: employe.id })
    vibrer(arrive ? 14 : 10)
    notifier({
      ton: arrive ? 'succes' : 'info',
      titre: arrive
        ? `${employe.nom.split(' ')[0]} est en poste`
        : `${employe.nom.split(' ')[0]} part en pause`,
      detail: arrive
        ? 'Pointage enregistré à l’heure exacte, même hors réseau.'
        : 'La pause est notée. Un scan au retour et c’est reparti.',
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <PageHeader
        titre="Équipe"
        sous="Qui est là, qui vient quand, et qui sait déjà tout faire. Le pointage marche sans réseau."
        action={
          caissier ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
              <ScanBarcodeIcon className="size-4 text-primary" />
              <span className="text-sm font-medium">
                {caissier.nom.split(' ')[0]} tient la caisse
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
              <TriangleAlertIcon className="size-4 text-warning" />
              <span className="text-sm font-medium">Caisse sans titulaire</span>
            </div>
          )
        }
      />

      <Contenu className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          libelle="En poste"
          icone={<UserCheckIcon className="size-3.5" />}
          valeur={String(presents.length)}
          detail={`sur ${etat.equipe.length} de l’équipe`}
          ton={presents.length >= 3 ? 'succes' : 'alerte'}
        />
        <StatTile
          libelle="En pause"
          icone={<UsersIcon className="size-3.5" />}
          valeur={String(enPause.length)}
          detail={enPause.map((e) => e.nom.split(' ')[0]).join(', ') || 'personne'}
        />
        <StatTile
          libelle="Formation"
          icone={<GraduationCapIcon className="size-3.5" />}
          valeur={`${formationMoyenne} %`}
          detail="moyenne de l’équipe"
          ton={formationMoyenne >= 70 ? 'succes' : 'neutre'}
        />
        <StatTile
          libelle="Erreurs du jour"
          icone={<TriangleAlertIcon className="size-3.5" />}
          valeur={String(etat.equipe.reduce((s, e) => s + e.erreurs, 0))}
          detail="commandes à reprendre"
          ton={
            etat.equipe.reduce((s, e) => s + e.erreurs, 0) > 2
              ? 'alerte'
              : 'succes'
          }
        />
      </Contenu>

      <Contenu>
        <Segments
          valeur={vue}
          onChange={setVue}
          options={[
            { valeur: 'presence', libelle: 'Présence', compte: absents.length },
            { valeur: 'planning', libelle: 'Planning' },
            { valeur: 'formation', libelle: 'Formation' },
            { valeur: 'performance', libelle: 'Performance' },
            ...(estGerante
              ? [{ valeur: 'rh' as const, libelle: 'RH' }]
              : []),
          ]}
        />
      </Contenu>

      {vue === 'presence' && (
        <Contenu className="grid gap-3 lg:grid-cols-2">
          {etat.equipe.map((e, index) => (
            <CartePresence
              key={e.id}
              employe={e}
              index={index}
              onPointer={() => pointer(e)}
              onBadge={() => setFiche(e)}
              onPartir={() => {
                envoyer({ type: 'absenter', id: e.id })
                vibrer(10)
                notifier({
                  ton: 'info',
                  titre: `Service terminé pour ${e.nom.split(' ')[0]}`,
                  detail: 'La feuille de présence du jour est à jour.',
                })
              }}
              onCaisse={() => {
                envoyer({ type: 'confierCaisse', id: e.id })
                vibrer(14)
                notifier({
                  ton: 'succes',
                  titre: `Caisse confiée à ${e.nom.split(' ')[0]}`,
                  detail: 'Les prochains encaissements lui seront attribués.',
                })
              }}
            />
          ))}
        </Contenu>
      )}

      {vue === 'presence' && (
        <Contenu>
          <Card>
            <CardTitle
              aside={
                <span className="text-[11px] text-muted-foreground">
                  feuille du jour
                </span>
              }
            >
              Mouvements de pointage
            </CardTitle>
            {etat.pointages.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Rien encore. Le premier scan de la journée ouvrira la feuille.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {etat.pointages.slice(0, 12).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="font-display text-xs font-semibold text-muted-foreground tnum">
                      {p.heure}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {p.nom}
                    </span>
                    <Badge
                      ton={
                        p.type === 'arrivee' || p.type === 'reprise'
                          ? 'succes'
                          : p.type === 'pause'
                            ? 'attention'
                            : 'neutre'
                      }
                    >
                      {LIBELLE_POINTAGE[p.type]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Contenu>
      )}

      {vue === 'planning' && (
        <Contenu>
          <Planning equipe={etat.equipe} />
        </Contenu>
      )}

      {vue === 'formation' && (
        <Contenu className="flex flex-col gap-3">
          <Card className="border-primary/25 bg-primary/6">
            <p className="text-sm leading-relaxed text-pretty">
              <span className="font-medium">
                Quatre modules, moins de quinze minutes en tout.
              </span>{' '}
              <span className="text-muted-foreground">
                Un nouveau commis peut tenir un poste le jour de son arrivée.
                Coche ce qu’il maîtrise déjà.
              </span>
            </p>
          </Card>
          <div className="grid gap-3 lg:grid-cols-2">
            {indicateurs.performance
              .slice()
              .sort((a, b) => a.formation - b.formation)
              .map((p, index) => (
                <CarteFormation
                  key={p.employe.id}
                  employe={p.employe}
                  progression={p.formation}
                  index={index}
                  onBasculer={(moduleId) => {
                    const acquis = p.employe.modules.includes(moduleId)
                    envoyer({
                      type: 'basculerModule',
                      id: p.employe.id,
                      moduleId,
                    })
                    vibrer(10)
                    if (!acquis) {
                      const total = p.employe.modules.length + 1
                      if (total === FORMATIONS.length) {
                        notifier({
                          ton: 'succes',
                          titre: `${p.employe.nom.split(' ')[0]} a tout validé`,
                          detail: 'Formation complète. Elle peut former les autres.',
                        })
                      }
                    }
                  }}
                />
              ))}
          </div>
        </Contenu>
      )}

      {vue === 'performance' && (
        <Contenu className="flex flex-col gap-3">
          {indicateurs.performance.every((p) => p.ventes === 0) ? (
            <EmptyState
              titre="Personne n’a encore encaissé"
              texte="Confie la caisse à quelqu’un depuis l’onglet Présence, et ses ventes apparaîtront ici en direct."
            />
          ) : (
            indicateurs.performance.map((p, index) => (
              <LignePerformance
                key={p.employe.id}
                index={index}
                rang={index + 1}
                meilleur={indicateurs.performance[0]?.ventes ?? 1}
                perf={p}
                onErreur={() => {
                  envoyer({ type: 'signalerErreur', id: p.employe.id })
                  vibrer([12, 40, 12])
                  notifier({
                    ton: 'alerte',
                    titre: 'Erreur de commande notée',
                    detail: `Sur la fiche de ${p.employe.nom.split(' ')[0]}. Ça sert à former, pas à sanctionner.`,
                  })
                }}
              />
            ))
          )}
        </Contenu>
      )}

      {vue === 'rh' && estGerante && (
        <Contenu>
          <OngletRh />
        </Contenu>
      )}

      <Sheet
        ouvert={fiche !== null}
        onFermer={() => setFiche(null)}
        titre={fiche ? `Badge de ${fiche.nom}` : ''}
        sous="À scanner au comptoir pour pointer arrivée, pause et fin de service."
        pied={
          fiche && (
            <button
              type="button"
              onClick={() => {
                pointer(fiche)
                setFiche(null)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-display text-base font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              <QrCodeIcon className="size-5" />
              {fiche.statut === 'present'
                ? 'Scanner le départ en pause'
                : 'Scanner l’arrivée'}
            </button>
          )
        }
      >
        {fiche && (
          <div className="flex flex-col gap-4">
            <BadgeQr employe={fiche} />
            <ul className="flex flex-col gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
              <li className="flex items-baseline justify-between gap-3">
                <span>Poste</span>
                <span className="font-medium text-foreground">{fiche.role}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>Arrivée du jour</span>
                <span className="font-medium text-foreground tnum">
                  {fiche.arrivee ?? 'pas encore pointée'}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>Modules validés</span>
                <span className="font-medium text-foreground tnum">
                  {fiche.modules.length} / {FORMATIONS.length}
                </span>
              </li>
            </ul>
          </div>
        )}
      </Sheet>
    </div>
  )
}

/* ----------------------------- Carte présence ----------------------------- */

function CartePresence({
  employe,
  index,
  onPointer,
  onBadge,
  onPartir,
  onCaisse,
}: {
  employe: Employe
  index: number
  onPointer: () => void
  onBadge: () => void
  onPartir: () => void
  onCaisse: () => void
}) {
  const statut = STATUTS_EQUIPE[employe.statut]
  const initiales = employe.nom
    .split(' ')
    .map((m) => m[0])
    .join('')
    .slice(0, 2)

  return (
    <Card
      className={cn(
        'animate-rise flex flex-col gap-3',
        employe.statut === 'present' && 'border-success/25',
        employe.statut === 'pause' && 'border-warning/25',
      )}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-semibold',
            employe.statut === 'present'
              ? 'bg-success/15 text-success'
              : employe.statut === 'pause'
                ? 'bg-warning/15 text-warning'
                : 'bg-secondary text-muted-foreground',
          )}
        >
          {initiales}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold tracking-tight">
              {employe.nom}
            </h3>
            <Badge ton={statut.ton}>{statut.libelle}</Badge>
            {employe.caisse && employe.statut !== 'absent' && (
              <Badge ton="primaire">
                <ScanBarcodeIcon className="size-3" />
                caisse
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {employe.role}
            {employe.arrivee && (
              <span className="tnum"> · depuis {employe.arrivee}</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onBadge}
          aria-label={`Voir le badge de ${employe.nom}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <QrCodeIcon className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPointer}
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3.5 font-display text-sm font-semibold transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97]',
            employe.statut === 'present'
              ? 'border border-border text-foreground'
              : 'bg-primary text-primary-foreground',
          )}
        >
          {employe.statut === 'present' ? (
            <>
              <UsersIcon className="size-4" />
              Mettre en pause
            </>
          ) : (
            <>
              <QrCodeIcon className="size-4" />
              {employe.statut === 'pause' ? 'Reprendre le poste' : 'Pointer l’arrivée'}
            </>
          )}
        </button>

        {employe.statut !== 'absent' && (
          <>
            {!employe.caisse && (
              <button
                type="button"
                onClick={onCaisse}
                aria-label={`Confier la caisse à ${employe.nom}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <ScanBarcodeIcon className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onPartir}
              aria-label={`Terminer le service de ${employe.nom}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <LogOutIcon className="size-4" />
            </button>
          </>
        )}
      </div>
    </Card>
  )
}

/* ---------------------------- Carte formation ---------------------------- */

function CarteFormation({
  employe,
  progression,
  index,
  onBasculer,
}: {
  employe: Employe
  progression: number
  index: number
  onBasculer: (moduleId: string) => void
}) {
  return (
    <Card
      className="animate-rise flex flex-col gap-3"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold tracking-tight">
              {employe.nom}
            </h3>
            {progression === 100 && (
              <Badge ton="succes">
                <AwardIcon className="size-3" />
                complet
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{employe.role}</span>
        </div>
        <span className="shrink-0 font-display text-xl font-semibold tnum">
          {progression} %
        </span>
      </div>

      <Progress
        valeur={progression}
        ton={progression === 100 ? 'succes' : progression >= 50 ? 'primaire' : 'attention'}
      />

      <ul className="flex flex-col gap-1.5">
        {FORMATIONS.map((m) => {
          const acquis = employe.modules.includes(m.id)
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onBasculer(m.id)}
                aria-pressed={acquis}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300 ease-[var(--ease-organic)]',
                  acquis
                    ? 'border-success/25 bg-success/6'
                    : 'border-border hover:border-primary/30',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                    acquis
                      ? 'border-success bg-success text-success-foreground'
                      : 'border-border',
                  )}
                >
                  {acquis && <CheckIcon className="size-3.5" />}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{m.titre}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {m.description}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground tnum">
                  {m.duree} min
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* --------------------------- Ligne performance --------------------------- */

function LignePerformance({
  perf,
  rang,
  meilleur,
  index,
  onErreur,
}: {
  perf: {
    employe: Employe
    ventes: number
    tickets: number
    panierMoyen: number
    formation: number
    fiabilite: number
    tient: boolean
  }
  rang: number
  meilleur: number
  index: number
  onErreur: () => void
}) {
  const part = meilleur > 0 ? Math.round((perf.ventes / meilleur) * 100) : 0

  return (
    <Card
      className="animate-rise flex flex-col gap-3"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg font-display text-sm font-semibold tnum',
            rang === 1 && perf.ventes > 0
              ? 'bg-primary/20 text-primary'
              : 'bg-secondary text-muted-foreground',
          )}
        >
          {rang}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">
              {perf.employe.nom}
            </span>
            {perf.tient && <Badge ton="primaire">en caisse</Badge>}
            {perf.employe.erreurs > 0 && (
              <Badge ton="alerte">
                {perf.employe.erreurs} erreur{perf.employe.erreurs > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground tnum">
            {perf.employe.role}
            {perf.tickets > 0 &&
              ` · ${perf.tickets} ticket${perf.tickets > 1 ? 's' : ''} en session · panier ${fcfa(perf.panierMoyen)}`}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <span className="font-display text-base font-semibold tnum">
            {fcfa(perf.ventes)}
          </span>
          <span className="text-[10px] text-muted-foreground">encaissé</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-32 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <BanknoteIcon className="size-3" />
              Part du meilleur
            </span>
            <span className="tnum">{part} %</span>
          </div>
          <Progress valeur={part} />
        </div>
        <div className="flex min-w-32 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCapIcon className="size-3" />
              Fiabilité
            </span>
            <span className="tnum">{perf.fiabilite} %</span>
          </div>
          <Progress
            valeur={perf.fiabilite}
            ton={perf.fiabilite >= 90 ? 'succes' : perf.fiabilite >= 70 ? 'attention' : 'alerte'}
          />
        </div>
        <button
          type="button"
          onClick={onErreur}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          Noter une erreur
        </button>
      </div>
    </Card>
  )
}
