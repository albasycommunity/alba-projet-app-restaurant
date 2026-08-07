import type { Metadata } from 'next'
import { PilotageConsulte } from '@/components/onboarding/onboarding-client'
import { PilotageClient } from '@/components/pilotage/pilotage-client'

export const metadata: Metadata = {
  title: 'Pilotage — Alba',
  description:
    'Chiffre d’affaires, tickets, réconciliation des encaissements et rentabilité — recalculés en direct depuis la caisse.',
}

export default function PilotagePage() {
  return (
    <>
      <PilotageConsulte />
      <PilotageClient />
    </>
  )
}