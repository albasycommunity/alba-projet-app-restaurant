import type { Metadata } from 'next'
import { StockClient } from '@/components/stock/stock-client'

export const metadata: Metadata = {
  title: 'Stock — Alba',
  description:
    'Ruptures, dates limites, food cost réel et réapprovisionnement suggéré depuis la consommation du jour.',
}

export default function StockPage() {
  return <StockClient />
}
