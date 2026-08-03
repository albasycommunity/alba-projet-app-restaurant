/** @type {import('next').NextConfig} */
const nextConfig = {
  // Les types sont vérifiés à la CI/local (`npm run typecheck`) : on ne
  // masque plus les erreurs au moment du build.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Assets locaux uniquement (logo) : pas besoin du service d'images.
    unoptimized: true,
  },
  // Sortie autonome pour le déploiement (Docker, VPS) : le serveur
  // tient dans `.next/standalone` avec node_modules minimaux.
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  async headers() {
    // Le CSP strict est appliqué en production (build). En dev, on tolère
    // eval (hot-reload turbopack) : le reste des en-têtes reste actif.
    const estProduction = process.env.NODE_ENV === 'production'
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              estProduction
                ? "script-src 'self' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
