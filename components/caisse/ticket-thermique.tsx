import { RESTAURANT, fcfa, type Reglement } from '@/lib/data'

/**
 * Composant de ticket de caisse spécialement formaté pour l'impression
 * thermique Bluetooth (58mm ou 80mm).
 * Il utilise des polices monospace et aucune marge.
 */
export function TicketThermique({
  ref_,
  reglements,
  total,
  lignes,
}: {
  ref_: string
  reglements: Reglement[]
  total: number
  lignes: { nom: string; prix: number; vendus?: number }[]
}) {
  const dateStr = new Date().toLocaleString('fr-SN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className="bg-white text-black font-mono text-[12px] leading-tight w-[58mm] mx-auto p-0"
      style={{
        pageBreakInside: 'avoid',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* En-tête */}
      <div className="text-center mb-4">
        <h1 className="font-bold text-[16px] uppercase tracking-wider mb-1">
          {RESTAURANT.nom}
        </h1>
        <p className="text-[10px] uppercase">Ticket : {ref_}</p>
        <p className="text-[10px]">{dateStr}</p>
      </div>

      <div className="border-b border-dashed border-black mb-2" />

      {/* Lignes du panier */}
      <table className="w-full text-left mb-2">
        <tbody>
          {lignes.map((l, i) => {
            const qte = l.vendus || 1
            return (
              <tr key={i} className="align-top">
                <td className="w-6 pr-1">{qte}x</td>
                <td className="pr-1">{l.nom}</td>
                <td className="text-right whitespace-nowrap">
                  {fcfa(l.prix * qte).replace(' FCFA', '')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="border-b border-dashed border-black mb-2" />

      {/* Totaux */}
      <div className="flex justify-between font-bold text-[14px] mb-2">
        <span>TOTAL</span>
        <span>{fcfa(total)}</span>
      </div>

      {/* Paiements */}
      <div className="mb-4 text-[10px]">
        {reglements.map((r, i) => (
          <div key={i} className="flex justify-between">
            <span>Payé en {r.mode}</span>
            <span>{fcfa(r.montant)}</span>
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-black mb-2" />

      {/* Pied de page */}
      <div className="text-center mt-4">
        <p className="font-bold">MERCI DE VOTRE VISITE !</p>
        <p className="text-[10px] mt-1">À bientôt chez {RESTAURANT.nom}</p>
      </div>
    </div>
  )
}
