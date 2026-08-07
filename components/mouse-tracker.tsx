'use client'

import { useEffect } from 'react'

export function MouseTracker() {
  useEffect(() => {
    // Initialiser au centre pour éviter un saut au début
    document.documentElement.style.setProperty('--mouse-x', `${window.innerWidth / 2}px`)
    document.documentElement.style.setProperty('--mouse-y', `${window.innerHeight / 2}px`)

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return null
}
