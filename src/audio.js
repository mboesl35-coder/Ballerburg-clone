(function () {
  const B = (window.Baller = window.Baller || {});

  let ctx = null;
  let bus = null;
  const riding = [];

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

  function ride(gain, seconds) {
    riding.push(gain);
    window.setTimeout(function () {
      const i = riding.indexOf(gain);
      if (i >= 0) riding.splice(i, 1);
      try { gain.disconnect(); } catch (err) {}
    }, Math.ceil(seconds * 1000) + 120);
  }

  // Impact replaces the motor so the explosion is clean.
  function hushLaunches() {
    if (!ctx || !riding.length) return;
    const t = ctx.currentTime;
    for (let i = 0; i < riding.length; i++) {
      const param = riding[i].gain;
      try {
        const level = param.value;
        param.cancelScheduledValues(t);
        if (!(level > 0.001)) continue;
        param.setValueAtTime(level, t);
        param.linearRampToValueAtTime(0.0001, t + 0.05);
      } catch (err) {
        param.value = 0.0001;
      }
    }
    riding.length = 0;
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

  function panTo(node, x) {
    const width = (B.BALANCE && B.BALANCE.viewW) || 4800;
    let amount = 0;
    if (typeof x === "number" && isFinite(x)) {
      amount = (x / width) * 1.3 - 0.65;
      if (amount < -0.65) amount = -0.65;
      if (amount > 0.65) amount = 0.65;
    }
    if (typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = amount;
      node.connect(panner);
      panner.connect(bus);
      return;
    }
    node.connect(bus);
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
      if (opts && opts.lowpass) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = opts.lowpass;
        tail.connect(lp);
        tail = lp;
      }
      if (opts && opts.highpass) {
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = opts.highpass;
        tail.connect(hp);
        tail = hp;
      }
      const gain = ctx.createGain();
      gain.gain.value = level;
      tail.connect(gain);
      panTo(gain, x);
      const t = ctx.currentTime + delay;
      const dur = buffer.duration / rate;
      if (opts && opts.ride) ride(gain, delay + dur);
      src.start(t);
      src.stop(t + dur + 0.04);
      return true;
    }
    const url = FILES[key];
    if (!url) return false;
    const run = function () {
      const el = new Audio(url);
      el.volume = Math.max(0, Math.min(1, level));
      el.playbackRate = rate;
      const pending = el.play();
      if (pending && typeof pending.catch === "function") pending.catch(function () {});
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
      ride: true,
    });
  }

  function interceptLaunch(x) {
    playSample("interceptLaunch", {
      x: x,
      gain: 0.72,
      rate: vary(1.0, 0.04),
      ride: true,
    });
  }

  function rocketExplosion(x, scale) {
    if (!audio()) return;
    hushLaunches();
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
    hushLaunches();
    playSample("impact", {
      x: x,
      gain: 0.76,
      rate: vary(1.28, 0.04),
      highpass: 140,
    });
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
  };
})();
