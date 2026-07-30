import type { Metadata } from 'next'
import { PilotageClient } from '@/components/pilotage/pilotage-client'

export const metadata: Metadata = {
  title: 'Pilotage — Alba',
  description:
    'CA du jour, marge réelle, heures d’affluence et décisions du moment, recalculés à chaque encaissement.',
}

export default function PilotagePage() {
  return <PilotageClient />
}
