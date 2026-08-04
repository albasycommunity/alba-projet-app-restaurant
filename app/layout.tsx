import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { AlbaProvider } from '@/lib/store'
import { AuthProvider } from '@/lib/auth-contexte'
import { MenuProvider } from '@/components/menu-store'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'alba — l’excellence culinaire, simplifiée',
  description:
    'alba est l’app de gestion de restaurant offline-first pensée pour le terrain sénégalais : caisse résiliente, cuisine, stock, hygiène, équipe, fidélité et pilotage.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
  themeColor: '#0E0F12',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`bg-background ${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthProvider>
          <AlbaProvider>
            <MenuProvider>{children}</MenuProvider>
          </AlbaProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
