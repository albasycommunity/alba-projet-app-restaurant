import type { Metadata } from 'next'
import { ClientsClient } from '@/components/clients/clients-client'

export const metadata: Metadata = {
  title: 'Clients — Alba',
  description:
    'Fidélité, carte de membre et menu à partager sur WhatsApp.',
}

export default function ClientsPage() {
  return <ClientsClient />
}
