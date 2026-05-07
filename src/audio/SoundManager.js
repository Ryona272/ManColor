/**
 * src/audio/SoundManager.js  v2
 * Stylish procedural audio — Web Audio API only, no external files.
 *
 * Signal chain:
 *   oscillators/noise → g → seBus  → masterGain → destination
 *                         ↘ reverbSend → reverbNode → reverbReturn → masterGain
 *   bgm oscillators      → bgmBus → masterGain
 */

class SoundManager {
  constructor() {
    this._actx = null;
    this._masterGain = null;
    this._bgmBus = null;
    this._seBus = null;
    this._reverbNode = null;
    this._reverbReturn = null;
    this._bgmConv = null; // BGM-only reverb, routes through _bgmBus
    this._bgmConvReturn = null;
    this._bgmLoopTimer = null;
    this._bgmGainResetTimer = null; // guards against gain restore racing new BGM
    this._bgmActive = false;
    this._currentBgm = null;
    this._bgmVolume = 0.38;
    this._seVolume = 0.62;
    this._bgmPitch = 0.5; // global BGM transpose (0.5 = 1 octave down)
    this._scoreStep = 0;
    this._sowStep = 0;
    this._htmlAudio = null; // for MP3-backed BGM keys
    this._loadVolumes();
  }

  // ---------------------------------------------------------------------------
  // Context + reverb init
  // ---------------------------------------------------------------------------

  _ctx() {
    if (!this._actx) {
      const ACtx = window.AudioContext || window.webkitAudioContext;
      if (!ACtx) return null;
      this._actx = new ACtx();

      this._masterGain = this._actx.createGain();
      this._masterGain.gain.value = 1.0;
      this._masterGain.connect(this._actx.destination);

      this._bgmBus = this._actx.createGain();
      this._bgmBus.gain.value = this._bgmVolume;
      this._bgmBus.connect(this._masterGain);

      this._seBus = this._actx.createGain();
      this._seBus.gain.value = this._seVolume;
      this._seBus.connect(this._masterGain);

      this._buildReverb();
    }
    if (this._actx.state === "suspended") this._actx.resume().catch(() => {});
    return this._actx;
  }

  _buildReverb() {
    const ctx = this._actx;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 1.6);
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this._reverbNode = ctx.createConvolver();
    this._reverbNode.buffer = buf;
    this._reverbReturn = ctx.createGain();
    this._reverbReturn.gain.value = 0.28;
    this._reverbNode.connect(this._reverbReturn);
    this._reverbReturn.connect(this._masterGain);

