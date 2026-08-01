import { NextResponse } from 'next/server'
import { cookieVide } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const reponse = NextResponse.json({ ok: true })
  cookieVide(reponse)
  return reponse
}
