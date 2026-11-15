(function () {
  const B = (window.Baller = window.Baller || {});

  let ctx = null;
  let bus = null;
  const htmlLive = [];

  const FILES = {
    rocketLaunch: "sounds/rocket-launch.wav",
    interceptLaunch: "sounds/intercept-launch.wav",
    expl: "sounds/expl.wav",
    impact: "sounds/impact.wav",
    debris: "sounds/debris.wav",
    scream1: "sounds/scream-1.wav",
    scream2: "sounds/scream-2.wav",
    scream3: "sounds/scream-3.wav",
  };

  const SCREAM_KEYS = ["scream1", "scream2", "scream3"];
  const rawBytes = {};
  const decoded = {};
  let primed = false;

  Object.keys(FILES).forEach(function (key) {
    fetch(FILES[key]).then(function (res) {
      if (!res.ok) throw new Error(key);
      return res.arrayBuffer();
    }).then(function (buf) {
      rawBytes[key] = buf;
      decodePending();
    }).catch(function () {});
  });

  function decodePending() {
    if (!ctx) return;
    const keys = Object.keys(rawBytes);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!rawBytes[key] || decoded[key]) continue;
      const copy = rawBytes[key].slice(0);
      rawBytes[key] = null;
      ctx.decodeAudioData(copy).then(function (buffer) {
        decoded[key] = buffer;
      }).catch(function () {});
    }
  }

  function resume() {
    if (!ctx || ctx.state !== "suspended" || typeof ctx.resume !== "function") return;
    const pending = ctx.resume();
    if (pending && typeof pending.catch === "function") pending.catch(function () {});
  }

  function audio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (ctx) {
      resume();
      decodePending();
      return ctx;
    }
    try {
      ctx = new AC();
      bus = ctx.createGain();
      bus.gain.value = 0.92;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      bus.connect(comp);
      comp.connect(ctx.destination);
      resume();
      decodePending();
      return ctx;
    } catch (err) {
      ctx = null;
      bus = null;
      return null;
    }
  }

  function primeHtmlAudio() {
    if (primed) return;
    primed = true;
    const el = new Audio("data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA");
    const pending = el.play();
    if (pending && typeof pending.catch === "function") {
      pending.catch(function () {
        primed = false;
      });
    }
  }

  function vary(value, amount) {
    return value * (1 + (Math.random() * 2 - 1) * amount);
  }

  function panAmount(x) {
    const width = (B.BALANCE && B.BALANCE.viewW) || 4800;
    let amount = 0;
    if (typeof x === "number" && isFinite(x)) {
      amount = (x / width) * 1.3 - 0.65;
      if (amount < -0.65) amount = -0.65;
      if (amount > 0.65) amount = 0.65;
    }
    return amount;
  }

  function panTo(node, x) {
    const amount = panAmount(x);
    if (typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = amount;
      node.connect(panner);
      panner.connect(bus);
      return panner;
    }
    node.connect(bus);
    return null;
  }

  function release(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      try { nodes[i].disconnect(); } catch (err) {}
    }
  }

  function playSample(key, opts) {
    if (!audio()) return false;
    const buffer = decoded[key];
    const rate = (opts && opts.rate) || 1;
    const level = (opts && opts.gain) == null ? 0.85 : opts.gain;
    const delay = (opts && opts.delay) || 0;
    const x = opts ? opts.x : null;
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      let tail = src;
      const nodes = [src];
      if (opts && opts.lowpass) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = opts.lowpass;
        tail.connect(lp);
        tail = lp;
        nodes.push(lp);
      }
      if (opts && opts.highpass) {
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = opts.highpass;
        tail.connect(hp);
        tail = hp;
        nodes.push(hp);
      }
      const gain = ctx.createGain();
      gain.gain.value = level;
      tail.connect(gain);
      nodes.push(gain);
      const panner = panTo(gain, x);
      if (panner) nodes.push(panner);
      const t = ctx.currentTime + delay;
      // Play the whole recording. Fading it out when the rocket arrives
      // was cutting the tail off before the sample finished.
      src.onended = function () { release(nodes); };
      src.start(t);
      return true;
    }
    const url = FILES[key];
    if (!url) return false;
    const run = function () {
      const el = new Audio(url);
      htmlLive.push(el);
      el.volume = Math.max(0, Math.min(1, level));
      el.playbackRate = rate;
      const drop = function () {
        const i = htmlLive.indexOf(el);
        if (i >= 0) htmlLive.splice(i, 1);
      };
      el.addEventListener("ended", drop);
      el.addEventListener("error", drop);
      const pending = el.play();
      if (pending && typeof pending.catch === "function") pending.catch(drop);
    };
    if (delay > 0) window.setTimeout(run, Math.round(delay * 1000));
    else run();
    return true;
  }

  function rocketLaunch(x) {
    playSample("rocketLaunch", {
      x: x,
      gain: 0.78,
      rate: vary(1.0, 0.04),
    });
  }

  function interceptLaunch(x) {
    playSample("interceptLaunch", {
      x: x,
      gain: 0.72,
      rate: vary(1.0, 0.04),
    });
  }

  function rocketExplosion(x, scale) {
    if (!audio()) return;
    const amount = scale == null ? 1 : scale;
    const small = amount < 0.85;
    if (small) {
      playSample("impact", {
        x: x,
        gain: 0.78,
        rate: vary(1.05, 0.04),
      });
      playSample("debris", {
        x: x,
        gain: 0.42,
        rate: vary(1.12, 0.05),
        delay: 0.04,
      });
      return;
    }
    playSample("expl", {
      x: x,
      gain: 0.88,
      rate: vary(0.98, 0.04),
    });
    playSample("debris", {
      x: x,
      gain: 0.55,
      rate: vary(1.0, 0.05),
      delay: 0.06,
    });
  }

  function interceptExplosion(x) {
    if (!audio()) return;
    playSample("impact", {
      x: x,
      gain: 0.76,
      rate: vary(1.28, 0.04),
      highpass: 140,
    });
  }

  // A light-aircraft propeller: blade chops on a band of air, over a low engine.
  // It follows the drone and fades out when the flight ends.
  let prop = null;
  let propNoise = null;
  let propClip = null;
  let propPulse = null;

  function propCurves() {
    if (!propClip) {
      propClip = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = i / 255 * 2 - 1;
        propClip[i] = Math.tanh(x * 2.4);
      }
    }
    if (!propPulse) {
      propPulse = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = i / 255 * 2 - 1;
        const knee = (x - 0.2) / 0.8;
        propPulse[i] = knee > 0 ? knee * knee : 0;
      }
    }
  }

  function propNoiseBuffer() {
    if (propNoise) return propNoise;
    const length = ctx.sampleRate * 2;
    propNoise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = propNoise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return propNoise;
  }

  function setPan(panner, x) {
    if (!panner) return;
    const amount = panAmount(x);
    if (Math.abs(panner.pan.value - amount) < 0.012) return;
    panner.pan.value = amount;
  }

  function droneStart(x) {
    if (!audio()) return;
    droneStop(true);
    propCurves();
    const blade = vary(64, 0.03);
    const t = ctx.currentTime;
    const nodes = [];

    function take(node) {
      nodes.push(node);
      return node;
    }

    const body = take(ctx.createOscillator());
    body.type = "sawtooth";
    body.frequency.value = blade * 0.5;
    const body2 = take(ctx.createOscillator());
    body2.type = "sawtooth";
    body2.frequency.value = blade * 0.5 * 1.007;
    const bodyFilter = take(ctx.createBiquadFilter());
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = 240;
    bodyFilter.Q.value = 0.6;
    const clip = take(ctx.createWaveShaper());
    clip.curve = propClip;
    clip.oversample = "2x";
    const bodyGain = take(ctx.createGain());
    bodyGain.gain.value = 0.05;
    body.connect(bodyFilter);
    body2.connect(bodyFilter);
    bodyFilter.connect(clip);
    clip.connect(bodyGain);

    const tone = take(ctx.createOscillator());
    tone.type = "sine";
    tone.frequency.value = blade;
    const toneGain = take(ctx.createGain());
    toneGain.gain.value = 0.04;
    tone.connect(toneGain);

    const noise = take(ctx.createBufferSource());
    noise.buffer = propNoiseBuffer();
    noise.loop = true;
    const wash = take(ctx.createBiquadFilter());
    wash.type = "bandpass";
    wash.frequency.value = 720;
    wash.Q.value = 0.7;
    const washGain = take(ctx.createGain());
    washGain.gain.value = 4.4;
    const chop = take(ctx.createGain());
    chop.gain.value = 0.12;
    const pulse = take(ctx.createOscillator());
    pulse.type = "sawtooth";
    pulse.frequency.value = blade;
    const shaper = take(ctx.createWaveShaper());
    shaper.curve = propPulse;
    shaper.oversample = "2x";
    const pulseDepth = take(ctx.createGain());
    pulseDepth.gain.value = 0.95;
    pulse.connect(shaper);
    shaper.connect(pulseDepth);
    pulseDepth.connect(chop.gain);
    noise.connect(wash);
    wash.connect(washGain);
    washGain.connect(chop);

    const air = take(ctx.createBiquadFilter());
    air.type = "highpass";
    air.frequency.value = 2200;
    const airGain = take(ctx.createGain());
    airGain.gain.value = 0.045;
    noise.connect(air);
    air.connect(airGain);

    const wobble = take(ctx.createOscillator());
    wobble.type = "sine";
    wobble.frequency.value = 4.2;
    const wobbleBlade = take(ctx.createGain());
    wobbleBlade.gain.value = 1.4;
    const wobbleBody = take(ctx.createGain());
    wobbleBody.gain.value = 0.7;
    wobble.connect(wobbleBlade);
    wobble.connect(wobbleBody);
    wobbleBlade.connect(pulse.frequency);
    wobbleBlade.connect(tone.frequency);
    wobbleBody.connect(body.frequency);

    const master = take(ctx.createGain());
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.5, t + 0.07);
    bodyGain.connect(master);
    toneGain.connect(master);
    chop.connect(master);
    airGain.connect(master);
    const panner = panTo(master, x);
    if (panner) nodes.push(panner);

    body.start(t);
    body2.start(t);
    tone.start(t);
    pulse.start(t);
    wobble.start(t);
    noise.start(t);

    prop = {
      master: master,
      panner: panner,
      blade: blade,
      heard: blade,
      body: body,
      body2: body2,
      tone: tone,
      pulse: pulse,
      noise: noise,
      wobble: wobble,
      nodes: nodes,
    };
  }

  function droneMove(x, along) {
    if (!prop || !ctx) return;
    setPan(prop.panner, x);
    const u = Math.max(0, Math.min(1, along || 0));
    const blade = prop.blade + u * 8;
    if (Math.abs(blade - prop.heard) < 0.4) return;
    prop.heard = blade;
    prop.pulse.frequency.value = blade;
    prop.tone.frequency.value = blade;
    prop.body.frequency.value = blade * 0.5;
    prop.body2.frequency.value = blade * 0.5 * 1.007;
  }

  function droneStop(quick) {
    if (!prop || !ctx) {
      prop = null;
      return;
    }
    const voice = prop;
    prop = null;
    const t = ctx.currentTime;
    const fade = quick ? 0.03 : 0.12;
    try {
      voice.master.gain.cancelScheduledValues(t);
      const level = voice.master.gain.value;
      voice.master.gain.setValueAtTime(level > 0.0001 ? level : 0.0001, t);
      voice.master.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    } catch (err) {}
    const end = t + fade + 0.03;
    const sources = [voice.body, voice.body2, voice.tone, voice.pulse, voice.noise, voice.wobble];
    for (let i = 0; i < sources.length; i++) {
      try { sources[i].stop(end); } catch (err) {}
    }
    voice.noise.onended = function () { release(voice.nodes); };
  }

  // Real vocal crowd scream when a residential building is hit.
  let lastScream = -1;
  function scream(x, homes) {
    if (!audio()) return;
    const count = Math.max(1, homes || 1);
    const level = Math.min(0.95, 0.76 + (count - 1) * 0.06);
    let pick = Math.floor(Math.random() * SCREAM_KEYS.length);
    if (pick === lastScream) pick = (pick + 1) % SCREAM_KEYS.length;
    lastScream = pick;
    playSample(SCREAM_KEYS[pick], {
      x: x,
      gain: level,
      rate: vary(1.0, 0.03),
      delay: 0.05,
    });
  }

  function guard(fn) {
    return function () {
      try {
        fn.apply(null, arguments);
      } catch (err) {
        if (window.console) console.error(err);
      }
    };
  }

  B.sfx = {
    unlock: function () {
      audio();
      primeHtmlAudio();
    },
    rocketLaunch: guard(rocketLaunch),
    interceptLaunch: guard(interceptLaunch),
    rocketExplosion: guard(rocketExplosion),
    interceptExplosion: guard(interceptExplosion),
    scream: guard(scream),
    droneStart: guard(droneStart),
    droneMove: guard(droneMove),
    droneStop: guard(droneStop),
  };
})();
