// A short two-note chime for when a timer switches between lock-in and chill.
// Browsers only allow sound after a click, so unlockChime() is called from
// the button that starts a timer.

let ctx: AudioContext | null = null

export function unlockChime() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // No Web Audio; timers still work silently.
  }
}

export function chime() {
  if (!ctx || ctx.state !== 'running') return
  const start = ctx.currentTime
  ;[660, 880].forEach((freq, i) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = start + i * 0.22
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(gain).connect(ctx!.destination)
    osc.start(t)
    osc.stop(t + 0.55)
  })
}
