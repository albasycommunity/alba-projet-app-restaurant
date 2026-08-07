import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { fcfa, Reglement, RESTAURANT } from '@/lib/data'

// On utilise une police standard de React-PDF (Helvetica) pour éviter les soucis de chargement asynchrone

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
    borderBottom: '1 solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 2,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  divider: {
    borderBottom: '1 dashed #000',
    marginVertical: 10,
  },
  footer: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 9,
    fontStyle: 'italic',
  },
  mentionsLegales: {
    marginTop: 20,
    fontSize: 8,
    textAlign: 'center',
    color: '#444',
  }
})

type Props = {
  refFacture: string
  dateFacture: string
  reglements: Reglement[]
  total: number
  lignes: { nom: string; qte: number; prix: number }[]
}

/**
 * Composant PDF formaté comme un ticket ou facture simplifiée.
 * Adapté au format A4/A5 ou ticket selon l'usage, ici on laisse Page par défaut (A4).
 */
export const PdfFacture = ({ refFacture, dateFacture, reglements, total, lignes }: Props) => {
  return (
    <Document>
      <Page size={[226, 600]} style={styles.page}>
        {/* EN-TÊTE : Ticket Thermique (80mm) = ~226 pt */}
        <View style={styles.header}>
          <Text style={styles.title}>{RESTAURANT.nom}</Text>
          <Text style={styles.subtitle}>Facture N° {refFacture}</Text>
          <Text style={styles.subtitle}>
            Date: {new Date(dateFacture).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* LIGNES */}
        <View style={styles.section}>
          {lignes.map((l, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={{ width: '60%' }}>{l.qte}x {l.nom}</Text>
              <Text style={{ width: '40%', textAlign: 'right' }}>
                {fcfa(l.prix * l.qte)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* TOTAL */}
        <View style={styles.row}>
          <Text style={styles.bold}>TOTAL</Text>
          <Text style={styles.bold}>{fcfa(total)}</Text>
        </View>

        <View style={styles.divider} />

        {/* PAIEMENTS */}
        <View style={styles.section}>
          <Text style={{ marginBottom: 5 }}>Règlements :</Text>
          {reglements.map((r, idx) => (
            <View key={idx} style={styles.row}>
              <Text>{r.mode}</Text>
              <Text>{fcfa(r.montant)}</Text>
            </View>
          ))}
        </View>

        {/* MENTIONS LÉGALES (Sénégal) */}
        <View style={styles.mentionsLegales}>
          <Text>NINEA: 00000000000000</Text>
          <Text>RCCM: SN-DKR-2026-A-00000</Text>
          <Text>Adresse: {RESTAURANT.quartier}</Text>
          <Text>TVA 18% incluse dans les prix</Text>
        </View>

        <Text style={styles.footer}>Jërëjëf pour votre visite !</Text>
      </Page>
    </Document>
  )
}
