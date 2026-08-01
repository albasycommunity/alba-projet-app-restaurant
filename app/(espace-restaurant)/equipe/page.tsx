import type { Metadata } from 'next'
import { EquipeClient } from '@/components/equipe/equipe-client'

export const metadata: Metadata = {
  title: 'Équipe — Alba',
  description:
    'Pointage par badge QR sans réseau, planning visuel de la semaine, modules de formation courts et suivi de performance individuel.',
}

export default function EquipePage() {
  return <EquipeClient />
}
