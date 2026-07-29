import type { Metadata } from 'next'
import { HygieneClient } from '@/components/hygiene/hygiene-client'

export const metadata: Metadata = {
  title: 'Hygiène — Alba',
  description:
    'Check-lists HACCP horodatées avec preuve photo, traçabilité des lots et registre imprimable pour le contrôle sanitaire.',
}

export default function HygienePage() {
  return <HygieneClient />
}
