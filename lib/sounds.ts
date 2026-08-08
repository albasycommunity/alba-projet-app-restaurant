'use client'

class AlbaAudioSynth {
  private ctx: AudioContext | null = null

  private getContext() {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  playHover() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc1.type = 'sine'
    osc2.type = 'triangle'
    osc1.frequency.setValueAtTime(300, ctx.currentTime)
    osc2.frequency.setValueAtTime(450, ctx.currentTime) // Quinte

    osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15)
    osc2.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1000, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc1.start()
    osc2.start()
    osc1.stop(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.15)
  }

  playClick() {
    const ctx = this.getContext()
    if (!ctx) return

    // Un son de validation type "Level Up" ou Caisse Enregistreuse magique
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    const notes = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5 (Accord majeur rapide)
    let time = ctx.currentTime

    gain.gain.setValueAtTime(0, time)

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, time)
      
      oscGain.gain.setValueAtTime(0, time)
      oscGain.gain.linearRampToValueAtTime(0.1, time + 0.02)
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15)
      
      osc.connect(oscGain)
      oscGain.connect(gain)
      
      osc.start(time)
      osc.stop(time + 0.15)
      
      time += 0.05 // Arpège très rapide
    })
  }

  playPop() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  }
}

export const sfx = typeof window !== 'undefined' ? new AlbaAudioSynth() : null
