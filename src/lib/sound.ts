let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 滚动时极轻的一下咔哒声。 */
export function playTick(speed = 1): void {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1180, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.032 * speed, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

/** 定格时的一小段上行音。 */
export function playReveal(): void {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const at = now + index * 0.075;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.075, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.5);
  });
}

export function primeAudio(): void {
  context();
}
