import type { Metadata } from 'next'
import { CuisineClient } from '@/components/cuisine/cuisine-client'

export const metadata: Metadata = {
  title: 'Cuisine — Alba',
  description:
    'La file du service en un écran : ce qui arrive, ce qui cuit, ce qui part.',
}

export default function CuisinePage() {
  return <CuisineClient />
}
