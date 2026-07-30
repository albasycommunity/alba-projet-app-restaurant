import type { Metadata } from 'next'
import { ConsoleClient } from '@/components/console/console-client'

export const metadata: Metadata = {
  title: 'Console alba — Super-admin',
  description:
    'Vue globale des tenants alba : MRR, churn, tenants à risque, statut de service.',
}

export default function ConsolePage() {
  return <ConsoleClient />
}
