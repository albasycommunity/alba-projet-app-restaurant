import type { Metadata } from 'next'
import { CaisseClient } from '@/components/caisse/caisse-client'

export const metadata: Metadata = {
  title: 'Caisse — Alba',
  description:
    'Encaisser en quelques appuis : Wave, Orange Money, Free Money ou espèces, même sans réseau.',
}

export default function CaissePage() {
  return <CaisseClient />
}
