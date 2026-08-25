// Web Audio API Sound Effects Engine for CoinFlip
// Zero-latency, highly compatible, and works completely offline without asset loading issues.

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("coinflip_sound_enabled");
    if (stored !== null) return stored === "true";
  }
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem("coinflip_sound_enabled", enabled ? "true" : "false");
  }
}

// 1. Subtle UI Button Click
export function playClickSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

// 2. Coin Flip & Spinning Metallic Rattle / Whoosh Sound
export function playCoinSpinSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 1.2;

  // Multiple high frequency ringing metallic clinks as it flips
  const clinkInterval = 0.09;
  for (let i = 0; i < 11; i++) {
    const clinkTime = now + i * clinkInterval * (1 + i * 0.06);
    const osc = ctx.createOscillator();
    const bandpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "triangle";
    const baseFreq = 1800 + (i % 3) * 450 + Math.random() * 200;
    osc.frequency.setValueAtTime(baseFreq, clinkTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, clinkTime + 0.06);

    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(baseFreq, clinkTime);
    bandpass.Q.setValueAtTime(12, clinkTime);

    gain.gain.setValueAtTime(0.14 * (1 - i / 14), clinkTime);
    gain.gain.exponentialRampToValueAtTime(0.001, clinkTime + 0.06);

    osc.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    osc.start(clinkTime);
    osc.stop(clinkTime + 0.06);
  }
}

// 3. Coin Land / Solid Metallic Table Clink
export function playCoinLandSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Low metallic thud
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(320, now);
  thud.frequency.exponentialRampToValueAtTime(90, now + 0.12);
  thudGain.gain.setValueAtTime(0.25, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now);
  thud.stop(now + 0.12);

  // High metallic bounce ring
  const ping = ctx.createOscillator();
  const pingGain = ctx.createGain();
  ping.type = "sine";
  ping.frequency.setValueAtTime(2400, now);
  ping.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
  pingGain.gain.setValueAtTime(0.2, now);
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  ping.connect(pingGain);
  pingGain.connect(ctx.destination);
  ping.start(now);
  ping.stop(now + 0.25);
}

// 4. Winning Celebratory Fanfare & Coin Chimes
export function playWinSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 triumphant arpeggio

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.11;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0, noteTime);
    gain.gain.linearRampToValueAtTime(0.22, noteTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.45);
  });

  // Extra celebratory shimmer chimes at the end
  setTimeout(() => {
    if (!isSoundEnabled()) return;
    const ctxAfter = getAudioContext();
    if (!ctxAfter) return;
    const t = ctxAfter.currentTime;
    [1318.51, 1567.98, 2093.0].forEach((freq, i) => {
      const chimeTime = t + i * 0.08;
      const osc = ctxAfter.createOscillator();
      const gain = ctxAfter.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, chimeTime);
      gain.gain.setValueAtTime(0.15, chimeTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 0.35);
      osc.connect(gain);
      gain.connect(ctxAfter.destination);
      osc.start(chimeTime);
      osc.stop(chimeTime + 0.35);
    });
  }, 450);
}

// 5. Soft Loss / Descending Tone
export function playLoseSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [392.0, 349.23, 311.13, 261.63]; // G4 -> F4 -> Eb4 -> C4 descending

  notes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, noteTime);

    // Warm filter to make it sound soft and retro
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, noteTime);

    gain.gain.setValueAtTime(0.12, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.2);
  });
}

// 6. Timer Pressure Tick Sound (Urgent and tense countdown ticks)
export function playTimerTickSound(urgent = false) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = urgent ? "sawtooth" : "sine";
  osc.frequency.setValueAtTime(urgent ? 1046.5 : 880, now); // High C6 when urgent, A5 otherwise
  osc.frequency.exponentialRampToValueAtTime(urgent ? 523.25 : 440, now + 0.05);

  gain.gain.setValueAtTime(urgent ? 0.2 : 0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

// 7. Wind Gust / Weather Whoosh Sound
export function playWindWhooshSound(intensity = "medium") {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBuffer.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  const startFreq = intensity === "extreme" ? 700 : intensity === "high" ? 500 : 350;
  const peakFreq = intensity === "extreme" ? 1800 : intensity === "high" ? 1200 : 800;

  filter.frequency.setValueAtTime(startFreq, now);
  filter.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.5);
  filter.frequency.exponentialRampToValueAtTime(startFreq, now + 1.2);
  filter.Q.setValueAtTime(3.5, now);

  const gain = ctx.createGain();
  const maxGain = intensity === "extreme" ? 0.28 : intensity === "high" ? 0.2 : 0.12;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(maxGain, now + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  whiteNoise.start(now);
  whiteNoise.stop(now + 1.3);
}

// 8. Bet Placed / Chip Placed Audio
export function playBetPlacedSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(587.33, now); // D5
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

// 9. Round Start Bell (Casino Table Bell)
export function playRoundStartBell() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(987.77, now); // B5 crystal bell
  osc.frequency.exponentialRampToValueAtTime(493.88, now + 0.4);

  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.55);
}