    // BGM-dedicated reverb — output goes through _bgmBus so stopBgm() kills it instantly
    this._bgmConv = ctx.createConvolver();
    this._bgmConv.buffer = buf; // reuse same impulse buffer
    this._bgmConvReturn = ctx.createGain();
    this._bgmConvReturn.gain.value = 0.28;
    this._bgmConv.connect(this._bgmConvReturn);
    this._bgmConvReturn.connect(this._bgmBus); // ← through bgmBus!
  }

  // ---------------------------------------------------------------------------
  // Low-level helpers
  // ---------------------------------------------------------------------------

  /**
   * Single oscillator with smooth ADSR envelope.
   * wet: amount routed to reverb (0 = dry only).
   */
  _osc(
    freq,
    dur,
    {
      type = "sine",
      vol = 0.2,
      t = 0,
      out = null,
      freqEnd = null,
      detune = 0,
      attack = 0.008,
      release = null,
      wet = 0,
    } = {},
  ) {
    const ctx = this._actx;
    const dst = out ?? this._seBus;
    const rel = release ?? Math.min(0.18, dur * 0.35);
    const att = Math.min(attack, dur * 0.25);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (detune) osc.detune.value = detune;
    if (freqEnd != null)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(freqEnd, 0.5),
        t + dur,
      );

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setValueAtTime(vol, t + dur - rel);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    g.connect(dst);
    if (wet > 0 && this._reverbNode) {
      const s = ctx.createGain();
      s.gain.value = wet;
      g.connect(s);
      s.connect(this._reverbNode);
    }
    osc.start(t);
    osc.stop(t + dur + 0.06);
  }

  /**
   * Marimba synthesis:
   *   sine fundamental (long decay) +
   *   fast-decay 4th harmonic (woody "clunk") +
   *   attack transient (pitch smear)
   */
  _marimba(freq, t, { vol = 0.32, out = null, wet = 0.18 } = {}) {
    const dst = out ?? this._seBus;
    // Fundamental
    this._osc(freq, 0.75, { vol, t, out: dst, release: 0.55, wet });
    // 4th harmonic (rapid decay)
    this._osc(freq * 3.97, 0.055, {
      vol: vol * 0.38,
      t,
      out: dst,
      release: 0.04,
    });
    // Attack transient
    this._osc(freq * 9, 0.018, {
      vol: vol * 0.55,
      t,
      out: dst,
      freqEnd: freq,
      release: 0.012,
    });
  }

  /** Bandpass-filtered noise burst. */
  _noise(
    dur,
    { vol = 0.2, bandFreq = 2000, q = 0.8, t = 0, out = null, wet = 0 } = {},
  ) {
    const ctx = this._actx;
    const dst = out ?? this._seBus;
    const n = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = bandFreq;
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dst);
    if (wet > 0 && this._reverbNode) {
      const s = ctx.createGain();
      s.gain.value = wet;
      g.connect(s);
      s.connect(this._reverbNode);
    }
    src.start(t);
    src.stop(t + dur + 0.06);
  }

  /**
   * String ensemble voice for BGM — routed directly to _bgmBus.
   * Sawtooth × 5 detuned voices → lowpass → envelope + vibrato LFO → optional reverb.
   * @param {number} freq
   * @param {number} dur
   * @param {number} t  - absolute AudioContext time
   * @param {{ vol?: number, wet?: number, attack?: number }} opts
   */
  _strBgm(
    freq,
    dur,
    t,
    {
      vol = 0.12,
      wet = 0.42,
      attack = 0.18,
      oscType = "sawtooth",
      filtMult = 6.5,
      vibratoDepth = 0.011,
    } = {},
  ) {
    const ctx = this._actx;
    if (!ctx) return;
    const att = Math.min(attack, dur * 0.28);
    const rel = Math.min(0.35, dur * 0.3);
    // 5-voice ensemble (detune in cents, relative volume)
    const VOICES = [
      [-14, 0.55],
      [-6, 0.8],
      [0, 1.0],
      [6, 0.8],
      [14, 0.55],
    ];
    VOICES.forEach(([det, vr]) => {
      const osc = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const v = vol * vr;

      osc.type = oscType;
      osc.frequency.value = freq;
      osc.detune.value = det;

      // Vibrato (starts after bow attack settles)
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 5.4;
      lfoG.gain.value = freq * vibratoDepth;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start(t + att * 0.9);
      lfo.stop(t + dur + 0.1);

      // Warm lowpass
      filt.type = "lowpass";
      filt.frequency.value = Math.min(freq * filtMult, 5800);
      filt.Q.value = 0.38;

      // Bow-attack envelope
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + att);
      g.gain.setValueAtTime(v, t + dur - rel);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(filt);
      filt.connect(g);
      g.connect(this._bgmBus);

      if (wet > 0 && this._bgmConv) {
        const s = ctx.createGain();
        s.gain.value = wet;
        g.connect(s);
        s.connect(this._bgmConv); // BGM reverb routes through _bgmBus
      }
      osc.start(t);
      osc.stop(t + dur + 0.1);
    });
  }

  // ---------------------------------------------------------------------------
  // Sound Effects
  // ---------------------------------------------------------------------------

  /** Soft UI button click. */
  se_button() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._osc(1047, 0.07, {
      vol: 0.2,
      t,
      freqEnd: 1320,
      attack: 0.004,
      release: 0.05,
    });
    this._osc(1320, 0.07, {
      vol: 0.12,
      t: t + 0.048,
      attack: 0.004,
      release: 0.05,
      wet: 0.08,
    });
  }

  /** Per-stone marimba sound during sowing. Step tracked internally; resets on se_sow(). */
  se_sowStone() {
    const ctx = this._ctx();
    if (!ctx) return;
    // C major / A natural minor diatonic — no gap jumps, C4→A5
    const SCALE = [
      262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784, 880,
    ];
    const idx = Math.min(this._sowStep, SCALE.length - 1); // clamp: no wrap
    const freq = SCALE[idx];
    this._sowStep++;
    this._marimba(freq, ctx.currentTime, { vol: 0.26, wet: 0.2 });
  }

  /** Sowing-phase start: ascending 3-note chime. Resets per-stone step counter. */
  se_sow() {
    this._sowStep = 0;
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784].forEach((f, i) =>
      this._osc(f, 0.2, {
        vol: 0.17,
        t: t + i * 0.075,
        attack: 0.008,
        wet: 0.22,
      }),
    );
  }

  /** Turn transition pad. */
  se_turnStart(isPlayer = true) {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const freqs = isPlayer ? [392, 523, 659] : [392, 330, 262];
    freqs.forEach((f, i) =>
      this._osc(f, 0.38, {
        vol: 0.13,
        t: t + i * 0.065,
        attack: 0.05,
        release: 0.18,
        wet: 0.38,
      }),
    );
  }

  /** ぐるぐる — spiraling marimba arpeggio. */
  se_guruguru() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this._marimba(f, t + i * 0.085, { vol: 0.22 + i * 0.018, wet: 0.28 }),
    );
  }

  /** ざくざく — metallic slash. */
  /** ざくざく — チャリーン coin ring. */
  se_zakuzaku() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Coin ring: instant attack, slow metallic ring-down (sine pairs for bell quality)
    this._osc(1568, 0.7, {
      vol: 0.18,
      t,
      attack: 0.001,
      release: 0.55,
      wet: 0.45,
    }); // G6 fundamental
    this._osc(2093, 0.55, {
      vol: 0.12,
      t,
      attack: 0.001,
      release: 0.4,
      wet: 0.4,
    }); // C7 overtone
    this._osc(1319, 0.85, {
      vol: 0.1,
      t,
      attack: 0.001,
      release: 0.7,
      wet: 0.38,
    }); // E6 sub-ring
    // Strike transient: very short bright noise burst
    this._noise(0.03, { vol: 0.15, bandFreq: 4000, q: 0.9, t, wet: 0.15 });
    // Tiny pitch drop for natural "ringing coin" feel
    this._osc(1568, 0.6, {
      vol: 0.07,
      t: t + 0.01,
      freqEnd: 1500,
      attack: 0.001,
      release: 0.5,
      wet: 0.4,
    });
  }

  /** ちらちら — sparkling crystal chimes. */
  se_chirachira() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [1047, 1319, 1568, 2093, 1760, 2349, 1568, 2093].forEach((f, i) =>
      this._osc(f, 0.16, {
        vol: 0.13,
        t: t + i * 0.062,
        attack: 0.004,
        release: 0.1,
        wet: 0.4,
      }),
    );
  }

  /** ぽいぽい — bouncy spring. */
  se_poipoi() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(920, t + 0.11);
    osc.frequency.exponentialRampToValueAtTime(560, t + 0.26);
    g.gain.setValueAtTime(0.38, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g);
    g.connect(this._seBus);
    if (this._reverbNode) {
      const s = ctx.createGain();
      s.gain.value = 0.2;
      g.connect(s);
      s.connect(this._reverbNode);
    }
    osc.start(t);
    osc.stop(t + 0.33);
    this._osc(580, 0.18, { vol: 0.2, t: t + 0.19, freqEnd: 740, wet: 0.18 });
  }

  /** くたくた — deep thud. */
  se_kutakuta() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._osc(90, 0.44, {
      vol: 0.52,
      t,
      freqEnd: 38,
      attack: 0.004,
      release: 0.32,
    });
    this._noise(0.1, { vol: 0.22, bandFreq: 700, q: 0.5, t, wet: 0.08 });
    this._osc(55, 0.28, { vol: 0.18, t: t + 0.04, freqEnd: 32, release: 0.2 });
  }

  /** Win fanfare — marimba melody + chord pad. */
  se_win() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 523, 659, 784, 1047].forEach((f, i) => {
      const off = [0, 0.13, 0.26, 0.44, 0.57, 0.7, 0.86][i];
      this._marimba(f, t + off, { vol: 0.26, wet: 0.32 });
    });
    [523, 659, 784, 1047].forEach((f) =>
      this._osc(f, 1.4, {
        vol: 0.11,
        t: t + 1.05,
        attack: 0.06,
        release: 0.6,
        wet: 0.45,
      }),
    );
  }

  /** Lose — descending sorrowful tones. */
  se_lose() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [784, 622, 523, 415, 330].forEach((f, i) =>
      this._osc(f, 0.52, {
        vol: 0.17,
        t: t + i * 0.19,
        attack: 0.03,
        release: 0.3,
        wet: 0.38,
      }),
    );
  }

  /** Draw. */
  se_draw() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 523].forEach((f, i) =>
      this._osc(f, 0.32, {
        vol: 0.16,
        t: t + i * 0.17,
        attack: 0.03,
        release: 0.18,
        wet: 0.28,
      }),
    );
  }

  /** Game-end signal. */
  se_gameEnd() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784].forEach((f, i) =>
      this._osc(f, 0.36, {
        vol: 0.19,
        t: t + i * 0.15,
        attack: 0.02,
        wet: 0.3,
      }),
    );
  }

  /** Banner / announcement chime. */
  se_banner() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._osc(1047, 0.18, {
      vol: 0.15,
      t,
      freqEnd: 1320,
      attack: 0.005,
      release: 0.12,
      wet: 0.22,
    });
  }

  /** Choice dialog appears. */
  se_select() {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    this._osc(880, 0.1, { vol: 0.17, t, attack: 0.005 });
    this._osc(1047, 0.14, { vol: 0.17, t: t + 0.08, attack: 0.005, wet: 0.15 });
  }

  /** Score count tick — cycling pentatonic marimba. */
  se_score() {
    const ctx = this._ctx();
    if (!ctx) return;
    const PENTA = [330, 392, 440, 523, 587, 659];
    const f = PENTA[this._scoreStep % PENTA.length];
    this._scoreStep++;
    this._marimba(f, ctx.currentTime, { vol: 0.17, wet: 0.1 });
  }

  // ---------------------------------------------------------------------------
  // BGM
  // ---------------------------------------------------------------------------

  // Keys listed here are played from an MP3 file in /audio/<key>.mp3
  // instead of the procedural synth engine.
  static MP3_KEYS = new Set(["lobby"]);

  playBgm(key) {
    if (this._currentBgm === key) return;
    // Cancel any pending gain-restore from a previous stopBgm()
    if (this._bgmGainResetTimer !== null) {
      clearTimeout(this._bgmGainResetTimer);
      this._bgmGainResetTimer = null;
    }
    this.stopBgm();
    this._currentBgm = key;
    this._bgmActive = true;
    if (SoundManager.MP3_KEYS.has(key)) {
      this._ctx(); // ensure AudioContext is running
      const audio = new Audio(`./audio/${key}.mp3`);
      audio.loop = true;
      audio.volume = this._bgmVolume;
      audio.play().catch(() => {});
      this._htmlAudio = audio;
    } else {
      this._loopBgm(key, 0);
    }
  }

  stopBgm() {
    this._bgmActive = false;
    this._currentBgm = null;
    if (this._htmlAudio) {
      this._htmlAudio.pause();
      this._htmlAudio.src = "";
      this._htmlAudio = null;
    }
    if (this._bgmLoopTimer !== null) {
      clearTimeout(this._bgmLoopTimer);
      this._bgmLoopTimer = null;
    }
    if (this._bgmGainResetTimer !== null) {
      clearTimeout(this._bgmGainResetTimer);
      this._bgmGainResetTimer = null;
    }
    const ctx = this._actx;
    if (ctx && this._bgmBus) {
      // Orphan the old bus — all connected oscillators go permanently silent.
      // (Disconnect from masterGain so scheduled notes can't be heard again.)
      try {
        this._bgmBus.disconnect();
      } catch (_) {}
      if (this._bgmConvReturn) {
        try {
          this._bgmConvReturn.disconnect();
        } catch (_) {}
      }
      // Rebuild a clean bus for the next BGM
      this._bgmBus = ctx.createGain();
      this._bgmBus.gain.value = 0.0001;
      this._bgmBus.connect(this._masterGain);
      if (this._bgmConv && this._bgmConvReturn) {
        this._bgmConvReturn.connect(this._bgmBus);
      }
    }
  }

  _loopBgm(key, iteration) {
    if (!this._bgmActive || this._currentBgm !== key) return;
    const ctx = this._ctx();
    if (!ctx) return;

    if (iteration === 0) {
      // Fresh bus starts near-zero; ramp up quickly
      this._bgmBus.gain.cancelScheduledValues(ctx.currentTime);
      this._bgmBus.gain.setValueAtTime(0.0001, ctx.currentTime);
      this._bgmBus.gain.linearRampToValueAtTime(
        this._bgmVolume,
        ctx.currentTime + 0.3,
      );
    }

    const { notes, duration } = this._getBgmSequence(key);
    const t0 = ctx.currentTime;

    notes.forEach(
      ({
        freq,
        dur,
        delay,
        type = "sine",
        vol,
        freqEnd = null,
        detune = 0,
        wet = 0,
        str = false,
        strAttack = 0.18,
        strOscType = "sawtooth",
        strFiltMult = 6.5,
        strVibratoDepth = 0.011,
      }) => {
        // Apply global BGM pitch transpose
        freq = freq * this._bgmPitch;
        if (freqEnd != null) freqEnd = freqEnd * this._bgmPitch;
        if (str) {
          this._strBgm(freq, dur, t0 + delay, {
            vol,
            wet,
            attack: strAttack,
            oscType: strOscType,
            filtMult: strFiltMult,
            vibratoDepth: strVibratoDepth,
          });
          return;
        }
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        if (freqEnd != null) {
          osc.frequency.setValueAtTime(freq, t0 + delay);
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(freqEnd, 0.5),
            t0 + delay + dur,
          );
        }
        const att = Math.min(0.06, dur * 0.12);
        const rel = Math.min(0.22, dur * 0.28);
        g.gain.setValueAtTime(0.0001, t0 + delay);
        g.gain.linearRampToValueAtTime(vol, t0 + delay + att);
        g.gain.setValueAtTime(vol, t0 + delay + dur - rel);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
        osc.connect(g);
        g.connect(this._bgmBus);
        if (wet > 0 && this._reverbNode) {
          const s = ctx.createGain();
          s.gain.value = wet;
          g.connect(s);
          s.connect(this._reverbNode);
        }
        osc.start(t0 + delay);
        osc.stop(t0 + delay + dur + 0.06);
      },
    );

    this._bgmLoopTimer = setTimeout(
      () => this._loopBgm(key, iteration + 1),
      (duration + 0.35) * 1000,
    );
  }

  _getBgmSequence(key) {
    // Difficulty-specific game BGMs
    const DIFF = {
      game_kooni: [72, 0],
      game_yasha: [92, 1],
      game_rasetsu: [108, 2],
      game_kisin: [122, 3],
      game_kyubi: [136, 4],
      game_ashura: [150, 5],
      game_kugutsu: [164, 6],
    };
    if (DIFF[key]) return this._bgmGameDynamic(...DIFF[key]);
    if (key === "game") return this._bgmGameDynamic(108, 2); // fallback
    if (key === "result") return this._bgmResult();
    return this._bgmLobby();
  }

  // ---- Lobby BGM ----
  // Orchestral, Am — strings lead, light pizzicato bass, solo violin melody
  _bgmLobby() {
    const bpm = 72;
    const q = 60 / bpm;
    const h = q * 2;
    const w = q * 4;
    const notes = [];

    // Pizzicato-style bass (short triangle plucks)
    [
      [0, 220],
      [q * 2, 196],
      [q * 4, 175],
      [q * 6, 131],
      [q * 8, 220],
      [q * 10, 196],
      [q * 12, 165],
      [q * 14, 131],
      [q * 16, 220],
      [q * 18, 196],
      [q * 20, 175],
      [q * 22, 131],
      [q * 24, 220],
      [q * 26, 196],
      [q * 28, 175],
      [q * 30, 131],
    ].forEach(([delay, freq]) => {
      notes.push({ delay, freq, dur: q * 0.45, type: "triangle", vol: 0.1 });
      notes.push({
        delay,
        freq: freq / 2,
        dur: q * 0.45,
        type: "triangle",
        vol: 0.06,
      });
    });

    // String section pad chords (slow bow attack, str: true)
    const strChord = (delay, freqs, dur) =>
      freqs.forEach((freq) =>
        notes.push({
          delay,
          freq,
          dur,
          str: true,
          vol: 0.055,
          wet: 0.44,
          strAttack: 0.22,
        }),
      );
    strChord(0, [220, 277, 330, 440], w * 0.92); // Am
    strChord(w, [196, 247, 294, 392], w * 0.92); // G
    strChord(w * 2, [175, 220, 262, 349], w * 0.92); // F
    strChord(w * 3, [165, 220, 294, 392], w * 0.92); // Em
    strChord(w * 4, [220, 277, 330, 440], w * 0.92); // Am
    strChord(w * 5, [196, 247, 294, 392], w * 0.92); // G
    strChord(w * 6, [175, 220, 262, 349], w * 0.92); // F
    strChord(w * 7, [131, 165, 220, 330], w * 1.6); // Am (low resolve)

    // Solo violin melody (high str — single voice, lighter attack = more nimble)
    [
      [q * 0.5, 659, q * 0.9],
      [q * 1.5, 523, q * 0.9],
      [q * 2.5, 659, q * 0.9],
      [q * 3.5, 784, h * 0.9],
      [q * 6, 880, h * 0.9],
      [q * 8, 784, q * 0.9],
      [q * 9, 659, q * 0.9],
      [q * 10, 523, h * 0.9],
      [q * 12, 659, q * 0.9],
      [q * 13, 523, q * 0.9],
      [q * 14, 440, q * 0.9],
      [q * 15, 392, h * 0.9],
      [q * 17, 330, q * 0.9],
      [q * 18, 392, q * 0.9],
      [q * 19, 440, q * 0.9],
      [q * 20, 523, h * 0.9],
      [q * 22, 659, q * 0.9],
      [q * 23, 784, q * 0.9],
      [q * 24, 880, q * 0.9],
      [q * 25, 1047, q * 0.9],
      [q * 26, 880, q * 0.9],
      [q * 27, 784, q * 0.9],
      [q * 28, 659, w * 1.55],
    ].forEach(([delay, freq, dur]) =>
      notes.push({
        delay,
        freq,
        dur,
        str: true,
        vol: 0.072,
        wet: 0.36,
        strAttack: 0.1,
      }),
    );

    return { notes, duration: q * 32 };
  }

  // ---- Game BGM (difficulty-parametric) ----
  /**
   * Parametric game BGM — intensity 0 (kooni) → 6 (kugutsu).
   * As intensity rises: tempo faster, bass becomes heartbeat, pads fade, arpeggio accelerates.
   */
  _bgmGameDynamic(bpm, intensity) {
    const q = 60 / bpm;
    const e = q / 2;
    const s = q / 4;
    const bars = intensity >= 4 ? 8 : 16;
    const dur = q * 4 * bars;
    const notes = [];

    // ---- Bass roots: Am-pentatonic 8-bar cycle ----
    const ROOTS = [110, 110, 98, 110, 98, 110, 87, 98];
    for (let b = 0; b < bars; b++) {
      const t0 = b * q * 4;
      const root = ROOTS[b % 8];
      if (intensity <= 1) {
        // Quarter-note pulse
        notes.push({
          delay: t0,
          freq: root,
          dur: q * 0.8,
          vol: 0.1 + intensity * 0.01,
        });
        notes.push({
          delay: t0 + q * 2,
          freq: root * 0.9,
          dur: q * 0.8,
          vol: 0.08,
        });
      } else if (intensity <= 3) {
        // 8th-note groove
        const groove = [0, e, e + s, q * 2, q * 2 + e, q * 3 + e];
        groove.forEach((off, gi) =>
          notes.push({
            delay: t0 + off,
            freq: root * (off >= q * 2 ? 0.88 : 1),
            dur: e * 0.65,
            vol: [0.13, 0.09, 0.11, 0.12, 0.08, 0.1][gi],
          }),
        );
      } else {
        // Heartbeat: short "ba" + heavier "DUM" (~q*0.28 later), on beats 1 and 3
        const hb = q * 0.28;
        [0, q * 2].forEach((beat) => {
          notes.push({ delay: t0 + beat, freq: root, dur: s * 0.8, vol: 0.17 });
          notes.push({
            delay: t0 + beat + hb,
            freq: root * 0.78,
            dur: e * 0.85,
            vol: 0.14,
          });
        });
        if (intensity >= 6) {
          // Extra off-beat pulse on beats 2 and 4
          [q, q * 3].forEach((beat) =>
            notes.push({
              delay: t0 + beat,
              freq: root * 0.85,
              dur: s * 0.7,
              vol: 0.11,
            }),
          );
        }
      }
      // Sub-bass on beat 1
      notes.push({ delay: t0, freq: root / 2, dur: q * 0.55, vol: 0.055 });
    }

    // ---- Atmosphere: strings for intensity 0-1, thin pads for 2-3 ----
    if (intensity <= 3) {
      const PAD_CHORDS = [
        [220, 277, 330, 440], // Am7
        [196, 247, 294, 392], // G
        [175, 220, 262, 349], // F
        [165, 220, 294, 392], // Em
      ];
      for (let b = 0; b < bars; b += 4) {
        const chord = PAD_CHORDS[(b / 4) % 4];
        const t0 = b * q * 4;
        const cdur = q * 4 * 0.9;
        if (intensity <= 1) {
          // Full string section — soft, smooth (triangle wave, narrow filter)
          chord.forEach((f) =>
            notes.push({
              delay: t0,
              freq: f,
              dur: cdur,
              str: true,
              vol: 0.048 - intensity * 0.008,
              wet: 0.4,
              strAttack: 0.32,
              strOscType: "triangle",
              strFiltMult: 3.2,
              strVibratoDepth: 0.005,
            }),
          );
        } else {
          // intensity 2-3: lighter sine pad, no strings
          const pv = 0.028 - (intensity - 2) * 0.006;
          chord.forEach((f) => {
            notes.push({ delay: t0, freq: f, dur: cdur, vol: pv, wet: 0.3 });
            notes.push({
              delay: t0 + 0.03,
              freq: f,
              dur: cdur,
              vol: pv * 0.5,
              detune: 10,
              wet: 0.22,
            });
            notes.push({
              delay: t0 + 0.06,
              freq: f,
              dur: cdur,
              vol: pv * 0.5,
              detune: -10,
              wet: 0.22,
            });
          });
        }
      }
    }

    // ---- Arpeggio (intensity >= 1) ----
    if (intensity >= 1) {
      const ARP = [220, 261, 294, 329, 392, 440, 523, 587, 659, 784];
      // Step duration gets shorter at higher intensities
      const step = intensity >= 5 ? s : intensity >= 3 ? e * 0.8 : e;
      // Pattern complexity increases with intensity
      const PATS = [
        [0, 2, 4, 6, 4, 2], // 1: gentle
        [0, 2, 4, 6, 8, 6, 4, 2], // 2: medium
        [0, 2, 4, 6, 8, 6, 4, 2, 0, 1, 3, 5, 7, 9, 7, 5], // 3: varied
        [0, 2, 4, 6, 8, 6, 4, 2, 0, 3, 5, 8, 9, 7, 5, 3], // 4: fast
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1], // 5: ascending full
        [0, 2, 4, 6, 8, 9, 8, 6, 4, 2, 0, 1, 3, 5, 7, 9, 8, 6, 4, 2, 1, 0], // 6: racing
      ];
      const pat = PATS[Math.min(intensity - 1, 5)];
      const arpVol = 0.028 + intensity * 0.009;
      const arpType = intensity >= 3 ? "square" : "triangle";
      const totalSteps = Math.floor(dur / step);
      for (let i = 0; i < Math.min(totalSteps, bars * 20); i++)
        notes.push({
          delay: i * step,
          freq: ARP[pat[i % pat.length] % ARP.length],
          dur: step * 0.72,
          vol: arpVol,
          type: arpType,
        });
    }

    // ---- Melody (only intensity 0-1) ----
    if (intensity <= 1) {
      [
        [q * 0.5, 440, q * 0.85],
        [q * 1.5, 523, q * 0.85],
        [q * 2.5, 659, e * 0.85],
        [q * 3.5, 523, e * 0.85],
        [q * 4.5, 440, q * 0.85],
        [q * 5.5, 392, q * 0.85],
        [q * 6.5, 440, e * 0.85],
        [q * 7.5, 523, q * 0.85],
        [q * 8.5, 587, q * 0.85],
        [q * 9.5, 523, q * 0.85],
        [q * 10.5, 440, e * 0.85],
        [q * 11.5, 392, q * 0.85],
        [q * 12.5, 330, q * 2 * 0.85],
      ].forEach(([delay, freq, d]) =>
        notes.push({ delay, freq, dur: d, vol: 0.055, wet: 0.2 }),
      );
    }

    return { notes, duration: dur };
  }

  // ---- Result BGM ----
  // Triumphant orchestral, 88 BPM, C major — full strings, rising melody
  _bgmResult() {
    const bpm = 88;
    const q = 60 / bpm;
    const h = q * 2;
    const w = q * 4;
    const notes = [];

    // Cello bass (longer bowed notes)
    [
      [0, 131, h * 0.9],
      [h, 165, h * 0.9],
      [w, 175, h * 0.9],
      [w + h, 196, h * 0.9],
      [w * 2, 220, h * 0.9],
      [w * 2 + h, 196, h * 0.9],
      [w * 3, 196, h * 0.9],
      [w * 3 + h, 175, h * 0.9],
      [w * 4, 131, h * 0.9],
      [w * 4 + h, 165, h * 0.9],
      [w * 5, 175, h * 0.9],
      [w * 5 + h, 220, h * 0.9],
      [w * 6, 165, h * 0.9],
      [w * 6 + h, 196, h * 0.9],
      [w * 7, 131, w * 1.55],
    ].forEach(([delay, freq, dur]) => {
      notes.push({
        delay,
        freq,
        dur,
        str: true,
        vol: 0.08,
        wet: 0.3,
        strAttack: 0.2,
      });
      notes.push({ delay, freq: freq / 2, dur, type: "triangle", vol: 0.045 });
    });

    // Viola / inner strings — chord pads (C→F→Am→G progression)
    const strChord = (delay, freqs, dur, atk = 0.22) =>
      freqs.forEach((freq) =>
        notes.push({
          delay,
          freq,
          dur,
          str: true,
          vol: 0.058,
          wet: 0.42,
          strAttack: atk,
        }),
      );
    strChord(0, [262, 330, 392, 523], w * 0.92); // C
    strChord(w, [175, 220, 349, 440], w * 0.92); // F
    strChord(w * 2, [220, 277, 330, 440], w * 0.92); // Am
    strChord(w * 3, [196, 247, 294, 392], w * 0.92); // G
    strChord(w * 4, [262, 330, 392, 523], w * 0.92); // C
    strChord(w * 5, [175, 220, 349, 440], w * 0.92); // F
    strChord(w * 6, [165, 208, 330, 415], w * 0.92); // Am/E
    strChord(w * 7, [131, 165, 262, 330], w * 1.6, 0.28); // C (grand resolve)

    // Violin solo melody — single high voice, expressive
    [
      [0, 523, q * 0.9],
      [q, 659, q * 0.9],
      [q * 2, 784, h * 0.9],
      [q * 4, 880, h * 0.9],
      [q * 6, 784, q * 0.9],
      [q * 7, 659, q * 0.9],
      [q * 8, 523, h * 0.9],
      [q * 10, 587, q * 0.9],
      [q * 11, 659, q * 0.9],
      [q * 12, 784, h * 0.9],
      [q * 14, 880, q * 0.9],
      [q * 15, 784, q * 0.9],
      // Second phrase: rise and soar
      [q * 16, 659, q * 0.9],
      [q * 17, 784, q * 0.9],
      [q * 18, 880, q * 0.9],
      [q * 19, 1047, q * 0.9],
      [q * 20, 1175, h * 0.9],
      [q * 22, 1047, q * 0.9],
      [q * 23, 880, q * 0.9],
      [q * 24, 784, q * 0.9],
      [q * 25, 659, q * 0.9],
      [q * 26, 523, q * 0.9],
      [q * 27, 659, q * 0.9],
      [q * 28, 784, w * 1.55],
    ].forEach(([delay, freq, dur]) =>
      notes.push({
        delay,
        freq,
        dur,
        str: true,
        vol: 0.08,
        wet: 0.38,
        strAttack: 0.08,
      }),
    );

    return { notes, duration: q * 32 };
  }

  // ---------------------------------------------------------------------------
  // Volume
  // ---------------------------------------------------------------------------

  setSeVolume(v) {
    this._seVolume = Math.max(0, Math.min(1, v));
    if (this._seBus) this._seBus.gain.value = this._seVolume;
    try {
      localStorage.setItem("seVolume", this._seVolume);
    } catch (_) {}
  }

  setBgmVolume(v) {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this._bgmBus) this._bgmBus.gain.value = this._bgmVolume;
    if (this._htmlAudio) this._htmlAudio.volume = this._bgmVolume;
    try {
      localStorage.setItem("bgmVolume", this._bgmVolume);
    } catch (_) {}
  }

  _loadVolumes() {
    try {
      const bgm = parseFloat(localStorage.getItem("bgmVolume"));
      const se = parseFloat(localStorage.getItem("seVolume"));
      if (!isNaN(bgm)) this._bgmVolume = Math.max(0, Math.min(1, bgm));
      if (!isNaN(se)) this._seVolume = Math.max(0, Math.min(1, se));
    } catch (_) {}
  }
}

export const soundManager = new SoundManager();
